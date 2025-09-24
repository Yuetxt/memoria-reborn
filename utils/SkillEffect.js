// Modular Skill Effect system for complex character abilities
const { StatusEffectRegistry } = require('./StatusEffect');
const { calculateElementalDamage } = require('./ElementalSystem');

class SkillEffect {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.type = config.type; // 'damage', 'heal', 'buff', 'debuff', 'special'
        this.targetType = config.targetType; // 'single-enemy', 'all-enemies', 'single-ally', 'all-allies', 'self'
        
        // Execution parameters
        this.execute = config.execute; // Function that handles the effect
        this.conditions = config.conditions || []; // Prerequisites for the effect
        this.chances = config.chances || {}; // Probability-based effects
        
        // Visual
        this.emoji = config.emoji || '✨';
        this.animations = config.animations || [];
    }
    
    // Apply this effect to targets
    async apply(caster, targets, battleEngine, context = {}) {
        if (!this.checkConditions(caster, context)) {
            return { success: false, reason: 'Conditions not met' };
        }
        
        return await this.execute(caster, targets, battleEngine, context);
    }
    
    // Check if conditions are met for this effect
    checkConditions(caster, context) {
        for (const condition of this.conditions) {
            if (!this.evaluateCondition(condition, caster, context)) {
                return false;
            }
        }
        return true;
    }
    
    // Evaluate a specific condition
    evaluateCondition(condition, caster, context) {
        switch (condition.type) {
            case 'hpThreshold':
                return (caster.currentHp / caster.stats.hp) <= condition.value;
            case 'spThreshold':
                return caster.currentSP >= condition.value;
            case 'statusPresent':
                return caster.statusEffects.some(effect => effect.id === condition.value);
            case 'oncePerBattle':
                return !context.battleState?.usedOncePerBattle?.includes(condition.value);
            default:
                return true;
        }
    }
}

// Skill Effect Library - Predefined complex effects
class SkillEffectLibrary {
    
    // Basic damage effect
    static damage(power, element = null, additionalEffects = []) {
        return new SkillEffect({
            id: 'damage',
            name: 'Damage',
            type: 'damage',
            execute: async (caster, targets, battleEngine, context) => {
                const results = [];
                
                for (const target of targets) {
                    if (target.currentHp <= 0) continue;
                    
                    let damage = Math.floor(caster.stats.atk * (power / 100));
                    damage = Math.max(1, damage - Math.floor(target.stats.def * 0.3));
                    
                    // Apply elemental damage
                    const skillElement = element || caster.element;
                    damage = calculateElementalDamage(skillElement, target.element, damage);
                    
                    // Apply status effect modifiers
                    damage = battleEngine.applyDamageModifiers(damage, caster, target);
                    
                    target.currentHp = Math.max(0, target.currentHp - damage);
                    
                    results.push({
                        target: target.name,
                        damage: damage,
                        element: skillElement
                    });
                    
                    battleEngine.addBattleLog(`${caster.name} deals ${damage} ${skillElement} damage to ${target.name}!`);
                    
                    // Trigger any hit-based effects
                    await battleEngine.triggerStatusEffects('onHit', { caster, target, damage });
                }
                
                // Apply additional effects
                for (const effect of additionalEffects) {
                    await effect.apply(caster, targets, battleEngine, context);
                }
                
                return { success: true, results };
            }
        });
    }
    
    // Healing effect
    static heal(power, cleanse = false) {
        return new SkillEffect({
            id: 'heal',
            name: 'Heal',
            type: 'heal',
            execute: async (caster, targets, battleEngine, context) => {
                const results = [];
                
                for (const target of targets) {
                    if (target.currentHp <= 0) continue;
                    
                    let healing = Math.floor(caster.stats.atk * (power / 100));
                    
                    // Apply healing modifiers from status effects
                    healing = battleEngine.applyHealingModifiers(healing, caster, target);
                    
                    const actualHealing = Math.min(healing, target.stats.hp - target.currentHp);
                    target.currentHp += actualHealing;
                    
                    results.push({
                        target: target.name,
                        healing: actualHealing
                    });
                    
                    battleEngine.addBattleLog(`${caster.name} heals ${target.name} for ${actualHealing} HP!`);
                    
                    // Cleanse debuffs if specified
                    if (cleanse) {
                        const removed = target.statusEffects.filter(effect => effect.type === 'debuff');
                        target.statusEffects = target.statusEffects.filter(effect => effect.type !== 'debuff');
                        if (removed.length > 0) {
                            battleEngine.addBattleLog(`🧹 ${target.name} has been cleansed of ${removed.length} debuff(s)!`);
                        }
                    }
                }
                
                return { success: true, results };
            }
        });
    }
    
    // Apply status effect
    static applyStatus(statusId, duration = 2, chance = 100) {
        return new SkillEffect({
            id: 'applyStatus',
            name: `Apply ${statusId}`,
            type: 'buff',
            execute: async (caster, targets, battleEngine, context) => {
                const results = [];
                
                for (const target of targets) {
                    if (target.currentHp <= 0) continue;
                    
                    if (Math.random() * 100 < chance) {
                        const statusEffect = StatusEffectRegistry.create(statusId, {
                            duration: duration,
                            source: caster.name
                        });
                        
                        battleEngine.applyStatusEffect(target, statusEffect);
                        results.push({
                            target: target.name,
                            status: statusEffect.name
                        });
                        
                        battleEngine.addBattleLog(`${statusEffect.emoji} ${target.name} is now ${statusEffect.name}!`);
                    }
                }
                
                return { success: true, results };
            }
        });
    }
    
    // Conditional effect with chance
    static conditionalEffect(chance, successEffect, failureEffect = null) {
        return new SkillEffect({
            id: 'conditional',
            name: 'Conditional Effect',
            type: 'special',
            execute: async (caster, targets, battleEngine, context) => {
                const roll = Math.random() * 100;
                
                if (roll < chance) {
                    battleEngine.addBattleLog(`🎲 Success! (${roll.toFixed(1)}% vs ${chance}%)`);
                    return await successEffect.apply(caster, targets, battleEngine, context);
                } else {
                    battleEngine.addBattleLog(`🎲 Failed! (${roll.toFixed(1)}% vs ${chance}%)`);
                    if (failureEffect) {
                        return await failureEffect.apply(caster, targets, battleEngine, context);
                    }
                }
                
                return { success: true, results: [] };
            }
        });
    }
    
    // Self-damage effect
    static selfDamage(percentage, isFlat = false) {
        return new SkillEffect({
            id: 'selfDamage',
            name: 'Self Damage',
            type: 'special',
            execute: async (caster, targets, battleEngine, context) => {
                let damage;
                if (isFlat) {
                    damage = percentage;
                } else {
                    damage = Math.floor(caster.stats.hp * (percentage / 100));
                }
                
                caster.currentHp = Math.max(1, caster.currentHp - damage); // Don't let self-damage kill
                battleEngine.addBattleLog(`💥 ${caster.name} takes ${damage} damage from their own ability!`);
                
                return { success: true, results: [{ target: caster.name, damage }] };
            }
        });
    }
    
    // Force next turn skip
    static skipNextTurn() {
        return new SkillEffect({
            id: 'skipTurn',
            name: 'Skip Turn',
            type: 'debuff',
            execute: async (caster, targets, battleEngine, context) => {
                const exhausted = StatusEffectRegistry.create('exhausted', {
                    duration: 1,
                    source: caster.name
                });
                
                battleEngine.applyStatusEffect(caster, exhausted);
                battleEngine.addBattleLog(`😴 ${caster.name} will be exhausted next turn!`);
                
                return { success: true, results: [] };
            }
        });
    }
    
    // Complex multi-effect skill
    static multiEffect(effects) {
        return new SkillEffect({
            id: 'multiEffect',
            name: 'Multi Effect',
            type: 'special',
            execute: async (caster, targets, battleEngine, context) => {
                const allResults = [];
                
                for (const effect of effects) {
                    const result = await effect.apply(caster, targets, battleEngine, context);
                    allResults.push(result);
                }
                
                return { success: true, results: allResults };
            }
        });
    }
    
    // Character-specific complex effects
    
    // Aqua's Goddess of Trouble passive
    static goddessOfTrouble() {
        return new SkillEffect({
            id: 'goddessOfTrouble',
            name: 'Goddess of Trouble',
            type: 'special',
            execute: async (caster, targets, battleEngine, context) => {
                if (Math.random() < 0.25) { // 25% chance
                    // Trip and lose 50% HP
                    const damage = Math.floor(caster.stats.hp * 0.5);
                    caster.currentHp = Math.max(1, caster.currentHp - damage);
                    battleEngine.addBattleLog(`💃 ${caster.name} trips and hurts herself for ${damage} damage!`);
                    
                    // But buff all allies' ATK by 15% for 2 turns
                    const allies = battleEngine.playerTeam.filter(ally => ally.id !== caster.id && ally.currentHp > 0);
                    for (const ally of allies) {
                        const atkBuff = StatusEffectRegistry.create('atkBuff', {
                            duration: 2,
                            stacks: 1,
                            source: caster.name
                        });
                        battleEngine.applyStatusEffect(ally, atkBuff);
                    }
                    battleEngine.addBattleLog(`⬆️ All allies gain ATK boost from ${caster.name}'s "accident"!`);
                }
                
                return { success: true, results: [] };
            }
        });
    }
    
    // Kazuma's Lucky Pervert passive  
    static luckyPervert() {
        return new SkillEffect({
            id: 'luckyPervert',
            name: 'Lucky Pervert',
            type: 'special',
            conditions: [{ type: 'statusPresent', value: 'debuff' }],
            execute: async (caster, targets, battleEngine, context) => {
                if (Math.random() < 0.25) { // 25% chance to avoid debuff
                    // Remove the debuff
                    const debuffs = caster.statusEffects.filter(effect => effect.type === 'debuff');
                    caster.statusEffects = caster.statusEffects.filter(effect => effect.type !== 'debuff');
                    
                    battleEngine.addBattleLog(`😏 ${caster.name} avoids debuffs with his luck!`);
                    
                    // Give haste to female allies (assuming we add gender property)
                    const femaleAllies = battleEngine.playerTeam.filter(ally => 
                        ally.id !== caster.id && ally.currentHp > 0 && ally.gender === 'female'
                    );
                    for (const ally of femaleAllies) {
                        const haste = StatusEffectRegistry.create('haste', {
                            duration: 2,
                            source: caster.name
                        });
                        battleEngine.applyStatusEffect(ally, haste);
                    }
                    if (femaleAllies.length > 0) {
                        battleEngine.addBattleLog(`💨 Female allies become flustered and gain haste!`);
                    }
                }
                
                return { success: true, results: [] };
            }
        });
    }
    
    // Fern's Crescendo passive
    static crescendo() {
        return new SkillEffect({
            id: 'crescendoTrigger',
            name: 'Crescendo Trigger',
            type: 'special',
            execute: async (caster, targets, battleEngine, context) => {
                // Add crescendo stack
                let crescendoEffect = caster.statusEffects.find(effect => effect.id === 'crescendo');
                if (crescendoEffect) {
                    crescendoEffect.addStacks(1);
                } else {
                    crescendoEffect = StatusEffectRegistry.create('crescendo', {
                        duration: -1, // Permanent until triggered
                        stacks: 1,
                        source: caster.name
                    });
                    battleEngine.applyStatusEffect(caster, crescendoEffect);
                }
                
                battleEngine.addBattleLog(`🎵 ${caster.name} gains Crescendo stack (${crescendoEffect.stacks}/3)!`);
                
                // Check if at max stacks
                if (crescendoEffect.stacks >= 3) {
                    battleEngine.addBattleLog(`✨ ${caster.name}'s next skill will be free and enhanced!`);
                    context.nextSkillFree = true;
                    context.nextSkillEnhanced = true;
                }
                
                return { success: true, results: [] };
            }
        });
    }
}

module.exports = { SkillEffect, SkillEffectLibrary };
