import {Stats} from "./types";
import {Fighter} from "./fighter";
import {Base} from "discord.js";
import {getSkill} from "./skills";
import {stack} from "sequelize/types/utils";

export function createStacks(n: number, duration: number) {
    return Array.from({length: n}, () => ({remaining: duration}))
}

export class BaseAlteration {
    id: string = "Base"
    shortName: string = "base"
    longName: string = "b"
    stacks: { remaining: number }[]
    target: Fighter | null
    stackLimit: number = Infinity
    buff = false

    baseStacks() {
        return createStacks(1, 1)
    }

    constructor(baseStacks: { remaining: number }[] | null = null, stackLimit: number = Infinity) {
        this.stacks = baseStacks || this.baseStacks()
        this.stackLimit = stackLimit
    }

    setTarget(target: Fighter) {
        this.target = target
    }

    combine(alteration: BaseAlteration) {
        this.stacks = [...this.stacks, ...alteration.stacks]
    }

    onApply() {
    }

    turnStart() {
    }

    turnEnd() {
        this.use()
    }

    onDamage(){}
    onHeal(){}

    onRemove() {
    }

    use() {
        this.stacks = this.stacks.map(s => {
            return {remaining: s.remaining - 1}
        }).filter((s) => s.remaining > 0)
        if (this.stacks.length === 0) {
            this.onRemove()
        }
    }

    addStack(duration) {
        if (this.stacks.length + 1 <= this.stackLimit) {
            this.stacks.push({remaining: duration})
        }
    }
}

export class Poison extends BaseAlteration {
    id = "poison"
    longName = "Poison"
    shortName = "☠️"

    turnStart() {
        const dmg = this.target.damage(this.target.stats.maxHp * 0.2 * this.stacks.length, 0.5)
        this.target.log(`${this.target.name} took ${dmg} damage from poison!`)
    }
}

export class Burn extends BaseAlteration {
    id = "burn"
    shortName = "🔥"
    longName = "Burn"

    turnStart() {
        this.target.damage(this.target.stats.maxHp * 0.2 * this.stacks.length, 0.5)
    }
}

export class Bleed extends BaseAlteration {
    id = "bleed"
    shortName = "🩸"
    longName = "Bleed"

    turnStart() {
        this.target.damage(this.target.stats.maxHp * 0.2 * this.stacks.length, 0)
    }
}

export class Stun extends BaseAlteration {
    id = "Stun"
    shortName = "😵"
    longName = "Stun"

    turnStart() {
        this.target.turnEnded = true
        this.target.log(`${this.target.name} is stunned!`)
    }
}

export class Taunt extends BaseAlteration {
    id = "Stun"
    shortName = "😵"
    longName = "Stun"
    player: Fighter

    constructor(p: Fighter, stacks=null) {
        super(stacks);
        this.player = p
    }

    onApply() {
        let player = this.player
        this.target.skills = this.target.skills.map(s => {
            if (s.targetNumber === 1) {
                return {
                    ...s,
                    getTargets() {
                        console.log("GET TARGET", player)
                        return [player]
                    }
                }
            }
            return s
        })
    }

    onRemove() {
        super.onRemove();
        this.target.skills = this.target.skills.map(s => {
            return {
                ...getSkill(s.id)
            }
        })
    }
}
const NULL_STATS: Stats = {
    atk: 0,
    def: 0,
    spd: 0,
    hp: 0,
    maxHp: 0,
    damageTakenMultiplier: 1,
    damageDealtMultiplier: 1,
}
export class StatAlteration extends BaseAlteration {
    stats: Stats
    constructor(stats) {
        super();
        this.stats = {
            ...NULL_STATS,
            ...stats
        }
    }
    onApply() {
        super.onApply();
        // Addition current stats with alt stats key by key
        for(const key of Object.keys(this.stats)) {
            this.target.stats[key] += this.stats[key]
        }
    }
    onRemove() {
        super.onRemove();
        // Subtraction current stats with alt stats key by key
        for(const key of Object.keys(this.stats)) {
            this.target.stats[key] -= this.stats[key]
        }
    }
}

export class BoardEffect extends BaseAlteration {
    damage: (t)=>void
    heal: (t)=>void
    end: (t)=>void
    constructor({onDamage, onHeal, end}: {onDamage?: (alt: BaseAlteration)=>void, onHeal?:(alt: BaseAlteration)=>void, end?:(alt: BaseAlteration)=>void}, stacks, id) {
        super();
        this.damage = onDamage || (()=>{})
        this.heal = onHeal || (()=>{})
        this.end = end || (()=>{})
        this.stacks = stacks
        this.id = "board-" + id
    }
    onDamage() {
        super.onDamage();
        this.damage(this)
    }
    onHeal() {
        super.onHeal();
        this.heal(this)
    }
    onRemove() {
        super.onRemove();
        this.end(this)
    }
}