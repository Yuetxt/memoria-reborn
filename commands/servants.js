const { EmbedBuilder } = require('discord.js');
const { Player, Servant } = require('../database/Database');

module.exports = {
    name: 'servants',
    description: 'View your servant collection',
    aliases: ['collection', 'roster'],
    cooldown: 3,
    async execute(message, args) {
        const player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [{
                model: Servant,
                as: 'servants',
                through: {
                    attributes: ['level', 'bondLevel', 'experience']
                }
            }]
        });
        
        if (!player) {
            return message.reply('You need to start your adventure first! Use `!start`');
        }
        
        if (player.servants.length === 0) {
            return message.reply('You don\'t have any servants yet!');
        }
        
        // Sort servants by rarity and level
        const sortedServants = player.servants.sort((a, b) => {
            if (b.rarity !== a.rarity) return b.rarity - a.rarity;
            return b.PlayerServant.level - a.PlayerServant.level;
        });
        
        // Paginate if necessary
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        const totalPages = Math.ceil(sortedServants.length / perPage);
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        const displayServants = sortedServants.slice(start, end);
        
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`${message.author.username}'s Servant Collection`)
            .setDescription(`Total Servants: ${player.servants.length}`)
            .setFooter({ text: `Page ${page}/${totalPages} | Use !servants [page] to navigate` });
        
        displayServants.forEach((servant, index) => {
            const stars = '★'.repeat(servant.rarity);
            const elementEmoji = getElementEmoji(servant.element);
            embed.addFields({
                name: `${start + index + 1}. ${servant.name} ${stars}`,
                value: `Level: ${servant.PlayerServant.level} | Bond: ${servant.PlayerServant.bondLevel}/15\n${elementEmoji} ${servant.element} | ${servant.role}`,
                inline: true
            });
        });
        
        await message.reply({ embeds: [embed] });
    }
};

function getElementEmoji(element) {
    const emojis = {
        fire: '🔥',
        water: '💧',
        earth: '⛰️',
        wind: '🍃',
        electric: '⚡',
        ice: '❄️',
        light: '🌟',
        dark: '🌑'
    };
    return emojis[element] || '❓';
}