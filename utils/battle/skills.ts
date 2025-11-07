import {Skill} from "./types";
import {BoardEffect, createStacks, Poison, StatAlteration, Stun, Taunt} from "./alterations";
import {Fighter} from "./fighter";
import {chance} from "./utils";
import {green, red} from "../ansiFormatter";

function rndChoice(list) {
    return list[Math.floor(Math.random() * list.length)]
}

const BASE_SKILL: Skill = {
    id: "",
    name: "",
    description: "",
    cost: 0,
    targetNumber: 0,
    execute: (player, targets, engine) => "",
    filterTarget: (f: Fighter) => true,
    ally: false,
}

const SKILL: Skill[] = [
    {
        id: "auto-attack",
        name: "Auto Attack",
        description: "",
        cost: -1,
        targetNumber: 1,
        getTargets: (p, e) => {
            return []
        },
        execute: (player, targets, engine) => {
            let dmg = 0

            dmg = targets[0].damage(player.stats.atk)

            return red(`${targets[0]} takes ${dmg} damage !`)
        }
    },
    {
        id: "purification-fontain",
        name: "Purification Fontain",
        cost: 4,
        targetNumber: 0,
        getTargets: (p, e) => {
            return e.aliveSame(p)
        },
        description: "Lorem ipsum...",
        execute: (player, targets, engine) => {
            targets.map((f) => {
                f.alterations.filter(f => !f.buff).forEach(f => f.onRemove())
                f.alterations = f.alterations.filter((a) => a.buff)
                f.heal(f.stats.maxHp * 0.15)
            })
            return `All allies have been purified and healed!`
        }
    },  {
        id: "poison",
        name: "Poison",
        cost: 0,
        targetNumber: 0,
        getTargets: (p, e) => {
            return [e.aliveDiff(p)[0]]
        },
        description: "Lorem ipsum...",
        execute: (player, targets, engine) => {
            targets[0].alterate(new Poison(createStacks(1, 3)))
            return `${targets[0]} is poisoned`
        }
    },
    {
        id: "explosion",
        name: "Explosion",
        cost: 5,
        targetNumber: 0,
        description: "Lorem ipsum...",
        needFeedback: true,
        getTargets: (p, e) => {
            return e.aliveDiff(p)
        },
        execute: (player, targets, engine) => {
            targets.map((f) => {
                f.damage(3 * player.stats.atk)
            })
            player.alterate(new Stun())
            return `All enemies take ${3 * player.stats.atk} damage!`
        }
    },
    {
        id: "luck-of-the-draw",
        name: "Luck of the Draw",
        cost: 5,
        targetNumber: 1,
        description: "Lorem ipsum...",
        needFeedback: true,
        getTargets: (p, e) => {
            return [rndChoice(e.aliveDiff(p))]
        },
        execute: (player, targets, engine) => {
            if (chance(50)) {
                if (chance(50)) {
                    return `${targets[0].name} takes ${targets[0].damage(player.stats.atk * 2 * 1.2)} damage!`
                } else {
                    return `${targets[0].name} takes ${targets[0].damage(player.stats.atk * 1.2)} damage!`
                }
            } else {
                return `${player.name} takes ${player.damage(0.1 * player.stats.atk)} damage!`
            }
        }
    },
    {
        id: "ultimate-sacrifice",
        name: "Ultimate sacrifice",
        cost: 5,
        targetNumber: 0,
        description: "Lorem ipsum...",
        needFeedback: true,
        getTargets: (p, e) => {
            return e.aliveDiff(p)
        },
        execute: (player, targets, engine) => {
            targets.forEach((f) => {
                f.alterate(new Taunt(player, createStacks(1, 2)))
            })
            player.alterate(new StatAlteration({
                damageTakenMultiplier: 1.5
            }))
            player.alterate(new BoardEffect({
                onDamage: (alt) => {
                    engine.aliveSame(alt.target).filter(f => f != alt.target).forEach((f) => {
                        f.heal(f.stats.maxHp * 0.025)
                    })
                    engine.log(green(`${alt.target.name} healed allies!`))
                }, end: (alt) => {
                    if (chance(50)) {
                        alt.target.alterate(new Stun(createStacks(1, 1)))
                    }
                }
            }, createStacks(1, 2), "ultimate-sacrifice"))
            return `${player} taunts ennemies!`
        }
    },

]

function skillLog(player: Fighter, skill: Skill, results: string) {
    return `${player.name} used **${skill.name} -> ${results}`
}

function getSkill(id: string) {
    const skill = SKILL.find((s) => s.id === id)
    if (skill) {
        return {...BASE_SKILL, ...skill}
    }
    return null
}

export {getSkill}