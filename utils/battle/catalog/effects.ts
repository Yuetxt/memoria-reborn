import {Element} from "../../types/battle";
import {Fighter} from "../fighter";
import {BattleEngine} from "../engine";
import {
    BaseAlteration,
    CustomBoardEffectAlteration,
    CustomStatAlteration,
} from "../alterations";
import {chance} from "../utils";
import {Bleed, Burn, Freeze, Paralysis, Poison, Regen, Shield, Shock, Stun} from "./alterations";
import {Effect} from "../effect";
import {generateId} from "../../utils";

const statsRegex = "atk|def|spd|hp|max_hp|dmg_taken|dmg_dealt|debuff_res|heal|acc|evs"


const ALTS: Record<string, (s: number, duration: number) => BaseAlteration> = {
    "poison": (stacks: number, duration: number) => new Poison(duration, stacks),
    "bleed": (s, d) => new Bleed(d, s),
    "burn": (s, d) => new Burn(s, d),
    "stun": (s, d) => new Stun(s, d),
    "regen": (s, d) => new Regen(s, d),
    "shock": (s, d) => new Shock(s, d),
    "paralysis": (s, d) => new Paralysis(s, d)
}
export const EFFECTS = {
    "dmg": (s: string) => {
        // construct regex from Element enum
        const elementRegex = Object.values(Element).join("|")
        const elementMatch = s.match(elementRegex)
        let element: Element | null;
        if (elementMatch && Object.keys(Element).includes(elementMatch[0])) {
            element = elementMatch[0] as Element
        }
        const dmgMatch = s.match("[0-9]+%")
        let dmg = 1;
        if (dmgMatch) {
            dmg = parseInt(dmgMatch[0].replace("%", ""))
        }
        return (caster: Fighter, target: Fighter, e: BattleEngine) => {
            caster.attack(target, dmg, {element})
        }
    },
    "hploss": (s: string) => {
        const dmgMatch = s.match("[0-9]+%")
        let dmg = 0;
        if (dmgMatch) {
            dmg = parseInt(dmgMatch[0].replace("%", "")) / 100
        }
        return (c: Fighter, t: Fighter, e: BattleEngine) => {
            t.stats.hp -= t.stats.max_hp * dmg
            t.stats.hp = Math.max(0, t.stats.hp)
            e.log(`${t} loose ${dmg * t.stats.max_hp} damage!`, new Date().getTime())
        }
    },
    "stat": (s: string) => {
        const stacksMatch = s.match("[0-9]+-[0-9]+")
        let duration = 1
        if (stacksMatch) {
            const splitted = stacksMatch[0].split("-")
            duration = parseInt(splitted[1])
        }

        const statsMatchs = [...s.matchAll(new RegExp(`(${statsRegex})[+-][0-9]+%?`, 'g'))]
        const relativeStatsModif = {}
        for (const match of statsMatchs) {
            let split = match[0].split("+")
            let value = 0
            if (split.length > 1) {
                value = parseInt(split[1])
            } else {
                split = match[0].split("-")
                if (split.length > 1) {
                    value = -parseInt(split[1])
                }
            }
            relativeStatsModif[split[0]] = value
        }
        const id = generateId() // Id is for handling duplication of the same effect. For each skill we generate and ID so that the effect does not stack
        return (caster: Fighter, target: Fighter, e: BattleEngine) => {
            target.alter(new CustomStatAlteration(relativeStatsModif, duration, id))
        }
    },
    "alt": (s: string) => {

        const stacksMatch = s.match("[0-9]+-[0-9]+")
        let stacks = 1
        let duration = 1
        if (stacksMatch) {
            const splitted = stacksMatch[0].split("-")
            stacks = parseInt(splitted[0])
            duration = parseInt(splitted[1])
        }
        const regex = Object.keys(ALTS).join("|")
        const alts = [...s.matchAll(new RegExp(regex, 'g'))]

        return (caster: Fighter, target: Fighter, e: BattleEngine) => {
            const alterations = []
            for (const alt of alts) {
                const altFunc = ALTS[alt[0]]
                if (altFunc) {
                    const a = altFunc(stacks, duration)
                    a.setCaster(caster)
                    alterations.push(a)
                }
            }
            alterations.map((a) => target.alter(a))
        }
    },
    "heal": (s: string) => {
        const powerMatch = s.match("[0-9]+%")
        let power = 1
        if (powerMatch) {
            power = parseInt(powerMatch[0].replace("%", "")) / 100
        }

        const sourceMatch = s.match("caster|target")
        let source = "target"
        if (sourceMatch) {
            source = sourceMatch[0]
        }

        return (caster: Fighter, target: Fighter, e: BattleEngine) => {
            target.heal((source == "caster" ? caster : target).stats.max_hp * power)
        }
    },
    "clean": (s: string) => {
        return (c: Fighter, t: Fighter, e: BattleEngine) => {
            t.alterations.filter(a => !a.buff).map(a => a.onRemove())
            t.alterations = t.alterations.filter(a => a.buff)
        }
    },
    "shield": (s: string) => {
        const stacksMatch = s.match("[0-9]+-[0-9]+")
        let stacks = 1
        let duration = 1
        if (stacksMatch) {
            const splitted = stacksMatch[0].split("-")
            stacks = parseInt(splitted[0])
            duration = parseInt(splitted[1])
        }
        const powerStatMatch = s.match(`(${statsRegex})-[0-9]+%`)
        let statKey = "max_hp"
        let power = 20
        if (powerStatMatch) {
            const split = powerStatMatch[0].split("-")
            statKey = split[0]
            power = parseInt(split[1])
        }
        return (c: Fighter, t: Fighter, e: BattleEngine) => {
            const stat = t.stats[statKey] || t.stats.max_hp
            t.alter(new Shield(stat * power / 100, duration, stacks))
        }
    }
}
