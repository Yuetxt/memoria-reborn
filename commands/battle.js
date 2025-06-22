// Directory: /memoria-lost-bot/commands/battle.js
// JRPG-style turn-based battle command

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Player, Servant, PlayerServant, Battle } = require('../database/Database');
const JRPGBattleEngine = require('../utils/JRPGBattleEngine');

module.exports = {
    name: 'battle',
    description: 'Battle in the Babel Tower',
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
        
        // Check team
        if (player.servants.length === 0) {
            return message.reply('You need to set up your team first! Use `!team`');
        }
        
        // Regenerate stamina
        await player.regenerateStamina();
        
        // Check stamina
        const floor = player.currentFloor.split('-');
        const floorNumber = parseInt(floor[1]);
        const isBoss = floorNumber === 10;
        const staminaCost = isBoss ? 20 : (floorNumber >= 7 ? 15 : 10);
        
        if (player.stamina < staminaCost) {
            return message.reply(`Not enough stamina! You need ${staminaCost} stamina for this battle. Current: ${player.stamina}/${player.maxStamina}`);
        }
        
        // Prepare player team with skills
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
                critDamage: 200,
                evasion: 5,
                hitRate: 95
            };
            
            // Generate skills based on role and element
            const skills = generateServantSkills(servant);
            
            playerTeam.push({
                id: servant.id,
                name: servant.name,
                element: servant.element,
                role: servant.role,
                stats: stats,
                currentHp: stats.hp,
                currentAp: 100, // Starting AP
                maxAp: 100,
                isDefending: false,
                skills: skills,
                selectedAction: null
            });
        }
        
        // Generate enemies
        const enemyTeam = generateEnemies(player.currentFloor);
        
        // Create battle instance
        const battle = new JRPGBattleEngine(playerTeam, enemyTeam);
        
        // Deduct stamina
        player.stamina -= staminaCost;
        await player.save();
        
        // Start battle
        await startBattle(message, battle, player, isBoss, floor, floorNumber, playerTeam);
    }
};

async function startBattle(message, battle, player, isBoss, floor, floorNumber, originalTeam) {
    let currentCharacterIndex = 0;
    const selectedActions = [];
    
    // Create initial battle display
    const battleEmbed = createBattleEmbed(battle);
    const introEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⚔️ Battle Start!')
        .setDescription(`Floor ${floor[0]}-${floorNumber} - ${isBoss ? 'BOSS BATTLE' : 'Enemy Encounter'}`);
    
    const startButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_turn')
                .setLabel('Begin Battle')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️')
        );
    
    let battleMessage;
    if (message.reply) {
        battleMessage = await message.reply({ embeds: [battleEmbed, introEmbed], components: [startButton] });
    } else {
        battleMessage = message;
        await battleMessage.edit({ embeds: [battleEmbed, introEmbed], components: [startButton] });
    }
    
    const startCollector = battleMessage.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: 30000,
        max: 1
    });
    
    startCollector.on('collect', async (interaction) => {
        // Start action selection for first character
        await selectCharacterAction(interaction, battle, currentCharacterIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
    });
    
    startCollector.on('end', async (collected) => {
        if (collected.size === 0) {
            // Auto-start if no response
            await selectCharacterAction(battleMessage, battle, currentCharacterIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
    });
}

async function selectCharacterAction(interactionOrMessage, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam) {
    const character = battle.playerTeam[charIndex];
    
    if (!character || character.currentHp <= 0) {
        // Skip dead characters
        charIndex++;
        if (charIndex < battle.playerTeam.length) {
            await selectCharacterAction(interactionOrMessage, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            // All actions selected, execute turn
            await executeTurn(interactionOrMessage, battle, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
        return;
    }
    
    // Create detailed action selection embed
    const actionEmbed = createDetailedBattleEmbed(battle, charIndex);
    
    // Create action buttons
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`action_attack_${charIndex}`)
                .setLabel('Attack')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️'),
            new ButtonBuilder()
                .setCustomId(`action_defend_${charIndex}`)
                .setLabel('Defend')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🛡️'),
            new ButtonBuilder()
                .setCustomId(`action_skills_${charIndex}`)
                .setLabel('Skills')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✨'),
            new ButtonBuilder()
                .setCustomId('action_flee')
                .setLabel('Flee')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🏃')
        );
    
    // Add battle status row
    const statusRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('view_battle_status')
                .setLabel('View Battle Status')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊')
        );
    
    // Update the message
    let battleMessage;
    if (interactionOrMessage.update) {
        // It's an interaction
        await interactionOrMessage.update({ embeds: [actionEmbed], components: [actionRow, statusRow] });
        battleMessage = interactionOrMessage.message;
    } else if (interactionOrMessage.edit) {
        // It's a message
        await interactionOrMessage.edit({ embeds: [actionEmbed], components: [actionRow, statusRow] });
        battleMessage = interactionOrMessage;
    } else {
        // It's the initial message object
        battleMessage = interactionOrMessage;
        await battleMessage.edit({ embeds: [actionEmbed], components: [actionRow, statusRow] });
    }
    
    const collector = battleMessage.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: 60000
    });
    
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'view_battle_status') {
            // Show full battle status
            const battleEmbed = createBattleEmbed(battle);
            await interaction.reply({ embeds: [battleEmbed], flags: 64 });
            return;
        }
        
        if (interaction.customId === 'action_flee') {
            await interaction.update({ 
                content: 'You fled from battle! No rewards gained.', 
                embeds: [], 
                components: [] 
            });
            collector.stop('flee');
            return;
        }
        
        collector.stop();
        
        if (interaction.customId.startsWith('action_attack_')) {
            // Select target for basic attack
            await selectTarget(interaction, battle, charIndex, 'attack', selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
        else if (interaction.customId.startsWith('action_defend_')) {
            // Defend action
            selectedActions.push({
                character: charIndex,
                action: 'defend',
                target: null
            });
            
            // Move to next character
            if (charIndex + 1 < battle.playerTeam.length) {
                await selectCharacterAction(interaction, battle, charIndex + 1, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
            } else {
                await executeTurn(interaction, battle, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
            }
        }
        else if (interaction.customId.startsWith('action_skills_')) {
            // Show skill selection
            await selectSkill(interaction, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
    });
}

async function selectSkill(interaction, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam) {
    const character = battle.playerTeam[charIndex];
    
    const skillEmbed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`✨ ${character.name}'s Skills`)
        .setDescription(`Current AP: ${character.currentAp}/${character.maxAp}`);
    
    // Create visual skill list
    let skillDisplay = '```\n';
    character.skills.forEach((skill, index) => {
        const canUse = character.currentAp >= skill.apCost;
        const status = canUse ? '✓' : '✗';
        const apBar = createTextBar(Math.floor((skill.apCost / character.maxAp) * 100), 10, '▓', '░');
        
        skillDisplay += `┌─────────────────────────────────────┐\n`;
        skillDisplay += `│ ${status} ${padString(skill.name, 32)} │\n`;
        skillDisplay += `├─────────────────────────────────────┤\n`;
        skillDisplay += `│ Cost: ${padString(`${skill.apCost} AP`, 6)} [${apBar}]        │\n`;
        skillDisplay += `│ Power: ${padString(skill.power.toString(), 4)} | Target: ${padString(skill.targetType, 11)} │\n`;
        skillDisplay += `│ ${padString(skill.description, 35)} │\n`;
        skillDisplay += `└─────────────────────────────────────┘\n`;
        
        if (index < character.skills.length - 1) {
            skillDisplay += '\n';
        }
    });
    skillDisplay += '```';
    
    skillEmbed.addFields({ name: 'Available Skills', value: skillDisplay });
    
    // Create skill buttons
    const skillButtons = [];
    character.skills.forEach((skill, index) => {
        skillButtons.push(
            new ButtonBuilder()
                .setCustomId(`skill_${index}`)
                .setLabel(`${skill.name} (${skill.apCost} AP)`)
                .setStyle(character.currentAp >= skill.apCost ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(character.currentAp < skill.apCost)
                .setEmoji(skill.emoji || '✨')
        );
    });
    
    // Add back button
    skillButtons.push(
        new ButtonBuilder()
            .setCustomId('skill_back')
            .setLabel('Back')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('↩️')
    );
    
    // Create rows (max 5 buttons per row)
    const skillRows = [];
    for (let i = 0; i < skillButtons.length; i += 5) {
        skillRows.push(
            new ActionRowBuilder().addComponents(skillButtons.slice(i, i + 5))
        );
    }
    
    await interaction.update({ embeds: [skillEmbed], components: skillRows });
    
    const skillCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: 30000,
        max: 1
    });
    
    skillCollector.on('collect', async (skillInteraction) => {
        if (skillInteraction.customId === 'skill_back') {
            // Go back to action selection
            await selectCharacterAction(skillInteraction, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            const skillIndex = parseInt(skillInteraction.customId.split('_')[1]);
            const skill = character.skills[skillIndex];
            
            // Select target for skill
            await selectTarget(skillInteraction, battle, charIndex, skill, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
    });
}

async function selectTarget(interaction, battle, charIndex, actionOrSkill, selectedActions, player, isBoss, floor, floorNumber, originalTeam) {
    const isBasicAttack = actionOrSkill === 'attack';
    const skill = isBasicAttack ? null : actionOrSkill;
    
    // Determine valid targets
    let validTargets = [];
    if (isBasicAttack || (skill && skill.targetType === 'enemy')) {
        validTargets = battle.enemyTeam.map((enemy, index) => ({
            name: enemy.name,
            index: index,
            hp: enemy.currentHp,
            maxHp: enemy.stats.hp,
            type: 'enemy'
        })).filter(t => t.hp > 0);
    } else if (skill && skill.targetType === 'ally') {
        validTargets = battle.playerTeam.map((ally, index) => ({
            name: ally.name,
            index: index,
            hp: ally.currentHp,
            maxHp: ally.stats.hp,
            type: 'ally'
        })).filter(t => t.hp > 0);
    } else if (skill && skill.targetType === 'all-enemies') {
        // No target selection needed
        selectedActions.push({
            character: charIndex,
            action: 'skill',
            skill: skill,
            target: 'all-enemies'
        });
        
        // Move to next character
        if (charIndex + 1 < battle.playerTeam.length) {
            await selectCharacterAction(interaction, battle, charIndex + 1, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            await executeTurn(interaction, battle, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        }
        return;
    }
    
    const targetEmbed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🎯 Select Target')
        .setDescription(isBasicAttack ? 'Choose target for basic attack' : `Choose target for ${skill.name}`);
    
    // Create visual target selection
    let targetDisplay = '```\n';
    validTargets.forEach((target, index) => {
        const hpPercent = Math.floor((target.hp / target.maxHp) * 100);
        targetDisplay += `${index + 1}. ${target.name}\n`;
        targetDisplay += `   HP: ${target.hp}/${target.maxHp} [${createTextBar(hpPercent, 20, '█', '░')}]\n`;
        if (index < validTargets.length - 1) targetDisplay += '\n';
    });
    targetDisplay += '```';
    
    targetEmbed.addFields({ name: 'Available Targets', value: targetDisplay });
    
    const targetButtons = validTargets.map((target, index) => 
        new ButtonBuilder()
            .setCustomId(`target_${target.type}_${target.index}`)
            .setLabel(`${index + 1}. ${target.name}`)
            .setStyle(target.type === 'enemy' ? ButtonStyle.Danger : ButtonStyle.Primary)
            .setEmoji(target.type === 'enemy' ? '👹' : '👥')
    );
    
    // Add cancel button
    targetButtons.push(
        new ButtonBuilder()
            .setCustomId('target_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️')
    );
    
    const targetRows = [];
    for (let i = 0; i < targetButtons.length; i += 5) {
        targetRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
    }
    
    await interaction.update({ embeds: [targetEmbed], components: targetRows });
    
    const targetCollector = interaction.message.createMessageComponentCollector({
        filter: i => i.user.id === player.discordId,
        time: 30000,
        max: 1
    });
    
    targetCollector.on('collect', async (targetInteraction) => {
        if (targetInteraction.customId === 'target_cancel') {
            await selectCharacterAction(targetInteraction, battle, charIndex, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
        } else {
            const [_, targetType, targetIndex] = targetInteraction.customId.split('_');
            
            selectedActions.push({
                character: charIndex,
                action: isBasicAttack ? 'attack' : 'skill',
                skill: skill,
                target: { type: targetType, index: parseInt(targetIndex) }
            });
            
            // Move to next character
            if (charIndex + 1 < battle.playerTeam.length) {
                await selectCharacterAction(targetInteraction, battle, charIndex + 1, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
            } else {
                await executeTurn(targetInteraction, battle, selectedActions, player, isBoss, floor, floorNumber, originalTeam);
            }
        }
    });
}

async function executeTurn(interactionOrMessage, battle, playerActions, player, isBoss, floor, floorNumber, originalTeam) {
    // Execute all actions
    battle.executePlayerTurn(playerActions);
    battle.executeEnemyTurn();
    
    // Create battle summary embed
    const battleEmbed = createBattleEmbed(battle);
    
    // Add turn summary
    const turnSummary = new EmbedBuilder()
        .setColor('#FFD93D')
        .setTitle('📜 Turn Summary')
        .setDescription(battle.battleLog.join('\n') || 'Turn completed...');
    
    // Determine the message to update
    let battleMessage;
    if (interactionOrMessage.message) {
        battleMessage = interactionOrMessage.message;
    } else {
        battleMessage = interactionOrMessage;
    }
    
    // Check if battle is over
    if (battle.isOver) {
        await battleMessage.edit({ embeds: [battleEmbed, turnSummary], components: [] });
        setTimeout(async () => {
            await handleBattleEnd(battleMessage, battle, player, isBoss, floor, floorNumber, originalTeam);
        }, 3000);
    } else {
        // Show turn results then continue
        const continueButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('continue_battle')
                    .setLabel('Continue Battle')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        
        await battleMessage.edit({ embeds: [battleEmbed, turnSummary], components: [continueButton] });
        
        const continueCollector = battleMessage.createMessageComponentCollector({
            filter: i => i.user.id === player.discordId,
            time: 30000,
            max: 1
        });
        
        continueCollector.on('collect', async (interaction) => {
            await selectCharacterAction(interaction, battle, 0, [], player, isBoss, floor, floorNumber, originalTeam);
        });
        
        continueCollector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Auto-continue if no response
                await selectCharacterAction(battleMessage, battle, 0, [], player, isBoss, floor, floorNumber, originalTeam);
            }
        });
    }
}

function createBattleEmbed(battle) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`⚔️ Battle - Turn ${battle.turn}`)
        .setDescription('═══════════════════════════════════════');
    
    // Create visual battle layout
    let battleLayout = '';
    
    // Player side (left)
    battleLayout += '**YOUR TEAM**\n';
    battleLayout += '```\n';
    
    // Display up to 4 character slots
    for (let i = 0; i < 4; i++) {
        if (i < battle.playerTeam.length) {
            const char = battle.playerTeam[i];
            const hpPercent = Math.floor((char.currentHp / char.stats.hp) * 100);
            const apPercent = Math.floor((char.currentAp / char.maxAp) * 100);
            
            battleLayout += `┌─────────────────────┐\n`;
            battleLayout += `│ ${padString(char.name, 19)} │\n`;
            battleLayout += `├─────────────────────┤\n`;
            battleLayout += `│ HP: ${padString(`${char.currentHp}/${char.stats.hp}`, 15)} │\n`;
            battleLayout += `│ ${createTextBar(hpPercent, 19, '█', '░')} │\n`;
            battleLayout += `│ AP: ${padString(`${char.currentAp}/${char.maxAp}`, 15)} │\n`;
            battleLayout += `│ ${createTextBar(apPercent, 19, '▓', '░')} │\n`;
            battleLayout += `└─────────────────────┘\n`;
            
            if (i < battle.playerTeam.length - 1 || i < 3) {
                battleLayout += '\n';
            }
        } else {
            // Empty slot
            battleLayout += `┌─────────────────────┐\n`;
            battleLayout += `│    [Empty Slot]     │\n`;
            battleLayout += `├─────────────────────┤\n`;
            battleLayout += `│                     │\n`;
            battleLayout += `│                     │\n`;
            battleLayout += `│                     │\n`;
            battleLayout += `│                     │\n`;
            battleLayout += `└─────────────────────┘\n`;
            
            if (i < 3) battleLayout += '\n';
        }
    }
    
    battleLayout += '```';
    
    // Enemy side (right)
    let enemyLayout = '**ENEMIES**\n';
    enemyLayout += '```\n';
    
    for (let i = 0; i < battle.enemyTeam.length; i++) {
        const enemy = battle.enemyTeam[i];
        if (enemy.currentHp > 0) {
            const hpPercent = Math.floor((enemy.currentHp / enemy.stats.hp) * 100);
            
            enemyLayout += `┌─────────────────────┐\n`;
            enemyLayout += `│ ${padString(enemy.name.substring(0, 19), 19)} │\n`;
            enemyLayout += `├─────────────────────┤\n`;
            enemyLayout += `│ HP: ${padString(`${enemy.currentHp}/${enemy.stats.hp}`, 15)} │\n`;
            enemyLayout += `│ ${createTextBar(hpPercent, 19, '█', '░')} │\n`;
            enemyLayout += `│ ${padString(enemy.element.toUpperCase(), 19)} │\n`;
            enemyLayout += `└─────────────────────┘\n`;
            
            if (i < battle.enemyTeam.length - 1) {
                enemyLayout += '\n';
            }
        }
    }
    
    enemyLayout += '```';
    
    embed.addFields(
        { name: '\u200B', value: battleLayout, inline: true },
        { name: '\u200B', value: enemyLayout, inline: true }
    );
    
    return embed;
}

function createDetailedBattleEmbed(battle, charIndex) {
    const character = battle.playerTeam[charIndex];
    const embed = new EmbedBuilder()
        .setColor('#4ECDC4')
        .setTitle(`${character.name}'s Turn`)
        .setDescription('═══════════════════════════════════════');
    
    // Character detail box
    let charDetail = '```\n';
    charDetail += `┌─────────────────────────────────────┐\n`;
    charDetail += `│ ${padString(character.name, 35)} │\n`;
    charDetail += `├─────────────────────────────────────┤\n`;
    charDetail += `│ Role: ${padString(character.role.toUpperCase(), 29)} │\n`;
    charDetail += `│ Element: ${padString(character.element.toUpperCase(), 26)} │\n`;
    charDetail += `├─────────────────────────────────────┤\n`;
    charDetail += `│ HP: ${padString(`${character.currentHp}/${character.stats.hp}`, 31)} │\n`;
    charDetail += `│ ${createTextBar(Math.floor((character.currentHp / character.stats.hp) * 100), 35, '█', '░')} │\n`;
    charDetail += `│ AP: ${padString(`${character.currentAp}/${character.maxAp}`, 31)} │\n`;
    charDetail += `│ ${createTextBar(Math.floor((character.currentAp / character.maxAp) * 100), 35, '▓', '░')} │\n`;
    charDetail += `├─────────────────────────────────────┤\n`;
    charDetail += `│ STATS                               │\n`;
    charDetail += `│ ATK: ${padString(character.stats.atk.toString(), 6)} DEF: ${padString(character.stats.def.toString(), 6)} SPD: ${padString(character.stats.spd.toString(), 6)} │\n`;
    charDetail += `└─────────────────────────────────────┘\n`;
    charDetail += '```';
    
    embed.addFields({ name: 'Character Status', value: charDetail });
    
    // Skills list
    let skillsList = '```\n';
    skillsList += '┌─────────────────────────────────────┐\n';
    skillsList += '│            AVAILABLE SKILLS         │\n';
    skillsList += '├─────────────────────────────────────┤\n';
    
    character.skills.forEach((skill, index) => {
        const canUse = character.currentAp >= skill.apCost ? '✓' : '✗';
        skillsList += `│ ${canUse} ${padString(`${index + 1}. ${skill.name}`, 31)} │\n`;
        skillsList += `│   ${padString(`Cost: ${skill.apCost} AP | Pwr: ${skill.power}`, 32)} │\n`;
        if (index < character.skills.length - 1) {
            skillsList += '├─────────────────────────────────────┤\n';
        }
    });
    
    skillsList += '└─────────────────────────────────────┘\n';
    skillsList += '```';
    
    embed.addFields({ name: 'Skills', value: skillsList });
    
    return embed;
}

function padString(str, length) {
    if (str.length > length) {
        return str.substring(0, length);
    }
    const padding = length - str.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

function createTextBar(percentage, length, fillChar, emptyChar) {
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;
    return fillChar.repeat(filled) + emptyChar.repeat(empty);
}

// Generate skills based on servant role and element
function generateServantSkills(servant) {
    const skills = [];
    
    // Basic skill from servant data
    skills.push({
        name: servant.skillName,
        description: servant.skillDescription,
        apCost: 20,
        power: servant.skillPower,
        targetType: 'enemy',
        element: servant.element,
        emoji: '⚔️'
    });
    
    // Generate additional skills based on role
    switch (servant.role) {
        case 'dps':
            skills.push({
                name: 'Power Strike',
                description: 'Powerful single target attack',
                apCost: 30,
                power: 180,
                targetType: 'enemy',
                emoji: '💥'
            });
            skills.push({
                name: 'Blade Dance',
                description: 'Attacks all enemies',
                apCost: 40,
                power: 120,
                targetType: 'all-enemies',
                emoji: '🌪️'
            });
            break;
            
        case 'tank':
            skills.push({
                name: 'Taunt',
                description: 'Forces enemies to target you',
                apCost: 15,
                power: 0,
                targetType: 'self',
                effect: 'taunt',
                emoji: '😤'
            });
            skills.push({
                name: 'Iron Wall',
                description: 'Greatly increases defense',
                apCost: 25,
                power: 0,
                targetType: 'self',
                effect: 'def-up',
                emoji: '🛡️'
            });
            break;
            
        case 'healer':
            skills.push({
                name: 'Heal',
                description: 'Restores HP to one ally',
                apCost: 20,
                power: 150,
                targetType: 'ally',
                effect: 'heal',
                emoji: '💚'
            });
            skills.push({
                name: 'Group Heal',
                description: 'Restores HP to all allies',
                apCost: 35,
                power: 100,
                targetType: 'all-allies',
                effect: 'heal',
                emoji: '✨'
            });
            break;
            
        case 'support':
            skills.push({
                name: 'Buff',
                description: 'Increases ally attack',
                apCost: 20,
                power: 0,
                targetType: 'ally',
                effect: 'atk-up',
                emoji: '⬆️'
            });
            skills.push({
                name: 'Haste',
                description: 'Increases ally speed',
                apCost: 25,
                power: 0,
                targetType: 'ally',
                effect: 'spd-up',
                emoji: '💨'
            });
            break;
            
        case 'control':
            skills.push({
                name: 'Stun',
                description: 'Stuns target for 1 turn',
                apCost: 25,
                power: 50,
                targetType: 'enemy',
                effect: 'stun',
                emoji: '😵'
            });
            skills.push({
                name: 'Slow',
                description: 'Reduces enemy speed',
                apCost: 20,
                power: 80,
                targetType: 'enemy',
                effect: 'spd-down',
                emoji: '🐌'
            });
            break;
    }
    
    // Add ultimate skill if servant has one
    if (servant.ultimateName) {
        skills.push({
            name: servant.ultimateName,
            description: servant.ultimateDescription,
            apCost: 50,
            power: 300,
            targetType: 'all-enemies',
            element: servant.element,
            emoji: '🌟'
        });
    }
    
    return skills;
}

function generateEnemies(floor) {
    const [mainFloor, subFloor] = floor.split('-').map(Number);
    const isBoss = subFloor === 10;
    
    if (isBoss) {
        return [{
            name: getBossName(mainFloor),
            element: getBossElement(mainFloor),
            stats: {
                atk: 100 + mainFloor * 50,
                def: 80 + mainFloor * 40,
                hp: (500 + mainFloor * 200) * 10,
                spd: 50 + mainFloor * 10,
                critChance: 10,
                critDamage: 150,
                evasion: 5,
                hitRate: 95
            },
            currentHp: (500 + mainFloor * 200) * 10,
            skills: [
                {
                    name: 'Boss Strike',
                    power: 150,
                    targetType: 'enemy'
                },
                {
                    name: 'Divine Wrath',
                    power: 100,
                    targetType: 'all-enemies'
                }
            ]
        }];
    } else {
        const enemyCount = Math.min(1 + Math.floor(subFloor / 3), 3);
        const enemies = [];
        
        for (let i = 0; i < enemyCount; i++) {
            enemies.push({
                name: `Floor ${mainFloor} Monster`,
                element: ['fire', 'water', 'earth', 'wind'][Math.floor(Math.random() * 4)],
                stats: {
                    atk: 30 + mainFloor * 10 + subFloor * 2,
                    def: 20 + mainFloor * 8 + subFloor,
                    hp: (100 + mainFloor * 30 + subFloor * 10) * 10,
                    spd: 30 + mainFloor * 5,
                    critChance: 5,
                    critDamage: 150,
                    evasion: 3,
                    hitRate: 90
                },
                currentHp: (100 + mainFloor * 30 + subFloor * 10) * 10,
                skills: [
                    {
                        name: 'Attack',
                        power: 100,
                        targetType: 'enemy'
                    }
                ]
            });
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
            { name: '💰 Gold Gained', value: `+${baseGold} gold`, inline: true }
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
        resultEmbed.setDescription('Your team was defeated! Train your servants and try again.');
    }
    
    await battleMessage.edit({ embeds: [resultEmbed], components: [] });
}