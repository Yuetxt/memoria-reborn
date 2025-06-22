// Directory: /memoria-lost-bot/commands/admin.js
// Admin-only command for testing and debugging

const { EmbedBuilder } = require('discord.js');
const { Player, Servant, Item, PlayerServant, PlayerItem } = require('../database/Database');
const { ownerId } = require('../config.json');
const { Op } = require('sequelize');

module.exports = {
    name: 'admin',
    description: 'Admin commands for testing (Owner only)',
    aliases: ['test', 'debug'],
    cooldown: 0,
    async execute(message, args) {
        // Check if user is the bot owner
        if (message.author.id !== ownerId) {
            return message.reply('This command is only available to the bot owner.');
        }
        
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔧 Admin Commands')
                .setDescription('Available admin commands for testing:')
                .addFields(
                    { name: '`!admin give gold <amount>`', value: 'Give yourself gold' },
                    { name: '`!admin give gems <amount>`', value: 'Give yourself gems' },
                    { name: '`!admin give servant <id/name>`', value: 'Give yourself a specific servant' },
                    { name: '`!admin give item <id/name>`', value: 'Give yourself a specific item' },
                    { name: '`!admin give allservants`', value: 'Give yourself ALL servants' },
                    { name: '`!admin give allitems`', value: 'Give yourself ALL items' },
                    { name: '`!admin set level <level>`', value: 'Set your level (1-99)' },
                    { name: '`!admin set floor <floor>`', value: 'Set current floor (e.g., 5-8)' },
                    { name: '`!admin set stamina <amount>`', value: 'Set stamina amount' },
                    { name: '`!admin reset`', value: 'Reset your account completely' },
                    { name: '`!admin info`', value: 'Show debug information' },
                    { name: '`!admin maxservant <name>`', value: 'Max out a servant (Lv99, Bond 15)' },
                    { name: '`!admin simulate battle`', value: 'Simulate a battle with current team' }
                )
                .setFooter({ text: 'Use with caution!' });
            
            return message.reply({ embeds: [helpEmbed] });
        }
        
        // Get player
        let player = await Player.findOne({
            where: { discordId: message.author.id },
            include: [
                {
                    model: Servant,
                    as: 'servants'
                },
                {
                    model: Item,
                    as: 'items'
                }
            ]
        });
        
        if (!player && args[0] !== 'reset') {
            return message.reply('You need to use `!start` first to create an account.');
        }
        
        const subCommand = args[0].toLowerCase();
        
        switch (subCommand) {
            case 'give':
                await handleGive(message, args, player);
                break;
                
            case 'set':
                await handleSet(message, args, player);
                break;
                
            case 'reset':
                await handleReset(message, player);
                break;
                
            case 'info':
                await handleInfo(message, player);
                break;
                
            case 'maxservant':
                await handleMaxServant(message, args, player);
                break;
                
            case 'simulate':
                await handleSimulate(message, args, player);
                break;
                
            default:
                message.reply('Invalid subcommand. Use `!admin` to see available commands.');
        }
    }
};

async function handleGive(message, args, player) {
    const giveType = args[1]?.toLowerCase();
    
    switch (giveType) {
        case 'gold':
            const goldAmount = parseInt(args[2]) || 10000;
            player.gold += goldAmount;
            await player.save();
            message.reply(`✅ Added ${goldAmount.toLocaleString()} gold. New balance: ${player.gold.toLocaleString()}`);
            break;
            
        case 'gems':
            const gemAmount = parseInt(args[2]) || 1000;
            player.gems += gemAmount;
            await player.save();
            message.reply(`✅ Added ${gemAmount.toLocaleString()} gems. New balance: ${player.gems.toLocaleString()}`);
            break;
            
        case 'servant':
            const servantQuery = args.slice(2).join(' ');
            if (!servantQuery) {
                return message.reply('Please specify a servant name or ID.');
            }
            
            const servant = await Servant.findOne({
                where: isNaN(servantQuery) 
                    ? { name: { [require('sequelize').Op.like]: `%${servantQuery}%` } }
                    : { id: parseInt(servantQuery) }
            });
            
            if (!servant) {
                return message.reply('Servant not found.');
            }
            
            const [ps, created] = await PlayerServant.findOrCreate({
                where: {
                    PlayerId: player.id,
                    ServantId: servant.id
                },
                defaults: {
                    level: 1,
                    bondLevel: 1
                }
            });
            
            if (created) {
                message.reply(`✅ Added **${servant.name}** (${servant.rarity}★) to your collection!`);
            } else {
                ps.bondExp += 500;
                if (ps.bondExp >= ps.bondLevel * 200) {
                    ps.bondLevel = Math.min(15, ps.bondLevel + 1);
                    ps.bondExp = 0;
                }
                await ps.save();
                message.reply(`✅ You already have **${servant.name}**. Added bond experience instead.`);
            }
            break;
            
        case 'item':
            const itemQuery = args.slice(2).join(' ');
            if (!itemQuery) {
                return message.reply('Please specify an item name or ID.');
            }
            
            const item = await Item.findOne({
                where: isNaN(itemQuery) 
                    ? { name: { [require('sequelize').Op.like]: `%${itemQuery}%` } }
                    : { id: parseInt(itemQuery) }
            });
            
            if (!item) {
                return message.reply('Item not found.');
            }
            
            const [pi, itemCreated] = await PlayerItem.findOrCreate({
                where: {
                    PlayerId: player.id,
                    ItemId: item.id
                },
                defaults: {
                    quantity: 1
                }
            });
            
            if (!itemCreated) {
                pi.quantity += 1;
                await pi.save();
            }
            
            message.reply(`✅ Added **${item.name}** (${item.rarity}★ ${item.type}) to your inventory!`);
            break;
            
        case 'allservants':
            const allServants = await Servant.findAll();
            let addedCount = 0;
            
            for (const servant of allServants) {
                const [ps, created] = await PlayerServant.findOrCreate({
                    where: {
                        PlayerId: player.id,
                        ServantId: servant.id
                    },
                    defaults: {
                        level: 1,
                        bondLevel: 1
                    }
                });
                if (created) addedCount++;
            }
            
            message.reply(`✅ Added ${addedCount} new servants to your collection! You now have all ${allServants.length} servants.`);
            break;
            
        case 'allitems':
            const allItems = await Item.findAll();
            let itemsAdded = 0;
            
            for (const item of allItems) {
                const [pi, created] = await PlayerItem.findOrCreate({
                    where: {
                        PlayerId: player.id,
                        ItemId: item.id
                    },
                    defaults: {
                        quantity: 5
                    }
                });
                if (created) itemsAdded++;
            }
            
            message.reply(`✅ Added ${itemsAdded} new items to your inventory! You now have all ${allItems.length} items.`);
            break;
            
        default:
            message.reply('Invalid give type. Options: gold, gems, servant, item, allservants, allitems');
    }
}

async function handleSet(message, args, player) {
    const setType = args[1]?.toLowerCase();
    
    switch (setType) {
        case 'level':
            const level = Math.min(99, Math.max(1, parseInt(args[2]) || 1));
            player.level = level;
            player.maxStamina = 100 + (level - 1) * 10;
            await player.save();
            message.reply(`✅ Set level to ${level}. Max stamina is now ${player.maxStamina}.`);
            break;
            
        case 'floor':
            const floor = args[2] || '1-1';
            if (!/^\d+-\d+$/.test(floor)) {
                return message.reply('Invalid floor format. Use format like: 5-8');
            }
            player.currentFloor = floor;
            await player.save();
            message.reply(`✅ Set current floor to ${floor}.`);
            break;
            
        case 'stamina':
            const stamina = parseInt(args[2]) || player.maxStamina;
            player.stamina = Math.min(stamina, player.maxStamina);
            await player.save();
            message.reply(`✅ Set stamina to ${player.stamina}/${player.maxStamina}.`);
            break;
            
        default:
            message.reply('Invalid set type. Options: level, floor, stamina');
    }
}

async function handleReset(message, player) {
    if (!player) {
        return message.reply('No account to reset.');
    }
    
    // Delete all player data
    await PlayerServant.destroy({ where: { PlayerId: player.id } });
    await PlayerItem.destroy({ where: { PlayerId: player.id } });
    await player.destroy();
    
    message.reply('✅ Your account has been completely reset. Use `!start` to begin again.');
}

async function handleInfo(message, player) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔍 Debug Information')
        .addFields(
            { name: 'Player ID', value: player.id.toString(), inline: true },
            { name: 'Discord ID', value: player.discordId, inline: true },
            { name: 'Account Created', value: player.createdAt.toLocaleString(), inline: true },
            { name: 'Total Servants', value: player.servants.length.toString(), inline: true },
            { name: 'Total Items', value: player.items.length.toString(), inline: true },
            { name: 'Battles Won', value: player.totalBattlesWon.toString(), inline: true }
        );
    
    // Get team info
    const team = await PlayerServant.findAll({
        where: {
            PlayerId: player.id,
            isInTeam: true
        },
        include: [Servant],
        order: [['slot', 'ASC']]
    });
    
    if (team.length > 0) {
        const teamInfo = team.map(ps => 
            `Slot ${ps.slot}: ${ps.Servant.name} (Lv.${ps.level})`
        ).join('\n');
        embed.addFields({ name: 'Current Team', value: teamInfo || 'No team set' });
    }
    
    // Database stats
    const totalServants = await Servant.count();
    const totalItems = await Item.count();
    const totalPlayers = await Player.count();
    
    embed.addFields(
        { name: '\n📊 Database Stats', value: '\u200B' },
        { name: 'Total Servants in DB', value: totalServants.toString(), inline: true },
        { name: 'Total Items in DB', value: totalItems.toString(), inline: true },
        { name: 'Total Players', value: totalPlayers.toString(), inline: true }
    );
    
    message.reply({ embeds: [embed] });
}

async function handleMaxServant(message, args, player) {
    const servantName = args.slice(1).join(' ');
    if (!servantName) {
        return message.reply('Please specify a servant name.');
    }
    
    const playerServant = await PlayerServant.findOne({
        where: {
            PlayerId: player.id
        },
        include: [{
            model: Servant,
            where: {
                name: { [Op.like]: `%${servantName}%` }
            }
        }]
    });
    
    if (!playerServant) {
        return message.reply('You don\'t have that servant in your collection.');
    }
    
    playerServant.level = 99;
    playerServant.bondLevel = 15;
    playerServant.experience = 0;
    playerServant.bondExp = 0;
    await playerServant.save();
    
    message.reply(`✅ **${playerServant.Servant.name}** is now Level 99 with Bond Level 15!`);
}

async function handleSimulate(message, args, player) {
    if (args[1]?.toLowerCase() !== 'battle') {
        return message.reply('Use `!admin simulate battle` to simulate a battle.');
    }
    
    const team = await PlayerServant.findAll({
        where: {
            PlayerId: player.id,
            isInTeam: true
        },
        include: [Servant],
        order: [['slot', 'ASC']]
    });
    
    if (team.length === 0) {
        return message.reply('You need to set up a team first with `!team`');
    }
    
    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⚔️ Battle Simulation')
        .setDescription('Simulating battle on floor ' + player.currentFloor);
    
    // Calculate team power
    let totalPower = 0;
    const teamInfo = [];
    
    for (const ps of team) {
        const stats = await ps.calculateStats();
        const power = stats.atk + stats.def + (stats.hp / 10) + stats.spd;
        totalPower += power;
        teamInfo.push(`${ps.Servant.name}: Power ${Math.floor(power)}`);
    }
    
    embed.addFields(
        { name: 'Team Composition', value: teamInfo.join('\n') },
        { name: 'Total Team Power', value: Math.floor(totalPower).toString() },
        { name: 'Recommended Floor', value: `${Math.floor(totalPower / 200)}-${Math.floor(Math.random() * 10) + 1}` }
    );
    
    // Simulate battle outcome
    const winChance = Math.min(95, 50 + (totalPower / 50));
    const result = Math.random() * 100 < winChance ? 'Victory' : 'Defeat';
    
    embed.addFields(
        { name: 'Win Chance', value: `${Math.floor(winChance)}%` },
        { name: 'Simulated Result', value: result }
    );
    
    message.reply({ embeds: [embed] });
}