const { DataTypes, Model } = require('sequelize');

class PlayerItem extends Model {
    static init(sequelize) {
        return super.init({
            quantity: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            equippedToServantId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            slot: {
                type: DataTypes.ENUM('weapon', 'armor', 'accessory'),
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'PlayerItem',
            tableName: 'player_items'
        });
    }
}

module.exports = PlayerItem;