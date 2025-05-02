/**
 * Root Database Configuration
 * This file forwards to the backend database configuration
 */

// Import the backend database configuration
const db = require('../backend/config/db');

// Export the unified database interface
module.exports = db;
