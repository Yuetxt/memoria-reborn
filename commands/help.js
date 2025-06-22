const { EmbedBuilder } = require('discord.js');
const { prefix } = require('../config.json');

module.exports = {
    name: 'help',
    description: 'List all commands or info about a specific command',
    aliases: ['commands', 'h'],
    cooldown: 3,
    execute(message, args) {
        const { commands } = message.client;
        
        if (!args.length) {
            // General help
            const embed = new EmbedBuilder()
                .setColor('#00D9FF')
                .setTitle('📚 Memoria Lost Commands')
                .setDescription(`Use \`${prefix}help [command]\` for detailed info about a command`)
                .addFields(
                    {
                        name: '🎮 Basic Commands',
                        value: '`start` - Begin your adventure\n`profile` - View your stats\n`help` - Show this menu'
                    },
                    {
                        name: '⚔️ Battle Commands',
                        value: '`battle` - Fight in the Babel Tower\n`team` - Manage your team\n`servants` - View your collection'
                    },
                    {
                        name: '🎰 Gacha & Shop',
                        value: '`summon` - Summon new servants\n`shop` - Buy items\n`inventory` - View your items'
                    },
                    {
                        name: '🔧 Management',
                        value: '`equip` - Equip items to servants\n`bond` - View servant bonds\n`daily` - Claim daily rewards'
                    }
                )
                .setFooter({ text: 'Climb the Babel Tower and defeat the gods!' });
            
            return message.reply({ embeds: [embed] });
        }
        
        // Specific command help
        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
        
        if (!command) {
            return message.reply('That\'s not a valid command!');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#00D9FF')
            .setTitle(`Command: ${prefix}${command.name}`)
            .setDescription(command.description);
        
        if (command.aliases) {
            embed.addFields({ name: 'Aliases', value: command.aliases.join(', '), inline: true });
        }
        
        if (command.cooldown) {
            embed.addFields({ name: 'Cooldown', value: `${command.cooldown} seconds`, inline: true });
        }
        
        message.reply({ embeds: [embed] });
    }
};