const { DataTypes, Model } = require('sequelize');

class Servant extends Model {
    static init(sequelize) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            series: {
                type: DataTypes.STRING,
                allowNull: false
            },
            rarity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 4,
                    max: 6
                }
            },
            element: {
                type: DataTypes.ENUM('fire', 'water', 'earth', 'wind', 'electric', 'ice', 'light', 'dark'),
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM('dps', 'tank', 'healer', 'support', 'control'),
                allowNull: false
            },
            baseAtk: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            baseDef: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            baseHp: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            baseSpd: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            skillName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            skillDescription: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            skillPower: {
                type: DataTypes.INTEGER,
                defaultValue: 100
            },
            passiveName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            passiveDescription: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            ultimateName: {
                type: DataTypes.STRING
            },
            ultimateDescription: {
                type: DataTypes.TEXT
            },
            imageUrl: {
                type: DataTypes.STRING
            }
        }, {
            sequelize,
            modelName: 'Servant',
            tableName: 'servants'
        });
    }

    getGrowthRates() {
        const growthRates = {
            4: {
                dps: { atk: 0.025, spd: 0.02, def: 0.015, hp: 0.015 },
                tank: { def: 0.025, hp: 0.025, atk: 0.02, spd: 0.015 },
                healer: { hp: 0.025, spd: 0.025, def: 0.02, atk: 0.015 },
                support: { hp: 0.025, spd: 0.025, def: 0.02, atk: 0.015 },
                control: { spd: 0.025, atk: 0.02, def: 0.015, hp: 0.015 }
            },
            5: {
                dps: { atk: 0.03, spd: 0.025, def: 0.02, hp: 0.02 },
                tank: { def: 0.03, hp: 0.03, atk: 0.025, spd: 0.02 },
                healer: { hp: 0.03, spd: 0.03, def: 0.025, atk: 0.02 },
                support: { hp: 0.03, spd: 0.03, def: 0.025, atk: 0.02 },
                control: { spd: 0.03, atk: 0.025, def: 0.02, hp: 0.02 }
            },
            6: {
                dps: { atk: 0.04, spd: 0.03, def: 0.025, hp: 0.025 },
                tank: { def: 0.04, hp: 0.04, atk: 0.03, spd: 0.025 },
                healer: { hp: 0.04, spd: 0.04, def: 0.03, atk: 0.025 },
                support: { hp: 0.04, spd: 0.04, def: 0.03, atk: 0.025 },
                control: { spd: 0.04, atk: 0.03, def: 0.025, hp: 0.025 }
            }
        };

        return growthRates[this.rarity][this.role];
    }
}

module.exports = Servant;