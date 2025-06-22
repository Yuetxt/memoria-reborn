const { DataTypes, Model } = require('sequelize');

class Item extends Model {
    static init(sequelize) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM('weapon', 'armor', 'accessory'),
                allowNull: false
            },
            rarity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 5
                }
            },
            element: {
                type: DataTypes.ENUM('fire', 'water', 'earth', 'wind', 'electric', 'ice', 'light', 'dark', 'neutral'),
                defaultValue: 'neutral'
            },
            atkBonus: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            defBonus: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            hpBonus: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            spdBonus: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            critChanceBonus: {
                type: DataTypes.FLOAT,
                defaultValue: 0
            },
            critDamageBonus: {
                type: DataTypes.FLOAT,
                defaultValue: 0
            },
            evasionBonus: {
                type: DataTypes.FLOAT,
                defaultValue: 0
            },
            elementalResistance: {
                type: DataTypes.FLOAT,
                defaultValue: 0
            },
            price: {
                type: DataTypes.INTEGER,
                defaultValue: 100
            },
            description: {
                type: DataTypes.TEXT
            }
        }, {
            sequelize,
            modelName: 'Item',
            tableName: 'items'
        });
    }
}

module.exports = Item;