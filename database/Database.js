const { Sequelize } = require('sequelize');
const { database } = require('../config.json');

const sequelize = new Sequelize(
    database.database,
    database.user,
    database.password,
    {
        host: database.host,
        dialect: 'mysql',
        logging: false,
    }
);

// Import models
const Player = require('./models/Player');
const Servant = require('./models/Servant');
const PlayerServant = require('./models/PlayerServant');
const Item = require('./models/Item');
const PlayerItem = require('./models/PlayerItem');
const Battle = require('./models/Battle');

// Initialize models
Player.init(sequelize);
Servant.init(sequelize);
PlayerServant.init(sequelize);
Item.init(sequelize);
PlayerItem.init(sequelize);
Battle.init(sequelize);

// Define associations
Player.belongsToMany(Servant, { through: PlayerServant, as: 'servants' });
Servant.belongsToMany(Player, { through: PlayerServant, as: 'players' });

Player.belongsToMany(Item, { through: PlayerItem, as: 'items' });
Item.belongsToMany(Player, { through: PlayerItem, as: 'players' });

// Add direct associations for PlayerServant and PlayerItem
PlayerServant.belongsTo(Player);
PlayerServant.belongsTo(Servant);
Player.hasMany(PlayerServant);
Servant.hasMany(PlayerServant);

PlayerItem.belongsTo(Player);
PlayerItem.belongsTo(Item);
Player.hasMany(PlayerItem);
Item.hasMany(PlayerItem);

Player.hasMany(Battle);
Battle.belongsTo(Player);

module.exports = {
    sequelize,
    Player,
    Servant,
    PlayerServant,
    Item,
    PlayerItem,
    Battle,
    initialize: async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection established.');
            await sequelize.sync({ alter: true });
            console.log('Database synchronized.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    }
};