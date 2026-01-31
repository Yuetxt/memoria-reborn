const {SlashCommandSubcommandBuilder, userMention, EmbedBuilder} = require("discord.js");
const {Player} = require("../../../database/models/Player");
const {calculateXp} = require("../../../utils/xp");
module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("xp")
        .setDescription("Add xp to player")
        .addNumberOption(o => o.setName("xp").setRequired(true).setDescription("xp to add, negative to remove"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player to add xp")),
    execute: async (interaction, _) => {
        const xp = interaction.options.getNumber("xp")
        const discordUser = interaction.options.getUser("player") || interaction.user
        const discordId = discordUser.id
        const player = await Player.findOne({where: {discordId}})
        if (!player) {
            return interaction.reply({content: "Player not found", ephemeral: true})
        }
        const baseProgress = player.getXpProgress()
        const baseLevel = player.lvl
        player.xp = Math.max(0, player.xp + xp)
        player.calculateLvl()
        await player.save()

        const embed = new EmbedBuilder()
            .setTitle(discordUser.displayName).setThumbnail(discordUser.displayAvatarURL())
            .setDescription(`${interaction.user} ${xp > 0 ? "gains": "loses"} **${Math.abs(xp)} xp** ! `)
            .addFields({
                name: "📊 Level",
                value: `_${baseLevel} (${Math.round(baseProgress.progress*100)}%)_    ->   **${player.lvl} (${Math.round(player.getXpProgress().progress*100)}%)**`
            })

        interaction.reply({
            embeds: [embed],
        })
    }
}