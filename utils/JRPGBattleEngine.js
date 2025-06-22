// Directory: /memoria-lost-bot/utils/JRPGBattleEngine.js
// JRPG-style battle engine

const { calculateElementalDamage } = require('./ElementalSystem');

class JRPGBattleEngine {
    constructor(playerTeam, enemyTeam) {
        this.playerTeam = playerTeam;
        this.enemyTeam = enemyTeam;
        this.turn = 1;
        this.battleLog = [];
        this.isOver = false;
        this.winner = null;
        
        // Initialize enemy AI
        this.enemyTeam.forEach(enemy => {
            enemy.currentAp = 100;
            enemy.maxAp = 100;
            enemy.isDefending = false;
        });
    }
    
    executePlayerTurn(actions) {
        this.battleLog = []; // Clear log for new turn
        
        // Reset defend status
        this.playerTeam.forEach(char => char.isDefending = false);
        
        // Sort actions by character speed
        const sortedActions = actions.sort((a, b) => {
            const charA = this.playerTeam[a.character];
            const charB = this.playerTeam[b.character];
            return charB.stats.spd - charA.stats.spd;
        });
        
        // Execute each action
        for (const action of sortedActions) {
            const character = this.playerTeam[action.character];
            if (character.currentHp <= 0) continue;
            
            switch (action.action) {
                case 'attack':
                    this.executeBasicAttack(character, action.target);
                    break;
                    
                case 'defend':
                    character.isDefending = true;
                    this.battleLog.push(`${character.name} is defending!`);
                    character.currentAp = Math.min(character.maxAp, character.currentAp + 10);
                    break;
                    
                case 'skill':
                    this.executeSkill(character, action.skill, action.target);
                    break;
            }
            
            // Check if all enemies defeated
            if (this.enemyTeam.every(e => e.currentHp <= 0)) {
                this.isOver = true;
                this.winner = 'player';
                return;
            }
        }
        
        // Regenerate AP
        this.playerTeam.forEach(char => {
            if (char.currentHp > 0) {
                char.currentAp = Math.min(char.maxAp, char.currentAp + 20);
            }
        });
    }
    
    executeEnemyTurn() {
        if (this.isOver) return;
        
        // Reset defend status
        this.enemyTeam.forEach(enemy => enemy.isDefending = false);
        
        // Simple AI for enemies
        for (const enemy of this.enemyTeam) {
            if (enemy.currentHp <= 0) continue;
            
            const aliveTargets = this.playerTeam.filter(p => p.currentHp > 0);
            if (aliveTargets.length === 0) {
                this.isOver = true;
                this.winner = 'enemy';
                return;
            }
            
            // Simple AI: Use skill if enough AP, otherwise basic attack
            if (enemy.currentAp >= 30 && enemy.skills.length > 1 && Math.random() > 0.5) {
                const skill = enemy.skills[1]; // Use second skill sometimes
                if (skill.targetType === 'all-enemies') {
                    this.executeEnemySkill(enemy, skill, 'all');
                } else {
                    const target = this.selectEnemyTarget(aliveTargets);
                    this.executeEnemySkill(enemy, skill, target);
                }
            } else {
                const target = this.selectEnemyTarget(aliveTargets);
                this.executeEnemyAttack(enemy, target);
            }
        }
        
        // Regenerate enemy AP
        this.enemyTeam.forEach(enemy => {
            if (enemy.currentHp > 0) {
                enemy.currentAp = Math.min(enemy.maxAp, enemy.currentAp + 20);
            }
        });
        
        // Check if all players defeated
        if (this.playerTeam.every(p => p.currentHp <= 0)) {
            this.isOver = true;
            this.winner = 'enemy';
        }
        
        this.turn++;
    }
    
    executeBasicAttack(attacker, targetInfo) {
        let target;
        if (targetInfo.type === 'enemy') {
            target = this.enemyTeam[targetInfo.index];
        } else {
            target = this.playerTeam[targetInfo.index];
        }
        
        if (!target || target.currentHp <= 0) return;
        
        // Basic attack damage formula (80% of ATK)
        let damage = Math.floor(attacker.stats.atk * 0.8);
        
        // Apply defense
        damage = Math.max(1, damage - Math.floor(target.stats.def * 0.5));
        
        // Check critical
        if (Math.random() * 100 < attacker.stats.critChance) {
            damage = Math.floor(damage * (attacker.stats.critDamage / 100));
            this.battleLog.push(`💥 Critical hit!`);
        }
        
        // Apply elemental damage
        damage = calculateElementalDamage(attacker.element, target.element, damage);
        
        // Apply defend bonus
        if (target.isDefending) {
            damage = Math.floor(damage * 0.5);
        }
        
        target.currentHp = Math.max(0, target.currentHp - damage);
        this.battleLog.push(`${attacker.name} attacks ${target.name} for ${damage} damage!`);
    }
    
    executeSkill(character, skill, targetInfo) {
        // Deduct AP
        character.currentAp -= skill.apCost;
        
        if (skill.targetType === 'all-enemies') {
            // Hit all enemies
            for (const enemy of this.enemyTeam) {
                if (enemy.currentHp > 0) {
                    this.applySkillEffect(character, skill, enemy);
                }
            }
        } else if (skill.targetType === 'all-allies') {
            // Affect all allies
            for (const ally of this.playerTeam) {
                if (ally.currentHp > 0) {
                    this.applySkillEffect(character, skill, ally);
                }
            }
        } else if (skill.targetType === 'self') {
            this.applySkillEffect(character, skill, character);
        } else {
            // Single target
            let target;
            if (targetInfo.type === 'enemy') {
                target = this.enemyTeam[targetInfo.index];
            } else {
                target = this.playerTeam[targetInfo.index];
            }
            
            if (target && target.currentHp > 0) {
                this.applySkillEffect(character, skill, target);
            }
        }
    }
    
    applySkillEffect(caster, skill, target) {
        if (skill.effect === 'heal') {
            // Healing skill
            const healing = Math.floor(caster.stats.atk * (skill.power / 100));
            const actualHealing = Math.min(healing, target.stats.hp - target.currentHp);
            target.currentHp += actualHealing;
            this.battleLog.push(`${caster.name} heals ${target.name} for ${actualHealing} HP!`);
        } else if (skill.power > 0) {
            // Damage skill
            let damage = Math.floor(caster.stats.atk * (skill.power / 100));
            damage = Math.max(1, damage - Math.floor(target.stats.def * 0.3));
            
            // Apply elemental damage
            const skillElement = skill.element || caster.element;
            damage = calculateElementalDamage(skillElement, target.element, damage);
            
            // Apply defend bonus
            if (target.isDefending) {
                damage = Math.floor(damage * 0.5);
            }
            
            target.currentHp = Math.max(0, target.currentHp - damage);
            this.battleLog.push(`${caster.name} uses ${skill.name} on ${target.name} for ${damage} damage!`);
        } else {
            // Status effect skill
            this.battleLog.push(`${caster.name} uses ${skill.name} on ${target.name}!`);
            // TODO: Implement status effects
        }
    }
    
    executeEnemyAttack(enemy, target) {
        let damage = Math.floor(enemy.stats.atk * 0.8);
        damage = Math.max(1, damage - Math.floor(target.stats.def * 0.5));
        
        if (target.isDefending) {
            damage = Math.floor(damage * 0.5);
        }
        
        target.currentHp = Math.max(0, target.currentHp - damage);
        this.battleLog.push(`${enemy.name} attacks ${target.name} for ${damage} damage!`);
    }
    
    executeEnemySkill(enemy, skill, target) {
        enemy.currentAp -= 30; // Fixed cost for enemy skills
        
        if (target === 'all') {
            for (const player of this.playerTeam) {
                if (player.currentHp > 0) {
                    this.applyEnemySkillEffect(enemy, skill, player);
                }
            }
        } else {
            this.applyEnemySkillEffect(enemy, skill, target);
        }
    }
    
    applyEnemySkillEffect(enemy, skill, target) {
        let damage = Math.floor(enemy.stats.atk * (skill.power / 100));
        damage = Math.max(1, damage - Math.floor(target.stats.def * 0.3));
        
        if (target.isDefending) {
            damage = Math.floor(damage * 0.5);
        }
        
        target.currentHp = Math.max(0, target.currentHp - damage);
        this.battleLog.push(`${enemy.name} uses ${skill.name} for ${damage} damage!`);
    }
    
    selectEnemyTarget(aliveTargets) {
        // Simple AI: Target lowest HP or tank
        const tanks = aliveTargets.filter(t => t.role === 'tank');
        if (tanks.length > 0 && Math.random() > 0.3) {
            return tanks[0];
        }
        
        // Otherwise target lowest HP
        return aliveTargets.reduce((lowest, current) => 
            current.currentHp < lowest.currentHp ? current : lowest
        );
    }
}

module.exports = JRPGBattleEngine;