module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Set bot activity
        client.user.setActivity('!start to begin your adventure', { type: 0 }); // 0 = Playing
        
        // Start stamina regeneration timer
        // setInterval(async () => {
        //     const { Player } = require('../database/Database');
        //     const players = await Player.findAll();
        //
        //     for (const player of players) {
        //         await player.regenerateStamina();
        //     }
        // }, 60000); // Check every minute
    }
};