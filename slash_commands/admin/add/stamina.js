const {SlashCommandSubcommandBuilder, userMention} = require("discord.js");
const {Player} = require("../../../database/models/Player");
module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("stamina")
        .setDescription("Set player stamina")
        .addNumberOption(o => o.setName("stamina").setRequired(true).setDescription("Stamina to set"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player to set stamina")),
    execute: async (interaction, _) => {
        const stamina = interaction.options.getNumber("stamina")
        const discordId = interaction.options.getUser("player")?.user.id || interaction.user.id
        const player = await Player.findOne({where: {discordId}})
        if (!player) {
            return interaction.reply({content: "Player not found", ephemeral: true})
        }
        player.stamina += stamina
        await player.save()
        interaction.reply({
            content: `Player ${userMention(player.discordId)} ${stamina > 0 ? "gains": "loses"} ${Math.abs(stamina)} stamina !`,
            ephemeral: true
        })
    }
}