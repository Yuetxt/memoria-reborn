import {Sequelize, Model, DataTypes} from "sequelize";
import {calculateLvl, calculateXp} from "../../utils/xp"
export class Player extends Model {

    static init(sequelize) {
        return super.init({
            discordId: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            lvl: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            xp: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            stamina: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    min: 0,
                }
            },
            lastStaminaRecharge: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            floor: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: '1-1'
            },
            pulls: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            gold: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            }
        }, {sequelize, tableName: "Players", modelName: "Player", timestamps: false})
    }

    static associate(models) {
        // Define association with Servant
        this.hasMany(models.Servants, {
            foreignKey: 'playerId',
            sourceKey: 'discordId',
            as: 'servants'
        });
    }

    getXpProgress() {
        const nextLevelXp = calculateXp(this.lvl + 1, "player")
        const currentLevelXp = calculateXp(this.lvl, "player")
        const neededXp = nextLevelXp - currentLevelXp
        return {
            neededXp,
            progress: Math.max(0, (this.xp - currentLevelXp) / neededXp)
        }
    }

    calculateLvl() {
        this.lvl = calculateLvl(this.xp, "player")
    }

    rechargeStamina() {
        const elapsed = Math.floor(Date.now() / 1000) - this.lastStaminaRecharge
        const minutesElapsed = Math.floor(elapsed / 60)
        this.stamina = Math.min(this.stamina + Math.floor(minutesElapsed / 4), 100)
        this.lastStaminaRecharge = Math.floor(Date.now() / 1000)
    }
}