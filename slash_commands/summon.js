const {SlashCommandBuilder, ContainerBuilder, MessageFlags} = require("discord.js");
const {summonServant} = require("../utils/gacha");
const {Servant} = require("../database/models/Servant");
const {Player} = require("../database/models/Player");
const {getServantData} = require("../utils/battle/setup");
const {staticUrl} = require("../config.json")
const gachaConfig = require("../config/gacha.json")
module.exports = {
    data: new SlashCommandBuilder().setName("summon").setDescription("Summon a servant"),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        const n = 5
        const summoned = Array.from({length: n}, (i) => {
            const {id, rarity} = summonServant(player.pulls || 0)
            return {
                ...getServantData(id),
                rarity
            }
        })

        await Servant.bulkCreate(summoned.map((s) => {
            return {
                servant_id: s.id,
                rarity: s.rarity,
                playerId: player.discordId,
            }
        }))
        if (!summoned.some(s => s.rarity === gachaConfig.rarityDropRates.length - 1)) {
            player.pulls = (player.pulls || 0) + n
        } else {
            player.pulls = 0
        }
        await player.save()


        const servantTexts = summoned.map((s) => {
            return `**${s.name}** ${gachaConfig.rarityChar.repeat(s.rarity + gachaConfig.baseRarity)}`
        })
        console.log("PLEASE", staticUrl, summoned[0].art)
        const container = new ContainerBuilder()
            .addTextDisplayComponents((txt) => txt.setContent(`# Pack opened !`))
            .addTextDisplayComponents((txt) => txt.setContent(`You summoned the following characters :\n${servantTexts.join("\n")}`))
            .addMediaGalleryComponents((media) => media.addItems(...summoned.map((s) => {
                return (item) => item.setURL(`${s.art}`)
            })))
        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        })
    }
}