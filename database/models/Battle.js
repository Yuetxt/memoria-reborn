const { DataTypes, Model } = require('sequelize');

class Battle extends Model {
    static init(sequelize) {
        return super.init({
            floor: {
                type: DataTypes.STRING,
                allowNull: false
            },
            enemyType: {
                type: DataTypes.ENUM('normal', 'elite', 'boss'),
                defaultValue: 'normal'
            },
            result: {
                type: DataTypes.ENUM('victory', 'defeat'),
                allowNull: false
            },
            turnsCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            expGained: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            goldGained: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            itemsDropped: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            teamComposition: {
                type: DataTypes.JSON,
                defaultValue: []
            }
        }, {
            sequelize,
            modelName: 'Battle',
            tableName: 'battles'
        });
    }
}

module.exports = Battle;