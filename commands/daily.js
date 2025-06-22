const { EmbedBuilder } = require('discord.js');
const { Player } = require('../database/Database');

module.exports = {
    name: 'daily',
    description: 'Claim your daily rewards',
    cooldown: 5,
    async execute(message) {
        const player = await Player.findOne({
            where: { discordId: message.author.id }
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        // Check last daily claim
        const lastClaim = player.lastDailyClaim ? new Date(player.lastDailyClaim) : null;
        const now = new Date();
        
        if (lastClaim) {
            const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
            if (hoursSinceLastClaim < 24) {
                const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
                return message.reply(`You've already claimed your daily reward! Come back in ${hoursRemaining} hours.`);
            }
        }
        
        // Give rewards
        const goldReward = 500 + (player.level * 50);
        const staminaReward = 50;
        
        player.gold += goldReward;
        player.stamina = Math.min(player.maxStamina, player.stamina + staminaReward);
        player.lastDailyClaim = now;
        await player.save();
        
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🎁 Daily Rewards Claimed!')
            .setDescription('Thanks for playing Memoria Lost!')
            .addFields(
                { name: '💰 Gold', value: `+${goldReward}`, inline: true },
                { name: '⚡ Stamina', value: `+${staminaReward}`, inline: true }
            )
            .setFooter({ text: 'Come back tomorrow for more rewards!' });
        
        await message.reply({ embeds: [embed] });
    }
};
