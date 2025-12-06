const {
    SlashCommandBuilder,
    MessageFlags, SlashCommandSubcommandBuilder
} = require('discord.js');
const {Fighter} = require("../utils/battle/fighter");
const {getSkill, execute_skill} = require("../utils/battle/skills");
const {BattleEngine} = require("../utils/battle/engine");
const {staticUrl} = require("../config.json")
const {weightedRandom, getNextFloor} = require("../utils/battle/utils");
const {getBoardEffect} = require("../utils/battle/passives");
const mobsData = require("../data/mobs.json")
const {Servant} = require("../database/models/Servant");
const {Op} = require("sequelize");
const {getServantData, getStats, computeRates, getServantsGrowthRate, getFloorMobs} = require("../utils/battle/setup");
const {BATTLE_STATS_DEFAULTS} = require("../utils/types/battle");
const {simpleFight, bossFight} = require("../config/battle.json")
const {normalizeRates} = require("../utils/gacha");
const servantsData = require("../data/servants.json")
const battleConfig = require("../config/battle.json")
const {Stun} = require("../utils/battle/catalog/alterations");
const {Floor} = require("../utils/floor");

function delay(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function futureTs(seconds) {
    return Math.floor(Math.floor(Date.now() / 1000) + seconds);
}

function rndChoice(a) {
    return a[Math.floor(Math.random() * a.length)]
}

function compareFloors(f1, f2) {
    // Regex check if f1 and f2 are in the format number-number
    if (!/^\d+-\d+$/.test(f1) || !/^\d+-\d+$/.test(f2)) {
        return false
    }

    const f1Num = parseInt(f1.replaceAll("-", ""))
    const f2Num = parseInt(f2.replaceAll("-", ""))
    return f1Num <= f2Num
}

module.exports = {
    data: new SlashCommandBuilder().setName("battle").setDescription("Start a battle with an enemy!")
        .addStringOption(o => o.setName("floor").setRequired(false).setDescription("Floor to battle on")),
    async execute(interaction, player) {
        let floor = Floor.fromString(interaction.options.getString("floor") || player.floor)
        // Check if floor is valid (respec number-number) and should be inferior to player floor (which has the same format)
        // if (!compareFloors(floor, player.floor)) {
        //     floor = player.floor
        // }
        const ennemies = []
        const mobs = getFloorMobs(floor)
        for (const mob of mobs) {
            const skills = [getSkill("auto-attack"), ...mob.skills.map(s => getSkill(s))]
            const skillConfig = mob.boss ? simpleFight : bossFight
            for (let i = 0; i < skillConfig.skillCooldowns.length; i++) {
                if (!skills[i].cooldown) {
                    skills[i].cooldown = skillConfig.skillCooldowns[i]
                }
                if (!skills[i].proba) {
                    skills[i].proba = skillConfig.skillProb[i]
                }
            }
            ennemies.push(new Fighter({
                data: {...mob},
                stats: mob.stats,
                skills: skills,
                boards: [...mob.passives, ...(mob.boss ? ["boss-passive"] : [])].map(b => getBoardEffect(b)).flat(),
                ally: false,
                boss: mob.boss || false
            }))
        }
        player.rechargeStamina()
        let staminaCost = ennemies.some(e => e.boss) ? battleConfig.baseStaminaCost : battleConfig.bossStaminaCost
        if (player.stamina < staminaCost) {
            return await interaction.reply("You don't have enough stamina!", {
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            })
        }
        player.stamina -= staminaCost
        await player.save()

        const servants = await Servant.findAll({where: {playerId: player.discordId, teamSlot: {[Op.gte]: 0}}})
        if (servants.length === 0) {
            return interaction.reply("You have no servants selected! Summon with /summon and manage your team with /team")
        }
        servants.map(s=>{
            s.lvl = 100
        })
        const players = []
        for (const servant of servants.sort((a, b) => a.teamSlot - b.teamSlot)) {
            const baseServant = getServantData(servant.servant_id)
            const lvlStats = computeRates(baseServant.stats, getServantsGrowthRate(baseServant.role, servant.rarity), servant.lvl)
            players.push(new Fighter({
                data: {
                    ...baseServant
                },
                stats: lvlStats,
                skills: [getSkill("auto-attack"), ...baseServant.skills.map(s => getSkill(s))],
                boards: baseServant.passives.map(b => getBoardEffect(b)).flat(),
                ally: true,
            }))
        }

        const engine = new BattleEngine([...players, ...ennemies])

        let containers = engine.createContainers()

        await interaction.reply({
            components: containers,
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            withResponse: true,
        })
        let msg = await interaction.followUp({
            components: [engine.turnContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            withResponse: true,
        })
        const updateTurn = async () => {
            await interaction.editReply({
                message: msg,
                components: [engine.turnContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            })
        }
        const updateState = async () => {
            const containers = engine.createContainers()
            await interaction.editReply({
                components: containers,
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            })
        }
        // Loop
        engine.getNextTurn()
        while (!engine.isOver) {
            // Enemy turn
            if (!engine.currentAction.isAlive) {
                engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration))
                await updateTurn()
                await delay(battleConfig.nonActionTurnDuration)
                engine.getNextTurn()
                continue
            }

            if (!engine.currentAction.isPlayer) {
                const skills = engine.currentAction.skills.filter((s) => s.disabled === 0 && (s["countdown"] || 0) <= 0)
                await updateState()

                if (skills.length === 0) {
                    engine.log(`${engine.currentAction} is unable to act !`)
                    engine.endTurn()
                    engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration), {ended: true})

                    await updateTurn()
                    await delay(battleConfig.nonActionTurnDuration)
                    engine.getNextTurn()
                    continue
                }
                const probs = normalizeRates(skills.map(s => s.proba))
                const skill = weightedRandom(skills, probs)
                let targets = []
                if (skill.populateTargets) {
                    targets = engine.currentAction.aliveEnnemies[0]
                }
                engine.log(`${engine.currentAction} used ${skill.name} !`)
                execute_skill(skill, engine.currentAction, engine, [targets])
                engine.currentAction.skills.map((s) => {
                    s["countdown"]--
                })
                skill["countdown"] = skill.cooldown || 0
                engine.endTurn()

                engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration))
                await updateTurn()
                await updateState()
                await delay(battleConfig.nonActionTurnDuration)
                engine.getNextTurn()
            } else { // Player turn
                const nextTs = futureTs(battleConfig.actionTurnDuration)
                const skills = engine.currentAction.skills.filter((s) => s.disabled === 0 && s.cost <= engine.allySp)
                if (skills.length === 0) {
                    engine.log(`${engine.currentAction} is unable to act !`)
                    engine.endTurn()
                    engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration), {ended: true})
                    await updateTurn()
                    await delay(battleConfig.nonActionTurnDuration)
                    engine.getNextTurn()
                    continue
                }

                engine.updateTurnContainer(null, nextTs) // Skill selection
                await updateTurn()

                const collectorFilter = (i) => i.user.id === interaction.user.id && i.customId.startsWith(engine.currentAction.id);
                let skill;
                try {
                    const action = await interaction.channel.awaitMessageComponent({
                        filter: collectorFilter,
                        time: 60_000
                    });
                    action.deferUpdate()
                    skill = engine.currentAction.verifyAction(action.customId)
                } catch (e) {
                }
                if (!skill) {
                    engine.log(`${engine.currentAction} did not act !`)
                    engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration))
                    await updateTurn()
                    await delay(battleConfig.nonActionTurnDuration)
                    engine.getNextTurn()
                    continue
                }

                let targets = []
                if (skill.populateTargets) {
                    const availableTargets = skill.ally ? engine.currentAction.aliveAllies : engine.currentAction.aliveEnnemies
                    if (availableTargets.length === 1) {
                        targets = availableTargets
                    } else {
                        engine.updateTurnContainer(skill, futureTs(battleConfig.actionTurnDuration))
                        await updateTurn()
                        const targetCollectorFilter = (i) => i.user.id === interaction.user.id && i.customId.startsWith(`${engine.currentAction.id}--${skill.id}`);
                        try {
                            const targetSelection = await interaction.channel.awaitMessageComponent({
                                filter: targetCollectorFilter,
                                time: battleConfig.actionTurnDuration * 1000
                            })
                            if (targetSelection.customId.includes("cancel")) {
                                continue
                            }
                            targets.push(...targetSelection.values.map(id => engine.getFighter(id)))
                        } catch (e) {
                            targets.push(engine.currentAction.aliveEnnemies[0])
                        }
                    }
                }
                engine.log(`${engine.currentAction} used ${skill.name} !`)
                execute_skill(skill, engine.currentAction, engine, targets)
                engine.allySp -= skill.cost
                engine.endTurn()

                if (skill.needFeedback || true) {
                    engine.updateTurnContainer(null, futureTs(battleConfig.nonActionTurnDuration), {ended: true})
                    await updateTurn()
                    await updateState()
                    await delay(battleConfig.nonActionTurnDuration)
                }
                engine.getNextTurn()
            }
        }

        await interaction.deleteReply(msg)

        if (engine.win) {
            player.floor = floor.next()
            player.save()
        }

        await interaction.editReply({
            components: [engine.getEndContainer()],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        })
    }
}