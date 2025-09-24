const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { Player, Servant, PlayerServant } = require('../database/Database');
const config = require('../config.json');

module.exports = {
    name: 'team',
    description: 'Manage your battle team',
    aliases: ['party', 'formation'],
    cooldown: 5,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [{
                model: Servant,
                as: 'servants',
                through: {
                    attributes: ['level', 'bondLevel', 'slot', 'isInTeam']
                }
            }]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        if (player.servants.length === 0) {
            return message.reply('You don\'t have any servants yet! Use `!summon` to get some.');
        }
        
        // Show current team
        const currentTeam = player.servants
            .filter(s => s.PlayerServant.isInTeam)
            .sort((a, b) => a.PlayerServant.slot - b.PlayerServant.slot);
        
        const teamSizeMin = config.battle.teamSizeMin;
        const teamSizeMax = config.battle.teamSizeMax;
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📋 Team Formation')
            .setDescription(`Select servants for your team (${teamSizeMin}-${teamSizeMax} members)\nSlot 1: Frontline (Tank) | Slots 2-3: Midline (DPS) | Slot 4: Backline (Support)`);
        
        // Display current team
        for (let i = 1; i <= 4; i++) {
            const servant = currentTeam.find(s => s.PlayerServant.slot === i);
            if (servant) {
                embed.addFields({
                    name: `Slot ${i}`,
                    value: `${servant.name} (Lv.${servant.PlayerServant.level})\n${servant.element} ${servant.role}`,
                    inline: true
                });
            } else {
                embed.addFields({
                    name: `Slot ${i}`,
                    value: 'Empty',
                    inline: true
                });
            }
        }
        
        // Create select menu for each slot
        const rows = [];
        for (let slot = 1; slot <= 4; slot++) {
            const options = [
                {
                    label: 'Remove',
                    description: 'Remove servant from this slot',
                    value: `remove_${slot}`
                }
            ];
            
            // Add available servants
            player.servants.forEach(servant => {
                const inOtherSlot = servant.PlayerServant.isInTeam && servant.PlayerServant.slot !== slot;
                if (!inOtherSlot) {
                    options.push({
                        label: servant.name,
                        description: `Lv.${servant.PlayerServant.level} | ${servant.rarity}★ ${servant.element} ${servant.role}`,
                        value: `${servant.id}_${slot}`
                    });
                }
            });
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`team_slot_${slot}`)
                .setPlaceholder(`Select servant for Slot ${slot}`)
                .addOptions(options);
            
            rows.push(new ActionRowBuilder().addComponents(selectMenu));
        }
        
        const teamMessage = await message.reply({ embeds: [embed], components: rows.slice(0, 4) });
        
        // Create collector
        const collector = teamMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });
        
        collector.on('collect', async (interaction) => {
            const [action, slotStr] = interaction.values[0].split('_');
            const slot = parseInt(slotStr);
            
            if (action === 'remove') {
                // Remove servant from slot
                await PlayerServant.update(
                    { isInTeam: false, slot: null },
                    {
                        where: {
                            PlayerId: player.id,
                            slot: slot
                        }
                    }
                );
            } else {
                // Add servant to slot
                const servantId = action; // Keep as string, don't convert to int
                
                // Remove from current slot if any
                await PlayerServant.update(
                    { isInTeam: false, slot: null },
                    {
                        where: {
                            PlayerId: player.id,
                            ServantId: servantId
                        }
                    }
                );
                
                // Remove current servant in target slot
                await PlayerServant.update(
                    { isInTeam: false, slot: null },
                    {
                        where: {
                            PlayerId: player.id,
                            slot: slot
                        }
                    }
                );
                
                // Add to new slot
                await PlayerServant.update(
                    { isInTeam: true, slot: slot },
                    {
                        where: {
                            PlayerId: player.id,
                            ServantId: servantId
                        }
                    }
                );
            }
            
            await interaction.reply({ content: 'Team updated!', flags: 64 }); // 64 is the ephemeral flag
            collector.stop();
            
            // Show updated team
            await this.execute(message, args);
        });
        
        collector.on('end', () => {
            teamMessage.edit({ components: [] }).catch(() => {});
        });
    }
};
