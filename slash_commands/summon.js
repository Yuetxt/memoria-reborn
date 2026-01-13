const {
    SlashCommandBuilder, ContainerBuilder, MessageFlags, SectionBuilder, ActionRow, ActionRowBuilder, ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const {summonServant} = require("../utils/gacha");
const {Servant} = require("../database/models/Servant");
const {Player} = require("../database/models/Player");
const {getServantData} = require("../utils/battle/setup");
const {staticUrl} = require("../config.json")
const gachaConfig = require("../config/gacha.json")
const {MultiPageMessageBuilder} = require("../utils/components/multipageEmbed");
module.exports = {
    data: new SlashCommandBuilder().setName("summon").setDescription("Summon a servant"),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Player} player
     */
    async execute(interaction, player) {
        const n = 20
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


        const messageBuilder = new MultiPageMessageBuilder().setItemCount(summoned.length)
            .setChunk(5)
            .setMessageBuilder((s, e) => {
                let sections = summoned.slice(s, e).map((s) => new SectionBuilder()
                    .setThumbnailAccessory(t => t.setURL(`${s.art}`))
                    .addTextDisplayComponents(t => t.setContent(`### ${s.name}`))
                    .addTextDisplayComponents(t => t.setContent(`${s.element.toLocaleUpperCase()} _${s.role}_`))
                    .addTextDisplayComponents(t => t.setContent(`${gachaConfig.rarityChar.repeat(s.rarity + gachaConfig.baseRarity)}`)))

                return [new ContainerBuilder()
                    .addTextDisplayComponents((txt) => txt.setContent(`# Pack opened !`))
                    .addTextDisplayComponents((txt) => txt.setContent(`You summoned the following characters`))
                    .addSectionComponents(...sections)]
        })

        await messageBuilder.applyToInteraction(interaction, {ephemeral: true})
    }
}