import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    TextDisplayBuilder
} from "discord.js";
import {chance, doubleLifeBar, getStatsString} from "./utils";
import {BaseAlteration} from "./alterations";
import {BattleEngine} from "./engine";
import {BoardEffect} from "./passives";
import {bold, green, red} from "../ansiFormatter";
import {
    BATTLE_STATS_ABS,
    BATTLE_STATS_DEFAULTS,
    BATTLE_STATS_PERCENT,
    BattleStats,
    Element,
    ELEMENT_EMOJI
} from "../types/battle";
import {generateId} from "../utils";
import {elementRelationship} from "./helper";
import {BaseStats, CommonAttrs} from "../types/data";
import {Skill} from "./skills";

export type DmgReturn = { damage: number, dodge?: boolean, miss?: boolean, crit?: boolean }

export class Fighter {
    id: string // Id in battle

    // Data
    data: CommonAttrs
    isPlayer: boolean
    boss: boolean

    // Stats
    stats: BattleStats
    startStats: BattleStats
    element: Element = Element.NEUTRAL

    skills: Skill[]
    alterations: BaseAlteration[] = []
    boardEffects: BoardEffect[] = []

    engine: BattleEngine | null
    targetable: boolean = true


    log(line: string) {
        if (this.engine) {
            this.engine.log(line)
        }
    }

    toString() {
        return `${bold(this.data.name)}`
    }


    get isAlive() {
        return this.stats.hp > 0
    }

    get allies() {
        return this.engine?.same(this)
    }

    get ennemies() {
        return this.engine?.diff(this)
    }

    get aliveAllies() {
        return this.engine?.aliveSame(this)
    }

    get aliveEnnemies() {
        return this.engine?.aliveDiff(this)
    }

    get nameText() {
        return new TextDisplayBuilder().setContent(`### ${ELEMENT_EMOJI[this.data.element] || ""} ${this.data.name} (${Math.round(this.stats.hp)}/${this.stats.max_hp}) ${this.getAlterationsStrings()}`)
    }

    get hpText() {
        return new TextDisplayBuilder().setContent(`${doubleLifeBar(20, this.stats.hp / this.stats.max_hp, this.stats.shield * 5 / this.stats.max_hp, {
            firstChar: this.stats.hp / this.stats.max_hp < 0.3 ? ":red_square:" : null
        })}`)
    }

    get section() {
        return new SectionBuilder().addTextDisplayComponents(this.nameText).addTextDisplayComponents(this.hpText).setThumbnailAccessory(
            (thumb) => thumb.setURL(this.data.art)
        );
    }

    constructor({
                    stats,
                    skills = [],
                    ally,
                    boards = [],
                    boss = false,
                    data,
                }: {
        stats: BattleStats | BaseStats,
        skills: Skill[],
        ally: boolean,
        boards?: BoardEffect[],
        data: CommonAttrs
        boss?: boolean,
    }) {
        this.id = generateId();
        this.stats = {...BATTLE_STATS_DEFAULTS, ...stats, max_hp: stats.hp};
        this.startStats = {...this.stats};
        this.skills = skills;
        this.isPlayer = ally;
        this.boss = boss
        this.boardEffects = boards || []
        this.data = {...data, art: data.art || "https://picsum.photos/200/300"}
    }

    getAlterationsStrings(includeStats = true) {
        const emoji = {
            atk: [":crossed_swords::arrow_up:", ":crossed_swords::arrow_down:"],
            def: [":shield::arrow_up:", ":shield::arrow_down:"],
            spd: ["💨", ":snail:"],
            acc: ["🌑", "🌑"],
            dmg_taken: [":dart:", "🛡️"]
        }
        let r = []
        if (includeStats) {
            for (const key of Object.keys(emoji)) {
                if (this.stats[key] > this.startStats[key]) {
                    r.push(`${emoji[key][0]}`)
                } else if (this.stats[key] < this.startStats[key]) {
                    r.push(`${emoji[key][1]} `)
                }
            }
        }
        return [...new Set([...r, ...this.alterations.map(a => a.emoji)])].join(" ")
    }

    getStatAlterationsStrings() {
        const alt: Partial<BattleStats> = {}
        for (const key of Object.keys(this.startStats)) {
            if (["hp", "shield"].includes(key)) continue
            if (BATTLE_STATS_ABS.includes(key)) {
                alt[key] = (this.stats[key] - this.startStats[key]) / this.startStats[key] * 100
            } else if (BATTLE_STATS_PERCENT.includes(key)) {
                alt[key] = this.stats[key] - this.startStats[key]
            }
        }
        return getStatsString(Object.fromEntries(Object.entries(alt).filter(([_, v]) => v !== 0 && v !== undefined && !isNaN(v))))
    }

    getActions(sp) {
        const actions = []
        for (const skill of this.skills) {
            actions.push(new ButtonBuilder().setDisabled(skill.cost > sp).setCustomId(`${this.id}__${skill.id}`).setLabel(`${skill.name} (${skill.cost < 0 ? "+" : ""}${Math.abs(skill.cost)} SP)`).setStyle(ButtonStyle.Primary))
        }
        // Create actions rows
        const rows = []
        for (let i = 0; i < actions.length / 5; i++) {
            rows.push(new ActionRowBuilder().addComponents(actions.slice(i * 5, (i + 1) * 5)))
        }

        return rows
    }

    turnStart() {
        this.skills.forEach(s => {
            s.disabled = Math.max(0, s.disabled)
        })
        this.boardEffects.forEach(b => {
            if (b.onTurnStart) {
                b.onTurnStart(this, this.engine, null)
            }
        })
    }

    turnEnd() {
        if (!this.isAlive) {
            this.boardEffects.map(b => b.onDie && b.onDie(this, this.engine, null))
        } else {
            this.boardEffects.forEach(b => b.onTurnEnd && b.onTurnEnd(this, this.engine, null))
        }
        this.alterations.forEach(a => a.use())
        this.alterations = this.alterations.filter(a => a.stacks.length > 0)
    }

    verifyAction(id: string) {
        const [charId, skillId] = id.split("__")
        if (charId !== this.id) {
            return null
        }
        return this.skills.find((skill) => skill.id === skillId)
    }

    damage(n: number, {
        ignoreShield = false,
        source = "",
        element = Element.NEUTRAL,
        crit = false
    }: {
        ignoreShield?: boolean,
        source?: Fighter | string,
        element?: Element,
        crit?: boolean,
        defMultiplier?: number
    } = {}) {
        let dmg = this.boardEffects.filter(b => b.valideDamage).reduce((a, b) => b.valideDamage(this, this.engine, {
            dmg: a,
            element,
            source
        }), n)

        this.log(`${this} takes ${red(Math.round(dmg).toString())} ${red("damage")} ${crit ? "(critical) " : ""}${typeof source == "string" ? source : ""}!`)
        if (!ignoreShield && this.stats.shield > 0) {
            this.stats.shield -= dmg
            if (this.stats.shield < 0) {
                dmg = Math.abs(this.stats.shield)
                this.log(`${this}'s shield breaks!`)
                this.stats.shield = 0
            } else {
                this.log(`${this}'s shield absorbs ${dmg.toLocaleString()} damage!`)
                dmg = 0
            }
        }
        this.stats.hp = Math.max(0, this.stats.hp - dmg)
        this.boardEffects.forEach(b => b.onDamage && b.onDamage(this, this.engine, {
            dmg,
            element,
            source
        }))
        return
    }

    attack(target: Fighter, power: number, {element, ignoreShield = false, defMultiplier = 1}: {
        element?: Element,
        ignoreShield?: boolean,
        defMultiplier?: number
    } = {}) {
        let elem = element || this.element
        let multiplier = power * this.stats.atk / (target.stats.def * defMultiplier + 5) / 100
        if (this.isPlayer) {
            switch (elementRelationship(elem, target.element)) {
                case 1:
                    multiplier *= 1.25
                    break
                case -1:
                    multiplier *= 0.8
                    break
                default:
                    multiplier *= 1
                    break
            }
        }
        if (target.isPlayer) {
            switch (elementRelationship(target.element, elem)) {
                case 1:
                    multiplier *= 0.75
                    break
                case -1:
                    multiplier *= 0.8
                    break
                default:
                    multiplier *= 1
                    break
            }
        }
        const crit = chance(this.stats.crit_chance)
        multiplier *= crit ? this.stats.crit_dmg / 100 : 1
        multiplier *= (1 + this.stats.dmg_dealt / 100)
        multiplier *= (1 + target.stats.dmg_taken / 100)
        let dmg = multiplier * this.stats.atk

        dmg = this.boardEffects.filter(b => b.onAttack).reduce((a, b) => b.onAttack(this, this.engine, {
            target,
            dmg: a
        }), dmg)
        target.damage(dmg, {ignoreShield, element: elem, source: this, crit})
    }

    heal(amount: number, source="") {
        amount = amount * (1 + this.stats.heal / 100)
        amount = this.boardEffects.filter(b => b.onHeal).reduce((a, b) => b.onHeal(this, this.engine, a), amount)
        this.stats.hp = Math.min(this.stats.max_hp, this.stats.hp + amount)
        this.log(`${this} heals ${green(Math.round(amount).toString())} ${green("HP")} ${source}!`)
    }

    alter(alteration: BaseAlteration) {
        if (!alteration.buff && chance(this.stats.debuff_res)) {
            return
        }
        let hit = this.boardEffects.map((b) => !b.onAlter || b.onAlter(this, this.engine, alteration)).reduce((a, b) => a && b, true)
        if (!hit) return
        const currentAlteration = this.alterations.find((a) => a.id == alteration.id)
        if (currentAlteration) {
            currentAlteration.combine(alteration)
        } else {
            this.alterations.push(alteration)
            alteration.onApply(this)
        }
    }
}


