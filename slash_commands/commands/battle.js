const {
    SlashCommandBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    AttachmentBuilder,
    MediaGalleryBuilder,
    ContainerBuilder,
    UserSelectMenuBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    InteractionCollectorError,
    MessageFlags
} = require('discord.js');
const {Player, Servant} = require("../../database/Database");
const {Fighter} = require("../../utils/battle/fighter");
const {getSkill} = require("../../utils/battle/skills");
const {BattleEngine} = require("../../utils/battle/engine");
const {staticUrl} = require("../../config.json")
// Fonctionnement
// Ordre : simulation de tick (chaque tick => init + vitesse, le premier à 1000 joue)
// A chaque tour une action possible -> mise à jour du combat
//

// Structure : [{
//      baseStats: {},
//      skills: [{usable}]
//      alterations: [{...stats, actions: [(player, target, stacks)=>{}], tours: remaining_tours}]
// }]

function delay(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function futureTs(ms) {
    return Math.floor(Date.now() / 1000) + ms / 1000;
}

function createDelay(seconds) {
    let timer;
    let resolved = false;
    let resolveFn;

    const ms = Math.max(0, Math.floor(seconds * 1000));
    const promise = new Promise((resolve) => {
        resolveFn = resolve;
        timer = setTimeout(() => {
            resolved = true;
            resolve();
        }, ms);
    });

    return {
        promise,
        cancel(value) {
            if (resolved) return;
            clearTimeout(timer);
            resolved = true;
            resolveFn(value);
        }
    };
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder().setName("battle").setDescription("Start a battle with an enemy!"),
    async execute(interaction) {
        const player = await Player.findOne({
            where: {discordId: interaction.user.id},
            include: [{
                model: Servant,
                as: 'servants',
                through: {
                    where: {isInTeam: true},
                    attributes: ['level', 'bondLevel', 'slot']
                }
            }]
        });
        const file = new AttachmentBuilder('./public/boss/Epona.png');

        const exampleGallery = new MediaGalleryBuilder().addItems(
            (mediaGalleryItem) =>
                mediaGalleryItem
                    .setDescription('alt text displaying on an image from the AttachmentBuilder')
                    .setURL('attachment://Epona.png'),
            (mediaGalleryItem) =>
                mediaGalleryItem
                    .setDescription('alt text displaying on an image from an external URL')
                    .setURL('https://i.imgur.com/AfFp7pu.png')
                    .setSpoiler(true), // Will display as a blurred image
        );

        // await interaction.channel.send({
        //     components: [exampleGallery],
        //     files: [file],
        //     flags: MessageFlags.IsComponentsV2,
        // });
        const mobile = false && interaction.member.presence.clientStatus.mobile !== null
        console.log("MOBILE", mobile)
        // console.log(interaction.member.presence)
        const players = [
            new Fighter({
                id: "123451324326",
                name: "Aqua",
                stats: {
                    atk: 91,
                    def: 130,
                    spd: 115,
                    hp: 1540,
                    maxHp: 1540,
                },
                skills: [getSkill("auto-attack"), getSkill("purification-fontain")],
                ally: true,
                artUrl: `${staticUrl}/servants/Konosuba/Aqua-min.png`
            }),
            new Fighter({
                id: "1234585653634",
                name: "Megumin",
                stats: {
                    atk: 155,
                    def: 92,
                    spd: 91,
                    hp: 1060,
                    maxHp: 1060
                },
                skills: [getSkill("auto-attack"), getSkill("explosion")],
                ally: true,
                artUrl: `${staticUrl}/servants/Konosuba/Megumin-min.png`
            }),
            new Fighter({
                id: "12345856509133634",
                name: "Kazuma Satou",
                stats: {
                    atk: 130,
                    def: 97,
                    spd: 124,
                    hp: 1070,
                    maxHp: 1070
                },
                skills: [getSkill("auto-attack"), getSkill("luck-of-the-draw")],
                ally: true,
                artUrl: `${staticUrl}/servants/Konosuba/Kazuma_Saito-min.png`
            }), new Fighter({
                id: "12345859133634",
                name: "Darkness",
                stats: {
                    atk: 93,
                    def: 142,
                    spd: 88,
                    hp: 1160,
                    maxHp: 1160
                },
                skills: [getSkill("auto-attack"), getSkill("ultimate-sacrifice")],
                ally: true,
                artUrl: `${staticUrl}/servants/Konosuba/Darkness-min.png`
            }),
        ]
        const ennemies = [
            new Fighter({
                id: "123442341356",
                name: "Enemy 1",
                stats: {
                    atk: 200,
                    def: 100,
                    spd: 120,
                    hp: 1000,
                    maxHp: 1000,
                    currentHp: 100,
                },
                skills: [getSkill("poison"), getSkill("auto-attack")],
                ally: false,
                boss: true,
                artUrl: `${staticUrl}/boss/Epona-min.png`
            })
        ]

        const engine = new BattleEngine([...players, ...ennemies], mobile)

        let containers = engine.createContainers()

        await interaction.reply({
            components: containers,
            flags: MessageFlags.IsComponentsV2, //| MessageFlags.Ephemeral,
            withResponse: true,
        })
        let msg;
        // Loop
        engine.getNextTurn()
        while (!engine.isOver) {
            let cancelled = false
            console.log("TURN START", engine.currentTurn.name)
            if (!engine.currentTurn.ally || engine.currentTurn.turnEnded) {
                if (!engine.currentTurn.turnEnded) {
                    const skill = engine.currentTurn.skills[0]
                    let targets = skill.getTargets(engine.currentTurn, engine)
                    if(targets.length === 0) {
                        targets.push(engine.aliveAllies[0])
                    }
                    const effectLog = skill.execute(engine.currentTurn, targets, engine)
                    engine.log(`${engine.currentTurn.name} used ${skill.name} -> ${effectLog}`)
                }
                engine.endTurn()
                const turnContainer = engine.getTurnContainer(null, futureTs(5000))
                if (!msg) {
                    msg = await interaction.followUp({
                        components: [turnContainer],
                        flags: MessageFlags.IsComponentsV2, //| MessageFlags.Ephemeral,
                        withResponse: true,
                    })
                } else {
                    await interaction.editReply({
                        message: msg,
                        components: [turnContainer],
                        flags: MessageFlags.IsComponentsV2, //| MessageFlags.Ephemeral,
                        withResponse: true,
                    })
                }
                containers = engine.createContainers()
                await interaction.editReply({
                    components: containers, flags: MessageFlags.IsComponentsV2, //| MessageFlags.Ephemeral,
                })
                await delay(5)
                engine.getNextTurn()
            } else {
                const nextTs = futureTs(60_000)
                const turnContainer = engine.getTurnContainer(null, nextTs)
                if (!msg) {
                    msg = await interaction.followUp({
                        components: [turnContainer],
                        flags: MessageFlags.IsComponentsV2 ,//| MessageFlags.Ephemeral,
                        withResponse: true,
                    })
                } else {
                    await interaction.editReply({
                        message: msg,
                        components: [turnContainer],
                        flags: MessageFlags.IsComponentsV2 ,//| MessageFlags.Ephemeral,
                        withResponse: true,
                    })
                }
                const collectorFilter = (i) => i.user.id === interaction.user.id && i.customId.startsWith(engine.currentTurn.id);
                try {
                    const action = await interaction.channel.awaitMessageComponent({
                        filter: collectorFilter,
                        time: 60_000
                    });
                    action.deferUpdate()
                    const skill = engine.currentTurn.verifyAction(action.customId)
                    if (skill) {
                        let targets = skill.getTargets(engine.currentTurn, engine)
                        if (targets.length === 0) {
                            await interaction.editReply({
                                components: [engine.getTurnContainer(skill, nextTs)],
                                message: msg,
                                flags: MessageFlags.IsComponentsV2 //| MessageFlags.Ephemeral,
                            })
                            const targetCollectorFilter = (i) => i.user.id === interaction.user.id && i.customId.startsWith(`${engine.currentTurn.id}--${skill.id}`);
                            try {
                                const targetSelection = await interaction.channel.awaitMessageComponent({
                                    filter: targetCollectorFilter,
                                    time: 60_000
                                })
                                if (targetSelection.customId.includes("cancel")) {
                                    continue
                                }
                                targets.push(targetSelection.values.map(id => engine.getFighter(id))[0])
                            } catch (e) {
                                console.log("Eh bah ", e)
                                // if(e instanceof InteractionCollectorError) {
                                //     engine.getNextTurn()
                                // }
                            }
                        }
                        try {
                            const effectLog = skill.execute(engine.currentTurn, targets, engine)
                            engine.log(`${engine.currentTurn.name} used ${skill.name} -> ${effectLog}`)
                            if (engine.currentTurn.ally) {
                                engine.allySp -= skill.cost
                            } else {
                                engine.ennemySp -= skill.cost
                            }
                        } catch (e) {
                            console.log("Eh bah ", e)
                        }
                        engine.endTurn()
                        if(skill.needFeedback) {
                            containers = engine.createContainers()
                            await interaction.editReply({
                                components: [engine.getTurnContainer(skill, futureTs(5000))],
                                message: msg,
                                flags: MessageFlags.IsComponentsV2 //| MessageFlags.Ephemeral,
                            })
                            await interaction.editReply({
                                components: containers, flags: MessageFlags.IsComponentsV2 //| MessageFlags.Ephemeral,
                            })
                            await delay(5)
                        } else {
                            containers = engine.createContainers()
                            await interaction.editReply({
                                components: containers, flags: MessageFlags.IsComponentsV2// | MessageFlags.Ephemeral,
                            })
                        }
                        engine.getNextTurn()

                    }
                } catch (e) {
                    console.log("Eh bah ", e)
                    // Check with error e is
                    engine.getNextTurn()

                }
            }
        }

        await interaction.deleteReply(msg)
        await interaction.editReply({
            components: [engine.getEndContainer()],
            flags: MessageFlags.IsComponentsV2 //| MessageFlags.Ephemeral,
        })
    }
}