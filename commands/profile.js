const { EmbedBuilder } = require('discord.js');
const { Player, PlayerServant, Servant } = require('../database/Database');

module.exports = {
    name: 'profile',
    description: 'View your player profile',
    aliases: ['p', 'stats'],
    cooldown: 3,
    async execute(message) {
        // Get player data
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [
                {
                    model: Servant,
                    as: 'servants',
                    through: {
                        attributes: ['level', 'bondLevel', 'isInTeam', 'slot']
                    }
                }
            ]
        });
        
        if (!player) {
            return message.reply('You haven\'t started your adventure yet! Use `!start` to begin.');
        }
        
        // Regenerate stamina before showing
        await player.regenerateStamina();
        
        // Get team composition
        const team = player.servants
            .filter(s => s.PlayerServant.isInTeam)
            .sort((a, b) => a.PlayerServant.slot - b.PlayerServant.slot);
        
        // Calculate experience needed for next level
        const expNeeded = player.level * 100;
        const expProgress = Math.floor((player.experience / expNeeded) * 100);
        
        // Create profile embed
        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle(`${message.author.username}'s Profile`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: '📊 Level', value: `Level ${player.level} (${expProgress}%)`, inline: true },
                { name: '⚡ Stamina', value: `${player.stamina}/${player.maxStamina}`, inline: true },
                { name: '🏔️ Current Floor', value: player.currentFloor, inline: true },
                { name: '💰 Gold', value: player.gold.toLocaleString(), inline: true },
                { name: '💎 Gems', value: player.gems.toLocaleString(), inline: true },
                { name: '⚔️ Battles Won', value: player.totalBattlesWon.toString(), inline: true }
            );
        
        // Add team composition
        if (team.length > 0) {
            const teamValue = team.map((s, i) => 
                `**Slot ${i + 1}:** ${s.name} (Lv.${s.PlayerServant.level} | Bond ${s.PlayerServant.bondLevel})`
            ).join('\n');
            embed.addFields({ name: '👥 Current Team', value: teamValue });
        }
        
        // Add servant collection info
        embed.addFields({
            name: '📚 Collection',
            value: `Total Servants: ${player.servants.length}\n4★: ${player.servants.filter(s => s.rarity === 4).length} | 5★: ${player.servants.filter(s => s.rarity === 5).length} | 6★: ${player.servants.filter(s => s.rarity === 6).length}`
        });
        
        await message.reply({ embeds: [embed] });
    }
};