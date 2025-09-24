// Modern SP-based battle command for Memoria Lost
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Player, Servant, PlayerServant, Battle } = require('../database/Database');
const ModernBattleEngine = require('../utils/ModernBattleEngine');
const config = require('../config.json');

module.exports = {
    name: 'battle',
    description: 'Battle in the Babel Tower with the new SP system',
    aliases: ['fight', 'tower'],
    cooldown: 10,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [{
                model: Servant,
                as: 'servants',
                through: {
                    where: { isInTeam: true },
                    attributes: ['level', 'bondLevel', 'slot']
                }
            }]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        // Check team requirements
        const teamSize = player.servants.length;
        if (teamSize < config.battle.teamSizeMin) {
            return message.reply(`You need at least ${config.battle.teamSizeMin} servants in your team! Use \`!team\` to set up your formation.`);
        }
        
        // Regenerate stamina
        await player.regenerateStamina();
        
        // Check stamina cost
        const floor = player.currentFloor.split('-');
        const floorNumber = parseInt(floor[1]);
        const isBoss = floorNumber === 10;
        const staminaCost = isBoss ? 20 : (floorNumber >= 7 ? 15 : 10);
        
        if (player.stamina < staminaCost) {
            return message.reply(`Not enough stamina! You need ${staminaCost} stamina for this battle. Current: ${player.stamina}/${player.maxStamina}`);
        }
        
        // Prepare player team with SP-based skills
        const playerTeam = [];
        for (const servant of player.servants.sort((a, b) => a.PlayerServant.slot - b.PlayerServant.slot)) {
            const ps = servant.PlayerServant;
            
            // Calculate stats
            const growthRates = servant.getGrowthRates();
            const bondBonus = 1 + (ps.bondLevel - 1) * 0.01;
            
            const stats = {
                atk: Math.floor(servant.baseAtk * (1 + growthRates.atk * (ps.level - 1)) * bondBonus),
                def: Math.floor(servant.baseDef * (1 + growthRates.def * (ps.level - 1)) * bondBonus),
                hp: Math.floor(servant.baseHp * (1 + growthRates.hp * (ps.level - 1)) * bondBonus) * 10,
                spd: Math.floor(servant.baseSpd * (1 + growthRates.spd * (ps.level - 1)) * bondBonus),
                critChance: 7,
                critDamage: 200
            };
            
            // Generate SP-based skills
            const skills = generateSPSkills(servant);
            
            playerTeam.push({
                id: servant.id,
                name: servant.name,
                element: servant.element,
                role: servant.role,
                stats: stats,
                currentHp: stats.hp,
                skills: skills,
                slot: ps.slot
            });
        }
        
        // Generate enemies
        const enemyTeam = generateEnemies(player.currentFloor);
        
        // Create battle instance with config
        const battleConfig = {
            baseSP: config.battle.baseSP || 5,
            maxSP: config.battle.maxSP || 15,
            autoAttackSPGain: config.battle.autoAttackSPGain || 1,
            spRegenPerTurn: config.battle.spRegenPerTurn || 0
        };
        
        const battle = new ModernBattleEngine(playerTeam, enemyTeam, battleConfig);
        
        // Deduct stamina
        player.stamina -= staminaCost;
        await player.save();
        
        // Start battle
        await startBattle(message, battle, player, isBoss, floor, floorNumber, playerTeam);
    }
};

async function startBattle(message, battle, player, isBoss, floor, floorNumber, originalTeam) {
    // Create initial battle display
    const battleEmbed = createModernBattleEmbed(battle);
    const introEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⚔️ Battle Start!')
        .setDescription(`Floor ${floor[0]}-${floorNumber} - ${isBoss ? 'BOSS BATTLE' : 'Enemy Encounter'}\n\n🎯 **Battle Mechanics:**\n• Auto-Attack: +${battle.config.autoAttackSPGain} SP, deals damage\n• Skills: Consume SP, powerful effects\n• Strategy: Build SP → Unleash Skills!`)
        .addFields({
            name: '🎮 Controls',
            value: '• Each character chooses: **Auto-Attack** OR **Skill**\n• Enemies target **Slot 1** → **Slot 2** → **Slot 3** → **Slot 4**',
            inline: false
        });
    
    const startButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_battle_turn')
                .setLabel('Begin Battle')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️')
        );
    
    const battleMessage = await message.reply({ 
        embeds: [battleEmbed, introEmbed], 
        components: [startButton] 
    });
    
    const startCollector = battleMessage.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: config.battle.turnTimeout,
        max: 1
    });
    
    startCollector.on('collect', async (interaction) => {
        await planTurnActions(interaction, battle, player, isBoss, floor, floorNumber, originalTeam);
    });
    
    startCollector.on('end', async (collected) => {
        if (collected.size === 0) {
            // Auto-start with default actions
            await planTurnActions(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
        }
    });
}

async function planTurnActions(interactionOrMessage, battle, player, isBoss, floor, floorNumber, originalTeam) {
    // Start immediate turn-based execution
    let battleMessage;
    if (interactionOrMessage.update) {
        await interactionOrMessage.update({ embeds: [createModernBattleEmbed(battle)], components: [] });
        battleMessage = interactionOrMessage.message;
    } else {
        await interactionOrMessage.edit({ embeds: [createModernBattleEmbed(battle)], components: [] });
        battleMessage = interactionOrMessage;
    }
    
    await executeFluidTurn(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
}

// New fluid turn execution system
async function executeFluidTurn(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam) {
    // Process turn start effects
    battle.processStatusEffects('turnStart');
    await battle.triggerPassiveEffects('onTurnStart');
    
    // Create turn order based on speed
    const turnOrder = [];
    
    // Add alive player characters
    battle.playerTeam.forEach((char, index) => {
        if (char.currentHp > 0 && battle.canCharacterAct(char)) {
            turnOrder.push({
                type: 'player',
                character: char,
                index: index,
                speed: battle.getEffectiveStats(char).spd
            });
        }
    });
    
    // Add alive enemies
    battle.enemyTeam.forEach((enemy, index) => {
        if (enemy.currentHp > 0 && battle.canCharacterAct(enemy)) {
            turnOrder.push({
                type: 'enemy',
                character: enemy,
                index: index,
                speed: battle.getEffectiveStats(enemy).spd
            });
        }
    });
    
    // Sort by speed (highest first)
    turnOrder.sort((a, b) => b.speed - a.speed);
    
    // Execute each action in order
    for (const actor of turnOrder) {
        if (actor.character.currentHp <= 0) continue;
        if (!battle.canCharacterAct(actor.character)) continue;
        
        if (actor.type === 'player') {
            // Player character turn - show action selection
            await executePlayerTurn(battleMessage, battle, actor, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            // Enemy turn - execute AI action immediately
            await executeEnemyTurn(battleMessage, battle, actor);
        }
        
        // Check for battle end after each action
        if (battle.checkBattleEnd()) {
            await handleBattleEnd(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
            return;
        }
        
        // Small delay for readability
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Apply end of turn effects
    await battle.applyEndOfTurnEffects();
    battle.turn++;
    
    // Continue to next turn if battle not over
    if (!battle.isOver) {
        const continueButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('continue_turn')
                    .setLabel(`Continue Turn ${battle.turn}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        
        await battleMessage.edit({ 
            embeds: [createModernBattleEmbed(battle)], 
            components: [continueButton] 
        });
        
        const continueCollector = battleMessage.createMessageComponentCollector({
            filter: i => i.user.id === player.discordId,
            time: config.battle.autoProgressAfterSeconds * 1000,
            max: 1
        });
        
        continueCollector.on('collect', async (interaction) => {
            await executeFluidTurn(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
        });
        
        continueCollector.on('end', async (collected) => {
            if (collected.size === 0) {
                await executeFluidTurn(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
            }
        });
    }
}

async function executePlayerTurn(battleMessage, battle, actor, player, isBoss, floor, floorNumber, originalTeam) {
    const character = actor.character;
    
    // Show action selection for this character
    const actionEmbed = createActionSelectionEmbed(battle, actor.index);
    const actionButtons = createActionButtons(battle, actor.index);
    
    await battleMessage.edit({ embeds: [actionEmbed], components: actionButtons });
    
    return new Promise((resolve) => {
        const collector = battleMessage.createMessageComponentCollector({
            filter: i => i.user.id === player.discordId,
            time: config.battle.turnTimeout,
            max: 1
        });
        
        collector.on('collect', async (interaction) => {
            const action = interaction.customId;
            
            if (action === 'auto_attack') {
                // Execute auto-attack immediately
                const target = battle.enemyTeam.find(e => e.currentHp > 0);
                const targetIndex = battle.enemyTeam.indexOf(target);
                
                const playerAction = {
                    action: 'auto-attack',
                    target: { type: 'enemy', index: targetIndex }
                };
                
                // Execute immediately
                await battle.executeAction({
                    type: 'player',
                    character: character,
                    action: playerAction.action,
                    target: playerAction.target,
                    speed: character.stats.spd
                });
                
                // Update battle display with action info
                await interaction.update({ 
                    embeds: [createModernBattleEmbed(battle)], 
                    components: [] 
                });
                
                resolve();
                
            } else if (action === 'use_skill') {
                // Show skill selection with immediate execution
                await selectSkillFluid(interaction, battle, actor, battleMessage, resolve);
            }
        });
        
        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Auto-select auto-attack if no response
                const target = battle.enemyTeam.find(e => e.currentHp > 0);
                const targetIndex = battle.enemyTeam.indexOf(target);
                
                const playerAction = {
                    action: 'auto-attack',
                    target: { type: 'enemy', index: targetIndex }
                };
                
                await battle.executeAction({
                    type: 'player',
                    character: character,
                    action: playerAction.action,
                    target: playerAction.target,
                    speed: character.stats.spd
                });
                
                await battleMessage.edit({ 
                    embeds: [createModernBattleEmbed(battle)], 
                    components: [] 
                });
                
                resolve();
            }
        });
    });
}

async function executeEnemyTurn(battleMessage, battle, actor) {
    const enemy = actor.character;
    
    // Generate and execute enemy action immediately
    const enemyAction = battle.generateEnemyAction(enemy);
    
    await battle.executeAction({
        type: 'enemy',
        character: enemy,
        action: enemyAction.action,
        target: enemyAction.target,
        skill: enemyAction.skill,
        speed: enemy.stats.spd
    });
    
    // Update battle display with enemy action result
    await battleMessage.edit({ 
        embeds: [createModernBattleEmbed(battle)], 
        components: [] 
    });
}

async function selectSkillFluid(interaction, battle, actor, battleMessage, resolve) {
    const character = actor.character;
    const availableSkills = character.skills.filter(skill => battle.teamSP >= skill.spCost);
    
    if (availableSkills.length === 0) {
        // Force auto-attack
        const target = battle.enemyTeam.find(e => e.currentHp > 0);
        const targetIndex = battle.enemyTeam.indexOf(target);
        
        await battle.executeAction({
            type: 'player',
            character: character,
            action: 'auto-attack',
            target: { type: 'enemy', index: targetIndex },
            speed: character.stats.spd
        });
        
        await interaction.update({ 
            embeds: [createModernBattleEmbed(battle)], 
            components: [] 
        });
        
        resolve();
        return;
    }
    
    const skillEmbed = createSkillSelectionEmbedFluid(character, availableSkills, battle);
    const skillButtons = createSkillButtons(availableSkills, actor.index);
    
    await interaction.update({ embeds: [skillEmbed], components: skillButtons });
    
    const skillCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: config.battle.turnTimeout,
        max: 1
    });
    
    skillCollector.on('collect', async (skillInteraction) => {
        const skillIndex = parseInt(skillInteraction.customId.split('_')[1]);
        const skill = availableSkills[skillIndex];
        
        // Select target for skill
        if (skill.targetType === 'all-enemies' || skill.targetType === 'all-allies' || skill.targetType === 'self') {
            // No target selection needed - execute immediately
            await battle.executeAction({
                type: 'player',
                character: character,
                action: 'skill',
                skill: skill,
                target: null,
                speed: character.stats.spd
            });
            
            await skillInteraction.update({ 
                embeds: [createModernBattleEmbed(battle)], 
                components: [] 
            });
            
            resolve();
        } else {
            // Select target with immediate execution
            await selectSkillTargetFluid(skillInteraction, battle, actor, skill, battleMessage, resolve);
        }
    });
    
    skillCollector.on('end', async (collected) => {
        if (collected.size === 0) {
            // Auto-attack if no skill selected
            const target = battle.enemyTeam.find(e => e.currentHp > 0);
            const targetIndex = battle.enemyTeam.indexOf(target);
            
            await battle.executeAction({
                type: 'player',
                character: character,
                action: 'auto-attack',
                target: { type: 'enemy', index: targetIndex },
                speed: character.stats.spd
            });
            
            await battleMessage.edit({ 
                embeds: [createModernBattleEmbed(battle)], 
                components: [] 
            });
            
            resolve();
        }
    });
}

async function selectSkillTargetFluid(interaction, battle, actor, skill, battleMessage, resolve) {
    const targets = skill.targetType === 'single-enemy' ? 
        battle.enemyTeam.filter(e => e.currentHp > 0) :
        battle.playerTeam.filter(p => p.currentHp > 0);
    
    const targetEmbed = createTargetSelectionEmbed(skill, targets);
    const targetButtons = createTargetButtons(targets, skill.targetType, actor.index);
    
    await interaction.update({ embeds: [targetEmbed], components: targetButtons });
    
    const targetCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: config.battle.turnTimeout,
        max: 1
    });
    
    targetCollector.on('collect', async (targetInteraction) => {
        const targetIndex = parseInt(targetInteraction.customId.split('_')[1]);
        const targetType = skill.targetType === 'single-enemy' ? 'enemy' : 'ally';
        
        // Execute skill immediately
        await battle.executeAction({
            type: 'player',
            character: actor.character,
            action: 'skill',
            skill: skill,
            target: { type: targetType, index: targetIndex },
            speed: actor.character.stats.spd
        });
        
        const targetName = targets[targetIndex].name;
        
        await targetInteraction.update({ 
            embeds: [createModernBattleEmbed(battle)], 
            components: [] 
        });
        
        resolve();
    });
    
    targetCollector.on('end', async (collected) => {
        if (collected.size === 0) {
            // Auto-select first target
            const targetIndex = 0;
            const targetType = skill.targetType === 'single-enemy' ? 'enemy' : 'ally';
            
            await battle.executeAction({
                type: 'player',
                character: actor.character,
                action: 'skill',
                skill: skill,
                target: { type: targetType, index: targetIndex },
                speed: actor.character.stats.spd
            });
            
            await battleMessage.edit({ 
                embeds: [createModernBattleEmbed(battle)], 
                components: [] 
            });
            
            resolve();
        }
    });
}

async function selectSkill(interaction, battle, charIndex, playerActions, player, isBoss, floor, floorNumber, originalTeam) {
    const character = battle.playerTeam[charIndex];
    const availableSkills = character.skills.filter(skill => battle.teamSP >= skill.spCost);
    
    if (availableSkills.length === 0) {
        await interaction.reply({ 
            content: `${character.name} doesn't have enough SP for any skills! Auto-attacking instead.`, 
            flags: 64 
        });
        
        // Force auto-attack
        const target = battle.enemyTeam.find(e => e.currentHp > 0);
        const targetIndex = battle.enemyTeam.indexOf(target);
        
        playerActions[charIndex] = {
            action: 'auto-attack',
            target: { type: 'enemy', index: targetIndex }
        };
        
        await collectAllActions(interaction.message, battle, playerActions, charIndex + 1, player, isBoss, floor, floorNumber, originalTeam);
        return;
    }
    
    const skillEmbed = createSkillSelectionEmbed(character, availableSkills);
    const skillButtons = createSkillButtons(availableSkills, charIndex);
    
    await interaction.update({ embeds: [skillEmbed], components: skillButtons });
    
    const skillCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: config.battle.turnTimeout,
        max: 1
    });
    
    skillCollector.on('collect', async (skillInteraction) => {
        const skillIndex = parseInt(skillInteraction.customId.split('_')[1]);
        const skill = availableSkills[skillIndex];
        
        // Select target for skill
        if (skill.targetType === 'all-enemies' || skill.targetType === 'all-allies' || skill.targetType === 'self') {
            // No target selection needed
            playerActions[charIndex] = {
                action: 'skill',
                skill: skill,
                target: null
            };
            
            await skillInteraction.reply({ 
                content: `${character.name} will use ${skill.name}! (-${skill.spCost} SP)`, 
                flags: 64 
            });
            
            await collectAllActions(skillInteraction.message, battle, playerActions, charIndex + 1, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            // Select target
            await selectSkillTarget(skillInteraction, battle, charIndex, skill, playerActions, player, isBoss, floor, floorNumber, originalTeam);
        }
    });
}

async function selectSkillTarget(interaction, battle, charIndex, skill, playerActions, player, isBoss, floor, floorNumber, originalTeam) {
    const targets = skill.targetType === 'single-enemy' ? 
        battle.enemyTeam.filter(e => e.currentHp > 0) :
        battle.playerTeam.filter(p => p.currentHp > 0);
    
    const targetEmbed = createTargetSelectionEmbed(skill, targets);
    const targetButtons = createTargetButtons(targets, skill.targetType, charIndex);
    
    await interaction.update({ embeds: [targetEmbed], components: targetButtons });
    
    const targetCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: config.battle.turnTimeout,
        max: 1
    });
    
    targetCollector.on('collect', async (targetInteraction) => {
        const targetIndex = parseInt(targetInteraction.customId.split('_')[1]);
        const targetType = skill.targetType === 'single-enemy' ? 'enemy' : 'ally';
        
        playerActions[charIndex] = {
            action: 'skill',
            skill: skill,
            target: { type: targetType, index: targetIndex }
        };
        
        const targetName = targets[targetIndex].name;
        const character = battle.playerTeam[charIndex];
        
        await targetInteraction.reply({ 
            content: `${character.name} will use ${skill.name} on ${targetName}! (-${skill.spCost} SP)`, 
            flags: 64 
        });
        
        await collectAllActions(targetInteraction.message, battle, playerActions, charIndex + 1, player, isBoss, floor, floorNumber, originalTeam);
    });
}

async function executeBattleTurn(battleMessage, battle, playerActions, player, isBoss, floor, floorNumber, originalTeam) {
    // Execute the turn
    battle.executeTurn(playerActions);
    
    // Create turn results
    const battleEmbed = createModernBattleEmbed(battle);
    const logEmbed = new EmbedBuilder()
        .setColor('#FFD93D')
        .setTitle(`📜 Turn ${battle.turn - 1} Results`)
        .setDescription(battle.battleLog.join('\n') || 'Turn completed...');
    
    if (battle.isOver) {
        await battleMessage.edit({ embeds: [battleEmbed, logEmbed], components: [] });
        setTimeout(async () => {
            await handleBattleEnd(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
        }, 3000);
    } else {
        // Continue battle
        const continueButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('continue_turn')
                    .setLabel(`Continue Turn ${battle.turn}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        
        await battleMessage.edit({ embeds: [battleEmbed, logEmbed], components: [continueButton] });
        
        const continueCollector = battleMessage.createMessageComponentCollector({
            filter: i => i.user.id === player.discordId,
            time: config.battle.autoProgressAfterSeconds * 1000,
            max: 1
        });
        
        continueCollector.on('collect', async (interaction) => {
            await planTurnActions(interaction, battle, player, isBoss, floor, floorNumber, originalTeam);
        });
        
        continueCollector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Auto-continue
                await planTurnActions(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
            }
        });
    }
}

// UI Creation Functions
function createModernBattleEmbed(battle) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`⚔️ Battle - Turn ${battle.turn}`)
        .setDescription('═══════════════════════════════════════');
    
    // Shared Team SP display
    const teamSPBar = battle.createSPBar(battle.teamSP, battle.maxTeamSP, 20);
    const spDisplay = `💫 **TEAM SP: ${battle.teamSP}/${battle.maxTeamSP}**\n[${teamSPBar}]\n\n`;
    
    // Player team display
    let playerDisplay = '```\n🛡️ YOUR TEAM\n';
    battle.playerTeam.forEach((char, index) => {
        const hpBar = battle.createHPBar(char.currentHp, char.stats.hp, 15);
        const aliveIcon = char.currentHp > 0 ? '🟢' : '💀';
        const speedIcon = getSpeedIcon(char.stats.spd);
        
        playerDisplay += `${aliveIcon} Slot ${index + 1}: ${char.name} ${speedIcon}\n`;
        playerDisplay += `   HP: ${char.currentHp}/${char.stats.hp} [${hpBar}]\n`;
        playerDisplay += `   Role: ${char.role.toUpperCase()} | Element: ${char.element.toUpperCase()}\n\n`;
    });
    playerDisplay += '```';
    
    // Enemy team display
    let enemyDisplay = '```\n👹 ENEMIES\n';
    battle.enemyTeam.forEach((enemy, index) => {
        const hpBar = battle.createHPBar(enemy.currentHp, enemy.stats.hp, 15);
        const aliveIcon = enemy.currentHp > 0 ? '🔴' : '💀';
        
        enemyDisplay += `${aliveIcon} ${enemy.name}\n`;
        enemyDisplay += `   HP: ${enemy.currentHp}/${enemy.stats.hp} [${hpBar}]\n`;
        enemyDisplay += `   Element: ${enemy.element.toUpperCase()}\n\n`;
    });
    enemyDisplay += '```';
    
    embed.addFields(
        { name: '💫 Team Resources', value: spDisplay, inline: false },
        { name: '\u200B', value: playerDisplay, inline: true },
        { name: '\u200B', value: enemyDisplay, inline: true }
    );
    
    return embed;
}

function getSpeedIcon(speed) {
    if (speed >= 80) return '⚡'; // Very fast
    if (speed >= 60) return '💨'; // Fast
    if (speed >= 40) return '🚶'; // Normal
    return '🐌'; // Slow
}

function createActionSelectionEmbed(battle, charIndex) {
    const character = battle.playerTeam[charIndex];
    
    return new EmbedBuilder()
        .setColor('#4ECDC4')
        .setTitle(`${character.name}'s Turn`)
        .setDescription(`**${character.role.toUpperCase()}** | **${character.element.toUpperCase()}** | Speed: ${character.stats.spd}`)
        .addFields(
            {
                name: '💖 Health',
                value: `${character.currentHp}/${character.stats.hp} HP\n${battle.createHPBar(character.currentHp, character.stats.hp, 20)}`,
                inline: true
            },
            {
                name: '💫 Team SP',
                value: `${battle.teamSP}/${battle.maxTeamSP} SP\n${battle.createSPBar(battle.teamSP, battle.maxTeamSP, 20)}`,
                inline: true
            },
            {
                name: '🎯 Choose Action',
                value: `**Auto-Attack:** Gain SP, deals damage\n**Skills:** Use team SP, powerful effects\n\n*Actions execute immediately!*`,
                inline: false
            }
        );
}

function createActionButtons(battle, charIndex) {
    const character = battle.playerTeam[charIndex];
    const hasUsableSkills = character.skills.some(skill => battle.teamSP >= skill.spCost);
    
    return [new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('auto_attack')
                .setLabel('Auto-Attack (Gain SP)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️'),
            new ButtonBuilder()
                .setCustomId('use_skill')
                .setLabel('Use Skill')
                .setStyle(hasUsableSkills ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('✨')
                .setDisabled(!hasUsableSkills)
        )];
}

function createSkillSelectionEmbedFluid(character, availableSkills, battle) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`✨ ${character.name}'s Skills`)
        .setDescription(`Team SP: ${battle.teamSP}/${battle.maxTeamSP} | Speed: ${character.stats.spd}`);
    
    let skillList = '';
    availableSkills.forEach((skill, index) => {
        skillList += `**${index + 1}. ${skill.name}** (${skill.spCost} SP)\n`;
        skillList += `${skill.description}\n`;
        skillList += `Power: ${skill.power} | Target: ${skill.targetType}\n\n`;
    });
    
    embed.addFields({ name: 'Available Skills', value: skillList || 'No skills available' });
    return embed;
}

function createSkillSelectionEmbed(character, availableSkills) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`✨ ${character.name}'s Skills`)
        .setDescription(`Current SP: ${character.currentSP}/${character.maxSP}`);
    
    let skillList = '';
    availableSkills.forEach((skill, index) => {
        skillList += `**${index + 1}. ${skill.name}** (${skill.spCost} SP)\n`;
        skillList += `${skill.description}\n`;
        skillList += `Power: ${skill.power} | Target: ${skill.targetType}\n\n`;
    });
    
    embed.addFields({ name: 'Available Skills', value: skillList || 'No skills available' });
    return embed;
}

function createSkillButtons(availableSkills, charIndex) {
    const buttons = availableSkills.map((skill, index) => 
        new ButtonBuilder()
            .setCustomId(`skill_${index}`)
            .setLabel(`${skill.name} (${skill.spCost} SP)`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(skill.emoji || '✨')
    );
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }
    
    return rows.length > 0 ? rows : [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('no_skills')
            .setLabel('No Skills Available')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    )];
}

function createTargetSelectionEmbed(skill, targets) {
    return new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle(`🎯 Select Target for ${skill.name}`)
        .setDescription(`Choose who to target with this skill`)
        .addFields({
            name: 'Available Targets',
            value: targets.map((target, index) => 
                `${index + 1}. ${target.name} (${target.currentHp}/${target.stats.hp} HP)`
            ).join('\n')
        });
}

function createTargetButtons(targets, targetType, charIndex) {
    const buttons = targets.map((target, index) => 
        new ButtonBuilder()
            .setCustomId(`target_${index}`)
            .setLabel(`${target.name}`)
            .setStyle(targetType === 'single-enemy' ? ButtonStyle.Danger : ButtonStyle.Primary)
            .setEmoji(targetType === 'single-enemy' ? '👹' : '👥')
    );
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }
    
    return rows;
}

// Generate SP-based skills for servants
function generateSPSkills(servant) {
    const skills = [];
    
    // Only the original skill from servant data (converted to SP cost)
    skills.push({
        name: servant.skillName,
        description: servant.skillDescription,
        spCost: 15,
        power: servant.skillPower || 120,
        targetType: 'single-enemy',
        element: servant.element,
        effect: 'damage',
        emoji: '⚔️'
    });
    
    return skills;
}

function generateEnemies(floor) {
    const [mainFloor, subFloor] = floor.split('-').map(Number);
    const isBoss = subFloor === 10;
    
    if (isBoss || config.battle.preferSingleEnemy) {
        // Single enemy (boss or preferred format)
        const enemy = {
            name: isBoss ? getBossName(mainFloor) : `Floor ${mainFloor} Guardian`,
            element: getBossElement(mainFloor),
            stats: {
                atk: (isBoss ? 120 : 80) + mainFloor * (isBoss ? 60 : 30),
                def: (isBoss ? 100 : 60) + mainFloor * (isBoss ? 50 : 25),
                hp: ((isBoss ? 800 : 400) + mainFloor * (isBoss ? 300 : 150)) * 10,
                spd: (isBoss ? 60 : 40) + mainFloor * (isBoss ? 15 : 10)
            },
            skills: [
                {
                    name: 'Strike',
                    spCost: 0,
                    power: 100,
                    targetType: 'single-enemy',
                    effect: 'damage'
                },
                {
                    name: isBoss ? 'Divine Wrath' : 'Power Attack',
                    spCost: 25,
                    power: isBoss ? 150 : 130,
                    targetType: 'single-enemy',
                    effect: 'damage'
                }
            ]
        };
        
        enemy.currentHp = enemy.stats.hp;
        return [enemy];
    } else {
        // Multiple enemies (only if UI can handle it)
        const enemyCount = Math.min(2, config.battle.maxEnemiesForMultiple);
        const enemies = [];
        
        for (let i = 0; i < enemyCount; i++) {
            const enemy = {
                name: `Floor ${mainFloor} Monster ${i + 1}`,
                element: ['fire', 'water', 'earth', 'wind'][Math.floor(Math.random() * 4)],
                stats: {
                    atk: 40 + mainFloor * 15 + subFloor * 3,
                    def: 30 + mainFloor * 12 + subFloor * 2,
                    hp: (150 + mainFloor * 50 + subFloor * 15) * 10,
                    spd: 35 + mainFloor * 8
                },
                skills: [
                    {
                        name: 'Attack',
                        spCost: 0,
                        power: 100,
                        targetType: 'single-enemy',
                        effect: 'damage'
                    }
                ]
            };
            
            enemy.currentHp = enemy.stats.hp;
            enemies.push(enemy);
        }
        
        return enemies;
    }
}

function getBossName(floor) {
    const bossNames = [
        'Cerberus, Guardian of the Gate',
        'Medusa, the Petrifying Gaze',
        'Thor, God of Thunder',
        'Fenrir, the Chained Wolf',
        'Amaterasu, Sun Goddess'
    ];
    return bossNames[floor - 1] || `Floor ${floor} Deity`;
}

function getBossElement(floor) {
    const elements = ['fire', 'earth', 'electric', 'dark', 'light'];
    return elements[floor - 1] || 'fire';
}

async function handleBattleEnd(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam) {
    const resultEmbed = new EmbedBuilder()
        .setTitle(battle.winner === 'player' ? '🎉 Victory!' : '💀 Defeat!')
        .setColor(battle.winner === 'player' ? '#2ECC71' : '#E74C3C');
    
    if (battle.winner === 'player') {
        const baseExp = isBoss ? 200 : (50 + floorNumber * 10);
        const baseGold = isBoss ? 500 : (100 + floorNumber * 20);
        
        const leveledUp = await player.addExperience(baseExp);
        player.gold += baseGold;
        player.totalBattlesWon += 1;
        
        if (isBoss) {
            const nextMainFloor = parseInt(floor[0]) + 1;
            player.currentFloor = `${nextMainFloor}-1`;
            resultEmbed.addFields({ 
                name: '🏔️ Floor Cleared!', 
                value: `You've defeated the boss and can now access Floor ${nextMainFloor}!` 
            });
        } else {
            player.currentFloor = `${floor[0]}-${floorNumber + 1}`;
        }
        
        await player.save();
        
        resultEmbed.addFields(
            { name: '✨ EXP Gained', value: `+${baseExp} EXP`, inline: true },
            { name: '💰 Gold Gained', value: `+${baseGold} gold`, inline: true },
            { name: '🎮 Battle Summary', value: `Turn-based SP combat completed!\nYour team mastered the new system!`, inline: false }
        );
        
        if (leveledUp) {
            resultEmbed.addFields({ 
                name: '🎊 Level Up!', 
                value: `You reached level ${player.level}!` 
            });
        }
        
        // Save battle record
        await Battle.create({
            PlayerId: player.id,
            floor: player.currentFloor,
            enemyType: isBoss ? 'boss' : 'normal',
            result: 'victory',
            turnsCount: battle.turn,
            expGained: baseExp,
            goldGained: baseGold,
            teamComposition: originalTeam.map(s => s.id)
        });
        
    } else {
        resultEmbed.setDescription('Your team was defeated! The new SP system takes practice - train your servants and try different strategies!');
    }
    
    await battleMessage.edit({ embeds: [resultEmbed], components: [] });
}
