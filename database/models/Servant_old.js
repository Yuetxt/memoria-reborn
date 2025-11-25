const { DataTypes, Model } = require('sequelize');

class Servant_old extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            servantId: {
              type: DataTypes.STRING,
              allowNull: false
            },
            xp: {
                type: DataTypes.INTEGER,
            },
            rarity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 4,
                    max: 10
                }
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
                dps_aoe: { atk: 0.025, spd: 0.02, def: 0.015, hp: 0.015 },
                dps_st: { atk: 0.025, spd: 0.02, def: 0.015, hp: 0.015 },
                tank: { def: 0.025, hp: 0.025, atk: 0.02, spd: 0.015 },
                healer: { hp: 0.025, spd: 0.025, def: 0.02, atk: 0.015 },
                support: { hp: 0.025, spd: 0.025, def: 0.02, atk: 0.015 },
                control: { spd: 0.025, atk: 0.02, def: 0.015, hp: 0.015 }
            },
            5: {
                dps: { atk: 0.03, spd: 0.025, def: 0.02, hp: 0.02 },
                dps_aoe: { atk: 0.03, spd: 0.025, def: 0.02, hp: 0.02 },
                dps_st: { atk: 0.03, spd: 0.025, def: 0.02, hp: 0.02 },
                tank: { def: 0.03, hp: 0.03, atk: 0.025, spd: 0.02 },
                healer: { hp: 0.03, spd: 0.03, def: 0.025, atk: 0.02 },
                support: { hp: 0.03, spd: 0.03, def: 0.025, atk: 0.02 },
                control: { spd: 0.03, atk: 0.025, def: 0.02, hp: 0.02 }
            },
            6: {
                dps: { atk: 0.04, spd: 0.03, def: 0.025, hp: 0.025 },
                dps_aoe: { atk: 0.04, spd: 0.03, def: 0.025, hp: 0.025 },
                dps_st: { atk: 0.04, spd: 0.03, def: 0.025, hp: 0.025 },
                tank: { def: 0.04, hp: 0.04, atk: 0.03, spd: 0.025 },
                healer: { hp: 0.04, spd: 0.04, def: 0.03, atk: 0.025 },
                support: { hp: 0.04, spd: 0.04, def: 0.03, atk: 0.025 },
                control: { spd: 0.04, atk: 0.03, def: 0.025, hp: 0.025 }
            },
            7: {
                dps: { atk: 0.045, spd: 0.035, def: 0.03, hp: 0.03 },
                dps_aoe: { atk: 0.045, spd: 0.035, def: 0.03, hp: 0.03 },
                dps_st: { atk: 0.045, spd: 0.035, def: 0.03, hp: 0.03 },
                tank: { def: 0.045, hp: 0.045, atk: 0.035, spd: 0.03 },
                healer: { hp: 0.045, spd: 0.045, def: 0.035, atk: 0.03 },
                support: { hp: 0.045, spd: 0.045, def: 0.035, atk: 0.03 },
                control: { spd: 0.045, atk: 0.035, def: 0.03, hp: 0.03 }
            },
            8: {
                dps: { atk: 0.05, spd: 0.04, def: 0.035, hp: 0.035 },
                dps_aoe: { atk: 0.05, spd: 0.04, def: 0.035, hp: 0.035 },
                dps_st: { atk: 0.05, spd: 0.04, def: 0.035, hp: 0.035 },
                tank: { def: 0.05, hp: 0.05, atk: 0.04, spd: 0.035 },
                healer: { hp: 0.05, spd: 0.05, def: 0.04, atk: 0.035 },
                support: { hp: 0.05, spd: 0.05, def: 0.04, atk: 0.035 },
                control: { spd: 0.05, atk: 0.04, def: 0.035, hp: 0.035 }
            },
            9: {
                dps: { atk: 0.055, spd: 0.045, def: 0.04, hp: 0.04 },
                dps_aoe: { atk: 0.055, spd: 0.045, def: 0.04, hp: 0.04 },
                dps_st: { atk: 0.055, spd: 0.045, def: 0.04, hp: 0.04 },
                tank: { def: 0.055, hp: 0.055, atk: 0.045, spd: 0.04 },
                healer: { hp: 0.055, spd: 0.055, def: 0.045, atk: 0.04 },
                support: { hp: 0.055, spd: 0.055, def: 0.045, atk: 0.04 },
                control: { spd: 0.055, atk: 0.045, def: 0.04, hp: 0.04 }
            },
            10: {
                dps: { atk: 0.06, spd: 0.05, def: 0.045, hp: 0.045 },
                dps_aoe: { atk: 0.06, spd: 0.05, def: 0.045, hp: 0.045 },
                dps_st: { atk: 0.06, spd: 0.05, def: 0.045, hp: 0.045 },
                tank: { def: 0.06, hp: 0.06, atk: 0.05, spd: 0.045 },
                healer: { hp: 0.06, spd: 0.06, def: 0.05, atk: 0.045 },
                support: { hp: 0.06, spd: 0.06, def: 0.05, atk: 0.045 },
                control: { spd: 0.06, atk: 0.05, def: 0.045, hp: 0.045 }
            }
        };

        return growthRates[this.rarity]?.[this.role] || growthRates[4][this.role] || { atk: 0.025, spd: 0.02, def: 0.015, hp: 0.015 };
    }
}

module.exports = Servant_old;
