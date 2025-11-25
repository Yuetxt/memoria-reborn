import floors from "../../data/floors.json"
import mobData from "../../data/mobs.json"

export function getEnemies(f: string): { id: string, lvl: number }[] {
    let [floor, subfloor] = f.split("-")
    let mobs = floors[floor].subfloors[subfloor].mobs
    const enemies: {id: string, lvl: number}[] = []
    for (const mob of mobs) {
        const lvlMatch = mob.match("\\((\\d+)\\)") || "(1)"
        const qtMatch = mob.match("\\[(\\d+)\\]") || "[1]"
        const id: string = mob.replace(lvlMatch[0], "").replace(qtMatch[0], "")
        const level = parseInt(lvlMatch[1])
        const quantity = parseInt(qtMatch[1])
        enemies.push(...Array.from({length: quantity}, () => {
            return {
                id,
                lvl: level
            }
        }))
    }
    return enemies
}

// Grow : Primary stat = 1.5%/lvl, 2ndary = 1%/lvl, 3rdary = 0.5%/lvl, hp: 3%/lvl
// Primary = highest, secondary = middle, tertiary = lowest
type FighterSetup = {
    baseStats: {
        atk: number,
        def: number,
        spd: number,
        maxhp: number
    }
}

export function getEnemy({id, lvl}: {id: string, lvl: number}) {
    const base: FighterSetup = mobData[id]
    const statKeys = Object.keys(base.baseStats).filter((k) => k !== "maxhp").sort((a, b) => base.baseStats[b] - base.baseStats[a])
    const growths = [1.5, 1, 0.5]
    for(let i =0; i < 3; i++) {
        base.baseStats[statKeys[i]] = base.baseStats[statKeys[i]] * (1+growths[i]/100)**(lvl-1)
    }
    base.baseStats.maxhp = base.baseStats.maxhp * (1+3/100)**(lvl-1)
    return base
}