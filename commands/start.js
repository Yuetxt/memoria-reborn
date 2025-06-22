const { EmbedBuilder } = require('discord.js');
const { Player, Servant, PlayerServant } = require('../database/Database');

module.exports = {
    name: 'start',
    description: 'Start your Memoria Lost adventure!',
    cooldown: 5,
    async execute(message) {
        // Check if player already exists
        const existingPlayer = await Player.findOne({
            where: { discordId: message.author.id }
        });
        
        if (existingPlayer) {
            return message.reply('You have already started your adventure! Use `!profile` to view your progress.');
        }
        
        // Create new player
        const player = await Player.create({
            discordId: message.author.id,
            username: message.author.username
        });
        
        // Give starter servant (a random 4★ servant)
        const starterServants = await Servant.findAll({
            where: { rarity: 4 }
        });
        
        if (starterServants.length > 0) {
            const starterServant = starterServants[Math.floor(Math.random() * starterServants.length)];
            await PlayerServant.create({
                PlayerId: player.id,
                ServantId: starterServant.id,
                isInTeam: true,
                slot: 1
            });
            
            // Create welcome embed
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🎊 Welcome to Memoria Lost!')
                .setDescription(`**${message.author.username}**, your journey begins now!`)
                .addFields(
                    { name: '📖 Story', value: 'You stand before the legendary Babel Tower, where gods and goddesses guard each floor. Your mission is to climb to the top, defeating the deities and completing their trials.' },
                    { name: '⭐ Starter Servant', value: `You received **${starterServant.name}** (${starterServant.rarity}★ ${starterServant.element} ${starterServant.role})!` },
                    { name: '💫 Next Steps', value: '• Use `!profile` to view your stats\n• Use `!battle` to start climbing the tower\n• Use `!summon` to get more servants\n• Use `!help` for all commands' }
                )
                .setFooter({ text: 'May the gods favor your journey!' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
        }
    }
};
