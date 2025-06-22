// Directory: /memoria-lost-bot/scripts/populateData.js
// Script to populate initial game data

const { Sequelize } = require('sequelize');
const config = require('../config.json');
const { servants } = require('../data/servantData');

// Initialize Sequelize
const sequelize = new Sequelize(
    config.database.database,
    config.database.user,
    config.database.password,
    {
        host: config.database.host,
        dialect: 'mysql',
        logging: false
    }
);

// Import models
const Servant = require('../database/models/Servant');
const Item = require('../database/models/Item');

// Initialize models
Servant.init(sequelize);
Item.init(sequelize);

async function populateServants() {
    console.log('Populating servants...');
    
    let count = 0;
    for (const servant of servants) {
        const [instance, created] = await Servant.findOrCreate({
            where: { name: servant.name },
            defaults: servant
        });
        if (created) count++;
    }
    
    console.log(`Populated ${count} new servants (${servants.length} total in database)`);
}

async function populateItems() {
    console.log('Populating items...');
    
    const items = [
        // ==================== WEAPONS ====================
        // 1★ Weapons
        {
            name: 'Iron Sword',
            type: 'weapon',
            rarity: 1,
            element: 'neutral',
            atkBonus: 10,
            price: 100,
            description: 'A basic iron sword'
        },
        {
            name: 'Wooden Staff',
            type: 'weapon',
            rarity: 1,
            element: 'neutral',
            atkBonus: 8,
            spdBonus: 5,
            price: 100,
            description: 'A simple wooden staff'
        },
        
        // 2★ Weapons
        {
            name: 'Steel Blade',
            type: 'weapon',
            rarity: 2,
            element: 'neutral',
            atkBonus: 20,
            price: 300,
            description: 'A sharp steel blade'
        },
        {
            name: 'Silver Dagger',
            type: 'weapon',
            rarity: 2,
            element: 'light',
            atkBonus: 18,
            critChanceBonus: 3,
            price: 350,
            description: 'Quick silver dagger'
        },
        
        // 3★ Weapons
        {
            name: 'Flame Sword',
            type: 'weapon',
            rarity: 3,
            element: 'fire',
            atkBonus: 35,
            critChanceBonus: 5,
            price: 800,
            description: 'A sword imbued with fire'
        },
        {
            name: 'Frost Blade',
            type: 'weapon',
            rarity: 3,
            element: 'ice',
            atkBonus: 35,
            spdBonus: 10,
            price: 800,
            description: 'A blade of eternal ice'
        },
        {
            name: 'Thunder Spear',
            type: 'weapon',
            rarity: 3,
            element: 'electric',
            atkBonus: 40,
            price: 850,
            description: 'Spear crackling with lightning'
        },
        
        // 4★ Weapons (for drops)
        {
            name: 'Demon Slayer Blade',
            type: 'weapon',
            rarity: 4,
            element: 'dark',
            atkBonus: 50,
            critChanceBonus: 8,
            critDamageBonus: 20,
            price: 2000,
            description: 'Forged to slay demons'
        },
        {
            name: 'Holy Excalibur',
            type: 'weapon',
            rarity: 4,
            element: 'light',
            atkBonus: 55,
            defBonus: 15,
            price: 2200,
            description: 'Replica of the legendary sword'
        },
        
        // 5★ Weapons (rare drops)
        {
            name: 'Godslayer',
            type: 'weapon',
            rarity: 5,
            element: 'dark',
            atkBonus: 80,
            critChanceBonus: 15,
            critDamageBonus: 50,
            price: 10000,
            description: 'Weapon forged to kill gods'
        },
        
        // ==================== ARMOR ====================
        // 1★ Armor
        {
            name: 'Leather Armor',
            type: 'armor',
            rarity: 1,
            element: 'neutral',
            defBonus: 10,
            price: 100,
            description: 'Basic leather protection'
        },
        {
            name: 'Cloth Robe',
            type: 'armor',
            rarity: 1,
            element: 'neutral',
            defBonus: 5,
            spdBonus: 8,
            price: 100,
            description: 'Light cloth armor'
        },
        
        // 2★ Armor
        {
            name: 'Chain Mail',
            type: 'armor',
            rarity: 2,
            element: 'neutral',
            defBonus: 20,
            hpBonus: 50,
            price: 300,
            description: 'Interlocking metal rings'
        },
        {
            name: 'Magic Robe',
            type: 'armor',
            rarity: 2,
            element: 'light',
            defBonus: 15,
            elementalResistance: 5,
            price: 350,
            description: 'Robe with magic protection'
        },
        
        // 3★ Armor
        {
            name: 'Dragon Scale Mail',
            type: 'armor',
            rarity: 3,
            element: 'fire',
            defBonus: 35,
            elementalResistance: 10,
            price: 1000,
            description: 'Armor made from dragon scales'
        },
        {
            name: 'Mithril Vest',
            type: 'armor',
            rarity: 3,
            element: 'neutral',
            defBonus: 30,
            hpBonus: 100,
            spdBonus: 5,
            price: 1200,
            description: 'Light but strong mithril'
        },
        
        // 4★ Armor (for drops)
        {
            name: 'Demon Lord Armor',
            type: 'armor',
            rarity: 4,
            element: 'dark',
            defBonus: 50,
            hpBonus: 200,
            elementalResistance: 15,
            price: 2500,
            description: 'Armor of the demon lords'
        },
        
        // ==================== ACCESSORIES ====================
        // 1★ Accessories
        {
            name: 'Health Ring',
            type: 'accessory',
            rarity: 1,
            element: 'neutral',
            hpBonus: 100,
            price: 150,
            description: 'Increases maximum health'
        },
        {
            name: 'Speed Charm',
            type: 'accessory',
            rarity: 1,
            element: 'wind',
            spdBonus: 10,
            price: 150,
            description: 'Makes you slightly faster'
        },
        
        // 2★ Accessories
        {
            name: 'Power Bracelet',
            type: 'accessory',
            rarity: 2,
            element: 'neutral',
            atkBonus: 15,
            price: 400,
            description: 'Enhances physical strength'
        },
        {
            name: 'Magic Pendant',
            type: 'accessory',
            rarity: 2,
            element: 'light',
            defBonus: 10,
            elementalResistance: 5,
            price: 400,
            description: 'Protects against magic'
        },
        
        // 3★ Accessories
        {
            name: 'Critical Pendant',
            type: 'accessory',
            rarity: 3,
            element: 'neutral',
            critChanceBonus: 10,
            critDamageBonus: 20,
            price: 1200,
            description: 'Enhances critical strikes'
        },
        {
            name: 'Evasion Boots',
            type: 'accessory',
            rarity: 3,
            element: 'wind',
            spdBonus: 15,
            evasionBonus: 8,
            price: 1000,
            description: 'Magical boots that help dodge'
        },
        {
            name: 'Regeneration Amulet',
            type: 'accessory',
            rarity: 3,
            element: 'earth',
            hpBonus: 150,
            defBonus: 10,
            price: 1100,
            description: 'Slowly regenerates health'
        },
        
        // 4★ Accessories (for drops)
        {
            name: 'Hero\'s Medal',
            type: 'accessory',
            rarity: 4,
            element: 'light',
            atkBonus: 20,
            defBonus: 20,
            hpBonus: 200,
            spdBonus: 20,
            price: 3000,
            description: 'Medal of legendary heroes'
        },
        
        // 5★ Accessories (rare drops)
        {
            name: 'Divine Grace',
            type: 'accessory',
            rarity: 5,
            element: 'light',
            atkBonus: 30,
            defBonus: 30,
            hpBonus: 300,
            critChanceBonus: 10,
            elementalResistance: 20,
            price: 15000,
            description: 'Blessing of the gods'
        }
    ];
    
    let count = 0;
    for (const item of items) {
        const [instance, created] = await Item.findOrCreate({
            where: { name: item.name },
            defaults: item
        });
        if (created) count++;
    }
    
    console.log(`Populated ${count} new items (${items.length} total in database)`);
}

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');
        
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
        
        await populateServants();
        await populateItems();
        
        console.log('\n✅ Data population complete!');
        console.log('You can now start the bot with: npm start');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();