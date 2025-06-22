const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player, Servant, PlayerServant, Battle } = require('../database/Database');
const BattleEngine = require('../utils/BattleEngine');
const { calculateElementalDamage } = require('../utils/ElementalSystem');

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
        
        // Prepare player team
        const playerTeam = [];
        for (const servant of player.servants.sort((a, b) => a.PlayerServant.slot - b.PlayerServant.slot)) {
            const ps = servant.PlayerServant; // Get the through model data
            
            // Calculate stats manually since we have the servant data
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
            
            playerTeam.push({
                id: servant.id,
                name: servant.name,
                element: servant.element,
                role: servant.role,
                stats: stats,
                currentHp: stats.hp,
                skills: [{
                    name: servant.skillName,
                    description: servant.skillDescription,
                    power: servant.skillPower,
                    cost: 3,
                    type: 'damage'
                }]
            });
        }
        
        // Generate enemies based on floor
        const enemyTeam = generateEnemies(player.currentFloor);
        
        // Create battle instance
        const battle = new BattleEngine(playerTeam, enemyTeam);
        
        // Create battle embed
        const battleEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`⚔️ Battle - Floor ${player.currentFloor}`)
            .setDescription('Choose your actions!');
        
        // Add team status
        updateBattleEmbed(battleEmbed, battle);
        
        // Create action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('battle_auto')
                    .setLabel('Auto Battle')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('battle_skill')
                    .setLabel('Use Skill')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId('battle_flee')
                    .setLabel('Flee')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏃')
            );
        
        const battleMessage = await message.reply({ embeds: [battleEmbed], components: [actionRow] });
        
        // Deduct stamina
        player.stamina -= staminaCost;
        await player.save();
        
        // Battle loop
        const collector = battleMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300000 // 5 minutes
        });
        
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'battle_flee') {
                await interaction.update({ 
                    content: 'You fled from battle! No rewards gained.', 
                    embeds: [], 
                    components: [] 
                });
                collector.stop();
                return;
            }
            
            if (interaction.customId === 'battle_auto') {
                // Auto battle - process entire battle
                while (!battle.isOver) {
                    // Simple AI for player team
                    const turnOrder = battle.getTurnOrder();
                    for (const unit of turnOrder) {
                        if (battle.isOver) break;
                        
                        if (unit.isPlayer) {
                            const targets = battle.enemyTeam.filter(e => e.currentHp > 0);
                            if (targets.length > 0) {
                                const target = targets[0]; // Target first enemy
                                battle.executeAutoAttack(unit, target);
                            }
                        }
                    }
                    battle.processTurn();
                }
            }
            
            // Update embed
            updateBattleEmbed(battleEmbed, battle);
            
            if (battle.isOver) {
                // Battle ended
                const resultEmbed = new EmbedBuilder()
                    .setTitle(battle.winner === 'player' ? '🎉 Victory!' : '💀 Defeat!')
                    .setColor(battle.winner === 'player' ? '#2ECC71' : '#E74C3C');
                
                if (battle.winner === 'player') {
                    // Calculate rewards
                    const baseExp = isBoss ? 200 : (50 + floorNumber * 10);
                    const baseGold = isBoss ? 500 : (100 + floorNumber * 20);
                    
                    const expGained = baseExp;
                    const goldGained = baseGold;
                    
                    // Level up check
                    const leveledUp = await player.addExperience(expGained);
                    player.gold += goldGained;
                    player.totalBattlesWon += 1;
                    
                    // Progress to next floor
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
                    
                    // Item drops
                    const drops = generateItemDrops(player.currentFloor);
                    
                    resultEmbed.addFields(
                        { name: '✨ EXP Gained', value: `+${expGained} EXP`, inline: true },
                        { name: '💰 Gold Gained', value: `+${goldGained} gold`, inline: true }
                    );
                    
                    if (leveledUp) {
                        resultEmbed.addFields({ 
                            name: '🎊 Level Up!', 
                            value: `You reached level ${player.level}!` 
                        });
                    }
                    
                    if (drops.length > 0) {
                        resultEmbed.addFields({ 
                            name: '📦 Item Drops', 
                            value: drops.map(item => `${item.name} (${item.rarity}★)`).join('\n') 
                        });
                    }
                    
                    // Save battle record
                    await Battle.create({
                        PlayerId: player.id,
                        floor: player.currentFloor,
                        enemyType: isBoss ? 'boss' : 'normal',
                        result: 'victory',
                        turnsCount: battle.turn,
                        expGained: expGained,
                        goldGained: goldGained,
                        itemsDropped: drops,
                        teamComposition: playerTeam.map(s => s.id)
                    });
                    
                } else {
                    resultEmbed.setDescription('Your team was defeated! Train your servants and try again.');
                }
                
                await interaction.update({ embeds: [resultEmbed], components: [] });
                collector.stop();
            } else {
                await interaction.update({ embeds: [battleEmbed], components: [actionRow] });
            }
        });
        
        collector.on('end', () => {
            if (!battleMessage.deleted) {
                battleMessage.edit({ components: [] }).catch(() => {});
            }
        });
    }
};

function updateBattleEmbed(embed, battle) {
    embed.fields = [];
    
    // Player team status
    const playerStatus = battle.playerTeam.map(s => 
        `${s.name}: ${s.currentHp}/${s.stats.hp} HP`
    ).join('\n');
    embed.addFields({ name: '👥 Your Team', value: playerStatus || 'No units', inline: true });
    
    // Enemy team status
    const enemyStatus = battle.enemyTeam.map(e => 
        `${e.name}: ${e.currentHp}/${e.stats.hp} HP`
    ).join('\n');
    embed.addFields({ name: '👹 Enemies', value: enemyStatus || 'No enemies', inline: true });
    
    // Battle info
    embed.addFields({ 
        name: '⚡ Battle Info', 
        value: `Turn: ${battle.turn}\nSP: ${battle.skillPoints}/10`, 
        inline: true 
    });
    
    // Recent actions
    if (battle.battleLog.length > 0) {
        const recentActions = battle.battleLog.slice(-3).join('\n');
        embed.addFields({ name: '📜 Recent Actions', value: recentActions });
    }
}

function generateEnemies(floor) {
    const [mainFloor, subFloor] = floor.split('-').map(Number);
    const isBoss = subFloor === 10;
    
    if (isBoss) {
        // Boss enemy
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
            currentHp: (500 + mainFloor * 200) * 10
        }];
    } else {
        // Regular enemies
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
                currentHp: (100 + mainFloor * 30 + subFloor * 10) * 10
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

function generateItemDrops(floor) {
    // Simple item drop logic - can be expanded
    return [];
}