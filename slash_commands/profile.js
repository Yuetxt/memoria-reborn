const {SlashCommandBuilder, ContainerBuilder, MessageFlags, EmbedBuilder} = require("discord.js");
const {summonServant} = require("../utils/gacha");
const {Servant} = require("../database/models/Servant");
const {Player} = require("../database/models/Player");
const {getServantData} = require("../utils/battle/setup");
const {staticUrl} = require("../config.json")
const gachaConfig = require("../config/gacha.json")
const {calculateXp} = require("../utils/xp");


module.exports = {
    data: new SlashCommandBuilder().setName("profile").setDescription("Show your profile"),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        console.log(player, player.xp)
        const expNeeded = calculateXp(player.lvl + 1, "player");
        const expProgress = Math.floor((player.xp / expNeeded) * 100);


        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle(`${interaction.member.name || interaction.user.displayName}'s Profile`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '📊 Level', value: `Level ${player.lvl} (${player.getXpProgress().progress*100}%)`, inline: true },
                // { name: '⚡ Stamina', value: `${player.stamina}/${player.maxStamina }`, inline: true }, // TODO : integrate stamina increase
                { name: '🏔️ Current Floor', value: player.floor, inline: true },
                { name: '💰 Gold', value: player.gold.toLocaleString(), inline: true },
                // { name: '💎 Gems', value: player.gems.toLocaleString(), inline: true },
                // { name: '⚔️ Battles Won', value: player.totalBattlesWon.toString(), inline: true }
            );

        await interaction.reply({
            embeds: [embed],
        })
    }
}