import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {Player} from "../database/models/Player";


module.exports = {
    data: new SlashCommandBuilder().setName("start").setDescription("Start a new game"),
    playerRequired: false,
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {

        if (player) {
            return interaction.reply('You have already started your adventure!', {ephemeral: true});
        }

        const newPlayer = Player.build({
            discordId: interaction.user.id,
            lvl: 1,
            xp: 0,
            stamina: 100,
        });
        await newPlayer.save();

        await interaction.reply('You have started your adventure!', {ephemeral: true});
    }
}