const { EmbedBuilder } = require('discord.js');
const { Player, Item } = require('../database/Database');

module.exports = {
    name: 'inventory',
    description: 'View your inventory',
    aliases: ['inv', 'items', 'bag'],
    cooldown: 3,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [{
                model: Item,
                as: 'items',
                through: {
                    attributes: ['quantity', 'equippedToServantId']
                }
            }]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        if (player.items.length === 0) {
            return message.reply('Your inventory is empty! Visit the `!shop` or battle enemies to get items.');
        }
        
        // Group items by type
        const weapons = player.items.filter(i => i.type === 'weapon');
        const armors = player.items.filter(i => i.type === 'armor');
        const accessories = player.items.filter(i => i.type === 'accessory');
        
        const embed = new EmbedBuilder()
            .setColor('#8E44AD')
            .setTitle(`${message.author.username}'s Inventory`)
            .setDescription(`Total Items: ${player.items.length}`);
        
        // Add weapons
        if (weapons.length > 0) {
            const weaponList = weapons.map(w => 
                `${w.name} (${w.rarity}★) x${w.PlayerItem.quantity}${w.PlayerItem.equippedToServantId ? ' [Equipped]' : ''}`
            ).join('\n');
            embed.addFields({ name: '⚔️ Weapons', value: weaponList });
        }
        
        // Add armors
        if (armors.length > 0) {
            const armorList = armors.map(a => 
                `${a.name} (${a.rarity}★) x${a.PlayerItem.quantity}${a.PlayerItem.equippedToServantId ? ' [Equipped]' : ''}`
            ).join('\n');
            embed.addFields({ name: '🛡️ Armor', value: armorList });
        }
        
        // Add accessories
        if (accessories.length > 0) {
            const accessoryList = accessories.map(a => 
                `${a.name} (${a.rarity}★) x${a.PlayerItem.quantity}${a.PlayerItem.equippedToServantId ? ' [Equipped]' : ''}`
            ).join('\n');
            embed.addFields({ name: '💍 Accessories', value: accessoryList });
        }
        
        embed.setFooter({ text: 'Use !equip to manage equipment' });
        
        await message.reply({ embeds: [embed] });
    }
};
