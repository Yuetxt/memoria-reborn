import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Player } from '../database/models/Player.js';
import { Servant } from '../database/models/Servant.js';
import servantsData from '../data/servants.json' assert { type: 'json' };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your player profile'),
    playerRequired: true,
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        // Get player's servants
        const servants = await Servant.findAll({
            where: { playerId: player.discordId }
        });

        // Get team composition (teamSlot 0-2 are team members)
        const team = servants
            .filter(s => s.teamSlot >= 0 && s.teamSlot <= 2)
            .sort((a, b) => a.teamSlot - b.teamSlot);

        // Calculate experience progress
        const expNeeded = player.lvl * 100;
        const expProgress = Math.floor((player.xp / expNeeded) * 100);

        // Create profile embed
        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle(`${interaction.user.username}'s Profile`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '📊 Level', value: `Level ${player.lvl} (${expProgress}%)`, inline: true },
                { name: '⚡ Stamina', value: `${player.stamina}/100`, inline: true },
                { name: '🏔️ Current Floor', value: `${player.floor || 1}-1`, inline: true },
                { name: '💰 Gold', value: player.gold?.toLocaleString() || '0', inline: true },
                { name: '💎 Gems', value: player.gems?.toLocaleString() || '0', inline: true },
                { name: '⚔️ Battles Won', value: (player.battlesWon || 0).toString(), inline: true }
            );

        // Add team composition
        if (team.length > 0) {
            const teamValue = team.map((s, i) => {
                const servantData = servantsData[s.servant_id];
                const servantName = servantData?.name || s.servant_id;
                return `**Slot ${i + 1}:** ${servantName} (Lv.${s.lvl} | Bond 2)`;
            }).join('\n');
            embed.addFields({ name: '👥 Current Team', value: teamValue });
        }

        // Add servant collection info
        const rarity4 = servants.filter(s => s.rarity === 4).length;
        const rarity5 = servants.filter(s => s.rarity === 5).length;
        const rarity6 = servants.filter(s => s.rarity === 6).length;

        embed.addFields({
            name: '📚 Collection',
            value: `Total Servants: ${servants.length}\n4★: ${rarity4} | 5★: ${rarity5} | 6★: ${rarity6}`
        });

        await interaction.reply({ embeds: [embed] });
    }
};
