const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player, Servant, PlayerServant } = require('../database/Database');
const { summonServant } = require('../utils/GachaSystem');

module.exports = {
    name: 'summon',
    description: 'Summon new servants',
    aliases: ['gacha', 'pull'],
    cooldown: 5,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id }
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        // Check currency
        const singleCost = 150;
        const multiCost = 1500;
        
        // Create summon options embed
        const embed = new EmbedBuilder()
            .setColor('#FFD93D')
            .setTitle('🎰 Servant Summoning')
            .setDescription('Choose your summoning option:')
            .addFields(
                { name: '1️⃣ Single Summon', value: `Cost: ${singleCost} gold\nSummon 1 servant`, inline: true },
                { name: '🔟 10x Summon', value: `Cost: ${multiCost} gold\nSummon 10 servants\n**Guaranteed 5★ or higher!**`, inline: true }
            )
            .addFields({ name: '📊 Rates', value: '4★: 70% | 5★: 25% | 6★: 5%' })
            .setFooter({ text: `Your Gold: ${player.gold}` });
        
        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('summon_single')
                    .setLabel('Single Summon')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('1️⃣')
                    .setDisabled(player.gold < singleCost),
                new ButtonBuilder()
                    .setCustomId('summon_multi')
                    .setLabel('10x Summon')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔟')
                    .setDisabled(player.gold < multiCost),
                new ButtonBuilder()
                    .setCustomId('summon_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
        
        const summonMessage = await message.reply({ embeds: [embed], components: [row] });
        
        // Create collector
        const collector = summonMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });
        
        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'summon_cancel') {
                await interaction.update({ content: 'Summoning cancelled.', embeds: [], components: [] });
                collector.stop();
                return;
            }
            
            const isMulti = interaction.customId === 'summon_multi';
            const cost = isMulti ? multiCost : singleCost;
            const count = isMulti ? 10 : 1;
            
            // Deduct gold
            player.gold -= cost;
            await player.save();
            
            // Perform summons
            const summonedServants = [];
            let guaranteed5Star = false;
            
            for (let i = 0; i < count; i++) {
                let servant;
                
                // Guarantee 5★ or higher on 10th pull if none obtained
                if (isMulti && i === 9 && !guaranteed5Star) {
                    const highRarityServants = await Servant.findAll({
                        where: { rarity: [5, 6] }
                    });
                    servant = highRarityServants[Math.floor(Math.random() * highRarityServants.length)];
                } else {
                    servant = await summonServant();
                }
                
                if (servant.rarity >= 5) guaranteed5Star = true;
                
                // Check if player already has this servant
                const existing = await PlayerServant.findOne({
                    where: {
                        PlayerId: player.id,
                        ServantId: servant.id
                    }
                });
                
                if (existing) {
                    // Give bond experience for duplicate
                    existing.bondExp += 100;
                    if (existing.bondExp >= existing.bondLevel * 200) {
                        existing.bondLevel = Math.min(15, existing.bondLevel + 1);
                        existing.bondExp = 0;
                    }
                    await existing.save();
                    servant.isDuplicate = true;
                } else {
                    // Add new servant to collection
                    await PlayerServant.create({
                        PlayerId: player.id,
                        ServantId: servant.id
                    });
                }
                
                summonedServants.push(servant);
            }
            
            // Create results embed
            const resultsEmbed = new EmbedBuilder()
                .setColor('#FFD93D')
                .setTitle('✨ Summoning Results!')
                .setDescription(summonedServants.map(s => {
                    const stars = '★'.repeat(s.rarity);
                    const duplicate = s.isDuplicate ? ' (Duplicate - Bond EXP gained!)' : ' **NEW!**';
                    return `${stars} **${s.name}** - ${s.element} ${s.role}${duplicate}`;
                }).join('\n'))
                .setFooter({ text: `Remaining Gold: ${player.gold}` });
            
            await interaction.update({ embeds: [resultsEmbed], components: [] });
            collector.stop();
        });
        
        collector.on('end', () => {
            if (!summonMessage.deleted) {
                summonMessage.edit({ components: [] }).catch(() => {});
            }
        });
    }
};