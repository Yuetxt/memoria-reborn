// New character data with complex skill mechanics for Memoria Lost
const { SkillEffectLibrary } = require('../utils/SkillEffect');

module.exports = {
    servants: [
        // ==================== KONOSUBA ====================
        {
            id: 'aqua',
            name: 'Aqua',
            series: 'Konosuba', 
            element: 'water',
            gender: 'female',
            baseAtk: 91,
            baseDef: 130, 
            baseHp: 115,
            baseSpd: 154,
            rarity: 6,
            role: 'support',
            
            // Complex skill: Purification Fountain
            skillName: 'Purification Fountain',
            skillDescription: 'Aqua summons a purifying fountain, cleansing all debuffs from allies and healing them for 15% of her HP.',
            skillSpCost: 10,
            skillTargetType: 'all-allies',
            skillEffects: [
                SkillEffectLibrary.heal(15, true) // 15% ATK healing with cleanse
            ],
            
            // Complex passive: Goddess of Trouble
            passiveName: 'Goddess of Trouble',
            passiveDescription: 'Every time Aqua uses a skill, there is a 25% chance she will accidentally trip, causing her to lose 50% of her max HP but increasing the ATK of all allies by 15% for 2 turns.',
            passiveEffects: [
                SkillEffectLibrary.goddessOfTrouble()
            ],
            passiveTriggers: ['onSkillUse']
        },
        
        {
            id: 'megumin', 
            name: 'Megumin',
            series: 'Konosuba',
            element: 'fire',
            gender: 'female',
            baseAtk: 155,
            baseDef: 92,
            baseHp: 91, 
            baseSpd: 106,
            rarity: 6,
            role: 'dps_aoe',
            
            // Complex skill: Explosion
            skillName: 'Explosion',
            skillDescription: 'Megumin unleashes her signature Explosion spell, dealing 300% ATK fire damage to all enemies. After using this skill, Megumin is unable to act for the next turn due to exhaustion.',
            skillSpCost: 15,
            skillTargetType: 'all-enemies', 
            skillEffects: [
                SkillEffectLibrary.damage(300, 'fire'),
                SkillEffectLibrary.skipNextTurn()
            ],
            
            // Passive: Explosion Mastery
            passiveName: 'Explosion Mastery',
            passiveDescription: 'When Megumin uses Explosion, all allies gain a 10% boost to their ATK for 2 turns.',
            passiveEffects: [
                SkillEffectLibrary.multiEffect([
                    SkillEffectLibrary.applyStatus('atkBuff', 2, 100)
                ])
            ],
            passiveTriggers: ['onExplosionUse']
        },
        
        {
            id: 'kazuma',
            name: 'Kazuma Satou', 
            series: 'Konosuba',
            element: 'wind',
            gender: 'male',
            baseAtk: 130,
            baseDef: 97,
            baseHp: 124,
            baseSpd: 116,
            rarity: 4,
            role: 'dps_st',
            
            // Complex skill: Luck of the Draw
            skillName: 'Luck of the Draw',
            skillDescription: 'Kazuma takes a gamble, dealing 120% ATK wind damage to a random enemy. There\'s a 50% chance the attack misses entirely and he deals 10% ATK damage to himself, but a 50% chance it crits, dealing double damage.',
            skillSpCost: 15,
            skillTargetType: 'single-enemy',
            skillEffects: [
                SkillEffectLibrary.conditionalEffect(50, 
                    // Success: Critical hit for 240% damage
                    SkillEffectLibrary.damage(240, 'wind'),
                    // Failure: Miss and self-damage
                    SkillEffectLibrary.selfDamage(10)
                )
            ],
            
            // Passive: Lucky Pervert
            passiveName: 'Lucky Pervert', 
            passiveDescription: 'Kazuma has a 25% chance to avoid any debuff. Additionally, each time he avoids a debuff, all female allies gain haste for 2 turns, as they get flustered by his antics.',
            passiveEffects: [
                SkillEffectLibrary.luckyPervert()
            ],
            passiveTriggers: ['onDebuffApplied']
        },
        
        {
            id: 'darkness',
            name: 'Darkness',
            series: 'Konosuba',
            element: 'light', 
            gender: 'female',
            baseAtk: 93,
            baseDef: 142,
            baseHp: 88,
            baseSpd: 155,
            rarity: 5,
            role: 'tank',
            
            // Complex skill: Ultimate Sacrifice... Maybe?
            skillName: 'Ultimate Sacrifice... Maybe?',
            skillDescription: 'Darkness taunts all enemies for 2 turns and takes 150% of incoming damage. Each time she\'s hit, allies recover 2.5% of their max HP. At skill end, 50% chance she\'s Stunned for 1 turn.',
            skillSpCost: 10,
            skillTargetType: 'self',
            skillEffects: [
                SkillEffectLibrary.multiEffect([
                    SkillEffectLibrary.applyStatus('taunt', 2, 100),
                    // Custom effect for damage amplification and healing
                    // TODO: Implement complex multi-part effect
                ])
            ],
            
            // Passive: Masochist's Resolve
            passiveName: 'Masochist\'s Resolve',
            passiveDescription: 'Each time Darkness loses 10% of her max HP, she gains one stack of Resolve (max 5 stacks). Each stack grants +5% DEF to her.',
            passiveEffects: [
                // TODO: Implement HP threshold trigger for resolve stacks
            ],
            passiveTriggers: ['onDamageTaken']
        },
        
        // ==================== FRIEREN ====================
        {
            id: 'frieren',
            name: 'Frieren',
            series: 'Sousou no Frieren',
            element: 'nature',
            gender: 'female', 
            baseAtk: 132,
            baseDef: 117,
            baseHp: 145,
            baseSpd: 102,
            rarity: 6,
            role: 'dps_aoe',
            
            // Skill: Elven Magic Circle
            skillName: 'Elven Magic Circle',
            skillDescription: 'Etches a giant arcane glyph in the air, detonating it to blast all enemies for 170% ATK Nature damage.',
            skillSpCost: 5,
            skillTargetType: 'all-enemies',
            skillEffects: [
                SkillEffectLibrary.damage(170, 'nature')
            ],
            
            // Passive: Timeless Aegis
            passiveName: 'Timeless Aegis',
            passiveDescription: 'At the start of battle, Frieren grants herself a permanent 10% Resistance to all elements.',
            passiveEffects: [
                SkillEffectLibrary.applyStatus('timelessAegis', -1, 100)
            ],
            passiveTriggers: ['onBattleStart']
        },
        
        {
            id: 'fern',
            name: 'Fern',
            series: 'Sousou no Frieren',
            element: 'light',
            gender: 'female',
            baseAtk: 141,
            baseDef: 97, 
            baseHp: 141,
            baseSpd: 98,
            rarity: 6,
            role: 'dps_st',
            
            // Skill: Mana Lance
            skillName: 'Mana Lance',
            skillDescription: 'Draws on the magical drills taught by Frieren to fire a concentrated bolt at one enemy for 150% ATK Light damage. 25% chance to inflict slow on the target for 2 turns.',
            skillSpCost: 10,
            skillTargetType: 'single-enemy',
            skillEffects: [
                SkillEffectLibrary.damage(150, 'light'),
                SkillEffectLibrary.applyStatus('slow', 2, 25)
            ],
            
            // Passive: Crescendo
            passiveName: 'Crescendo', 
            passiveDescription: 'Each time Fern uses a skill, she gains +5% ATK (stacking up to 3 times). At 3 stacks, her next skill costs 0 SP and deals 50% extra damage, then stacks reset.',
            passiveEffects: [
                SkillEffectLibrary.crescendo()
            ],
            passiveTriggers: ['onSkillUse']
        },
        
        {
            id: 'stark',
            name: 'Stark',
            series: 'Sousou no Frieren', 
            element: 'earth',
            gender: 'male',
            baseAtk: 99,
            baseDef: 144,
            baseHp: 118,
            baseSpd: 130,
            rarity: 4,
            role: 'tank',
            
            // Skill: Axe of the Fallen
            skillName: 'Axe of the Fallen',
            skillDescription: 'Swings his battle-axe in a wide arc, dealing 100% ATK earth damage to all enemies and applying -15% ATK for 2 turns. Then forms a protective barrier around him, generating a shield equal to 20% of his DEF for 2 turns.',
            skillSpCost: 15,
            skillTargetType: 'all-enemies',
            skillEffects: [
                SkillEffectLibrary.damage(100, 'earth'),
                // TODO: Implement ATK debuff and shield effects
            ],
            
            // Passive: Unyielding Oath
            passiveName: 'Unyielding Oath',
            passiveDescription: 'Once per battle, when an ally\'s HP falls below 30%, Stark takes all incoming single target hits for them for the next 2 turns.',
            passiveEffects: [
                // TODO: Implement protection redirect effect
            ],
            passiveTriggers: ['onAllyLowHP'],
            passiveConditions: ['oncePerBattle']
        }
    ],
    
    // Skill generation function for complex characters
    generateComplexSkills: function(servant) {
        const skills = [];
        
        // Primary skill
        skills.push({
            name: servant.skillName,
            description: servant.skillDescription,
            spCost: servant.skillSpCost,
            targetType: servant.skillTargetType,
            effects: servant.skillEffects,
            element: servant.element,
            emoji: this.getSkillEmoji(servant.skillName)
        });
        
        // Role-based additional skills
        switch (servant.role) {
            case 'support':
                skills.push({
                    name: 'Blessing',
                    description: 'Grants ATK boost to ally',
                    spCost: 15,
                    targetType: 'single-ally',
                    effects: [SkillEffectLibrary.applyStatus('atkBuff', 2)],
                    emoji: '🙏'
                });
                break;
                
            case 'dps_aoe':
                skills.push({
                    name: 'Focused Blast',
                    description: 'Single target high damage',
                    spCost: 20,
                    targetType: 'single-enemy', 
                    effects: [SkillEffectLibrary.damage(180)],
                    emoji: '💥'
                });
                break;
                
            case 'dps_st':
                skills.push({
                    name: 'Multi-Strike',
                    description: 'Multiple hits on single target',
                    spCost: 25,
                    targetType: 'single-enemy',
                    effects: [SkillEffectLibrary.damage(140)],
                    emoji: '⚡'
                });
                break;
                
            case 'tank':
                skills.push({
                    name: 'Protective Stance',
                    description: 'Increases defense and draws aggro',
                    spCost: 20,
                    targetType: 'self',
                    effects: [
                        SkillEffectLibrary.applyStatus('defBuff', 3),
                        SkillEffectLibrary.applyStatus('taunt', 2)
                    ],
                    emoji: '🛡️'
                });
                break;
        }
        
        return skills;
    },
    
    getSkillEmoji: function(skillName) {
        const emojiMap = {
            'Purification Fountain': '⛲',
            'Explosion': '💥',
            'Luck of the Draw': '🎲',
            'Ultimate Sacrifice... Maybe?': '💀',
            'Elven Magic Circle': '🌟',
            'Mana Lance': '⚡',
            'Axe of the Fallen': '🪓'
        };
        return emojiMap[skillName] || '✨';
    }
};
