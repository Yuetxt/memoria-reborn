import {Fighter} from "./fighter";
import {BattleEngine} from "./engine";
import {chance, targetsStrings} from "./utils";
import {EFFECTS} from "./catalog/effects";
import {CustomBoardEffectAlteration} from "./alterations";
import {Freeze} from "./catalog/alterations";
import {Element} from "../types/battle";

// Effects are simply functions that do something in the battle
// Caster is the one who uses the effect, target is the one on whom the effect will act
export type EffectFunction = (caster: Fighter, target: Fighter, engine: BattleEngine) => void

// So effect takes a function that decides targets, and bunch of functions or sub-effects, and a chance to actually work.
// The goal by having the sub-effects system is to allow to group or separate chances for effects
export type EffectType = Partial<{
    targets: (c: Fighter, e: BattleEngine) => Fighter[],
    effects: (EffectType | string | EffectFunction)[],
    chance: number
}>

export class Effect {
    chance: number = 100
    effects: Effect[] = []
    func: EffectFunction = (c, t, e) => null
    getTargets = (caster: Fighter, engine: BattleEngine): Fighter[] => []

    constructor(effects: Effect[], targets?: (c: Fighter, e: BattleEngine) => Fighter[], chance?: number);
    constructor(execute: EffectFunction, targets?: (c: Fighter, e: BattleEngine) => Fighter[], chance?: number);
    constructor(executeOrEffects: EffectFunction | Effect[], targets: (c: Fighter, e: BattleEngine) => Fighter[] = (p, e) => [], chance: number = 100) {
        this.chance = chance
        if (Array.isArray(executeOrEffects)) {
            this.effects = executeOrEffects;
        } else {
            this.func = executeOrEffects;
        }
        this.getTargets = targets
    }

    static fromString(e: string) {
        // e: effet;effet;effet
        let effect = e.toLowerCase()
        let targets = (c: Fighter, e: BattleEngine) => []
        const targetMatch = e.match("{[a-z_]+}")
        let k = ""
        if (targetMatch) {
            k = targetMatch[0].replace("{", "").replace("}", "")
            effect = effect.replace(targetMatch[0], "")
        }
        if (Object.keys(targetsStrings).includes(k)) {
            targets = targetsStrings[k]
        }

        const effectsStrings = effect.split(";")
        const effects: Effect[] = []
        for (let ef of effectsStrings) {
            ef = ef.trim()
            if (CUSTOM_EFFECTS[ef]) {
                effects.push(CUSTOM_EFFECTS[ef])
                continue
            }
            const key = Object.keys(EFFECTS).find((k) => ef.startsWith(k))
            if (!key)
                continue
            // Chance
            const chanceMatch = ef.match("\[[0-9]+\]")
            let c = 100
            if (chanceMatch) {
                c = parseInt(chanceMatch[0].replace("[", "").replace("]", ""))
            }
            effects.push(new Effect(EFFECTS[key](ef), () => [], c))
        }
        return new Effect(effects, targets, 100)
    }

    static fromObject(o: EffectType) {
        const effects = (o.effects || []).map(e => {
            if (typeof e == "string") {
                return Effect.fromString(e)
            } else if (typeof e === "function") {
                return Effect.fromFunction(e)
            }
            return Effect.fromObject(e)
        })
        return new Effect(effects, o.targets || ((c, e) => []), o.chance || 100)
    }

    static fromFunction(f: EffectFunction) {
        return new Effect(f, (p, e) => [], 100)
    }

    static from(entry: EffectType | string | EffectFunction) {
        if (typeof entry == "string") {
            return Effect.fromString(entry)
        }
        if (typeof entry == "function") {
            return Effect.fromFunction(entry)
        }
        return Effect.fromObject(entry)
    }


    execute(caster: Fighter, engine: BattleEngine, baseTargets: Fighter[] | Fighter = []) {
        if (chance(this.chance)) { // chance to apply the effect
            if (!Array.isArray(baseTargets)) { // Ensure base targets is an array
                baseTargets = [baseTargets]
            }

            let targets = this.getTargets(caster, engine) // If the function return no target, simply use base targets
            if (targets.length == 0) {
                targets = baseTargets
            }
            targets.filter((t)=>!!t).map((t) => {// Apply all effects to each target
                if (this.effects.length > 0 && (chance(caster.stats.acc) || caster=== t)) { // If there's sub effects and the attack hits, caster can't miss himself
                    if (caster.isPlayer === t.isPlayer || !chance(t.stats.evs)) { // If the target does not dodge (ally don't wanna dodge)
                        this.effects.map((e) => {
                            e.execute(caster, engine, t)
                        })
                    } else {
                        engine.log(`${t} dodged !`)
                    }
                } else if (this.effects.length > 0) {
                    engine.log(`${caster} missed ${t} !`)
                }
                // Execute the main effect
                this.func(caster, t, engine)
            })
            if(targets.length === 0) {
                this.func(caster, caster, engine)
            }
        }
    }
}

export const CUSTOM_EFFECTS: Record<string, Effect> = {
    "winter-edge": new Effect((c, t, e) => {
        t.alter(new CustomBoardEffectAlteration([{
            onAttack: (c, e, d) => {
                if (d.target.alterations.filter(a => a.id == "freeze").length > 0) {
                    return d.dmg * 1.2
                } else if (chance(30)) {
                    d.target.alter(new Freeze())
                }
                return d.dmg
            }
        }], 1, 3))
    }),
    "already-frozen": new Effect((c, t, e) => {
        const frozen = t.alterations.filter(a => a.id === "freeze")
        if (frozen.length > 0) {
            frozen.map(f => f.onRemove())
            t.alterations = t.alterations.filter(a => a.id !== "freeze")
            c.attack(t, 150, {element: Element.ICE})
        }
    }),
    "already-bleeding": new Effect((c, t, e) => {
        const bleed = t.alterations.filter(a => a.id === "bleed")
        if (bleed.length > 0) {
            bleed[0].stacks = [...bleed[0].stacks, {remaining: 3}, {remaining: 3}]
        }
    }),
    "debuff-sp": new Effect((c, t, e) => {
        if (t.alterations.filter(a => !a.buff).length > 0 && c.isPlayer) {
            e.gainSp(1, "from debuff")
        }
    })
}


