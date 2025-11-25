import {Fighter} from "./fighter";
import {
    ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
    ContainerBuilder, SectionBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder
} from "discord.js";
import {createAttachment, lifeBar} from "./utils";
import {Skill} from "./skills";
import battleConfig from "../../config/battle.json"
import {yellow} from "../ansiFormatter";
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
    turn: number = 0
    skillPoints: number
    battleLog: { line: string, ts: number, turn: number }[]
    isOver: boolean
    win: boolean
    simulatedTurns: Fighter[]
    currentTurn: Fighter[]
    currentAction: Fighter
    mobile: boolean
    initiativeRequired: number

    allySp: number = 0

    allySpText: TextDisplayBuilder
    turnContainer: ContainerBuilder

    startAlive: Fighter[]

    get currentLog() {
        return this.battleLog.filter(l => l.turn == this.turn).sort((a, b) => a.ts - b.ts)
    }

    get allies() {
        return this.fighters.filter((f) => f.isPlayer);
    }

    get enemies() {
        return this.fighters.filter((f) => !f.isPlayer);
    }

    get alives() {
        return this.fighters.filter((f) => f.isAlive);
    }

    get aliveAllies() {
        return this.allies.filter((f) => f.isAlive);
    }

    get aliveEnemies() {
        return this.enemies.filter((f) => f.isAlive);
    }

    get deadAllies() {
        return this.allies.filter((f) => !f.isAlive);
    }

    get deadEnemies() {
        return this.enemies.filter((f) => !f.isAlive);
    }

    aliveSame(f: Fighter) {
        return f.isPlayer ? this.aliveAllies : this.aliveEnemies
    }

    aliveDiff(f: Fighter) {
        return (!f.isPlayer ? this.aliveAllies : this.aliveEnemies).filter(f => f.targetable)
    }

    same(f: Fighter) {
        return f.isPlayer ? this.allies : this.enemies
    }

    diff(f: Fighter) {
        return !f.isPlayer ? this.allies : this.enemies
    }

    constructor(fighters: Fighter[], mobile = false) {
        this.fighters = fighters
        this.currentTurn = [...fighters.sort((a, b) => b.stats.spd - a.stats.spd)]
        this.turn = 0;
        this.skillPoints = 5; // Starting SP
        this.battleLog = [];
        this.isOver = false;
        this.simulatedTurns = []
        this.mobile = mobile
        this.fighters.forEach(f => {
            f.engine = this
        })
        this.initiativeRequired = this.alives.reduce((a, f) => Math.max(a, f.stats.spd), 0) * 5
        this.currentAction = null
        this.allySp = battleConfig.startSp

        this.fighters.map(f => {
            f.boardEffects.forEach(b => {
                if (b.onBattleStart) {
                    b.onBattleStart(f, this, null)
                }
            })
        })

        this.turnContainer = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent("Battle is starting"))
    }
    gainSp(n: number, source: string | Fighter= "") {
        if(n===0) return
        this.allySp += n
        this.allySp = Math.min(this.allySp, battleConfig.maxSp)
        this.log(`Allies regains ${yellow(n.toString())} ${yellow("SP")} ${source}!`)
    }
    simulateTurns(n) {
        this.simulatedTurns = [...this.currentTurn.filter(f => f.isAlive)]
        while (this.simulatedTurns.length < n) {
            const nextTurn = this.alives.sort((a, b) => b.stats.spd - a.stats.spd)
            this.simulatedTurns.push(...nextTurn)
        }
        this.simulatedTurns = this.simulatedTurns.slice(0, n)

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

    log(line: string, ts: number | null = null) {
        if(line.length ===0)return
        this.battleLog.push({
            line,
            turn: this.turn,
            ts: ts || new Date().getTime()
        })
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
        if (this.turn == 0) {

        }


        do {
            if (this.currentTurn.length === 0) {
                this.currentTurn = [...this.alives.sort((a, b) => b.stats.spd - a.stats.spd)]
            }
            this.currentAction = this.currentTurn.shift()
        } while (!this.currentAction.isAlive)
        this.turn += 1
        this.currentAction.turnStart()
        this.startAlive = [...this.alives]
        this.simulateTurns(4)
    }

    endTurn() {
        this.allySp = Math.max(this.allySp, battleConfig.maxSp)
        this.currentAction.turnEnd()
        const defeated = this.startAlive.filter(f => !f.isAlive)
        if (defeated.length > 0) {
            this.log(`${defeated.join(", ")} has been defeated !`)
        }
        if (this.aliveAllies.length == 0) {
            this.isOver = true
            this.win = true
        } else if (this.aliveEnemies.length == 0) {
            this.isOver = true
            this.win = false
        }
    }

    createContainers() {
        // Create UI

        let enemyContainer;
        if (this.enemies.length == 1 && this.enemies[0].boss) { // BOSS UI
            enemyContainer = new ContainerBuilder()
                .addTextDisplayComponents((txt) => txt.setContent(`### Boss battle - ${this.enemies[0].data.name} (${Math.round(this.enemies[0].stats.hp)}/${this.enemies[0].stats.max_hp}) ${this.enemies[0].getAlterationsStrings()}`))
                .addSeparatorComponents((sep) => sep.setDivider(true))
                .setAccentColor(0xFF0000)
                .addMediaGalleryComponents((media) => media.addItems((item) => item.setURL(this.enemies[0].data.art)))
                .addTextDisplayComponents((txt) => txt.setContent(lifeBar(25, this.enemies[0].stats.hp / this.enemies[0].stats.max_hp)))
        } else { // ENEMIES UI
            enemyContainer = new ContainerBuilder()
                .addTextDisplayComponents((txt) => txt.setContent("### Enemies"))
                .addSeparatorComponents((sep) => sep.setDivider(true))
                .setAccentColor(0xFF0000).addSectionComponents(this.aliveEnemies.map(f => f.section))
        }

        const alliesContainer = new ContainerBuilder()
            .addTextDisplayComponents((txt) => txt.setContent(`### Your Team\nSP: ${this.allySp} / ${battleConfig.maxSp}`))
            // .addTextDisplayComponents(this.allySpText)
            .addSeparatorComponents((sep) => sep.setDivider(true))
            .setAccentColor(0x00FF00).addSectionComponents(this.aliveAllies.map(f => f.section))
        if (this.deadAllies.length > 0) {
            alliesContainer.addSeparatorComponents((sep) => sep.setDivider(true))
            alliesContainer.addTextDisplayComponents(txt => txt.setContent(`-# Dead allies : ${this.deadAllies.map(s=>s.data.name).join(", ")}`))
        }
        return [enemyContainer, alliesContainer]
    }

    updateTurnContainer(skill: Skill | null = null, nextTurnTs: number = 0, {ended = false} = {}) {
        const mainSection = new SectionBuilder()
            .addTextDisplayComponents((txt) => txt.setContent(`# ${this.currentAction.data.name}'s turn`))
            .addTextDisplayComponents((txt) => txt.setContent(`${Math.round(this.currentAction.stats.hp)}/${this.currentAction.stats.max_hp} HP ${this.currentAction.getStatAlterationsStrings().length > 0 ? " | "+ this.currentAction.getStatAlterationsStrings():""}`))
            .setThumbnailAccessory((thumb) => thumb.setURL(this.currentAction.data.art))
        if (this.currentAction.getAlterationsStrings(false).length > 0) {
            mainSection.addTextDisplayComponents((txt) => txt.setContent(`${this.currentAction.getAlterationsStrings(false)}`))
        }
        // if (this.currentAction.getStatAlterationsStrings().length > 0) {
        //     mainSection.addTextDisplayComponents((txt) => txt.setContent(`${this.currentAction.getStatAlterationsStrings()}`))
        // }
        const container = new ContainerBuilder()
            .setAccentColor(this.currentAction.isPlayer ? 0x00FF00 : 0xFF0000)
            .addSectionComponents(mainSection)


        if (this.currentLog.length > 0) {
            container.addTextDisplayComponents((txt) => txt.setContent(
                "```ansi\n" +
                `${this.currentLog.filter(l=>l.line.length > 0).map(l => l.line).join("\n")}`
                + "\n```"
            ))
        }


        if (this.currentAction.isPlayer && !ended) {
            if (!skill) {
                const row = this.currentAction.getActions(this.allySp)
                container
                    .addTextDisplayComponents(txt => txt.setContent("### Actions"))
                    .addActionRowComponents(row)
            }
            if (skill) {
                const rows = []
                const ally = skill.ally || false
                rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                    .setCustomId(`${this.currentAction.id}--${skill.id}`)
                    .setPlaceholder("Select target")
                    .addOptions(this.alives.sort((a, b) => a.isPlayer != ally ? 0 : a.isPlayer ? 1 : -1).map(f => ({
                        label: f.data.name,
                        value: f.id
                    })))))
                rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Cancel").setCustomId(`${this.currentAction.id}--${skill.id}--cancel`).setStyle(ButtonStyle.Danger)))
                container.addActionRowComponents(rows)
            }
        }


        if (this.simulatedTurns.length > 0) {
            let turnsText = `Next : ${this.simulatedTurns.map(f=>f.data.name).join(" - ")}`
            if (nextTurnTs > 0) {
                turnsText += ` | Next turn <t:${nextTurnTs}:R>`
            }
            container.addTextDisplayComponents((txt) => txt.setContent(`-# *${turnsText}*`))
        }
        this.turnContainer = container
    }

    getEndContainer() {
        return new ContainerBuilder().addTextDisplayComponents((txt) => txt.setContent("The battle is over!"))
    }
}