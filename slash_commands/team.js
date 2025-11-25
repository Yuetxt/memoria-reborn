const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags
} = require("discord.js");
const {Servant} = require("../database/models/Servant");
const {getServantData} = require("../utils/battle/setup");
const {ELEMENT_EMOJI} = require("../utils/types/battle");
module.exports = {
    data: new SlashCommandBuilder().setName("team").setDescription("Manage your team"),
    async execute(interaction, player) {
        const servants = await Servant.findAll({where: {playerId: player.discordId}})
        const servantsData = Object.fromEntries(servants.map(s => {
            return [s.servant_id, getServantData(s.servant_id)]
        }))
        const slots = ["Frontline", "Midlane", "Midlane", "Backline"]
        const generateRows = () => {
            const menus = []
            for (let i = 0; i < slots.length; i++) {
                menus.push(new StringSelectMenuBuilder().setCustomId(`team-${player.id}-${i}`).setPlaceholder(slots[i]).addOptions([
                    ...servants.filter(s => s.teamSlot < 0 || s.teamSlot === i).map(s => ({
                        label: `${servantsData[s.servant_id].name}`,
                        description: `${servantsData[s.servant_id].role.toUpperCase()} | ${ELEMENT_EMOJI[servantsData[s.servant_id].element]} | lvl ${s.lvl}`,
                        value: s.id.toString(),
                        default: s.teamSlot === i,
                    })),
                    {
                        label: "empty",
                        value: "empty"
                    }
                ]))
            }
            return menus.map(m => new ActionRowBuilder().addComponents(m))
        }
        const generateContainer = () => {
            const container = new ContainerBuilder().addTextDisplayComponents(txt => txt.setContent("# Team composition"))
                .addActionRowComponents(generateRows())
            return container
        }

        // const rows = menus.map(m => new ActionRowBuilder().addComponents(m))
        await interaction.reply({
            components: [generateContainer()],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        })

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId.startsWith(`team-${player.id}`),
            time: 5 * 60_000
        })

        collector.on("collect", i => {
            i.deferUpdate()
            const [_, __, slot] = i.customId.split("-")
            const servantId = i.values[0]
            const currentServants = servants.filter(s => s.teamSlot === parseInt(slot))
            currentServants.map(s=>{
                s.teamSlot = -1
                s.save()
            })
            if (servantId !== "empty") {
                const servant = servants.find(s => s.id === parseInt(servantId))
                if (!servant || servant.teamSlot >= 0) return

                servant.teamSlot = parseInt(slot)
                servant.save()
            }



            interaction.editReply({
                components: [generateContainer()], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            })
        })

    }
}