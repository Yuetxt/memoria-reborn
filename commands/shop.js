const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player, Item, PlayerItem } = require('../database/Database');
const { Op } = require('sequelize');

module.exports = {
    name: 'shop',
    description: 'Visit the in-game shop',
    aliases: ['store', 'buy'],
    cooldown: 5,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id }
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        // Get shop items (basic items only)
        const shopItems = await Item.findAll({
            where: { rarity: [1, 2, 3] },
            limit: 25
        });
        
        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('🛒 Item Shop')
            .setDescription('Welcome to the shop! Select an item to purchase.')
            .setFooter({ text: `Your Gold: ${player.gold}` });
        
        // Create select menu options
        const options = shopItems.map(item => ({
            label: `${item.name} (${item.rarity}★)`,
            description: `${item.type} - ${item.price} gold`,
            value: item.id.toString()
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_buy')
            .setPlaceholder('Select an item to view details')
            .addOptions(options);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const shopMessage = await message.reply({ embeds: [embed], components: [row] });
        
        const collector = shopMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });
        
        collector.on('collect', async (interaction) => {
            // Handle select menu interaction
            if (interaction.customId === 'shop_buy') {
                const itemId = parseInt(interaction.values[0]);
                const item = shopItems.find(i => i.id === itemId);
                
                if (!item) {
                    await interaction.reply({ content: 'Item not found!', ephemeral: true });
                    return;
                }
                
                // Show item details
                const itemEmbed = new EmbedBuilder()
                    .setColor('#F39C12')
                    .setTitle(`${item.name} (${item.rarity}★)`)
                    .setDescription(item.description || 'A useful item for your journey.')
                    .addFields(
                        { name: 'Type', value: item.type, inline: true },
                        { name: 'Price', value: `${item.price} gold`, inline: true },
                        { name: 'Element', value: item.element || 'Neutral', inline: true }
                    );
                
                // Add stat bonuses
                const statBonuses = [];
                if (item.atkBonus > 0) statBonuses.push(`ATK +${item.atkBonus}`);
                if (item.defBonus > 0) statBonuses.push(`DEF +${item.defBonus}`);
                if (item.hpBonus > 0) statBonuses.push(`HP +${item.hpBonus}`);
                if (item.spdBonus > 0) statBonuses.push(`SPD +${item.spdBonus}`);
                if (item.critChanceBonus > 0) statBonuses.push(`Crit Chance +${item.critChanceBonus}%`);
                if (item.critDamageBonus > 0) statBonuses.push(`Crit Damage +${item.critDamageBonus}%`);
                
                if (statBonuses.length > 0) {
                    itemEmbed.addFields({ name: 'Stat Bonuses', value: statBonuses.join('\n') });
                }
                
                // Purchase confirmation buttons
                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_${item.id}`)
                            .setLabel('Purchase')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(player.gold < item.price),
                        new ButtonBuilder()
                            .setCustomId('cancel_buy')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await interaction.update({ embeds: [itemEmbed], components: [confirmRow] });
            } 
            // Handle button interactions
            else if (interaction.customId.startsWith('buy_')) {
                const itemId = parseInt(interaction.customId.split('_')[1]);
                const item = shopItems.find(i => i.id === itemId);
                
                if (!item) {
                    await interaction.reply({ content: 'Item not found!', ephemeral: true });
                    return;
                }
                
                // Check gold again
                if (player.gold < item.price) {
                    await interaction.reply({ content: 'Not enough gold!', ephemeral: true });
                    return;
                }
                
                // Purchase item
                player.gold -= item.price;
                await player.save();
                
                // Add item to inventory
                const [playerItem, created] = await PlayerItem.findOrCreate({
                    where: {
                        PlayerId: player.id,
                        ItemId: item.id
                    },
                    defaults: {
                        quantity: 1
                    }
                });
                
                if (!created) {
                    playerItem.quantity += 1;
                    await playerItem.save();
                }
                
                const purchaseEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ Purchase Successful!')
                    .setDescription(`You purchased **${item.name}** for ${item.price} gold!`)
                    .addFields(
                        { name: 'Remaining Gold', value: player.gold.toString(), inline: true },
                        { name: 'Quantity Owned', value: playerItem.quantity.toString(), inline: true }
                    );
                
                await interaction.update({ embeds: [purchaseEmbed], components: [] });
                collector.stop();
            }
            else if (interaction.customId === 'cancel_buy') {
                await interaction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
                collector.stop();
            }
        });
        
        collector.on('end', () => {
            if (!shopMessage.deleted) {
                shopMessage.edit({ components: [] }).catch(() => {});
            }
        });
    }
};