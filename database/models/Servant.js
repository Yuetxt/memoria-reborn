import {DataTypes, Model} from "sequelize";
import {getServantData} from "../../utils/battle/setup";
import {calculateLvl, calculateXp} from "../../utils/xp";
export class Servant extends Model {
    static init(sequelize) {
        return super.init({
            servant_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            playerId: {
                type: DataTypes.STRING,
                allowNull: false,
                references: {
                    model: 'Players', // This references the table name
                    key: 'discordId'  // This references the primary key in the Players table
                }
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
            bondXp: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            bondLvl: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            teamSlot: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: -1
            },
            rarity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            }
        }, {
            sequelize,
            modelName: 'Servant',
            tableName: 'servants'
        });
    }
    data;
    populateBaseData() {
        this.data = getServantData(this.servant_id)
    }
    calculateBondLvl() {
        this.bondLvl = calculateLvl(this.bondXp, "bond")
    }
    getBondXpProgress() {
        const nextLevelXp = calculateXp(this.bondLvl + 1, "bond")
        const currentLevelXp = calculateXp(this.bondLvl, "bond")
        const neededXp = nextLevelXp - currentLevelXp
        return {
            neededXp,
            progress: Math.max(0, (this.bondXp - currentLevelXp) / neededXp)
        }
    }
    calculateLvl() {
        this.lvl = calculateLvl(this.xp, "servant")
    }
    getXpProgress() {
        const nextLevelXp = calculateXp(this.lvl + 1, "servant")
        const currentLevelXp = calculateXp(this.lvl, "servant")
        const neededXp = nextLevelXp - currentLevelXp
        return {
            neededXp,
            progress: Math.max(0, (this.xp - currentLevelXp) / neededXp)
        }
    }


    static associate(models) {
        this.belongsTo(models.Player, {
            foreignKey: 'playerId',
            as: 'player'
        });
    }
}