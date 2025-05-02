/**
 * Database Verification Script
 * Verifies database connection and checks if all required tables exist
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rydo_project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// List of tables that should exist in the database
const requiredTables = [
  'users',
  'drivers',
  'caretakers',
  'shuttle_drivers',
  'driver_bookings',
  'caretaker_appointments',
  'shuttle_routes',
  'shuttle_schedules',
  'shuttle_bookings',
  'shuttle_seats',
  'payments',
  'payment_orders',
  'wallets',
  'transactions',
  'commissions',
  'notifications',
  'notification_settings',
  'notification_devices',
  'tracking_sessions',
  'location_history',
  'otp_verifications',
  'support_tickets',
  'support_messages',
  'ratings',
  'system_settings',
  'migrations'
];

/**
 * Verify database connection and tables
 */
async function verifyDatabase() {
  let connection;
  
  try {
    console.log('🔍 Verifying database connection and tables...');
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
    
    // Get list of tables in the database
    const [tables] = await connection.query('SHOW TABLES');
    const existingTables = tables.map(table => Object.values(table)[0]);
    
    console.log('\n📋 Checking required tables:');
    
    // Check if all required tables exist
    const missingTables = [];
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' does not exist`);
        missingTables.push(table);
      }
    }
    
    // Check for additional tables
    const additionalTables = existingTables.filter(table => !requiredTables.includes(table));
    
    if (additionalTables.length > 0) {
      console.log('\n📋 Additional tables found:');
      
      for (const table of additionalTables) {
        console.log(`   ℹ️ Table '${table}' exists but is not in the required list`);
      }
    }
    
    // Summary
    console.log('\n📊 Database Verification Summary:');
    console.log(`   - Total required tables: ${requiredTables.length}`);
    console.log(`   - Existing tables: ${existingTables.length}`);
    console.log(`   - Missing tables: ${missingTables.length}`);
    console.log(`   - Additional tables: ${additionalTables.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️ Missing tables detected. Please run the database migrations to create them:');
      console.log('   node config/migrate.js');
    } else {
      console.log('\n✅ All required tables exist in the database');
    }
    
    // Check table structures for key tables
    if (existingTables.includes('users')) {
      console.log('\n🔍 Checking structure of key tables:');
      
      // Check users table
      const [userColumns] = await connection.query('DESCRIBE users');
      const userColumnNames = userColumns.map(col => col.Field);
      
      console.log(`   ✅ Table 'users' has ${userColumnNames.length} columns`);
      
      // Check if key columns exist
      const requiredUserColumns = ['id', 'email', 'phone', 'password', 'role', 'first_name', 'last_name'];
      const missingUserColumns = requiredUserColumns.filter(col => !userColumnNames.includes(col));
      
      if (missingUserColumns.length > 0) {
        console.log(`   ⚠️ Table 'users' is missing columns: ${missingUserColumns.join(', ')}`);
      } else {
        console.log(`   ✅ Table 'users' has all required columns`);
      }
      
      // Check payment_orders table if it exists
      if (existingTables.includes('payment_orders')) {
        const [paymentOrderColumns] = await connection.query('DESCRIBE payment_orders');
        const paymentOrderColumnNames = paymentOrderColumns.map(col => col.Field);
        
        console.log(`   ✅ Table 'payment_orders' has ${paymentOrderColumnNames.length} columns`);
        
        // Check if key columns exist
        const requiredPaymentOrderColumns = ['id', 'order_id', 'booking_id', 'booking_type', 'amount', 'status'];
        const missingPaymentOrderColumns = requiredPaymentOrderColumns.filter(col => !paymentOrderColumnNames.includes(col));
        
        if (missingPaymentOrderColumns.length > 0) {
          console.log(`   ⚠️ Table 'payment_orders' is missing columns: ${missingPaymentOrderColumns.join(', ')}`);
        } else {
          console.log(`   ✅ Table 'payment_orders' has all required columns`);
        }
      }
      
      // Check notifications table if it exists
      if (existingTables.includes('notifications')) {
        const [notificationColumns] = await connection.query('DESCRIBE notifications');
        const notificationColumnNames = notificationColumns.map(col => col.Field);
        
        console.log(`   ✅ Table 'notifications' has ${notificationColumnNames.length} columns`);
        
        // Check if key columns exist
        const requiredNotificationColumns = ['id', 'user_id', 'title', 'message', 'type', 'is_read'];
        const missingNotificationColumns = requiredNotificationColumns.filter(col => !notificationColumnNames.includes(col));
        
        if (missingNotificationColumns.length > 0) {
          console.log(`   ⚠️ Table 'notifications' is missing columns: ${missingNotificationColumns.join(', ')}`);
        } else {
          console.log(`   ✅ Table 'notifications' has all required columns`);
        }
      }
    }
    
    console.log('\n🏁 Database verification completed');
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    
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

// Run verification when script is executed directly
if (require.main === module) {
  verifyDatabase().catch(console.error);
}

module.exports = { verifyDatabase };
