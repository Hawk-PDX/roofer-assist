const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// Simple valid PNG icons - using complete, valid PNG data

