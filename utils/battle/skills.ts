import {DmgReturn, Fighter} from "./fighter";
import {chance, toSkillId} from "./utils";
import {green} from "../ansiFormatter";
import {BattleEngine} from "./engine";
import {Effect, EffectFunction, EffectType} from "./effect";
import {Element} from "../types/battle";
import {SKILL} from "./catalog/skills";

function rndChoice(list) {
    return list[Math.floor(Math.random() * list.length)]
}

const BASE_SKILL: Skill = {
    id: "",
    name: "",
    description: "",
    cost: 0,
    ally: false,
    effects: [],
    disabled: 0
}

// Skill are simply any actions that any fighter can do
// So it need to have some lore data
// And some effects data, each skills has a bunch of effect that executes when the skill is used
export type Skill = {
    id: string
    name: string,
    description?: string,
    disabled?: number, // Disabled constraints, skills is available only if null or 0
    cost?: number, // Player behavior
    cooldown?: number, // Enemy behavior
    proba?: number, // Enemy behavior
    ally?: boolean | null,
    effects: Effect[]
    needFeedback?: boolean | null,
    populateTargets?: boolean
}

// Since skills can be represented in json, we need a json friendly version of it
export type EffectLike = string | EffectType | EffectFunction
export type SkillShort = Omit<Skill, "id" | "effects"> & { effects: (EffectLike)[] | EffectLike }



function construct_skill(s: SkillShort): Skill { // Construct a real skill from a short version
    if (!Array.isArray(s.effects)) {
        s.effects = [s.effects]
    }
    return {
        ...BASE_SKILL,
        ...s,
        id: toSkillId(s.name),
        effects: s.effects.map((e) => Effect.from(e))
    }
}

function getSkill(id: string | SkillShort) {
    let s: SkillShort;
    if (typeof id == "string") {
        s = SKILL.find((s) => toSkillId(s.name) === id)
    } else {
        s = id
    }
    return construct_skill(s)
}

export function execute_skill(s: Skill, caster: Fighter, engine: BattleEngine, targets = []) {
    if (s.id != "auto-attack") {
        caster.boardEffects.map(b => b.validateSkill && b.validateSkill(caster, engine, s))
    }
    caster.boardEffects.map(b => b.onAct && b.onAct(caster, engine, s))
    return s.effects.map((e) => {
        e.execute(caster, engine, targets)
    })
}

export {getSkill}