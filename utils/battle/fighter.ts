import {Skill, Stats} from "./types";
import {
    ActionRowBuilder,
    ButtonBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ButtonStyle,
    AttachmentBuilder
} from "discord.js";
import {chance, lifeBar} from "./utils";
import {BaseAlteration} from "./alterations";
import {BattleEngine} from "./engine";

export class Fighter {
    id: string
    name: string
    stats: Stats
    skills: Skill[]
    ally: boolean
    initiative: number
    mobile: boolean = false
    alterations: BaseAlteration[] = []
    // Visualization
    nameText: TextDisplayBuilder
    hpText: TextDisplayBuilder
    section: SectionBuilder
    artUrl: string
    boss: boolean
    engine: BattleEngine | null
    turnEnded= false
    image: AttachmentBuilder

    log(line) {
        if (this.engine) {
            this.engine.log(line)
        }
    }
    toString() {
        return `${this.name}`
    }
    setEngine(engine: BattleEngine) {
        this.engine = engine
    }

    get alive() {
        return this.stats.hp > 0
    }

    constructor({id, name, stats, skills, ally, artUrl, boss}: any) {
        this.id = id;
        this.name = name;
        this.stats = stats;
        this.skills = skills;
        this.ally = ally;
        this.artUrl = artUrl || "https://picsum.photos/400"
        this.initiative = 0;

        this.nameText = new TextDisplayBuilder().setContent(`### ${this.name}`);
        this.hpText = new TextDisplayBuilder()
        this.updateSection()
        this.image = new AttachmentBuilder("./public/boss/Epona.png")
        this.section = new SectionBuilder().addTextDisplayComponents(this.nameText).addTextDisplayComponents(this.hpText).setThumbnailAccessory(
            (thumb) => thumb.setURL(this.artUrl)
        );
        this.boss = boss || false
    }

    updateSection() {
        this.nameText.setContent(`### ${this.name} (${this.stats.hp}/${this.stats.maxHp})       ${this.alterations.map(a => a.shortName).join(" ")}`);
        this.hpText.setContent(`${lifeBar(this.mobile ? 10 : 20, this.stats.hp / this.stats.maxHp)}`);
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
        this.turnEnded = false
        console.log("STARTTUR", this.name, this.alterations)
        this.alterations.forEach(a => a.turnStart())
    }

    turnEnd() {
        this.turnEnded = true
        this.alterations.forEach(a => a.turnEnd())
        this.alterations = this.alterations.filter(a => a.stacks.length > 0)
    }

    verifyAction(id) {
        const [charId, skillId] = id.split("__")
        if (charId !== this.id) {
            return null
        }
        return this.skills.find((skill) => skill.id === skillId)
    }

    damage(n, defMultiplier: number = 1, rate = 95) {
        this.alterations.map(a=>a.onDamage())
        if (chance(rate)) {
            if(chance(5)) {
                return 0 // Dodge
            }
            let dmg = Math.max(0, n - this.stats.def * defMultiplier)
            if(chance(20)) {
               dmg *= 2 // Critical
            }
            this.stats.hp -= dmg
            if (this.stats.hp < 0) {
                this.stats.hp = 0
            }
            return dmg
        } else {
            return 0 // Missed
        }
    }

    heal(amount) {
        this.alterations.map(a=>a.onHeal())

        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount)
    }

    alterate(alteration: BaseAlteration) {
        const currentAlteration = this.alterations.find((a) => a.id == alteration.id)
        if (currentAlteration) {
            currentAlteration.combine(alteration)
        } else {
            this.alterations.push(alteration)
            alteration.setTarget(this)
            alteration.onApply()
        }
    }
}


