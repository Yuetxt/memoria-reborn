const { EmbedBuilder } = require('discord.js');
const { Player, Servant } = require('../database/Database');

module.exports = {
    name: 'bond',
    description: 'View servant bond levels',
    aliases: ['bonds', 'affinity'],
    cooldown: 3,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [{
                model: Servant,
                as: 'servants',
                through: {
                    attributes: ['bondLevel', 'bondExp']
                }
            }]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        if (player.servants.length === 0) {
            return message.reply('You don\'t have any servants yet!');
        }
        
        // Sort by bond level
        const sortedServants = player.servants.sort((a, b) => 
            b.PlayerServant.bondLevel - a.PlayerServant.bondLevel
        );
        
        const embed = new EmbedBuilder()
            .setColor('#E91E63')
            .setTitle('💕 Servant Bond Levels')
            .setDescription('Build bonds with your servants by using them in battle!')
            .setFooter({ text: 'Max bond level: 15 | Each level gives +1% to all stats' });
        
        sortedServants.slice(0, 10).forEach(servant => {
            const bondProgress = Math.floor((servant.PlayerServant.bondExp / (servant.PlayerServant.bondLevel * 200)) * 100);
            const progressBar = createProgressBar(bondProgress);
            
            embed.addFields({
                name: `${servant.name} (${servant.rarity}★)`,
                value: `Bond Level: ${servant.PlayerServant.bondLevel}/15\n${progressBar} ${bondProgress}%`,
                inline: true
            });
        });
        
        await message.reply({ embeds: [embed] });
    }
};

function createProgressBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}