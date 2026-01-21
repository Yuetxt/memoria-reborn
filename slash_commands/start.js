import {ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder} from "discord.js";
import {Player} from "../database/models/Player";
import {welcomeText} from "../config/misc.json"

module.exports = {
    data: new SlashCommandBuilder().setName("start").setDescription("Start a new game"),
    playerRequired: false,
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        if (player) {
            return interaction.reply({
                content: "You have already started your adventure !",
                flags:  MessageFlags.Ephemeral,});
        }

        const newPlayer = Player.build({
            discordId: interaction.user.id,
            lvl: 1,
            xp: 0,
            stamina: 100,
            gold: 100000
        });
        await newPlayer.save();

        const text = welcomeText.replace("[discord nickname]", `**${interaction.user.displayName}**`);
        const embed = new EmbedBuilder()
            .setTitle("Welcome !")
            .setDescription(text)
            .setColor("Green");
        await interaction.reply({
            embeds: [embed],
            flags:  MessageFlags.Ephemeral,});

    }
}