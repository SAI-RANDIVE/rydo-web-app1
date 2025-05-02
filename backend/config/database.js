/**
 * Database Configuration
 * Supports both MongoDB and MySQL/Sequelize
 */

// Check if we're using MongoDB or MySQL based on environment variables
const useMongoDb = process.env.USE_MONGODB === 'true' || process.env.MONGODB_URI;

let sequelize = null;

// Only load Sequelize if we're not exclusively using MongoDB
if (!useMongoDb) {
    try {
        const { Sequelize } = require('sequelize');
        
        sequelize = new Sequelize(
            process.env.DB_NAME || 'rydo_db',
            process.env.DB_USER || 'root',
            process.env.DB_PASSWORD || '', 
            {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                dialect: 'mysql',
                logging: false, // Set to console.log for debugging
                pool: {
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                define: {
                    timestamps: true,
                    underscored: false
                }
            }
        );
        
        console.log('MySQL/Sequelize configuration loaded');
    } catch (error) {
        console.log('Sequelize not available, skipping MySQL configuration');
    }
}

module.exports = sequelize;
