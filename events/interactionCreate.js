const {MessageFlags} = require("discord.js");
const {Player} = require("../database/models/Player");
module.exports = {
    name: 'interactionCreate',
    async execute(interaction,) {
        if (!interaction.isChatInputCommand()) return;
        const client = interaction.client;
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand(false);
        let name = interaction.commandName;
        if (group !== null) {
            name = `${name}__${group}`;
        }
        if (sub !== null) {
            name = `${name}__${sub}`;
        }
        const command = client.slashCommands.get(name);



        // const command = interaction.client.slashCommands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        const player = await Player.findByPk(interaction.user.id);
        if (command.playerRequired !== false && !player) {
            return interaction.reply({
                content: 'You must start your adventure before using this command! Use `!start` to begin.',
                flags: MessageFlags.Ephemeral
            });
        }
        try {
            await command.execute(interaction, player);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};