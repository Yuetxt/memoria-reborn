const {SlashCommandBuilder, ContainerBuilder, MessageFlags, EmbedBuilder} = require("discord.js");
const {summonServant} = require("../utils/gacha");
const {Servant} = require("../database/models/Servant");
const {Player} = require("../database/models/Player");
const {getServantData} = require("../utils/battle/setup");
const {staticUrl} = require("../config.json")
const gachaConfig = require("../config/gacha.json")
const {calculateXp} = require("../utils/xp");
const {Op} = require("sequelize");


module.exports = {
    data: new SlashCommandBuilder().setName("profile").setDescription("Show your profile"),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        const expNeeded = calculateXp(player.lvl + 1, "player");
        const expProgress = Math.floor((player.xp / expNeeded) * 100);


        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle(`${interaction.user.displayName}'s Profile`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '📊 Level', value: `Level ${player.lvl} (${(player.getXpProgress().progress*100).toFixed(0)}%)`, inline: true },
                { name: '⚡ Stamina', value: `${player.stamina}/${player.maxStamina }`, inline: true }, // TODO : integrate stamina increase
                { name: '🏔️ Current Floor', value: player.floor, inline: true },
                { name: '💰 Gold', value: player.gold.toLocaleString(), inline: true },
                { name: '💎 Gems', value: player.gems.toLocaleString(), inline: true },
                { name: '⚔️ Battles Won', value: "0", inline: true }
            );

        const team = await Servant.findAll({
            where: {
                playerId: interaction.user.id,
                teamSlot: {[Op.gt]: -1}
            }
        })
        if (team.length > 0) {
            const teamValue = team.map((s, i) => {
                const data = getServantData(s.servant_id)
                console.log("DATA", data)
                return `**Slot ${i + 1}:** ${data.name} (Lv.${s.lvl} | Bond ${s.bondLvl})`
                }
            ).join('\n');
            embed.addFields({ name: '👥 Current Team', value: teamValue });
        }
        const servants = await Servant.findAll({
            where: {playerId: interaction.user.id},
            attributes: ["rarity"]
        })


        embed.addFields({
            name: '📚 Collection',
            value: `Total Servants: ${servants.length}\n4★: ${servants.filter(s => s.rarity === 0).length} | 5★: ${servants.filter(s => s.rarity === 1).length} | 6★: ${servants.filter(s => s.rarity === 2).length}`
        });
        console.log("TEAM", team)
        await interaction.reply({
            embeds: [embed],
            allowedMentions: {users: []}
        })
    }
}