/**
 * Database Migration Runner
 * Runs all database migrations in sequence
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
  database: process.env.DB_NAME || 'rydo_project',
  multipleStatements: true // Enable multiple statements for migrations
};

// Path to migration files
const migrationsPath = path.join(__dirname, '../config/migrations');

/**
 * Execute a migration file
 */
async function executeMigration(connection, filePath) {
  try {
    console.log(`🔄 Executing migration: ${path.basename(filePath)}`);
    
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
    console.log('🔍 Starting database migrations...');
    console.log('📊 Database Configuration:');
    console.log(`   - Host: ${dbConfig.host}`);
    console.log(`   - User: ${dbConfig.user}`);
    console.log(`   - Password: ${dbConfig.password ? '********' : '(empty)'}`);
    console.log(`   - Database: ${dbConfig.database}`);
    
    // Create database connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    console.log('✅ Successfully connected to MySQL server');
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const databaseExists = databases.some(db => db.Database === dbConfig.database);
    
    if (!databaseExists) {
      console.log(`❌ Database '${dbConfig.database}' does not exist`);
      console.log('🔄 Creating database...');
      
      await connection.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(`✅ Database '${dbConfig.database}' created successfully`);
    } else {
      console.log(`✅ Database '${dbConfig.database}' exists`);
    }
    
    // Use the database
    await connection.query(`USE ${dbConfig.database}`);
    
    // Create migrations table
    const migrationsTableCreated = await createMigrationsTable(connection);
    if (!migrationsTableCreated) {
      throw new Error('Failed to create migrations table');
    }
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(connection);
    console.log(`ℹ️ Found ${executedMigrations.length} previously executed migrations`);
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    
    // Execute pending migrations
    let migrationsExecuted = 0;
    let migrationsFailed = 0;
    
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        const filePath = path.join(migrationsPath, file);
        const success = await executeMigration(connection, filePath);
        
        if (success) {
          await recordMigration(connection, file);
          migrationsExecuted++;
        } else {
          migrationsFailed++;
          console.error(`❌ Failed to execute migration: ${file}`);
          // Continue with next migration instead of breaking
        }
      } else {
        console.log(`⏭️ Skipping already executed migration: ${file}`);
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Total migration files: ${migrationFiles.length}`);
    console.log(`   - Previously executed: ${executedMigrations.length}`);
    console.log(`   - Executed in this run: ${migrationsExecuted}`);
    console.log(`   - Failed in this run: ${migrationsFailed}`);
    
    if (migrationsFailed > 0) {
      console.log('\n⚠️ Some migrations failed. Please check the errors above and fix them before running again.');
    } else if (migrationsExecuted === 0) {
      console.log('\n✅ No new migrations to execute. Database is up to date.');
    } else {
      console.log('\n✅ All migrations executed successfully.');
    }
    
    // Verify database structure
    console.log('\n🔍 Verifying database structure...');
    const verifyScript = require('./verify-database');
    await verifyScript.verifyDatabase();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️ Access denied. Please check your database credentials in the .env file:');
      console.error('   - Make sure DB_USER is set to "root"');
      console.error('   - Make sure DB_PASSWORD is empty or correctly set');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Connection refused. Please check if MySQL server is running');
    }
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
