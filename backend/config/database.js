/**
 * Database Configuration
 * Supports both MongoDB and MySQL
 * This file now serves as a compatibility layer for the new unified db interface
 */

// Import the unified database interface
const db = require('./db');

// This file now just re-exports the unified database interface
// This maintains backward compatibility with code that imports from database.js
module.exports = db;
