const {
    SlashCommandSubcommandBuilder,
    userMention,
    MessageFlags,
    ActionRowBuilder,
    ContainerBuilder, StringSelectMenuBuilder, SectionBuilder
} = require("discord.js");
const {Player} = require("../../../database/models/Player");
const {Servant} = require("../../../database/models/Servant");
const {StringSelectMenuMultiplePagesBuilder} = require("../../../utils/components/multipageselect");

module.exports = {
    data: new SlashCommandSubcommandBuilder()
        .setName("bond_xp")
        .setDescription("Set bond xp to a servant")
        .addNumberOption(o => o.setName("xp").setRequired(true).setDescription("Bond xp to set"))
        .addStringOption(o => o.setName("servant_id").setRequired(false).setDescription("Id of the servant"))
        .addUserOption(o => o.setName("player").setRequired(false).setDescription("Player that own the servant")),
    execute: async (interaction, _) => {
        await interaction.deferReply({
            ephemeral: true
        })
        const xp = interaction.options.getNumber("xp")
        const discordUser = interaction.options.getUser("player") || interaction.user
        const discordId = discordUser.id
        const servantId = interaction.options.getString("servant_id")


        let servants;
        if (!servantId) {
            // Selector
            servants = await Servant.findAll({
                where: {
                    playerId: discordId
                }
            })
        } else {
            servants = await Servant.findAll({
                where: {
                    servant_id: servantId,
                    playerId: discordId
                }
            })
        }
        /// Select among the servants
        if (servants.length === 0) {
            return interaction.reply({
                content: "No servants found",
                ephemeral: true
            })

        }
        const id = interaction.id
        console.log(servants.map(s => s.id))
        servants.map(s => s.populateBaseData())
        servants = servants.sort((a, b) => a.data.name.localeCompare(b.data.name))
        const selector = new StringSelectMenuMultiplePagesBuilder()
            .setCustomId(id)
            .setActualPlaceholder(`Select a servant`)
            .addRealOptions(
                ...servants.map(servant => ({
                    label: servant.data.name,
                    value: servant.id.toString(),
                    description: `Card ID : ${servant.id} | Bond Lvl : ${servant.bondLvl} (${Math.round(servant.getBondXpProgress().progress * 100)}%) | Bond Xp : ${servant.bondXp}`,
                }))
            )

        const row = new ActionRowBuilder().addComponents(selector)
        const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(`Select a servant to set bond xp to **${xp}** !`)).addActionRowComponents(row)
        const collector = interaction.channel.createMessageComponentCollector({
            time: 60000,
            filter: (interaction) => interaction.customId === id
        })
        collector.on("collect", async (i) => {
            const servant_id = await selector.handleInteraction(i)
            i.deferUpdate()
            const servant = servants.find(s => s.id === parseInt(servant_id))

            if (!servant) {
                const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent("Select a servant")).addActionRowComponents(row)
                interaction.editReply({
                    components: [container],
                })
                return
            }

            if (!servant) return

            servants = [servant]
            collector.stop()
        })
        collector.on("end", async (i) => {
            if (servants.length !== 1) {
                interaction.deleteReply()
            } else {
                const servant = servants[0]
                const baseProgress = servant.getBondXpProgress()
                const baseLevel = servant.bondLvl
                servant.bondXp = Math.max(0, xp)
                servant.calculateBondLvl()
                await servant.save()
                interaction.deleteReply()
                interaction.followUp({
                    components: [
                        new ContainerBuilder().addSectionComponents(
                            new SectionBuilder().setThumbnailAccessory(t => t.setURL(servant.data.art))
                                .addTextDisplayComponents(t => t.setContent(`### ${servant.data.name}`))
                                .addTextDisplayComponents(t => t.setContent(`**Owned by** : ${discordUser} (ID : ${servant.id})`))
                                .addTextDisplayComponents(t => t.setContent(`**Bond Lvl **: ${baseLevel} (${Math.round(baseProgress.progress * 100)}%) -> **${servant.bondLvl} (${Math.round(servant.getBondXpProgress().progress * 100)}%)**`))
                        )
                    ],
                    flags: MessageFlags.IsComponentsV2,
                })
            }
        })

        if (servants.length === 1) collector.stop()
        else
            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                withResponse: true,

            })
    }
}