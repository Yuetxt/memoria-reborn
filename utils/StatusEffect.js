// StatusEffect system for complex battle mechanics
class StatusEffect {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type; // 'buff', 'debuff', 'special'
        this.duration = config.duration; // -1 for permanent, 0 for instant
        this.stacks = config.stacks || 1;
        this.maxStacks = config.maxStacks || 1;
        this.emoji = config.emoji || '';
        
        // Effect values
        this.statModifiers = config.statModifiers || {}; // {atk: 0.15, def: 0.1}
        this.flatModifiers = config.flatModifiers || {}; // {atk: 50, hp: 100}
        this.resistances = config.resistances || {}; // {fire: 0.5, all: 0.1}
        
        // Special mechanics
        this.triggers = config.triggers || []; // ['onHit', 'onTurnStart', 'onSkillUse']
        this.conditions = config.conditions || []; // ['hpBelow30', 'firstSkill']
        this.effects = config.effects || []; // ['stun', 'skipTurn', 'taunt']
        
        // Callback functions for complex effects
        this.onApply = config.onApply || null;
        this.onRemove = config.onRemove || null;
        this.onTrigger = config.onTrigger || null;
        this.onTurnStart = config.onTurnStart || null;
        this.onTurnEnd = config.onTurnEnd || null;
        
        // Visual
        this.description = config.description || '';
        this.source = config.source || null; // Who applied this effect
    }
    
    // Add stacks to this effect
    addStacks(amount = 1) {
        this.stacks = Math.min(this.maxStacks, this.stacks + amount);
        return this;
    }
    
    // Remove stacks from this effect
    removeStacks(amount = 1) {
        this.stacks = Math.max(0, this.stacks - amount);
        return this.stacks > 0;
    }
    
    // Advance duration by one turn
    tick() {
        if (this.duration > 0) {
            this.duration--;
        }
        return this.duration !== 0; // Returns false when effect should be removed
    }
    
    // Calculate stat modifier based on stacks
    getStatModifier(stat) {
        const baseModifier = this.statModifiers[stat] || 0;
        const flatModifier = this.flatModifiers[stat] || 0;
        return {
            multiplier: baseModifier * this.stacks,
            flat: flatModifier * this.stacks
        };
    }
    
    // Check if effect should trigger based on conditions
    shouldTrigger(trigger, context = {}) {
        if (!this.triggers.includes(trigger)) return false;
        
        // Check conditions
        for (const condition of this.conditions) {
            if (!this.checkCondition(condition, context)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Check specific condition
    checkCondition(condition, context) {
        const { character, target, battleState } = context;
        
        switch (condition) {
            case 'hpBelow30':
                return character && (character.currentHp / character.stats.hp) < 0.3;
            case 'hpBelow50':
                return character && (character.currentHp / character.stats.hp) < 0.5;
            case 'firstSkill':
                return battleState && battleState.firstSkillUsed === false;
            case 'oncePerBattle':
                return battleState && !battleState.usedOncePerBattle?.includes(this.id);
            case 'femaleAllies':
                return target && target.gender === 'female';
            default:
                return true;
        }
    }
    
    // Execute the effect
    execute(context = {}) {
        if (this.onTrigger) {
            return this.onTrigger(context);
        }
        return null;
    }
    
    // Get display information
    getDisplayInfo() {
        let info = `${this.emoji} ${this.name}`;
        if (this.stacks > 1) {
            info += ` x${this.stacks}`;
        }
        if (this.duration > 0) {
            info += ` (${this.duration}🔄)`;
        }
        return info;
    }
    
    // Clone this effect for application to another character
    clone() {
        return new StatusEffect({
            id: this.id,
            name: this.name,
            type: this.type,
            duration: this.duration,
            stacks: this.stacks,
            maxStacks: this.maxStacks,
            emoji: this.emoji,
            statModifiers: { ...this.statModifiers },
            flatModifiers: { ...this.flatModifiers },
            resistances: { ...this.resistances },
            triggers: [...this.triggers],
            conditions: [...this.conditions],
            effects: [...this.effects],
            onApply: this.onApply,
            onRemove: this.onRemove,
            onTrigger: this.onTrigger,
            onTurnStart: this.onTurnStart,
            onTurnEnd: this.onTurnEnd,
            description: this.description,
            source: this.source
        });
    }
}

// Status Effect Registry - predefined effects
class StatusEffectRegistry {
    static effects = {
        // Basic status effects
        stun: {
            id: 'stun',
            name: 'Stunned',
            type: 'debuff',
            emoji: '😵',
            effects: ['skipTurn'],
            description: 'Cannot act this turn'
        },
        
        haste: {
            id: 'haste',
            name: 'Haste',
            type: 'buff',
            emoji: '💨',
            statModifiers: { spd: 0.25 },
            description: 'Increased speed'
        },
        
        slow: {
            id: 'slow',
            name: 'Slow',
            type: 'debuff',
            emoji: '🐌',
            statModifiers: { spd: -0.25 },
            description: 'Reduced speed'
        },
        
        taunt: {
            id: 'taunt',
            name: 'Taunt',
            type: 'special',
            emoji: '🔥➡️',
            effects: ['forcedTarget'],
            description: 'Forces enemies to target this character'
        },
        
        shield: {
            id: 'shield',
            name: 'Shield',
            type: 'buff',
            emoji: '🔰',
            description: 'Absorbs incoming damage'
        },
        
        // Character-specific effects
        atkBuff: {
            id: 'atkBuff',
            name: 'ATK Up',
            type: 'buff',
            emoji: '⬆️',
            statModifiers: { atk: 0.15 },
            maxStacks: 5,
            description: 'Increased attack power'
        },
        
        defBuff: {
            id: 'defBuff',
            name: 'DEF Up',
            type: 'buff',
            emoji: '🛡️',
            statModifiers: { def: 0.15 },
            maxStacks: 5,
            description: 'Increased defense'
        },
        
        resolve: {
            id: 'resolve',
            name: 'Resolve',
            type: 'buff',
            emoji: '💪',
            statModifiers: { def: 0.05 },
            maxStacks: 5,
            description: 'Masochist\'s determination'
        },
        
        crescendo: {
            id: 'crescendo',
            name: 'Crescendo',
            type: 'buff',
            emoji: '🎵',
            statModifiers: { atk: 0.05 },
            maxStacks: 3,
            description: 'Building magical power'
        },
        
        exhausted: {
            id: 'exhausted',
            name: 'Exhausted',
            type: 'debuff',
            emoji: '😴',
            effects: ['skipTurn'],
            description: 'Too tired to act from using Explosion'
        },
        
        timelessAegis: {
            id: 'timelessAegis',
            name: 'Timeless Aegis',
            type: 'buff',
            emoji: '🌿',
            resistances: { all: 0.1 },
            duration: -1,
            description: 'Permanent elemental resistance'
        }
    };
    
    static create(effectId, config = {}) {
        const template = this.effects[effectId];
        if (!template) {
            throw new Error(`Unknown status effect: ${effectId}`);
        }
        
        return new StatusEffect({
            ...template,
            ...config
        });
    }
    
    static register(effectId, config) {
        this.effects[effectId] = config;
    }
}

module.exports = { StatusEffect, StatusEffectRegistry };
