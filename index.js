const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config.json');
const Database = require('./database/Database');
const {getCommands} = require("./utils/commands");

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ]
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.slashCommands = new Collection();
// Load slash commands

const foldersPath = path.join(__dirname, 'slash_commands');
getCommands(foldersPath).then((c)=>{
    client.slashCommands = c.collection
})

// const commandFolders = fs.readdirSync(foldersPath);
//
// for (const folder of commandFolders) {
//     const commandsPath = path.join(foldersPath, folder);
//     const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
//     for (const file of commandFiles) {
//         const filePath = path.join(commandsPath, file);
//         const command = require(filePath);
//         // Set a new item in the Collection with the key as the command name and the value as the exported module
//         if ('data' in command && 'execute' in command) {
//             client.slashCommands.set(command.data.name, command);
//         } else {
//             console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
//         }
//     }
// }

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Initialize database
Database.initialize();

// Login to Discord
client.login(token);