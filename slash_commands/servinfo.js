import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import servantsData from '../data/servants.json' assert { type: 'json' };
import { PASSIVES } from '../utils/battle/catalog/passives.ts';
import { SKILL } from '../utils/battle/catalog/skills.ts';

// Element emoji mapping
const ELEMENT_EMOJIS = {
    'fire': '🔥',
    'water': '💧',
    'wind': '💨',
    'earth': '🪨',
    'light': '✨',
    'darkness': '🌑',
    'ice': '❄️',
    'electric': '⚡',
    'nature': '🌿',
    'toxic': '☠️'
};

// Role emoji mapping
const ROLE_EMOJIS = {
    'dps': '⚔️',
    'support': '🛡️',
    'tank': '🏰',
    'healer': '💚',
    'control': '🎯'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servinfo')
        .setDescription('Display detailed information about a servant (Pokédex-style)')
        .addStringOption(option =>
            option.setName('servant_name')
                .setDescription('The name of the servant to look up')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    playerRequired: false,
    
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = Object.values(servantsData)
            .map(servant => servant.name)
            .filter(name => name.toLowerCase().includes(focusedValue))
            .slice(0, 25);
        
        await interaction.respond(
            choices.map(choice => ({ name: choice, value: choice }))
        );
    },

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const servantName = interaction.options.getString('servant_name');
        
        // Find servant by name (case-insensitive)
        const servantEntry = Object.entries(servantsData).find(([id, data]) => 
            data.name.toLowerCase() === servantName.toLowerCase()
        );

        if (!servantEntry) {
            return interaction.reply({
                content: `❌ Servant "${servantName}" not found. Use autocomplete to see available servants.`,
                ephemeral: true
            });
        }

        const [servantId, servant] = servantEntry;

        // Get element and role emojis
        const elementEmoji = ELEMENT_EMOJIS[servant.element?.toLowerCase()] || '❓';
        const roleEmoji = ROLE_EMOJIS[servant.role?.toLowerCase()] || '❓';

        // Create the embed
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${servant.name}`)
            .setDescription(`**Card ID:** ${servantId}\n**Card Series:** ${servant.series || 'Unknown'}\n**Location/Floor:** Various floors`)
            .addFields(
                { 
                    name: `${elementEmoji} Type`, 
                    value: servant.element ? servant.element.charAt(0).toUpperCase() + servant.element.slice(1) : 'None',
                    inline: true 
                },
                { 
                    name: `${roleEmoji} Role`, 
                    value: servant.role ? servant.role.toUpperCase() : 'Unknown',
                    inline: true 
                },
                { name: '\u200B', value: '\u200B', inline: true }
            );

        // Add stats
        if (servant.stats) {
            const statsText = [
                `**HP:** ${servant.stats.hp || 'N/A'}`,
                `**ATK:** ${servant.stats.atk || 'N/A'}`,
                `**DEF:** ${servant.stats.def || 'N/A'}`,
                `**SPD:** ${servant.stats.spd || 'N/A'}`
            ].join('\n');
            
            embed.addFields({ name: '📊 Base Stats', value: statsText, inline: false });
        }

        // Add skills
        if (servant.skills && servant.skills.length > 0) {
            let skillsText = '';
            servant.skills.forEach((skill, index) => {
                let skillInfo = '';
                
                if (typeof skill === 'string') {
                    // Find skill in catalog by id
                    const catalogSkill = SKILL.find(s => s.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') === skill);
                    if (catalogSkill) {
                        skillInfo = `**${catalogSkill.name}** • SP: ${catalogSkill.cost || 0}\n`;
                        if (catalogSkill.description) {
                            skillInfo += `${catalogSkill.description}\n`;
                        } else if (catalogSkill.effects) {
                            const effectsStr = Array.isArray(catalogSkill.effects) 
                                ? catalogSkill.effects.filter(e => typeof e === 'string').join(', ')
                                : catalogSkill.effects;
                            skillInfo += `_${effectsStr}_\n`;
                        }
                    } else {
                        skillInfo = `**${skill}** • Details pending\n`;
                    }
                } else if (skill.name) {
                    skillInfo = `**${skill.name}** • SP: ${skill.cost || 0}\n`;
                    if (skill.effects && Array.isArray(skill.effects)) {
                        const effectsStr = skill.effects.filter(e => typeof e === 'string').join(', ');
                        if (effectsStr) skillInfo += `_${effectsStr}_\n`;
                    }
                }
                
                if (skillInfo) {
                    skillsText += skillInfo + '\n';
                }
            });
            
            if (skillsText) {
                embed.addFields({ name: '⚡ Skills', value: skillsText || 'No skills available', inline: false });
            }
        }

        // Add passives
        if (servant.passives && servant.passives.length > 0) {
            let passivesText = '';
            servant.passives.forEach((passive, index) => {
                let passiveInfo = '';
                
                if (typeof passive === 'string') {
                    // Find passive in catalog
                    const catalogPassive = PASSIVES.find(p => p.id === passive);
                    if (catalogPassive) {
                        const passiveName = passive.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        passiveInfo = `**${passiveName}**\n`;
                        passiveInfo += `_Passive ability with special board effects_\n`;
                    } else {
                        passiveInfo = `**${passive}**\n`;
                    }
                } else if (passive.name) {
                    passiveInfo = `**${passive.name}**\n`;
                    if (passive.boards && passive.boards.length > 0) {
                        passiveInfo += `_Has ${passive.boards.length} board effect(s)_\n`;
                    }
                }
                
                if (passiveInfo) {
                    passivesText += passiveInfo + '\n';
                }
            });
            
            if (passivesText) {
                embed.addFields({ name: '🌟 Passives', value: passivesText || 'No passives', inline: false });
            }
        }

        // Add source anime
        if (servant.series) {
            embed.addFields({ 
                name: '📺 Source Anime', 
                value: servant.series,
                inline: false 
            });
        }

        // Set footer
        embed.setFooter({ text: `ID: ${servantId} • Use /profile to see your servants` });
        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
