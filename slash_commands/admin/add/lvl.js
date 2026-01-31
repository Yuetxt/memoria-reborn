const {SlashCommandSubcommandBuilder, userMention, EmbedBuilder} = require("discord.js");
const {Player} = require("../../../database/models/Player");
const {calculateXp, getMaxLvl} = require("../../../utils/xp");
module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("lvl")
        .setDescription("Add lvl to player")
        .addNumberOption(o => o.setName("lvl").setRequired(true).setDescription("Lvl to add, negative to remove"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player to add xp")),
    execute: async (interaction, _) => {
        const lvl = interaction.options.getNumber("lvl")
        const discordUser = interaction.options.getUser("player") || interaction.user
        const discordId = discordUser.id
        const player = await Player.findOne({where: {discordId}})
        if (!player) {
            return interaction.reply({content: "Player not found", ephemeral: true})
        }
        const baseLevel = player.lvl
        player.lvl = Math.min(getMaxLvl("player"), Math.max(1, player.lvl + lvl))
        player.xp = calculateXp(player.lvl, "player")
        await player.save()

        // UI
        const embed = new EmbedBuilder()
            .setTitle(discordUser.displayName).setThumbnail(discordUser.displayAvatarURL())
            .setDescription(`${interaction.user} ${lvl > 0 ? "gains": "loses"} **${Math.abs(lvl)} levels** ! `)
            .addFields({
                name: "📊 Level",
                value: `_${baseLevel}_ -> **${player.lvl}**`
            })

        interaction.reply({
            embeds: [embed],
        })
    }
}