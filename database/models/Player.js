const { DataTypes, Model } = require('sequelize');

class Player extends Model {
    static init(sequelize) {
        return super.init({
            discordId: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            username: {
                type: DataTypes.STRING,
                allowNull: false
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            experience: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            stamina: {
                type: DataTypes.INTEGER,
                defaultValue: 100
            },
            maxStamina: {
                type: DataTypes.INTEGER,
                defaultValue: 100
            },
            gold: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            gems: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            currentFloor: {
                type: DataTypes.STRING,
                defaultValue: '1-1'
            },
            lastStaminaRegen: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            totalBattlesWon: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            totalQuestsCompleted: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            }
        }, {
            sequelize,
            modelName: 'Player',
            tableName: 'players'
        });
    }

    async regenerateStamina() {
        const now = new Date();
        const lastRegen = new Date(this.lastStaminaRegen);
        const minutesPassed = Math.floor((now - lastRegen) / 60000);
        
        if (minutesPassed >= 4) {
            const staminaToAdd = Math.floor(minutesPassed / 4);
            const newStamina = Math.min(this.stamina + staminaToAdd, this.maxStamina);
            
            await this.update({
                stamina: newStamina,
                lastStaminaRegen: now
            });
        }
    }

    async addExperience(amount) {
        this.experience += amount;
        
        // Level up logic
        const expNeeded = this.level * 100; // Simple formula, can be adjusted
        if (this.experience >= expNeeded) {
            this.level += 1;
            this.experience -= expNeeded;
            this.maxStamina += 10;
            this.stamina = this.maxStamina;
            await this.save();
            return true; // Leveled up
        }
        await this.save();
        return false; // No level up
    }
}

module.exports = Player;