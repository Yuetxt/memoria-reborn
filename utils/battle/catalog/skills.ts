import {chance, shuffle, targetsStrings} from "../utils";
import {
    CustomBoardEffectAlteration,
    CustomClusterAlteration,
    CustomStatAlteration,
    SimpleAlteration
} from "../alterations";
import {Element} from "../../types/battle";
import {Effect} from "../effect";
import {SkillShort} from "../skills";
import {Fear, Paralysis, Shield, Taunt} from "./alterations";
import {rndInt} from "../../utils";
import {green, yellow} from "../../ansiFormatter";

export const SKILL: SkillShort[] = [
    {
        name: "Auto-attack",
        effects: "DMG 100%",
        populateTargets: true,
        cost: -1
    },
    {
        name: "Luck of the Draw",
        cost: 5,
        description: "Lorem ipsum...",
        needFeedback: true,
        effects: [{
            targets: targetsStrings["rnd_e"],
            effects: [(player, target, engine) => {
                if (chance(50)) {
                    if (chance(50)) {
                        engine.log(`${player} was very lucky !`)
                        player.attack(target, 240)
                    } else {
                        player.attack(target, 120)
                    }
                } else {
                    engine.log(`${player} was unlucky !`)
                    player.attack(player, 10)
                }
            }]
        }]
    },
    {
        name: "Ultimate Sacrifice",
        cost: 6,
        description: "Lorem ipsum...",
        needFeedback: true,
        effects: [{
            targets: targetsStrings["all_e"],
            effects: [(player, target, engine) => {
                target.alter(new Taunt(player, 1, 2))
            }]
        }, {
            targets: targetsStrings["self"],
            effects: [(player, target, engine) => {
                player.alter(new CustomClusterAlteration(1, 2, [
                    new CustomStatAlteration({dmg_taken: 50}),
                    new CustomBoardEffectAlteration([{
                        valideDamage: (c, e, d) => {
                            c.aliveAllies.map((a) => a.heal(a.stats.max_hp * 0.025, `thanks to ${c} Ultimate Sacrifice`))
                            return d.dmg
                        }
                    }])
                ]))
            }, "alt stun 1-1 [50]"]
        },
        ]
    },
    {
        name: "Predator's platter",
        cost: 3,
        populateTargets: true,
        effects: ["DMG 100%", (p, t, e) => {
            const alts = [new Fear(1, 2), new CustomStatAlteration({spd: -20}, 2), new CustomStatAlteration({acc: -30}, 2, true), new Paralysis(25, 1, 2)]
            t.alter(alts[Math.floor(Math.random() * alts.length)])
        }]
    }, {
        name: "Divergent Fist",
        cost: 5,
        populateTargets: true,
        effects: ["DMG 130% ELECTRIC", (p, t, e) => {
            t.alter(new CustomBoardEffectAlteration([{
                onTurnStart: (c, e, d) => {
                    p.attack(c, 50, {element: Element.ELECTRIC})
                },
                onDie: (c, e, d) => {
                    if (c.isPlayer)
                        e.gainSp(2, "from Divergent Fist")
                }
            }]))

        }]
    }, {
        name: "Ten Shadow Assault",
        cost: 5,
        populateTargets: true,
        effects: [(p, t, e) => {
            let hit = true
            // for (let i = 0; i < 2; i++) {
            //     if (t.damage(p.stats.atk * 0.25, {}).damage <= 0) {
            //         hit = false
            //     }
            // }
            // if (t.damage(p.stats.atk, {}).damage <= 0) {
            //     hit = false
            // }
            // if (hit) {
            //     t.alter(new Fear())
            // }
        }]
    },
    {
        name: "Perfect World",
        cost: 8,
        effects: ["DMG 100% {all_e};stat acc-30 1-2", (p, t, e) => {
            p.alter(new CustomBoardEffectAlteration([{
                onTurnEnd: (c, e, d) => {
                    if(c.isPlayer) {
                        e.gainSp(2, "from Perfect World")
                    }
                }
            }], 1, 2))
            // t.alter(new Taunt(p.aliveAllies[0], 1, 2))
        }]
    }, {
        name: "Bloodlust Cleaver",
        cost: 8,
        populateTargets: true,
        effects: [(p, t, e) => {
            if (t.stats.hp <= t.stats.max_hp * 0.5) {
                p.attack(t, 270)
                p.heal(p.stats.max_hp * 0.1, "from Bloodlust Cleaver")
            } else {
                p.attack(t, 230)
            }
        }]
    }, {
        name: "I won't let this happen",
        cost: 8,
        effects: [{
            targets: (p, e) => [p.aliveAllies.sort((a, b) => a.stats.hp - b.stats.hp)[0]],
            effects: [(p, t, e) => {
                t.alter(new CustomClusterAlteration(1, 2, [new Shield(1.5 * t.stats.def), new CustomBoardEffectAlteration([{
                    onTurnStart: (c, e, d) => {
                        if (c.stats.shield == 0 && c.isPlayer) {
                            e.gainSp(2, `from ${c}`)
                        }
                    }
                }])]))
            }]
        }]
    },


    // Mob Skills
    {
        name: "Pack tactics",
        cost: 3, effects: [{
            targets: targetsStrings["self"],
            effects: [(p, t, e) => {
                Effect.from(`stat ATK+${p.aliveAllies.length * 5}%`).execute(p, e, [t])
            }]
        }]
    },
    {
        name: "Tongue Snatch",
        cost: 3,
        effects: [{
            targets: (p, e) => [p.aliveEnnemies.sort((a, b) => b.stats.def - a.stats.def)[0]],
            effects: ["DMG 120%"]
        }]
    }, {
        name: "Burrow Hide",
        effects: [{
            targets: targetsStrings["self"],
            effects: [(c, t, e) => {
                t.alter(new SimpleAlteration(1, () => {
                    t.targetable = false
                }, () => {
                    t.targetable = true
                }))
            }, "heal 10%"]
        }]
    }, {
        name: "Cave Collapse",
        effects: [{
            targets: (p, e) => {
                const available = shuffle(p.aliveEnnemies)
                const n = rndInt(1, p.aliveEnnemies.length)
                return Array.from({length: n}, (_, i) => available[i])
            },
            effects: ["dmg 100%;alt stun 1-1 [25]"]
        }]
    },
    {
        name: "Tempest Ward",
        effects: [{
            targets: targetsStrings["all_a"],
            effects: [(c, t, e) => {
                t.alter(new CustomClusterAlteration(1, 2, [
                    new CustomStatAlteration({dmg_taken: -20}),
                    new CustomBoardEffectAlteration([{
                        valideDamage: (ally, e, {dmg, element}) => {
                            if (element === Element.ELECTRIC) {
                                c.heal(0.05 * c.stats.max_hp, "from Tempest Ward")
                                return 0
                            }
                            return dmg
                        }
                    }])
                ]))
            }]
        }]
    },
    {
        name: "Granite Crush",
        effects: [{
            targets: targetsStrings["fst_e"],
            effects: ["dmg 140% earth", (c, t, e) => {
                const buffs = t.alterations.filter(a => a.buff)
                if (buffs.length > 0) {
                    const n = rndInt(0, buffs.length)
                    const alt = buffs[n]
                    alt.onRemove()
                    t.alterations.splice(t.alterations.indexOf(alt), 1)
                }
            }]
        }]
    },
    {
        name: "Thunder Rampage", effects: [{
            targets: targetsStrings["fst_e"],
            effects: [(c, t, e) => {
                c.attack(t, 120 + 0.4 * c.stats.spd, {element: Element.ELECTRIC})
                if (c.stats.spd > t.stats.spd) {
                    t.alter(new Paralysis(25, 1, 2))
                }
            }]
        }]
    },
    {
        name: "Arcstorm overdrive", effects: [{
            targets: targetsStrings["all_e"],
            effects: [(c, t, e) => {
                c.attack(t, 95 + 0.2 * c.stats.spd, {element: Element.ELECTRIC})
            }]
        }, "stat spd+20% 1-3 {self}"]
    }, {
        name: "Electromagnetic Field",
        effects: [
            {
                targets: (c, e) => {
                    const ae = c.aliveEnnemies
                    return [ae[Math.floor(Math.random() * ae.length)], ae[Math.floor(Math.random() * ae.length)]]
                },
                effects: [
                    (c, t, d) => {
                        t.log(`${t} is surrounded by electromagnetic field !`)
                        t.alter(new CustomBoardEffectAlteration([{
                            validateSkill: (cas, e, d) => {
                                cas.damage(c.stats.spd * 0.5, {element: Element.ELECTRIC})
                                c.heal(0.05 * c.stats.max_hp, "from Electromagnetic Field") // Passive
                            }
                        }], 1, 2))
                    }
                ]
            }
        ]
    }, {
        name: "Spirit of the plains",
        effects: ["stat spd+20% 1-2 {self}", (c, t, e) => {
            c.alter(new CustomBoardEffectAlteration([
                {
                    onAlter: (c, e, d) => {
                        // Check if d is statAlter
                        if (d instanceof CustomStatAlteration && (d.stats["spd"] || 0) < 0) {
                            e.log(`${c} resists slow !`)
                            return false
                        }
                        return true
                    }
                }
            ]))
        }]
    }
]
