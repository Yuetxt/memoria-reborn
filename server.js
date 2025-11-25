const express = require('express');
const {staticDir} = require("./config.json")
const path = require('path');
const app = express();
const port = 3018;

// Serve static files from the 'public' directory
app.use(express.static(staticDir));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});