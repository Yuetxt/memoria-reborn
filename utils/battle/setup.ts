import {BaseStats, MobStatic, NULL_STATS, SERVANT_DEFAULTS, ServantStatic} from "../types/data";
import servantsData from "../../data/servants.json"
import mobsData from "../../data/mobs.json"
import floorData from "../../data/floors.json"
import {Role} from "../types/battle";
import {MAX_FLOOR, parseFloor, superior} from "./utils";
import {staticUrl} from "../../config.json"

export function getArtUrl(s: string) {
    if (s.startsWith("http")) return s
    if (s.length === 0) return
    if (s.startsWith("/")) return staticUrl + s
    return staticUrl + "/" + s
}

// ====== Servant Behavior
export function getServantData(id: string): ServantStatic {
    const baseData = servantsData[id.trim()]
    if (!baseData) {
        throw new Error(`Servant ${id} not found`)
    }
    // Formating
    baseData["role"] = (baseData["role"] || "").toLowerCase()
    baseData["element"] = (baseData["element"] || "neutral").toLowerCase()
    return {
        ...SERVANT_DEFAULTS,
        art: getArtUrl(`/servants/${baseData.series.replaceAll(" ", "-").toLowerCase()}/${id}-min.png`),
        id,
        ...baseData
    }
}


export const STATS_PRIORITY = {
    [Role.DPS]: ["atk", "spd", "def;hp"],
    [Role.SUPPORT]: ["spd;hp", "def", "atk"],
    [Role.TANK]: ["def;hp", "atk", "spd"],
    [Role.CONTROL]: ["spd", "atk", "def;hp"]
}

export const GROWTH_VALUES = [[2.5, 2, 1.5], [3, 2.5, 2], [4, 3.5, 3]]

export function getServantsGrowthRate(role: Role, rarity: number): BaseStats {
    const stats: BaseStats = {...NULL_STATS}
    const statKeys = STATS_PRIORITY[role]
    for (let i = 0; i < statKeys.length; i++) {
        const keys = statKeys[i].split(";")
        for (const key of keys) {
            const growth = GROWTH_VALUES[rarity][i]
            if (growth) {
                stats[key] = growth
            }
        }
    }
    return stats
}


export function computeRates(stats: BaseStats, rates: BaseStats, lvl: number) {
    const newStats: BaseStats = {...stats}
    for (const [key, value] of Object.entries(rates)) {
        newStats[key] = Math.round(stats[key] * (1 + value * (lvl - 1) / 100))
    }
    return newStats
}


// ========= Mob behavior
function getMobGrowthRate(mob: MobStatic) {
    const stats: BaseStats = {...NULL_STATS}
    const statKeys = Object.keys(mob.stats).filter(k => k != "hp").sort((a, b) => mob.stats[b] - mob.stats[a])
    statKeys.push("hp")
    const rates = [1.5, 1, 0.5, 3]
    for (let i = 0; i < statKeys.length; i++) {
        stats[statKeys[i]] = rates[i]
    }
    return stats
}

function getMob(id: string): MobStatic {
    const baseData = mobsData[id.trim()]
    if (!baseData) {
        throw new Error(`Mob ${id} not found`)
    }
    baseData["art"] = getArtUrl((baseData["art"] || ""))

    return {
        id,
        passives: [],
        ...baseData
    }
}

export const LEVEL_DELTA = 0.5

export function getFloor(floorString: string): MobStatic[] {
    let f = parseFloor(floorString)
    if (superior(f, MAX_FLOOR)) {
        f = MAX_FLOOR
    }
    const {floor, sub} = f
    try {
        const mobsStrings = floorData[floor - 1]["subs"][sub - 1]["mobs"]
        const mobs = []
        for (const m of mobsStrings) {
            const lvlMatchs = m.match("\\((\\d+)\\)")
            const qtMatch = m.match("\\[(\\d+)\\]")
            const mob = getMob(m.split(" ")[0])
            const rates = getMobGrowthRate(mob)
            const midLvl = parseInt(lvlMatchs?.[1] || "1")
            // const lvlDelta = Math.round(LEVEL_DELTA * midLvl)
            const qt = parseInt(qtMatch?.[1] || "1")
            for (let i = 0; i < qt; i++) {
                const lvl = midLvl//rndInt(midLvl - lvlDelta, midLvl + lvlDelta)
                mobs.push({
                    ...mob,
                    art: getArtUrl(`/monsters/floor-${floor}/${mob.id}-min.png`),
                    name: `${mob.name} ${qt > 1 ? i + 1 : ""}`,
                    stats: computeRates(mob.stats, rates, lvl),
                })
            }
        }
        return mobs
    } catch (e) {
        console.error(e)
        throw new Error(`Floor ${floorString} not found`)
    }
}