import levels from "../config/levels.json"
export function getMaxLvl(type: "player"|"servant"|"bond") {
    return levels[type].length
}

export function calculateLvl(xp: number, type: "player" | "servant" | "bond"): number {
    const id = levels[type].findIndex(level => level > xp)
    return id > -1 ? id : levels[type].length
}

export function calculateXp(lvl: number, type: "player" | "servant" | "bond" ): number {
    return levels[type][lvl - 1]
}


export function calculateXpToNextLvl(xp: number, type: "player" | "servant" | "bond"): number {
    return calculateXp(calculateLvl(xp, type) + 1, type) - xp
}


export function calculateXpToLvl(xp: number, lvl: number, type: "player" | "servant" | "bond"): number {
    return calculateXp(lvl, type) - xp
}


