// Directory: /memoria-lost-bot/commands/equip.js
// Equipment management command

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { Player, Servant, Item, PlayerServant, PlayerItem } = require('../database/Database');

module.exports = {
    name: 'equip',
    description: 'Equip items to your servants',
    cooldown: 5,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [
                {
                    model: Servant,
                    as: 'servants',
                    through: {
                        attributes: ['level', 'bondLevel']
                    }
                },
                {
                    model: Item,
                    as: 'items',
                    through: {
                        attributes: ['quantity', 'equippedToServantId']
                    }
                }
            ]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        if (player.servants.length === 0) {
            return message.reply('You don\'t have any servants to equip!');
        }
        
        if (player.items.length === 0) {
            return message.reply('You don\'t have any items to equip! Visit the `!shop` or win battles to get items.');
        }
        
        // Step 1: Select servant
        const servantOptions = player.servants.map(s => ({
            label: s.name,
            description: `Level ${s.PlayerServant.level} | ${s.rarity}★ ${s.role}`,
            value: s.id.toString()
        }));
        
        const servantSelect = new StringSelectMenuBuilder()
            .setCustomId('equip_servant')
            .setPlaceholder('Select a servant to equip')
            .addOptions(servantOptions.slice(0, 25)); // Discord limit is 25 options
        
        const row = new ActionRowBuilder().addComponents(servantSelect);
        
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎒 Equipment Management')
            .setDescription('Select a servant to manage their equipment');
        
        const equipMessage = await message.reply({ embeds: [embed], components: [row] });
        
        const collector = equipMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });
        
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'equip_servant') {
                const servantId = parseInt(interaction.values[0]);
                const servant = player.servants.find(s => s.id === servantId);
                
                if (!servant) {
                    await interaction.reply({ content: 'Servant not found!', flags: 64 });
                    return;
                }
                
                // Show current equipment and available items
                const currentEquipment = player.items.filter(i => 
                    i.PlayerItem.equippedToServantId === servantId
                );
                
                const equipEmbed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle(`${servant.name}'s Equipment`)
                    .setDescription('Current equipment and available items');
                
                // Show current equipment
                const weapon = currentEquipment.find(i => i.type === 'weapon');
                const armor = currentEquipment.find(i => i.type === 'armor');
                const accessory = currentEquipment.find(i => i.type === 'accessory');
                
                equipEmbed.addFields(
                    { 
                        name: '⚔️ Weapon Slot', 
                        value: weapon ? `${weapon.name} (${weapon.rarity}★)` : 'Empty', 
                        inline: true 
                    },
                    { 
                        name: '🛡️ Armor Slot', 
                        value: armor ? `${armor.name} (${armor.rarity}★)` : 'Empty', 
                        inline: true 
                    },
                    { 
                        name: '💍 Accessory Slot', 
                        value: accessory ? `${accessory.name} (${accessory.rarity}★)` : 'Empty', 
                        inline: true 
                    }
                );
                
                // Calculate current stats with equipment
                const baseStats = await calculateServantStats(servant, servant.PlayerServant);
                const equipStats = calculateEquipmentBonus(currentEquipment);
                
                equipEmbed.addFields({
                    name: '📊 Current Stats',
                    value: `ATK: ${baseStats.atk} (+${equipStats.atk})\nDEF: ${baseStats.def} (+${equipStats.def})\nHP: ${baseStats.hp / 10} (+${equipStats.hp})\nSPD: ${baseStats.spd} (+${equipStats.spd})`
                });
                
                // Create select menus for each slot
                const itemRows = [];
                const types = ['weapon', 'armor', 'accessory'];
                
                for (const type of types) {
                    const availableItems = player.items.filter(i => 
                        i.type === type && 
                        (i.PlayerItem.equippedToServantId === null || i.PlayerItem.equippedToServantId === servantId)
                    );
                    
                    if (availableItems.length > 0 || currentEquipment.some(i => i.type === type)) {
                        const options = [
                            {
                                label: 'Unequip',
                                description: `Remove ${type}`,
                                value: `unequip_${type}_${servantId}`
                            }
                        ];
                        
                        availableItems.forEach(item => {
                            const equipped = item.PlayerItem.equippedToServantId === servantId;
                            let description = `${item.rarity}★`;
                            
                            // Add stat preview
                            const stats = [];
                            if (item.atkBonus > 0) stats.push(`ATK+${item.atkBonus}`);
                            if (item.defBonus > 0) stats.push(`DEF+${item.defBonus}`);
                            if (item.hpBonus > 0) stats.push(`HP+${item.hpBonus}`);
                            if (item.spdBonus > 0) stats.push(`SPD+${item.spdBonus}`);
                            
                            if (stats.length > 0) {
                                description += ` | ${stats.join(' ')}`;
                            }
                            
                            if (equipped) description += ' [EQUIPPED]';
                            
                            options.push({
                                label: item.name,
                                description: description.substring(0, 100), // Discord limit
                                value: `equip_${item.id}_${servantId}_${type}`
                            });
                        });
                        
                        // Only show first 24 items (Discord limit is 25 with unequip option)
                        if (options.length > 25) {
                            options.length = 25;
                        }
                        
                        const itemSelect = new StringSelectMenuBuilder()
                            .setCustomId(`equip_${type}`)
                            .setPlaceholder(`Select ${type}`)
                            .addOptions(options);
                        
                        itemRows.push(new ActionRowBuilder().addComponents(itemSelect));
                    }
                }
                
                await interaction.update({ embeds: [equipEmbed], components: itemRows });
            } else if (interaction.customId.startsWith('equip_')) {
                const [action, itemIdOrType, servantId, itemType] = interaction.values[0].split('_');
                
                if (action === 'unequip') {
                    // Unequip item from slot
                    const playerItems = await PlayerItem.findAll({
                        where: {
                            PlayerId: player.id,
                            equippedToServantId: parseInt(servantId)
                        },
                        include: [Item]
                    });
                    
                    const playerItem = playerItems.find(pi => pi.Item.type === itemIdOrType);
                    
                    if (playerItem) {
                        playerItem.equippedToServantId = null;
                        await playerItem.save();
                        await interaction.reply({ 
                            content: `Unequipped ${playerItem.Item.name} from servant!`, 
                            flags: 64 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'No item equipped in that slot!', 
                            flags: 64 
                        });
                    }
                } else {
                    // Equip item
                    const itemId = parseInt(itemIdOrType);
                    
                    // First, unequip any item of this type from the servant
                    const existingEquips = await PlayerItem.findAll({
                        where: {
                            PlayerId: player.id,
                            equippedToServantId: parseInt(servantId)
                        },
                        include: [Item]
                    });
                    
                    const existingEquip = existingEquips.find(pi => pi.Item.type === itemType);
                    
                    if (existingEquip) {
                        existingEquip.equippedToServantId = null;
                        await existingEquip.save();
                    }
                    
                    // Then equip the new item
                    const playerItem = await PlayerItem.findOne({
                        where: {
                            PlayerId: player.id,
                            ItemId: itemId
                        },
                        include: [Item]
                    });
                    
                    if (playerItem) {
                        // If item was equipped elsewhere, unequip it first
                        if (playerItem.equippedToServantId && playerItem.equippedToServantId !== parseInt(servantId)) {
                            const otherServant = await Servant.findByPk(playerItem.equippedToServantId);
                            await interaction.reply({ 
                                content: `Unequipped ${playerItem.Item.name} from ${otherServant.name} and equipped to current servant!`, 
                                flags: 64 
                            });
                        } else {
                            await interaction.reply({ 
                                content: `Equipped ${playerItem.Item.name}!`, 
                                flags: 64 
                            });
                        }
                        
                        playerItem.equippedToServantId = parseInt(servantId);
                        await playerItem.save();
                    }
                }
                
                collector.stop();
                
                // Show updated equipment
                setTimeout(() => {
                    this.execute(message, args);
                }, 1000);
            }
        });
        
        collector.on('end', () => {
            equipMessage.edit({ components: [] }).catch(() => {});
        });
    }
};

// Helper function to calculate servant stats
async function calculateServantStats(servant, playerServant) {
    const growthRates = servant.getGrowthRates();
    const bondBonus = 1 + (playerServant.bondLevel - 1) * 0.01;
    
    return {
        atk: Math.floor(servant.baseAtk * (1 + growthRates.atk * (playerServant.level - 1)) * bondBonus),
        def: Math.floor(servant.baseDef * (1 + growthRates.def * (playerServant.level - 1)) * bondBonus),
        hp: Math.floor(servant.baseHp * (1 + growthRates.hp * (playerServant.level - 1)) * bondBonus) * 10,
        spd: Math.floor(servant.baseSpd * (1 + growthRates.spd * (playerServant.level - 1)) * bondBonus)
    };
}

// Helper function to calculate equipment bonuses
function calculateEquipmentBonus(equipment) {
    let bonus = {
        atk: 0,
        def: 0,
        hp: 0,
        spd: 0,
        critChance: 0,
        critDamage: 0,
        evasion: 0
    };
    
    equipment.forEach(item => {
        bonus.atk += item.atkBonus || 0;
        bonus.def += item.defBonus || 0;
        bonus.hp += item.hpBonus || 0;
        bonus.spd += item.spdBonus || 0;
        bonus.critChance += item.critChanceBonus || 0;
        bonus.critDamage += item.critDamageBonus || 0;
        bonus.evasion += item.evasionBonus || 0;
    });
    
    return bonus;
}