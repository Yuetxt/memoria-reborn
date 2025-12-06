

export enum Element {
    FIRE = "fire",
    ICE = "ice",
    WATER = "water",
    NATURE = "nature",
    TOXIC = "toxic",
    ELECTRIC = "electric",
    WIND = "wind",
    EARTH = "earth",
    DARKNESS = "darkness",
    LIGHT = "light",
    NEUTRAL = "neutral"
}

export const ELEMENT_TABLE_STRONG = {
    [Element.FIRE]: Element.ICE,
    [Element.ICE]: Element.WIND,
    [Element.WATER]: Element.FIRE,
    [Element.ELECTRIC]: Element.WATER,
    [Element.WIND]: Element.EARTH,
    [Element.EARTH]: Element.ELECTRIC,
    [Element.DARKNESS]: Element.NATURE,
    [Element.LIGHT]: Element.DARKNESS,
    [Element.TOXIC]: Element.LIGHT,
    [Element.NATURE]: Element.TOXIC,
}
export const ELEMENT_EMOJI = {
    [Element.FIRE]: "🔥",
    [Element.ICE]: "🧊",
    [Element.WATER]: "🌊",
    [Element.ELECTRIC]: "⚡",
    [Element.WIND]: "🌬️",
    [Element.EARTH]: "🌱",
    [Element.DARKNESS]: "🌙",
    [Element.LIGHT]: "☀️",
    [Element.TOXIC]: "☢️",
    [Element.NATURE]: "🌱",
    [Element.NEUTRAL]: "⚖️"
}

export const ELEMENT_TABLE_WEAK  = Object.fromEntries(Object.entries(ELEMENT_TABLE_STRONG).map(([k, v]) => [Element[v], k]))


export enum Role {
    SUPPORT = "support",
    TANK = "tank",
    DPS = "dps",
    CONTROL="control"
}


export type BattleStats = {
    // ABS
    atk: number,
    def: number,
    spd: number,
    hp: number,
    max_hp: number,

    // Percent
    acc: number,
    evs: number,

    crit_dmg: number
    crit_chance: number

    dmg_taken: number,
    dmg_dealt: number,
    heal: number

    // ABS
    shield: number,
    // Percent
    debuff_res: number,
}

export const BATTLE_STATS_PERCENT = ["acc", "evs", "crit_dmg", "crit_chance", "dmg_taken", "dmg_dealt", "heal", "shield", "debuff_res"]
export const BATTLE_STATS_ABS = ["atk", "def", "spd", "hp", "max_hp"]

export const BATTLE_STATS_DEFAULTS: Omit<BattleStats, "hp" | "max_hp" | "atk" | "def" | "spd"> = {
    acc: 95,
    evs: 5,
    crit_dmg: 200,
    crit_chance: 20,
    dmg_taken: 0,
    dmg_dealt: 0,
    heal: 0,
    shield: 0,
    debuff_res: 0,
}

