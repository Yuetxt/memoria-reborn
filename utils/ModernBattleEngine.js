// Modern Battle Engine for Memoria Lost - SP-based combat system
const { calculateElementalDamage } = require('./ElementalSystem');
const { StatusEffect, StatusEffectRegistry } = require('./StatusEffect');
const { SkillEffect, SkillEffectLibrary } = require('./SkillEffect');

class ModernBattleEngine {
    constructor(playerTeam, enemyTeam, config = {}) {
        this.playerTeam = playerTeam;
        this.enemyTeam = enemyTeam;
        this.turn = 1;
        this.battleLog = [];
        this.isOver = false;
        this.winner = null;
        
        // Combat configuration
        this.config = {
            baseSP: config.baseSP || 5, // Starting team SP
            maxSP: config.maxSP || 15, // SP cap (10-15 range)
            autoAttackSPGain: 1,
            spRegenPerTurn: 0,
            ...config
        };
        
        // Shared team SP system
        this.teamSP = this.config.baseSP;
        this.maxTeamSP = this.config.maxSP;
        
        // Initialize team SP and status
        this.initializeTeams();
    }
    
    initializeTeams() {
        // Initialize player team (no individual SP anymore)
        this.playerTeam.forEach(character => {
            character.statusEffects = [];
            character.selectedAction = null;
        });
        
        // Initialize enemy team (enemies still have individual SP for AI logic)
        this.enemyTeam.forEach(enemy => {
            enemy.currentSP = 0;
            enemy.maxSP = this.config.maxSP;
            enemy.statusEffects = [];
        });
    }
    
    // Execute a complete battle turn
    async executeTurn(playerActions) {
        this.battleLog = []; // Clear previous turn log
        
        // Process turn start effects
        this.processStatusEffects('turnStart');
        await this.triggerPassiveEffects('onTurnStart');
        
        // Mixed turn order system - characters and enemies act based on individual speeds
        const allActions = [];
        
        // Add player actions
        playerActions.forEach((action, index) => {
            const character = this.playerTeam[index];
            if (character && character.currentHp > 0 && this.canCharacterAct(character)) {
                allActions.push({
                    type: 'player',
                    character: character,
                    action: action.action,
                    target: action.target,
                    skill: action.skill,
                    speed: this.getEffectiveStats(character).spd
                });
            }
        });
        
        // Add enemy actions (AI generated)
        this.enemyTeam.forEach(enemy => {
            if (enemy.currentHp > 0 && this.canCharacterAct(enemy)) {
                const enemyAction = this.generateEnemyAction(enemy);
                allActions.push({
                    type: 'enemy',
                    character: enemy,
                    action: enemyAction.action,
                    target: enemyAction.target,
                    skill: enemyAction.skill,
                    speed: this.getEffectiveStats(enemy).spd
                });
            }
        });
        
        // Sort by speed (highest first) - creates mixed turn order
        allActions.sort((a, b) => b.speed - a.speed);
        
        // Execute all actions in speed order
        for (const actionData of allActions) {
            if (actionData.character.currentHp <= 0) continue;
            if (!this.canCharacterAct(actionData.character)) {
                this.addBattleLog(`😵 ${actionData.character.name} is unable to act!`);
                continue;
            }
            
            await this.executeAction(actionData);
            
            // Check for battle end after each action
            if (this.checkBattleEnd()) {
                break;
            }
        }
        
        // Apply end of turn effects
        await this.applyEndOfTurnEffects();
        
        this.turn++;
    }
    
    async executeAction(actionData) {
        const { type, character, action, target, skill } = actionData;
        
        switch (action) {
            case 'auto-attack':
                this.executeAutoAttack(character, target, type);
                break;
                
            case 'skill':
                this.executeSkill(character, skill, target, type);
                break;
        }
    }
    
    executeAutoAttack(attacker, targetInfo, attackerType) {
        // Grant SP for auto-attack (scaling based on saved SP)
        if (attackerType === 'player') {
            const spGain = this.calculateSPGain();
            this.teamSP = Math.min(this.maxTeamSP, this.teamSP + spGain);
            this.addBattleLog(`💫 Team gains ${spGain} SP! (${this.teamSP}/${this.maxTeamSP})`);
        }
        
        // Find target
        const target = this.getTarget(targetInfo, attackerType);
        if (!target || target.currentHp <= 0) return;
        
        // Calculate damage (80% of ATK for auto-attacks)
        let damage = Math.floor(attacker.stats.atk * 0.8);
        
        // Apply defense
        damage = Math.max(1, damage - Math.floor(target.stats.def * 0.4));
        
        // Apply elemental damage multiplier
        damage = calculateElementalDamage(attacker.element, target.element, damage);
        
        // Check for critical hit
        if (Math.random() * 100 < attacker.stats.critChance) {
            damage = Math.floor(damage * (attacker.stats.critDamage / 100));
            this.battleLog.push(`💥 ${attacker.name} scores a critical hit!`);
        }
        
        // Apply damage
        target.currentHp = Math.max(0, target.currentHp - damage);
        
        this.battleLog.push(`⚔️ ${attacker.name} attacks ${target.name} for ${damage} damage!`);
    }
    
    executeSkill(caster, skill, targetInfo, casterType) {
        // Deduct SP cost from team pool (player only)
        if (casterType === 'player') {
            this.teamSP -= skill.spCost;
        } else {
            // Enemies still use individual SP
            caster.currentSP -= skill.spCost;
        }
        
        // Apply skill effects based on target type
        switch (skill.targetType) {
            case 'single-enemy':
            case 'single-ally':
                const target = this.getTarget(targetInfo, casterType);
                if (target && target.currentHp > 0) {
                    this.applySkillEffect(caster, skill, target);
                }
                break;
                
            case 'all-enemies':
                const enemies = casterType === 'player' ? this.enemyTeam : this.playerTeam;
                enemies.forEach(enemy => {
                    if (enemy.currentHp > 0) {
                        this.applySkillEffect(caster, skill, enemy);
                    }
                });
                break;
                
            case 'all-allies':
                const allies = casterType === 'player' ? this.playerTeam : this.enemyTeam;
                allies.forEach(ally => {
                    if (ally.currentHp > 0) {
                        this.applySkillEffect(caster, skill, ally);
                    }
                });
                break;
                
            case 'self':
                this.applySkillEffect(caster, skill, caster);
                break;
        }
    }
    
    applySkillEffect(caster, skill, target) {
        if (skill.effect === 'damage') {
            // Damage skill
            let damage = Math.floor(caster.stats.atk * (skill.power / 100));
            damage = Math.max(1, damage - Math.floor(target.stats.def * 0.3));
            
            // Apply elemental damage
            const skillElement = skill.element || caster.element;
            damage = calculateElementalDamage(skillElement, target.element, damage);
            
            target.currentHp = Math.max(0, target.currentHp - damage);
            this.battleLog.push(`✨ ${caster.name} uses ${skill.name} on ${target.name} for ${damage} damage!`);
            
        } else if (skill.effect === 'heal') {
            // Healing skill
            const healing = Math.floor(caster.stats.atk * (skill.power / 100));
            const actualHealing = Math.min(healing, target.stats.hp - target.currentHp);
            target.currentHp += actualHealing;
            this.battleLog.push(`💚 ${caster.name} heals ${target.name} for ${actualHealing} HP!`);
            
        } else if (skill.effect === 'buff') {
            // Status effect (simplified implementation)
            this.battleLog.push(`⬆️ ${caster.name} uses ${skill.name} on ${target.name}!`);
            // TODO: Implement full status effect system
            
        } else if (skill.effect === 'debuff') {
            // Debuff effect
            this.battleLog.push(`⬇️ ${caster.name} uses ${skill.name} on ${target.name}!`);
            // TODO: Implement full status effect system
        }
    }
    
    getTarget(targetInfo, attackerType) {
        if (!targetInfo) return null;
        
        if (targetInfo.type === 'enemy') {
            return attackerType === 'player' ? this.enemyTeam[targetInfo.index] : this.playerTeam[targetInfo.index];
        } else if (targetInfo.type === 'ally') {
            return attackerType === 'player' ? this.playerTeam[targetInfo.index] : this.enemyTeam[targetInfo.index];
        }
        
        return null;
    }
    
    generateEnemyAction(enemy) {
        const alivePlayerTargets = this.playerTeam.filter(p => p.currentHp > 0);
        
        // Simple AI: Use skill if enough SP, otherwise auto-attack
        const availableSkills = enemy.skills.filter(skill => enemy.currentSP >= skill.spCost);
        
        if (availableSkills.length > 0 && Math.random() > 0.4) {
            // Use a random available skill
            const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            
            let target = null;
            if (skill.targetType === 'single-enemy') {
                target = this.selectEnemyTarget(alivePlayerTargets);
            }
            
            return {
                action: 'skill',
                skill: skill,
                target: target ? { type: 'enemy', index: this.playerTeam.indexOf(target) } : null
            };
        } else {
            // Auto-attack - select target based on slot priority
            const target = this.selectEnemyTarget(alivePlayerTargets);
            return {
                action: 'auto-attack',
                target: { type: 'enemy', index: this.playerTeam.indexOf(target) }
            };
        }
    }
    
    selectEnemyTarget(aliveTargets) {
        // Prioritize by slot position (Slot 1 = index 0 has highest priority)
        for (let slot = 0; slot < 4; slot++) {
            const targetInSlot = aliveTargets.find(target => {
                const playerIndex = this.playerTeam.indexOf(target);
                return playerIndex === slot;
            });
            
            if (targetInSlot) {
                return targetInSlot;
            }
        }
        
        // Fallback: first alive target
        return aliveTargets[0];
    }
    
    async applyEndOfTurnEffects() {
        // Apply SP regeneration if configured
        if (this.config.spRegenPerTurn > 0) {
            // Team SP regeneration
            this.teamSP = Math.min(this.maxTeamSP, this.teamSP + this.config.spRegenPerTurn);
            
            // Enemy individual SP regeneration
            this.enemyTeam.forEach(enemy => {
                if (enemy.currentHp > 0) {
                    enemy.currentSP = Math.min(enemy.maxSP, enemy.currentSP + this.config.spRegenPerTurn);
                }
            });
        }
        
        // Process status effects at turn end
        this.processStatusEffects('turnEnd');
        await this.triggerPassiveEffects('onTurnEnd');
    }
    
    // Trigger passive effects for characters
    async triggerPassiveEffects(trigger) {
        const allCharacters = [...this.playerTeam, ...this.enemyTeam];
        
        for (const character of allCharacters) {
            if (character.currentHp <= 0) continue;
            
            // Check if character has passive triggers for this event
            if (character.passiveTriggers && character.passiveTriggers.includes(trigger)) {
                // Execute passive effects
                if (character.passiveEffects) {
                    for (const effect of character.passiveEffects) {
                        if (effect && effect.apply) {
                            await effect.apply(character, [character], this, { trigger });
                        }
                    }
                }
            }
        }
    }
    
    // Status Effect Management Methods
    
    applyStatusEffect(character, statusEffect) {
        const existingEffect = character.statusEffects.find(effect => effect.id === statusEffect.id);
        
        if (existingEffect && statusEffect.maxStacks > 1) {
            // Stack the effect
            existingEffect.addStacks(statusEffect.stacks);
            if (statusEffect.duration > existingEffect.duration) {
                existingEffect.duration = statusEffect.duration;
            }
        } else if (existingEffect) {
            // Refresh duration
            existingEffect.duration = Math.max(existingEffect.duration, statusEffect.duration);
        } else {
            // Apply new effect
            character.statusEffects.push(statusEffect.clone());
            if (statusEffect.onApply) {
                statusEffect.onApply({ character, battleEngine: this });
            }
        }
    }
    
    async triggerStatusEffects(trigger, context = {}) {
        const allCharacters = [...this.playerTeam, ...this.enemyTeam];
        
        for (const character of allCharacters) {
            for (const effect of character.statusEffects) {
                if (effect.shouldTrigger(trigger, { ...context, character, battleState: this })) {
                    await effect.execute({ ...context, character, battleEngine: this });
                }
            }
        }
    }
    
    applyDamageModifiers(damage, attacker, target) {
        let modifiedDamage = damage;
        
        // Apply attacker's damage modifying effects
        for (const effect of attacker.statusEffects) {
            const atkMod = effect.getStatModifier('atk');
            modifiedDamage = Math.floor(modifiedDamage * (1 + atkMod.multiplier)) + atkMod.flat;
        }
        
        // Apply target's resistance effects
        for (const effect of target.statusEffects) {
            if (effect.resistances.all) {
                modifiedDamage = Math.floor(modifiedDamage * (1 - effect.resistances.all));
            }
        }
        
        return Math.max(1, modifiedDamage);
    }
    
    applyHealingModifiers(healing, caster, target) {
        let modifiedHealing = healing;
        
        // Apply caster's healing modifying effects
        for (const effect of caster.statusEffects) {
            // Check for healing boost effects
            if (effect.id === 'goddessOfWater' || effect.description.includes('healing')) {
                modifiedHealing = Math.floor(modifiedHealing * 1.25);
            }
        }
        
        return modifiedHealing;
    }
    
    addBattleLog(message) {
        this.battleLog.push(message);
    }
    
    processStatusEffects(phase) {
        const allCharacters = [...this.playerTeam, ...this.enemyTeam];
        
        for (const character of allCharacters) {
            if (character.currentHp <= 0) continue;
            
            // Process each status effect
            character.statusEffects = character.statusEffects.filter(effect => {
                // Call phase-specific handlers
                if (phase === 'turnStart' && effect.onTurnStart) {
                    effect.onTurnStart({ character, battleEngine: this });
                }
                if (phase === 'turnEnd' && effect.onTurnEnd) {
                    effect.onTurnEnd({ character, battleEngine: this });
                }
                
                // Tick duration and check if effect should be removed
                const shouldKeep = effect.tick();
                
                if (!shouldKeep && effect.onRemove) {
                    effect.onRemove({ character, battleEngine: this });
                }
                
                return shouldKeep;
            });
        }
    }
    
    // Get character's effective stats including status effect modifiers
    getEffectiveStats(character) {
        const baseStats = { ...character.stats };
        
        for (const effect of character.statusEffects) {
            for (const stat in baseStats) {
                const modifier = effect.getStatModifier(stat);
                baseStats[stat] = Math.floor(baseStats[stat] * (1 + modifier.multiplier)) + modifier.flat;
            }
        }
        
        return baseStats;
    }
    
    // Check if character can act (not stunned, etc.)
    canCharacterAct(character) {
        return !character.statusEffects.some(effect => effect.effects.includes('skipTurn'));
    }
    
    // Get forced target if character is taunted
    getForcedTarget(attacker, defaultTargets) {
        const tauntedTargets = defaultTargets.filter(target => 
            target.statusEffects.some(effect => effect.effects.includes('forcedTarget'))
        );
        
        return tauntedTargets.length > 0 ? tauntedTargets : defaultTargets;
    }
    
    // Calculate SP gain based on current SP pool (scaling mechanic)
    calculateSPGain() {
        // Base SP gain
        let spGain = this.config.autoAttackSPGain;
        
        // Scaling based on saved SP - more SP saved = better gain efficiency
        if (this.teamSP >= 10) {
            spGain += 1; // Bonus SP for having high reserves
        } else if (this.teamSP >= 7) {
            spGain += 0.5; // Small bonus for moderate reserves
        }
        
        return Math.ceil(spGain);
    }
    
    checkBattleEnd() {
        const alivePlayerCharacters = this.playerTeam.filter(c => c.currentHp > 0);
        const aliveEnemies = this.enemyTeam.filter(e => e.currentHp > 0);
        
        if (aliveEnemies.length === 0) {
            this.isOver = true;
            this.winner = 'player';
            return true;
        }
        
        if (alivePlayerCharacters.length === 0) {
            this.isOver = true;
            this.winner = 'enemy';
            return true;
        }
        
        return false;
    }
    
    // Create dynamic HP/SP bar for Discord display
    createHPBar(current, max, length = 20) {
        const percentage = Math.floor((current / max) * 100);
        const filled = Math.floor((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    
    createSPBar(current, max, length = 15) {
        const percentage = Math.floor((current / max) * 100);
        const filled = Math.floor((percentage / 100) * length);
        const empty = length - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }
    
    // Get battle status summary for UI
    getBattleStatus() {
        return {
            turn: this.turn,
            teamSP: this.teamSP,
            maxTeamSP: this.maxTeamSP,
            spPercentage: Math.floor((this.teamSP / this.maxTeamSP) * 100),
            playerTeam: this.playerTeam.map(char => ({
                name: char.name,
                currentHp: char.currentHp,
                maxHp: char.stats.hp,
                hpPercentage: Math.floor((char.currentHp / char.stats.hp) * 100),
                isAlive: char.currentHp > 0,
                // Individual character stats for display
                element: char.element,
                role: char.role,
                speed: this.getEffectiveStats(char).spd
            })),
            enemyTeam: this.enemyTeam.map(enemy => ({
                name: enemy.name,
                currentHp: enemy.currentHp,
                maxHp: enemy.stats.hp,
                hpPercentage: Math.floor((enemy.currentHp / enemy.stats.hp) * 100),
                isAlive: enemy.currentHp > 0,
                element: enemy.element,
                speed: this.getEffectiveStats(enemy).spd
            })),
            battleLog: this.battleLog.slice(-5), // Last 5 messages
            isOver: this.isOver,
            winner: this.winner
        };
    }
}

module.exports = ModernBattleEngine;
