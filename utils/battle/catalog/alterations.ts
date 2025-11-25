import {BoardEffect} from "../passives";
import {Element} from "../../types/battle";
import {chance} from "../utils";
import {
    BaseAlteration,
    BoardEffectAlteration,
    ClusterAlteration, CombineBehavior,
    CustomBoardEffectAlteration,
    CustomStatAlteration, SimpleAlteration
} from "../alterations";
import {Fighter} from "../fighter";

export class Poison extends BoardEffectAlteration {
    id = "poison"
    emoji = "☠️"
    name = "Poison"
    buff=false
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            const dmg = c.stats.max_hp * 0.02 * this.stacks.length / (c.stats.def * 0.5)
            c.damage(dmg, {source: "from poison"})
            // c.damage(c.stats.max_hp * 0.02 * this.stacks.length, {source: "from poison", defMultiplier: 0.5})
            return d
        }
    }]
}

export class Bleed extends BoardEffectAlteration {
    id = "bleed"
    emoji = "🩸"
    name = "Bleed"

    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            const dmg = c.stats.max_hp * 0.02 * this.stacks.length
            c.damage(dmg, {source: "from bleeding"})
            return d
        },
        onHeal: (c, e, d) => {
            const reducer = Math.max(3, Math.floor(this.stacks.length / 10))
            return d * (1 - reducer / 10)
        }
    }]
}

export class Burn extends BoardEffectAlteration {
    id = "burn"
    emoji = "🔥"
    name = "Burn"
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            const dmg = c.stats.max_hp * 0.02 * this.stacks.length / (c.stats.def * 0.5)
            c.damage(dmg, {source: "from burning"})
            return d
        },
        valideDamage: (c, e, d) => d.element === Element.FIRE ? d.dmg * 1.15 : d.dmg
    }]
}

export class Shock extends BoardEffectAlteration {
    id = "shock"
    emoji = "💥"
    name = "Shock"
    boards: BoardEffect[] = [{
        onTurnEnd: (c, e, d) => {
            this.caster?.attack(c, 25, {
                element: Element.ELECTRIC
            })
            return d
        },
        valideDamage: (c, e, d) => d.element === Element.ELECTRIC ? d.dmg * 1.15 : d.dmg
    }]
}

export class Stun extends BoardEffectAlteration {
    id = "stun"
    emoji = "😵"
    name="Stun"
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            // console.log("BEFORE", c.skills)
            c.skills.map(s => {
                s.disabled++
            })
            // c.log(`${c} is stunned !`)
            // console.log(c.skills)
            return d
        },
        onTurnEnd: (c, e, d) => {
            c.skills.map(s => {
                s.disabled--
            })
            return d
        }
    }]
}

export class Regen extends BoardEffectAlteration {
    id = "regen"
    name = "Regeneration"
    emoji = "❤️‍🩹"
    buff=true
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            c.heal(c.stats.max_hp * 0.04 * this.stacks.length, "from Regeneration")
            return d
        },
    }]
}

export class Lifesteal extends BoardEffectAlteration {
    id = "lifesteal"
    buff=true

    boards: BoardEffect[] = [{
        onAttack: (c, e, d) => {
            c.heal(d.dmg * 0.2, "from Lifesteal")
            return null
        },
    }]
}

export class Paralysis extends BoardEffectAlteration {
    id = "paralysis"
    emoji = "⚡"
    name = "Paralysis"
    c = 25
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            if (chance(this.c)) {
                c.skills.map(s => {
                    s.disabled++
                })
                c.log(`${c} is paralysed !`)
            }
            return d
        },
        onTurnEnd: (c, e, d) => {
            c.skills.map(s => {
                s.disabled++
            })
            return d
        }
    }]

    constructor(c: number = 25, s = 1, d = 1) {
        super(s, d);
        this.c = c
    }

}


export class Shield extends BaseAlteration {
    emoji = ""
    amount: number
    buff=true
    combineBehavior = CombineBehavior.REPLACE
    applyLine = () => `${this.target} has a shield of ${this.amount} HP !`

    constructor(amount: number, duration = 1, stack = 1) {
        super(duration, stack);
        this.amount = amount
    }

    combine(alt: Shield) {
        super.combine(alt);
        this.amount = alt.amount
        this.onApply(this.target)
    }

    onApply(f) {
        super.onApply(f);
        this.target.stats.shield = this.amount
    }

    onRemove() {
        super.onRemove();
        if (this.target) {
            this.target.stats.shield = 0
        }
    }
}

export class Freeze extends ClusterAlteration {
    id = "freeze"
    name = "Freeze"
    creator = () => {
        return [new CustomStatAlteration({spd: -50, def: -25}), new CustomBoardEffectAlteration([{
            valideDamage: (c, e, d) => {
                if (d.element === Element.FIRE) {
                    this.stacks = []
                    this.onRemove()
                }
                return d.dmg
            }
        }])]
    }
}

export class Fear extends ClusterAlteration {
    id = "fear"
    creator = () => {
        return [new CustomStatAlteration({spd: -15, atk: -15}), new Paralysis(15)]
    }
}

class TauntHelper extends BaseAlteration { // Alteration on the one that taunt
    id = "tauntHelper"
    name = ""
    applyLine = () => ""
    emoji = "➡️"
}

export class Taunt extends BoardEffectAlteration {
    id = "taunt"
    name = "Taunt"
    emoji="💢"
    applyLine = () => `${this.taunter} taunt's ${this.target}`
    taunter: Fighter
    boards: BoardEffect[] = [{
        onTurnStart: (c, e, d) => {
            this.taunter.aliveAllies.map((t) => {
                t.targetable = this.taunter === t
            })
            return d
        },
        onTurnEnd: (c, e, d) => {
            this.taunter.aliveAllies.map((t) => {
                t.targetable = true
            })
            return d
        }
    }]

    constructor(taunter: Fighter, s = 1, d = 1) {
        super(s, d);
        this.taunter = taunter
    }

    onApply(f: Fighter) {
        super.onApply(f);
        this.taunter.alter(new TauntHelper(1, Infinity))
    }

    onRemove() {
        super.onRemove();
        this.taunter.alterations = this.taunter.alterations.filter(a => a.id !== "tauntHelper")
    }
}

