// Directory: /memoria-lost-bot/database/models/PlayerServant.js
// Player-Servant relationship model (FIXED)

const { DataTypes, Model } = require('sequelize');

class PlayerServant extends Model {
    static init(sequelize) {
        return super.init({
            PlayerId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                references: {
                    model: 'players',
                    key: 'id'
                }
            },
            ServantId: {
                type: DataTypes.STRING,
                primaryKey: true,
                references: {
                    model: 'servants',
                    key: 'id'
                }
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            experience: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            bondLevel: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                validate: {
                    min: 1,
                    max: 15
                }
            },
            bondExp: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            slot: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 1,
                    max: 4
                }
            },
            isInTeam: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        }, {
            sequelize,
            modelName: 'PlayerServant',
            tableName: 'player_servants'
        });
    }

    async calculateStats() {
        // Need to get the servant data
        const { Servant } = require('../Database');
        const servant = await Servant.findByPk(this.ServantId);
        
        if (!servant) {
            throw new Error('Servant not found');
        }
        
        const growthRates = servant.getGrowthRates();
        const bondBonus = 1 + (this.bondLevel - 1) * 0.01; // 1% per bond level

        return {
            atk: Math.floor(servant.baseAtk * (1 + growthRates.atk * (this.level - 1)) * bondBonus),
            def: Math.floor(servant.baseDef * (1 + growthRates.def * (this.level - 1)) * bondBonus),
            hp: Math.floor(servant.baseHp * (1 + growthRates.hp * (this.level - 1)) * bondBonus) * 10,
            spd: Math.floor(servant.baseSpd * (1 + growthRates.spd * (this.level - 1)) * bondBonus),
            critChance: 7, // Base 7%
            critDamage: 200, // Base 200%
            evasion: 5, // Base 5%
            hitRate: 95 // Base 95%
        };
    }
}

module.exports = PlayerServant;
