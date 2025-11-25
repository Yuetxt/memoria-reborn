const {SlashCommandSubcommandBuilder, userMention} = require("discord.js");
const {Player} = require("../../../database/models/Player");
module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("gold")
        .setDescription("Set player gold")
        .addNumberOption(o => o.setName("gold").setRequired(true).setDescription("Gold to set"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player to set gold")),
    execute: async (interaction, _) => {
        const gold = interaction.options.getNumber("gold")
        const discordId = interaction.options.getUser("player")?.user.id || interaction.user.id
        const player = await Player.findOne({where: {discordId}})
        if (!player) {
            return interaction.reply({content: "Player not found", ephemeral: true})
        }
        player.gold = gold
        await player.save()
        interaction.reply({
            content: `Player ${userMention(player.discordId)} gold set to ${gold}`,
            ephemeral: true
        })
    }
}