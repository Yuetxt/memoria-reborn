import {
    CustomClusterAlteration,
    CustomStatAlteration,
    SimpleAlteration, StatAlteration
} from "../alterations";
import {chance} from "../utils";
import {Element} from "../../types/battle";
import {execute_skill, getSkill} from "../skills";
import {Passive} from "../passives";
import {Bleed, Lifesteal, Shield, Shock} from "./alterations";
import battleConfig from "../../../config/battle.json"
import {adjustRate} from "../../gacha";

export const PASSIVES: Passive[] = [{
    id: "explosion-mastery",
    boards: [{
        validateSkill: (c, e, d) => {
            if (d.id === "explosion") {
                c.aliveAllies.map((a) => {
                    a.alter(new CustomStatAlteration({atk: 10}, 2))
                })
            }
        }
    }]
}, {
    id: "Lucky Pervert",
    boards: [{
        onAlter: (c, e, d) => {
            if (chance(25)) {
                e.log(`${c} avoids ${d.name} !`)
                c.aliveAllies.filter(a => a.data.gender === "female").map(a => {
                    a.alter(new CustomStatAlteration({spd: 15}, 2))
                })
                return false
            } else return true
        }
    }]
},
    {
        id: "masochist-rule",
        boards: [{
            valideDamage: (c, e, d) => {
                const newHp = c.stats.hp - d.dmg
                const tenth = c.stats.max_hp / 10
                const currentTenth = Math.floor(c.stats.hp / tenth)
                const newTenth = Math.floor(newHp / tenth)
                if (currentTenth > newTenth) {
                    c["_resolveStacks"] = (c["_resolveStacks"] || 0)
                    if (c["_resolveStacks"] < 5) {
                        c["_resolveStacks"]++
                        c.stats.def += 0.05 * c.startStats.def
                        e.log(`${c} gains one Resolve stack (DEF+5%)`)
                    }
                }
                return d.dmg
            }
        }]
    },
    {
        id: "crescendo", boards: [{
            validateSkill: (c, e, d) => {
                c["_crescendoStacks"] = (c["_crescendoStacks"] || 0)
                if (c["_crescendoStacks"] < 3) {
                    c["_crescendoStacks"]++
                    c.stats.atk += 0.05 * c.startStats.atk
                    e.log(`${c} gains one Crescendo stack (ATK+5%)`)
                } else if (c["_crescendoStacks"] === 3) {
                    c["_crescendoStacks"] = 0
                    c.stats.atk -= 3 * 0.05 * c.startStats.atk
                    e.log(`${c} loses all Crescendo stacks ! Next skill will cost 0SP and deal +50% DMG`)
                    c["_crescendoActive"] = true
                    c["_crescendoSkillData"] = [...c.skills]
                    // Skills cost 0
                    c.skills.map(s => {
                        s.cost = 0
                    })
                }
                if (c["_crescendoActive"]) {
                    c.stats.dmg_dealt += 50
                    setTimeout(() => {
                        c.stats.dmg_dealt -= 50
                    }, 1000)
                    c.skills = [...c["_crescendoSkillData"]]
                    c["_crescendoActive"] = false
                    c["_crescendoSkillData"] = []
                }
            }
        }]
    }, {
        id: "unyelding-oauth",
        boards: [{
            onBattleStart: (cas, e, _) => {
                cas.allies.map(a => {
                    a.boardEffects.push({
                        onDamage: (c, e, d) => {
                            if (c.stats.hp < 0.3 * c.stats.max_hp) {
                                e.log(`${c} is protected by ${cas} (Unyielding OAuth) !`)
                                c.alter(new SimpleAlteration(2, () => {
                                    cas.allies.map((all) => {
                                        if (all != cas) {
                                            all.targetable = false
                                        }
                                    })
                                }, () => {
                                    cas.allies.map((all) => {
                                        if (all != cas) {
                                            all.targetable = true
                                        }
                                    })
                                }))
                            }
                            return d.dmg
                        }
                    })
                })
            }
        }]
    }, {
        id: "Tracing mastery",
        boards: [{
            onBattleStart: (caster) => {
                // Initialize tracking variables
                caster['_tracingMasteryCount'] = 0;
                caster['_tracingMasteryActive'] = false;
            },
            validateSkill: (caster, engine, skill) => {
                if (caster['_tracingMasteryActive']) {
                    // Reset the counter and flag after using the empowered skill
                    caster['_tracingMasteryCount'] = 0;
                    caster.stats.dmg_taken += 25;
                    skill.cost -= 2
                    caster['_tracingMasteryActive'] = false;
                    caster.log(`${caster}'s Tracing Mastery has been consumed!`);
                    setTimeout(() => {
                        caster.stats.dmg_taken -= 25
                        skill.cost += 2
                    }, 100)
                } else {
                    // Increment skill counter if not already empowered
                    caster['_tracingMasteryCount'] = (caster['_tracingMasteryCount'] || 0) + 1;

                    // Check if we've reached 3 skills
                    if (caster['_tracingMasteryCount'] >= 3) {
                        caster['_tracingMasteryActive'] = true;
                        caster.log(`✨ ${caster}'s Tracing Mastery is ready! Next skill will be empowered!`);
                    }
                }
            },
        }]
    }, {
        id: "kings-duty",
        boards: [{
            id: "kings",
            onBattleStart: (c, e, d) => {
                c.stats.shield = c.stats.def * 0.15
            },
            valideDamage: (c, e, d) => {
                if (c.stats.shield - d.dmg <= 0) {
                    c.boardEffects = c.boardEffects.filter(b => b.id !== "kings")
                    c.aliveAllies.map(a => {
                        a.alter(new CustomStatAlteration({atk: 15}, 2))
                    })
                }
                return d.dmg
            }
        }]
    },
    {
        id: "magical-prodigy",
        boards: [{
            onBattleStart: (c, e, d) => {
                c.stats.crit_chance += 5 * c.allies.filter(a => a.element === Element.ELECTRIC).length
                c.log(`${c} gains ${5 * c.allies.filter(a => a.element === Element.ELECTRIC).length}% Crit Chance from Magical Prodigy !`)
            }
        }]
    },
    {
        id: "culinary-duelist",
        boards: [{
            onBattleStart: (c, e, d) => {
                c['_culinaryDuelistTarget'] = null;
                c['_culinaryDuelistStacks'] = 0;
                c.ennemies.map(enemy => {
                    enemy.boardEffects.push({
                        valideDamage: (t, e, {dmg, source}) => {
                            if (source == c) {
                                if (t == c["_culinaryDuelistTarget"]) {
                                    if (c["_culinaryDuelistStacks"] < 3) {
                                        c['_culinaryDuelistStacks'] += 1;
                                        c.stats.atk += 0.05 * c.startStats.atk
                                    }
                                } else {
                                    c['_culinaryDuelistTarget'] = t
                                    c.stats.atk -= 0.05 * c.startStats.atk * (c["_culinaryDuelistStacks"] - 1)
                                    c['_culinaryDuelistStacks'] = 1
                                }
                            }
                            return dmg
                        }
                    })
                })
            },
        }]
    },
    {
        id: "jungle-resonance", boards: [{
            onTurnStart: (c, e, d) => {
                let stacks = c.aliveEnnemies.map((a) => a.alterations).flat().filter((a) => !a.buff).length
                if(c.isPlayer) {
                    e.gainSp(Math.min(5, stacks), "from Jungle Resonance")
                }
            }
        }]
    },
    {
        id: "resonance",
        boards: [{
            onBattleStart: (c, e, d) => {
                c.ennemies.map(a => {
                    a.boardEffects.push({
                        valideDamage: (t, e, {dmg, source}) => {
                            if (t.stats.dmg_taken > t.startStats.dmg_taken && source !== c) {// Market
                                e.log(`${c} follows up !`)
                                c.attack(t, 60)
                            }
                            return dmg
                        }
                    })
                })
            }
        }]
    },
    {
        id: "shared-body", boards: [{
            id: "shared-body",
            onDamage: (c, e, {dmg}) => {
                if (c.stats.hp < 0.3 * c.stats.max_hp) {
                    c.alter(new CustomClusterAlteration(1, 2, [
                        new CustomStatAlteration({crit_dmg: 30}),
                        new Lifesteal()
                    ]))
                    c.boardEffects = c.boardEffects.filter(b => b.id !== "shared-body")
                }
                return dmg
            }
        }]
    }, {
        id: "cursed-intimidation", boards: [{
            onBattleStart: (c, e, d) => {
                c.ennemies.map((enemy) => {
                    enemy.boardEffects.push({
                        onAct: (t, e, d) => {
                            if (t.alterations.filter(a => a.id == "fear").length > 0 && c.isPlayer) {
                                e.gainSp(2, "from Cursed Intimidation")
                            }
                        }
                    })
                })
            }
        }]
    }, {
        id: "hierarchy-favor", boards: [{
            onBattleStart: (c, e, d) => {
                c["_successor"] = c.allies[Math.floor(Math.random() * c.allies.length)]
                c["_successor"].stats.dmgtm -= 10
                c["_successor"].stats.dmgdm += 25
            }, onDie: (c, e, d) => {
                c["_successor"].stats.dmgtm += 10
                c["_successor"].stats.dmgdm -= 25
            }
        }]
    }, {
        id: "devils-appetite", boards: [{
            onAttack: (c, e, d) => {
                if (d.target.alterations.filter(a => a.id === "bleed").length > 0) {
                    d.target.alter(new Bleed())
                    c.heal(0.05 * c.stats.max_hp, "from Devils Appetite")
                }
                return null
            }
        }]
    }, {
        id: "return-by-death", boards: [{
            id: "return",
            onDie: (c, e, d) => {
                c.boardEffects = c.boardEffects.filter(b => b.id !== "return")
                c.stats.hp = c.stats.max_hp * 0.3
                e.gainSp(5, "from Return by Death")
                c.alterations = []
                c.alter(new CustomStatAlteration({
                    def: 20, heal: 15
                }))
                c.log(`${c} returns to life !`)
            }
        }]
    }, {
        id: "burnproof-resolve", boards: [{
            onBattleStart: (c, e, d) => {
                const subaru = c.allies.find(a => a.id === "subaru")
                if (subaru) {
                    c.stats.crit_dmg += 50
                }
            },
            valideDamage: (c, e, {dmg, source}) => {
                if (typeof source != "string") {
                    const burn = source.alterations.filter(a => a.id === "burn")
                    if (burn.length > 0 && burn[0].stacks.length >= 10) {
                        return dmg * 0.85
                    }
                }
                return dmg
            }
        }]
    }, {
        id: "heart-of-ice", boards: [{
            onBattleStart: (c, e, d) => {
                c.allies.map(a => {
                    a.boardEffects.push({
                        onAlter: (t, e, alt) => {
                            if (alt.id == "freeze") {
                                t.log(`${t} gains a shield from Heart of Ice !`)
                                t.alter(new Shield(0.1 * t.stats.max_hp))
                            }
                            return true
                        }
                    })
                })
            }
        }]
    }, {
        id: "spirit-ward",
        boards: [{
            onBattleStart: (c, e, d) => {
                const lowerDef = c.allies.reduce((a, b) => a.stats.def < b.stats.def ? a : b)
                lowerDef.alter(new CustomStatAlteration({
                    dmg_taken: -20
                }, 3, true))
            }
        }]
    },
    {
        id: "quantum-analyst",
        boards: [{
            onBattleStart: (c) => {
                c['_quantumAnalystTurn'] = 0;
                c['_quantumBuffActive'] = false;
            },
            onTurnStart: (c, e) => {
                c['_quantumAnalystTurn'] = (c['_quantumAnalystTurn'] || 0) + 1;

                // Every 3 turns, grant Quantum buff
                if (c['_quantumAnalystTurn'] >= 3) {
                    c['_quantumAnalystTurn'] = 0;
                    c['_quantumBuffActive'] = true;
                    c.log(`✨ ${c}'s Quantum Analyst: Quantum buff is now active!`);
                }
            },
            onAct: (c, e, skill) => {
                if (c['_quantumBuffActive']) {
                    if (skill.id !== "auto-attack") {
                        // Consume the buff and perform a basic attack
                        const basicAttack = getSkill("auto-attack");
                        c.log(`${c}'s Quantum Analyst: Consuming Quantum for a free Basic Attack!`);
                        execute_skill(basicAttack, c, e, [c.aliveEnnemies[0]]);
                    } else if(c.isPlayer){
                        e.gainSp(1, "from Quantum Analyst")
                    }
                    c['_quantumBuffActive'] = false;
                }
            },
        }]
    },
    {
        id: "el-psy-kongroo",
        boards: [{
            onBattleStart: (c) => {
                c['_elPsyKongrooTurn'] = 0;
            },
            onTurnStart: (c, e) => {
                c['_elPsyKongrooTurn'] = (c['_elPsyKongrooTurn'] || 0) + 1;
                if (c['_elPsyKongrooTurn'] % 3 === 0) {
                    c.log(`${c} uses El Psy Kongroo ! Auto-Attack gives 2 SP !`)
                    c.skills.map(s => {
                        if (s.id === "auto-attack") {
                            s.cost = -2
                        }
                    })
                }
            },
            onTurnEnd: (c, e) => {
                c.skills.map(s => {
                    if (s.id === "auto-attack") {
                        s.cost = 0
                    }
                })
            }
        }]
    },
    {
        id: "temporalHarmony",
        boards: [{
            onBattleStart: (c) => {
                c['_tmpHarmony'] = 0;
            },
            onTurnStart: (c, e) => {
                c['_tmpHarmony'] = (c['_tmpHarmony'] || 0) + 1;
                if (c['_tmpHarmony'] % 3 === 0) {
                    c.aliveAllies.map(a => {
                        // a.alter(new Barrier())
                    })
                }
            },
        }]
    }, {
        id: "bleeding-beauty", boards: [{
            onAttack: (c, e, {dmg, target}) => {
                if (target.alterations.filter(a => a.id === "bleed").length > 0) {
                    c.heal(0.1 * dmg, "from Bleeding Beauty")
                    return dmg * 1.2
                }
                return dmg
            }
        }]
    }, {
        id: "boss-passive",
        boards: [{
            onDamage: (c, e, d) => {
                if (c.stats.hp < 0.5 * c.stats.max_hp && !c["secondPhase"]) {
                    e.log(`${c} enters second phase !`) // 2nd phase
                    for (let i = 0; i < Math.min(battleConfig.secondPhaseFight.skillCooldowns.length, c.skills.length); i++) {
                        c.skills[i].proba = battleConfig.secondPhaseFight.skillProb[i]
                        c.skills[i].cooldown = battleConfig.secondPhaseFight.skillCooldowns[i]

                        if (i < c.skills.length - 2 && c.skills[c.skills.length - 1].disabled === 0) { // Force last skill
                            c.skills[i].disabled++
                        } else {
                            // c.skills[i].disabled--
                            c.skills[i]["countdown"] = 0
                        }
                    }
                    c["secondPhase"] = true
                    c["secondStart"] = c.skills[c.skills.length - 1].disabled === 0
                }
            },
            onTurnEnd: (c, e, d) => {
                if (c["secondStart"]) {
                    c["secondStart"] = false
                    c.skills.slice(0, c.skills.length - 1).map(s => {
                        s.disabled--
                    })
                }
            },
            onAct: (c, e, skill) => {
                // Prepare skills
                c["skillHistory"] = [skill.id, ...(c["skillHistory"] || [])]
                if (skill.id === c.skills[1].id) {
                    const delta = 0.1
                    const probs = adjustRate(c.skills.map(s => s.proba), 1, -delta)
                    c.skills.map((s, i) => {
                        s.proba = probs[i]
                    })
                    setTimeout(()=>{
                        const probs = adjustRate(c.skills.map(s => s.proba), 1, delta)
                        c.skills.map((s, i) => {
                            s.proba = probs[i]
                        })
                    }, 500)
                }
            },
            onTurnStart: (c, e, d) => {
                const history: string[] = (c["skillHistory"] || [])
                if (history.slice(2).every(i => i === c.skills[0].id) && c.skills.some(s => s.disabled === 0 && (s["countdown"] || 0) <= 0 && s.id !== c.skills[0].id)) { // Exclude attack
                    c.skills[0].disabled++
                }
                const lastSKill = c.skills[c.skills.length - 1]
                if (c["secondPhase"] && history.slice(4).every(i => i != lastSKill.id) && (lastSKill["countdown"] || 0) <= 0 && lastSKill.disabled === 0) { // Force last skill
                    c.skills.slice(0, c.skills.length - 1).map(s => {
                        s.disabled++
                    })
                }
            }
        }]
    }, {
        id: "stoneform",
        boards: [{
            id: "stone",
            onDamage: (c, e, d) => {
                if (c.stats.hp < 0.5 * c.stats.max_hp) {
                    c.alter(new CustomStatAlteration({
                        def: 15
                    }, 1))
                    c.boardEffects = c.boardEffects.filter(b => b.id !== "stone")
                }
            }
        }]
    }, {
        id: "briny-fortitude", boards: [{
            onAlter: (c, e, d) => {
                if (c.stats.hp > c.stats.max_hp * 0.7 && !d.buff) {
                    e.log(`${c} resists debuff !`)
                    return false
                }
                return true
            }
        }]
    }, {
        id: "ruler-of-clew-bay", boards: [{
            id: "ruler",
            onDamage: (c, e, d) => {
                if (c.stats.hp < c.stats.max_hp * 0.5) {
                    const debuffs = c.alterations.filter(a => !a.buff)
                    debuffs.map(a => {
                        a.onRemove()
                    })
                    c.alterations = c.alterations.filter(a => a.buff)
                    e.log(`${c} cleanses debuffs !`)
                    c.boardEffects = c.boardEffects.filter(b => b.id !== "ruler")
                    c.aliveEnnemies.map((a) => a.alter(new Shock()))
                }
            }
        }]
    }
]
