import {DataTypes, Model} from "sequelize";

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
    static associate(models) {
        this.belongsTo(models.Player, {
            foreignKey: 'playerId',
            as: 'player'
        });
    }
}