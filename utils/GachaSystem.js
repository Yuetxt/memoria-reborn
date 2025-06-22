const rates = {
    4: 70,  // 70% for 4★
    5: 25,  // 25% for 5★
    6: 5    // 5% for 6★
};

function performSummon() {
    const roll = Math.random() * 100;
    
    if (roll < rates[6]) return 6;
    if (roll < rates[6] + rates[5]) return 5;
    return 4;
}

async function summonServant(bannerId = 'main') {
    const { Servant } = require('../database/Database');
    const rarity = performSummon();
    
    // Get available servants for this banner and rarity
    const servants = await Servant.findAll({
        where: { rarity }
    });
    
    if (servants.length === 0) {
        throw new Error(`No servants found for rarity ${rarity}`);
    }
    
    // Select random servant
    const servant = servants[Math.floor(Math.random() * servants.length)];
    return servant;
}

module.exports = {
    rates,
    performSummon,
    summonServant
};