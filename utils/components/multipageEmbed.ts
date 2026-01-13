import {
    ActionRowBuilder,
    ButtonBuilder,
    MessageFlags,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder
} from "discord.js";
import {generateId} from "../utils";

export class MultiPageMessageBuilder {
    private _itemCount: number;
    private _chunksize: number;
    private _currentPage: number = 0;
    private _totalPage: number;
    private _id: string;
    private _messageBuilder: (s: number, e: number) => ContainerBuilder[];

    constructor() {
        this._id = generateId();
        return this
    }

    setChunk(i: number) {
        this._chunksize = i
        this._currentPage = 0
        this._totalPage = Math.ceil(this._itemCount / this._chunksize)
        return this
    }

    setItemCount(i: number) {
        console.log(i, this._chunksize)
        this._itemCount = i
        this._totalPage = Math.ceil(this._itemCount / this._chunksize)
        return this
    }

    setMessageBuilder(builder: (i: number, e: number) => ContainerBuilder[]) {
        this._messageBuilder = builder
        return this
    }

    getActions() {
        if (this._totalPage === 1) return []
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`${this._id}-previous`).setLabel("Previous").setStyle(ButtonStyle.Primary).setDisabled(this._currentPage === 0),
            new ButtonBuilder().setCustomId(`${this._id}-next`).setLabel("Next").setStyle(ButtonStyle.Primary).setDisabled(this._currentPage === this._totalPage - 1)
        )
        return [row]
    }

    async updateInteraction(i: ChatInputCommandInteraction, flags: number) {
        console.log(this._currentPage, this._totalPage)
        await i.editReply({
            components: [...this._messageBuilder(this._currentPage * this._chunksize, (this._currentPage + 1) * this._chunksize), ...this.getActions()],
            flags
        })
    }

    async applyToInteraction(interaction: ChatInputCommandInteraction, {
        ephemeral = false
    }: {
        ephemeral?: boolean
    }) {
        const flags = (ephemeral && MessageFlags.Ephemeral) | MessageFlags.IsComponentsV2
        if (!interaction.deferred) await interaction.deferReply({flags})

        await this.updateInteraction(interaction, flags)

        const collector = interaction.channel.createMessageComponentCollector({
            time: 60000,
            filter: (i) => i.customId.startsWith(this._id)
        })

        collector.on("collect", async (i) => {
            if(i.customId === `${this._id}-next` && this._currentPage < this._totalPage - 1) {
                this._currentPage++
            } else if(i.customId === `${this._id}-previous` && this._currentPage > 0) {
                this._currentPage--
            }
            await i.deferUpdate()
            await this.updateInteraction(interaction, flags)
        })
    }

}