const { calculateElementalDamage } = require('./ElementalSystem');

class BattleEngine {
    constructor(playerTeam, enemyTeam) {
        this.playerTeam = playerTeam;
        this.enemyTeam = enemyTeam;
        this.turn = 1;
        this.skillPoints = 5; // Starting SP
        this.battleLog = [];
        this.isOver = false;
        this.winner = null;
    }
    
    // Calculate turn order based on speed
    getTurnOrder() {
        const allUnits = [
            ...this.playerTeam.map(s => ({ ...s, isPlayer: true })),
            ...this.enemyTeam.map(e => ({ ...e, isPlayer: false }))
        ];
        
        return allUnits
            .filter(unit => unit.currentHp > 0)
            .sort((a, b) => b.stats.spd - a.stats.spd);
    }
    
    // Execute auto attack
    executeAutoAttack(attacker, defender) {
        // Check hit/miss
        const hitChance = attacker.stats.hitRate - defender.stats.evasion;
        if (Math.random() * 100 > hitChance) {
            this.battleLog.push(`${attacker.name} missed!`);
            return 0;
        }
        
        // Calculate damage
        let damage = attacker.stats.atk - defender.stats.def;
        damage = Math.max(damage, 1); // Minimum 1 damage
        
        // Check critical hit
        if (Math.random() * 100 < attacker.stats.critChance) {
            damage = Math.floor(damage * (attacker.stats.critDamage / 100));
            this.battleLog.push(`${attacker.name} scored a critical hit!`);
        }
        
        // Apply elemental damage
        damage = calculateElementalDamage(attacker.element, defender.element, damage);
        
        // Apply damage
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        this.battleLog.push(`${attacker.name} dealt ${damage} damage to ${defender.name}`);
        
        return damage;
    }
    
    // Execute skill
    executeSkill(attacker, skill, targets) {
        if (this.skillPoints < skill.cost) {
            this.battleLog.push(`Not enough SP to use ${skill.name}!`);
            return false;
        }
        
        this.skillPoints -= skill.cost;
        
        // Skill effects based on type
        switch (skill.type) {
            case 'damage':
                targets.forEach(target => {
                    const damage = Math.floor(attacker.stats.atk * (skill.power / 100));
                    const finalDamage = calculateElementalDamage(attacker.element, target.element, damage);
                    target.currentHp = Math.max(0, target.currentHp - finalDamage);
                    this.battleLog.push(`${attacker.name} used ${skill.name} and dealt ${finalDamage} damage to ${target.name}`);
                });
                break;
                
            case 'heal':
                targets.forEach(target => {
                    const healing = Math.floor(attacker.stats.atk * (skill.power / 100));
                    target.currentHp = Math.min(target.stats.hp, target.currentHp + healing);
                    this.battleLog.push(`${attacker.name} healed ${target.name} for ${healing} HP`);
                });
                break;
                
            case 'buff':
                // Implement buff logic
                break;
                
            case 'debuff':
                // Implement debuff logic
                break;
        }
        
        return true;
    }
    
    // Process one turn
    processTurn() {
        const turnOrder = this.getTurnOrder();
        
        for (const unit of turnOrder) {
            if (this.isOver) break;
            
            // Get valid targets
            const targetTeam = unit.isPlayer ? this.enemyTeam : this.playerTeam;
            const validTargets = targetTeam.filter(t => t.currentHp > 0);
            
            if (validTargets.length === 0) {
                this.isOver = true;
                this.winner = unit.isPlayer ? 'player' : 'enemy';
                break;
            }
            
            // AI logic for enemies, player choice for player units
            if (!unit.isPlayer) {
                // Simple AI: attack random target
                const target = validTargets[Math.floor(Math.random() * validTargets.length)];
                this.executeAutoAttack(unit, target);
            }
        }
        
        // Regenerate SP at end of turn
        this.skillPoints = Math.min(10, this.skillPoints + 1);
        this.turn++;
        
        // Check victory conditions
        if (this.playerTeam.every(s => s.currentHp <= 0)) {
            this.isOver = true;
            this.winner = 'enemy';
        } else if (this.enemyTeam.every(e => e.currentHp <= 0)) {
            this.isOver = true;
            this.winner = 'player';
        }
    }
}

module.exports = BattleEngine;