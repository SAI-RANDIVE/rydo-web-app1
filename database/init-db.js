/**
 * Database Initialization Script
 * 
 * This script initializes the database with all required tables for the RYDO Web App.
 * It should be run once when setting up the application.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rydo_project',
  multipleStatements: true
};

// Schema files to execute in order
const schemaFiles = [
  'users-schema.sql',
  'booking-schema.sql',
  'notifications-schema.sql',
  'wallet-schema.sql',
  'user-location-schema.sql'
];

// Function to read and execute SQL files
async function executeSqlFile(connection, filePath) {
  try {
    console.log(`Executing SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await connection.query(sql);
    console.log(`Successfully executed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error executing SQL file ${filePath}:`, error);
    return false;
  }
}

// Main function to initialize database
async function initializeDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true
    });
    
    // Create database if it doesn't exist
    console.log(`Creating database if not exists: ${dbConfig.database}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    
    // Use the database
    await connection.query(`USE ${dbConfig.database}`);
    
    // Execute schema files in order
    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, file);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: Schema file not found: ${filePath}`);
        continue;
      }
      
      // Execute SQL file
      const success = await executeSqlFile(connection, filePath);
      
      if (!success) {
        console.error(`Failed to execute schema file: ${file}`);
      }
    }
    
    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
    }
  }
}

// Run the initialization
initializeDatabase();
