/**
 * Database Migration Script
 * Executes SQL migration files to set up or update the database schema
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rydo_db',
  multipleStatements: true // Enable multiple statements for migrations
};

// Path to migration files
const migrationsPath = path.join(__dirname, 'migrations');

/**
 * Execute a migration file
 */
async function executeMigration(connection, filePath) {
  try {
    // Read migration file
    const migration = fs.readFileSync(filePath, 'utf8');
    
    // Execute migration
    await connection.query(migration);
    
    console.log(`✅ Successfully executed migration: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing migration ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migrations table ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating migrations table:', error.message);
    return false;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(connection) {
  try {
    const [rows] = await connection.query('SELECT name FROM migrations');
    return rows.map(row => row.name);
  } catch (error) {
    console.error('❌ Error getting executed migrations:', error.message);
    return [];
  }
}

/**
 * Record a migration as executed
 */
async function recordMigration(connection, migrationName) {
  try {
    await connection.query('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
    return true;
  } catch (error) {
    console.error(`❌ Error recording migration ${migrationName}:`, error.message);
    return false;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔌 Connected to database');
    
    // Create migrations table
    const migrationsTableCreated = await createMigrationsTable(connection);
    if (!migrationsTableCreated) {
      throw new Error('Failed to create migrations table');
    }
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(connection);
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    
    // Execute pending migrations
    let migrationsExecuted = 0;
    
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`🔄 Executing migration: ${file}`);
        
        const filePath = path.join(migrationsPath, file);
        const success = await executeMigration(connection, filePath);
        
        if (success) {
          await recordMigration(connection, file);
          migrationsExecuted++;
        } else {
          console.error(`❌ Failed to execute migration: ${file}`);
          break; // Stop on first failure
        }
      } else {
        console.log(`⏭️ Skipping already executed migration: ${file}`);
      }
    }
    
    console.log(`✅ Migration complete. ${migrationsExecuted} migrations executed.`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations };
