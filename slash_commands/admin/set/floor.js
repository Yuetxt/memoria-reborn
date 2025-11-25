const {SlashCommandSubcommandBuilder, SlashCommandBuilder, SlashCommandSubcommandGroupBuilder, userMention} = require("discord.js");
const {validateFloor} = require("../../../utils/battle/utils");
const {Player} = require("../../../database/models/Player");

module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("floor")
        .setDescription("Set player floor")
        .addNumberOption(o => o.setName("floor").setRequired(true).setDescription("Floor to set"))
        .addNumberOption(o => o.setName("subfloor").setRequired(true).setDescription("Subfloor to set"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player to set floor")),
    execute: async (interaction, _) => {
        const floor = interaction.options.getNumber("floor")
        const sub = interaction.options.getNumber("subfloor")
        const f = `${floor}-${sub}`
        const discordId = interaction.options.getUser("player")?.user.id || interaction.user.id
        const player = await Player.findOne({where: {discordId}})
        if (!player) {
            return interaction.reply({content: "Player not found", ephemeral: true})
        }
        if (!validateFloor(f)) {
            return interaction.reply({content: "Floor is not valid", ephemeral: true})
        }
        player.floor = f
        await player.save()
        interaction.reply({content: `Player ${userMention(player.discordId)} floor set to ${floor}`, ephemeral: true})
    }
}