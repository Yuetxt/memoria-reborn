import {BoardEffect} from "./passives";
import {Fighter} from "./fighter";
import {chance, getStatsString} from "./utils";
import {green, red} from "../ansiFormatter";
import {BATTLE_STATS_ABS, BATTLE_STATS_PERCENT, BattleStats, Element} from "../types/battle";
import {Skill} from "./skills";
import {generateId} from "../utils";


export enum CombineBehavior {
    ADD,
    REPLACE
}

export class BaseAlteration {
    stacks: { remaining: number }[]
    stackLimit: number = Infinity
    emoji = ""
    id = "base"
    caster: Fighter = null
    target: Fighter
    combineBehavior: CombineBehavior = CombineBehavior.ADD
    buff = false

    name = "base alteration"
    applyLine = () => `${this.target} takes ${this.buff ? green(this.name) : red(this.name)} !`

    constructor(stacks: number = 1, duration: number = 1) {
        this.stacks = Array.from({length: stacks}, () => ({remaining: duration + 1}))
    }

    setCaster(c: Fighter) {
        this.caster = c
    }

    combine(alt: BaseAlteration) {
        if (this.combineBehavior == CombineBehavior.ADD) {
            this.stacks = [...this.stacks, ...alt.stacks]
        } else if (this.combineBehavior == CombineBehavior.REPLACE) {
            this.stacks = alt.stacks
        }
    }

    use() {
        this.stacks = this.stacks.map(s => {
            return {remaining: s.remaining - 1}
        }).filter((s) => s.remaining > 0)
        if (this.stacks.length === 0) {
            this.onRemove()
        }
    }

    onRemove() {
    }

    onApply(f: Fighter) {
        this.target = f
        this.target.log(this.applyLine())
    }
}

export class SimpleAlteration extends BaseAlteration {
    applyLine = () => ""
    apply = () => {
    }
    remove = () => {
    }

    constructor(duration, apply: () => void, remove: () => void) {
        super(1, duration);
        this.apply = apply
        this.remove = remove
    }

    onApply(f: Fighter) {
        super.onApply(f);
        this.apply()
    }

    onRemove() {
        super.onRemove();
        this.remove()
    }
}

export class BoardEffectAlteration extends BaseAlteration {
    boards: BoardEffect[] = []

    onApply(f: Fighter) {
        super.onApply(f);
        this.target?.boardEffects.push(...this.boards.map(b => {
            return {...b, id: this.id}
        }))
    }

    onRemove() {
        super.onRemove();
        this.target.boardEffects = this.target.boardEffects.filter((b) => !this.boards.map(c => c.id).includes(b.id))
    }
}

export class CustomBoardEffectAlteration extends BoardEffectAlteration {
    applyLine = () => ''
    id = generateId()

    constructor(boards: BoardEffect[], stacks: number = 1, duration: number = 1) {
        super(stacks, duration);
        this.boards = boards
    }
}

export class StatAlteration extends BaseAlteration {
    stats: Partial<BattleStats> = {}
    id = Math.random().toString().substring(2, 7)
    applyLine = () => `${this.target} ${getStatsString(this.stats, true)}`

    onApply(f) {
        super.onApply(f);
        for (const key of Object.keys(this.stats)) {
            if (BATTLE_STATS_PERCENT.includes(key)) {
                this.target.stats[key] += this.stats[key]
            } else {
                this.target.stats[key] += this.target.startStats[key] * this.stats[key] / 100
            }
        }
    }

    onRemove() {
        super.onRemove();
        // Subtraction current stats with alt stats key by key
        for (const key of Object.keys(this.stats)) {
            if (BATTLE_STATS_PERCENT.includes(key)) {
                this.target.stats[key] -= this.stats[key]
            } else {
                this.target.stats[key] -= this.target.startStats[key] * this.stats[key] / 100
            }
        }
    }
}

export class CustomStatAlteration extends StatAlteration {
    constructor(stats: Partial<BattleStats>, duration: number = 1, id = null) {
        super(1, duration);
        this.id = id || generateId()
        this.stats = stats
    }
}

export class ClusterAlteration extends BaseAlteration {
    alterations: BaseAlteration[] = []
    applyLine = () => ""

    constructor(stacks: number = 1, duration: number = 1) {
        super(stacks, duration);
        this.alterations.map((a) => {
            a.stacks = this.stacks
        })
    }

    onApply(f: Fighter) {
        super.onApply(f);
        this.alterations.map(a => f.alter(a))
    }

    use() {
        super.use()
        this.alterations.map(a => {
            a.stacks = this.stacks
        })
    }

    onRemove() {
        super.onRemove();
        this.alterations.map(a => {
            a.stacks = []
            a.onRemove()
        })

    }
}

export class CustomClusterAlteration extends ClusterAlteration {
    id = generateId()

    constructor(stacks: number, duration: number = 1, alterations: BaseAlteration[]) {
        super(stacks, duration);
        this.alterations = alterations
    }
}

// // ============== Board Effect Based ================
//
//
// // ============= Stat Alteration Based ==============
// export class Slow extends StatAlteration {
//     id = "slow"
//     stats: Partial<BattleStats> = {
//         spd: -20
//     }
// }
//
// export class Haste extends StatAlteration {
//     id = "haste"
//     buff = true
//     stats: Partial<BattleStats> = {
//         spd: -20
//     }
// }
//
// export class Blind extends StatAlteration {
//     id = "blind"
//     buff = true
//     absStats: Partial<BattleStats> = {
//         acc: -30
//     }
// }
//
// export class Barrier extends StatAlteration {
//     id = "barrier"
//     emoji = "🛡️"
//     buff = true
//     absStats: Partial<BattleStats> = {
//         dmg_taken: -20
//     }
// }
//
// export class Mark extends StatAlteration {
//     id = "mark"
//     buff = true
//     absStats: Partial<BattleStats> = {
//         dmg_taken: 20
//     }
//
// }

