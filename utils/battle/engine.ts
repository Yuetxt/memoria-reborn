import {Fighter} from "./fighter";
import {
    ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
    ContainerBuilder, SectionBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder
} from "discord.js";
import {createAttachment, lifeBar} from "./utils";
import {Skill} from "./types";

export function generateId(prefix = '', randomChars = 8): string {
    const ts = Date.now().toString(36);
    const rand = Array.from({length: randomChars})
        .map(() => Math.floor(Math.random() * 36).toString(36))
        .join('');
    return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}

export class BattleEngine {
    id: string
    fighters: Fighter[]
    order: Fighter[]
    turn: number
    skillPoints: number
    battleLog: string[]
    isOver: boolean
    winner: string
    turns: Fighter[]
    currentTurn: Fighter
    mobile: boolean
    initiativeRequired: number

    allySp: number = 0
    ennemySp: number = 0

    allySpText: TextDisplayBuilder

    startAlive: Fighter[]

    get allies() {
        return this.fighters.filter((f) => f.ally);
    }

    get enemies() {
        return this.fighters.filter((f) => !f.ally);
    }

    get alives() {
        return this.fighters.filter((f) => f.alive);
    }

    get aliveAllies() {
        return this.allies.filter((f) => f.alive);
    }

    get aliveEnemies() {
        return this.enemies.filter((f) => f.alive);
    }

    get deadAllies() {
        return this.allies.filter((f) => !f.alive);
    }

    get deadEnemies() {
        return this.enemies.filter((f) => !f.alive);
    }

    aliveSame(f: Fighter) {
        return f.ally ? this.aliveAllies : this.aliveEnemies
    }

    aliveDiff(f: Fighter) {
        return !f.ally ? this.aliveAllies : this.aliveEnemies
    }

    same(f: Fighter) {
        return f.ally ? this.alives : this.enemies
    }

    diff(f: Fighter) {
        return !f.ally ? this.alives : this.enemies
    }

    constructor(fighters: Fighter[], mobile = false) {
        this.fighters = fighters
        this.order = fighters.sort((a, b) => b.stats.spd - a.stats.spd)
        this.turn = 1;
        this.skillPoints = 5; // Starting SP
        this.battleLog = [];
        this.isOver = false;
        this.winner = null;
        this.turns = []
        this.mobile = mobile
        this.fighters.forEach(f => {
            f.mobile = mobile
            f.engine = this
            f.updateSection()
        })
        this.initiativeRequired = this.alives.reduce((a, f) => Math.max(a, f.stats.spd), 0) * 5
        this.currentTurn = this.order[this.fighters.length - 1] // So that the first call to getNextTurn will start from the first fighter
        this.allySp = 10
    }

    simulateTurns(n) {
        this.turns = []
        let i = this.order.findIndex((f) => f.id == this.currentTurn.id)
        while (this.turns.length < n) {
            const nextUp = this.order[(i + 1) % this.order.length]
            if (nextUp.alive) {
                this.turns.push(nextUp)
            }
            i++
        }

        // Tick simulation implementation
        // const tmpFights = [...this.alives]
        // const initiatives = Object.fromEntries(tmpFights.map((f)=>[f.id, f.initiative]))
        // while (this.turns.length < n) {
        //     var ticks = Infinity
        //     let turn;
        //     tmpFights.forEach((f) => {
        //         const t = (this.initiativeRequired - f.initiative) / f.stats.spd
        //         if (ticks > t) {
        //             ticks = t
        //             turn = f
        //         }
        //     })
        //     this.turns.push(turn)
        //     tmpFights.map((f) => {
        //         if (f.id === turn.id) {
        //             f.initiative = 0
        //         } else {
        //             f.initiative += ticks * f.stats.spd
        //         }
        //     })
        // }
        // tmpFights.forEach((f) => {
        //     f.initiative = initiatives[f.id]
        // })
    }

    getFighter(id) {
        return this.fighters.find((f) => f.id === id)
    }

    log(line) {
        console.log("LOG", line, this.battleLog)
        this.battleLog[0] += `\n${line}`
    }

    getNextTurn() {
        // var ticks = Infinity
        // var turn = ""
        // this.alives.forEach((f) => {
        //     const t = (this.initiativeRequired - f.initiative) / f.stats.spd
        //     if (ticks > t) {
        //         ticks = t
        //         turn = f.id
        //     }
        // })
        // this.alives.forEach((f) => {
        //     if (f.id == turn) {
        //         f.initiative = 0
        //     } else {
        //         f.initiative += ticks * f.stats.spd
        //     }
        // })


        const i = this.order.findIndex((f) => f.id == this.currentTurn.id)
        do {
            this.currentTurn = this.order[(i + 1) % this.order.length]
        } while (!this.currentTurn.alive)
        // this.currentTurn = this.getFighter(turn)
        this.battleLog = ["", ...this.battleLog]
        this.currentTurn.turnStart()
        this.startAlive = [...this.alives]
        this.simulateTurns(4)
    }

    endTurn() {
        this.currentTurn.turnEnd()
        this.fighters.forEach(f => f.updateSection())
        this.allySpText.setContent(`SP: ${lifeBar(15, this.allySp / 15, {filledChar: ":yellow_square:"})}`)
        const defeated = this.startAlive.filter(f => !f.alive).map(f => f.name)
        if (defeated.length > 0) {
            this.log(`${defeated.map(f => `**${f}**`).join(", ")} has been defeated !`)
        }
        if (this.aliveAllies.length == 0) {
            this.isOver = true
            this.winner = "ennemies"
        } else if (this.aliveEnemies.length == 0) {
            this.isOver = true
            this.winner = "allies"
        }
    }

    createContainers() {
        this.allySpText = new TextDisplayBuilder().setContent(`*SP: *${lifeBar(15, this.allySp / 15, {filledChar: ":yellow_square:"})}`)
        let enemyContainer;
        if (this.enemies.length == 1 && this.enemies[0].boss) {
            enemyContainer = new ContainerBuilder()
                .addTextDisplayComponents((txt) => txt.setContent(`### Boss battle - ${this.enemies[0]} (${this.enemies[0].stats.hp}/${this.enemies[0].stats.maxHp}) `))
                .addSeparatorComponents((sep) => sep.setDivider(true))
                .setAccentColor(0xFF0000)
                .addMediaGalleryComponents((media) => media.addItems((item) => item.setURL(this.enemies[0].artUrl)))
                .addTextDisplayComponents((txt) => txt.setContent(lifeBar(25, this.enemies[0].stats.hp / this.enemies[0].stats.maxHp)))
        } else {
            enemyContainer = new ContainerBuilder()
                .addTextDisplayComponents((txt) => txt.setContent("### Enemies"))
                .addSeparatorComponents((sep) => sep.setDivider(true))
                .setAccentColor(0xFF0000).addSectionComponents(this.aliveEnemies.map(f => f.section))
        }
        const alliesContainer = new ContainerBuilder()
            .addTextDisplayComponents((txt) => txt.setContent(`### Your Team\nSP: ${lifeBar(15, this.allySp / 15, {filledChar: ":yellow_square:"})}`))
            // .addTextDisplayComponents(this.allySpText)
            .addSeparatorComponents((sep) => sep.setDivider(true))
            .setAccentColor(0x00FF00).addSectionComponents(this.aliveAllies.map(f => f.section))
        if (this.deadAllies.length > 0) {
            alliesContainer.addSeparatorComponents((sep) => sep.setDivider(true))
            alliesContainer.addTextDisplayComponents(txt => txt.setContent(`-# Dead allies : ${this.deadAllies.map(f => f.name).join(", ")}`))
        }
        return [enemyContainer, alliesContainer]
    }

    getTurnContainer(skill: Skill | null = null, nextTurnTs: number = 0) {
        const sp = this.currentTurn.ally ? this.allySp : this.ennemySp
        const mainSection = new SectionBuilder().addTextDisplayComponents((txt) => txt.setContent(`# ${this.currentTurn.name}'s turn`))
            .addTextDisplayComponents((txt) => txt.setContent(`${this.currentTurn.stats.hp}/${this.currentTurn.stats.maxHp} HP`))
            .setThumbnailAccessory((thumb) => thumb.setURL(this.currentTurn.artUrl))
        if (this.currentTurn.alterations.length > 0) {
            mainSection.addTextDisplayComponents((txt) => txt.setContent(`${this.currentTurn.alterations.map((a) => a.shortName).join("")}`))

        }
        const container = new ContainerBuilder()
            .setAccentColor(this.currentTurn.ally ? 0x00FF00 : 0xFF0000)
            .addSectionComponents(mainSection)
        if (this.battleLog[0].length > 0) {
            container.addTextDisplayComponents((txt) => txt.setContent(
                "```ansi\n" +
                `${this.battleLog[0]}`
                + "\n```"
            ))
        }
        if (this.currentTurn.ally && !this.currentTurn.turnEnded) {
            if (!skill) {
                const row = this.currentTurn.getActions(sp)
                container
                    .addTextDisplayComponents(txt => txt.setContent("### Actions"))
                    .addActionRowComponents(row)
            }
            if (skill) {
                const rows = []
                const ally = skill.ally || false
                rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                    .setCustomId(`${this.currentTurn.id}--${skill.id}`)
                    .setPlaceholder("Select target")
                    .addOptions(this.alives.sort((a, b) => a.ally != ally ? 0 : a.ally ? 1 : -1).map(f => ({
                        label: f.name,
                        value: f.id
                    })))))
                rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Cancel").setCustomId(`${this.currentTurn.id}--${skill.id}--cancel`).setStyle(ButtonStyle.Danger)))
                container.addActionRowComponents(rows)
            }
        }
        if (this.turns.length > 0) {
            let turnsText = `Next : ${this.turns.map(f => f.name).join(" - ")}`
            console.log("Turns", nextTurnTs)
            if (nextTurnTs > 0) {
                turnsText += ` | Next turn <t:${nextTurnTs}:R>`
            }
            container.addTextDisplayComponents((txt) => txt.setContent(`-# *${turnsText}*`))
        }
        return container
    }

    getEndContainer() {
        return new ContainerBuilder().addTextDisplayComponents((txt) => txt.setContent("The battle is over!"))
    }
}