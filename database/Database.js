const { Sequelize } = require('sequelize');
const { database } = require('../config.json');

// const sequelize = new Sequelize(
//     database.database,
//     database.user,
//     database.password,
//     {
//         host: database.host,
//         dialect: 'mysql',
//         logging: false,
//     }
// );
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false
})
// Import models
const {Player} = require('./models/Player');
const {Servant} = require('./models/Servant');
const Battle = require('./models/Battle');
// Servant.associate({Player})
// Player.associate({Servant})
Player.init(sequelize)
Servant.init(sequelize)
Player.hasMany(Servant, {
    foreignKey: 'playerId',
    sourceKey: 'discordId',
    as: 'servants'
})
Servant.belongsTo(Player, {
    foreignKey: 'playerId',
    sourceKey: 'discordId',
    as: 'player'
})
module.exports = {
    sequelize,
    Battle,
    initialize: async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection established.');
            await sequelize.sync();
            console.log('Database synchronized.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    }
};