// Reset and recreate database for clean deployment
const mysql = require('mysql2/promise');
const config = require('../config.json');

async function resetDatabase() {
    let connection;
    
    try {
        // Connect to MySQL server (not specific database)
        connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password
        });
        
        console.log('Connected to MySQL server...');
        
        // Drop and recreate database
        await connection.execute(`DROP DATABASE IF EXISTS ${config.database.database}`);
        console.log(`Dropped database: ${config.database.database}`);
        
        await connection.execute(`CREATE DATABASE ${config.database.database}`);
        console.log(`Created database: ${config.database.database}`);
        
        console.log('✅ Database reset complete!');
        console.log('Now run: node scripts/populateData.js');
        
    } catch (error) {
        console.error('❌ Error resetting database:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetDatabase();
