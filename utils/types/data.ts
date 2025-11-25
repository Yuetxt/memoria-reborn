import {Role} from "./battle";
import {Element} from "./battle";
import {Passive} from "../battle/passives";
import {SkillShort} from "../battle/skills";

export type BaseStats = {
    atk: number
    def: number
    spd: number
    hp: number
}
export const NULL_STATS: BaseStats = {
    atk: 0,
    def: 0,
    spd: 0,
    hp: 0
}
export type CommonAttrs = {
    id: string
    name: string
    art: string
    element: string
    stats: BaseStats
    description?: string
    skills: SkillShort[]
    passives: Passive[],
    gender?: string
}
export type ServantStatic = CommonAttrs & {
    series: string
    role: Role
    rarity: number
}

export type MobStatic =CommonAttrs & {
    boss?: boolean
}

export const SERVANT_DEFAULTS = {
    art: "",
    element: Element.NEUTRAL,
    rarity: 0,
    stats: NULL_STATS,
    passives: []
}