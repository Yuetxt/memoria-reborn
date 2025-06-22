const mysql = require('mysql2');
const config = require('./config.json');

const connection = mysql.createConnection(config.database);

connection.connect((err) => {
    if (err) {
        console.error('Error:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL successfully!');
    connection.end();
});