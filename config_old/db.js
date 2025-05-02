const mysql = require('mysql2');
require('dotenv').config();

console.log('Initializing database connection with:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  // password hidden for security
});

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database and tables if they don't exist
const initDatabase = async () => {
  try {
    const connection = await pool.promise().getConnection();
    
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.query(`USE ${process.env.DB_NAME}`);
    
    // Create users table with comprehensive information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('customer', 'driver', 'caretaker', 'shuttle_driver') NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        gender ENUM('male', 'female', 'other') NOT NULL,
        date_of_birth DATE NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        profile_photo VARCHAR(255),
        id_proof_type ENUM('aadhar', 'pan', 'voter', 'passport', 'driving_license') NOT NULL,
        id_proof_number VARCHAR(50) NOT NULL,
        id_proof_photo VARCHAR(255),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        upi_id VARCHAR(100),
        is_phone_verified BOOLEAN DEFAULT FALSE,
        is_email_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create drivers table with comprehensive information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        license_number VARCHAR(50) NOT NULL,
        license_expiry DATE NOT NULL,
        license_photo_front VARCHAR(255) NOT NULL,
        license_photo_back VARCHAR(255) NOT NULL,
        aadhar_number VARCHAR(20) NOT NULL,
        aadhar_photo_front VARCHAR(255) NOT NULL,
        aadhar_photo_back VARCHAR(255) NOT NULL,
        education_level ENUM('primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate') NOT NULL,
        languages_known TEXT NOT NULL,
        experience_years INT NOT NULL,
        vehicle_types TEXT NOT NULL COMMENT 'Comma separated list of vehicle types the driver can operate',
        preferred_locations TEXT COMMENT 'Comma separated list of preferred areas to work',
        skills TEXT COMMENT 'Special skills like defensive driving, first aid, etc.',
        is_verified BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT FALSE,
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        rating DECIMAL(3, 2) DEFAULT 0,
        total_rides INT DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        background_check_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        background_check_date DATE,
        verification_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create caretakers table with comprehensive information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS caretakers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        specialization VARCHAR(100) NOT NULL,
        experience_years INT NOT NULL,
        certification_type VARCHAR(255) NOT NULL,
        certification_number VARCHAR(100) NOT NULL,
        certification_photo VARCHAR(255) NOT NULL,
        medical_license_number VARCHAR(100),
        medical_license_photo VARCHAR(255),
        education_level ENUM('primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate', 'medical_degree') NOT NULL,
        languages_known TEXT NOT NULL,
        skills TEXT NOT NULL COMMENT 'Special skills like elderly care, child care, etc.',
        services_offered TEXT NOT NULL COMMENT 'Comma separated list of services offered',
        preferred_locations TEXT COMMENT 'Comma separated list of preferred areas to work',
        is_verified BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT FALSE,
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        rating DECIMAL(3, 2) DEFAULT 0,
        total_services INT DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        background_check_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        background_check_date DATE,
        verification_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create shuttle_services table with comprehensive information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shuttle_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        vehicle_model VARCHAR(100) NOT NULL,
        vehicle_year INT NOT NULL,
        vehicle_color VARCHAR(50) NOT NULL,
        vehicle_registration VARCHAR(50) NOT NULL,
        vehicle_registration_photo VARCHAR(255) NOT NULL,
        vehicle_insurance_number VARCHAR(100) NOT NULL,
        vehicle_insurance_expiry DATE NOT NULL,
        vehicle_insurance_photo VARCHAR(255) NOT NULL,
        vehicle_photo_front VARCHAR(255) NOT NULL,
        vehicle_photo_back VARCHAR(255) NOT NULL,
        vehicle_photo_interior VARCHAR(255) NOT NULL,
        passenger_capacity INT NOT NULL,
        ac_available BOOLEAN DEFAULT FALSE,
        wifi_available BOOLEAN DEFAULT FALSE,
        wheelchair_accessible BOOLEAN DEFAULT FALSE,
        route_name VARCHAR(255),
        route_details TEXT,
        service_areas TEXT NOT NULL COMMENT 'Comma separated list of areas served',
        is_verified BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT FALSE,
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        rating DECIMAL(3, 2) DEFAULT 0,
        total_trips INT DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        verification_date DATE,
        verification_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create customers table with additional information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        preferred_payment_method ENUM('cash', 'upi', 'card') DEFAULT 'cash',
        saved_addresses TEXT COMMENT 'JSON string of saved addresses',
        preferred_language VARCHAR(50) DEFAULT 'English',
        total_rides INT DEFAULT 0,
        total_spent DECIMAL(10, 2) DEFAULT 0,
        referral_code VARCHAR(20),
        referred_by INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create bookings table with enhanced information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_reference VARCHAR(20) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        service_provider_id INT NOT NULL,
        service_type ENUM('driver', 'caretaker', 'shuttle') NOT NULL,
        pickup_latitude DECIMAL(10, 8) NOT NULL,
        pickup_longitude DECIMAL(11, 8) NOT NULL,
        destination_latitude DECIMAL(10, 8) NOT NULL,
        destination_longitude DECIMAL(11, 8) NOT NULL,
        pickup_address VARCHAR(255) NOT NULL,
        destination_address VARCHAR(255) NOT NULL,
        booking_time DATETIME NOT NULL,
        scheduled_time DATETIME,
        start_time DATETIME,
        end_time DATETIME,
        estimated_distance DECIMAL(10, 2) COMMENT 'In kilometers',
        actual_distance DECIMAL(10, 2) COMMENT 'In kilometers',
        estimated_duration INT COMMENT 'In minutes',
        actual_duration INT COMMENT 'In minutes',
        base_fare DECIMAL(10, 2) NOT NULL,
        distance_fare DECIMAL(10, 2) NOT NULL,
        time_fare DECIMAL(10, 2) NOT NULL,
        waiting_fare DECIMAL(10, 2) DEFAULT 0,
        convenience_fee DECIMAL(10, 2) NOT NULL COMMENT '7.5% of total fare',
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        total_fare DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        cancellation_reason TEXT,
        cancelled_by ENUM('customer', 'service_provider', 'system'),
        cancellation_fee DECIMAL(10, 2) DEFAULT 0,
        payment_status ENUM('pending', 'completed', 'refunded', 'failed') DEFAULT 'pending',
        payment_method ENUM('cash', 'upi', 'card', 'wallet') DEFAULT 'cash',
        payment_id VARCHAR(255),
        payment_time DATETIME,
        otp VARCHAR(6),
        otp_verified BOOLEAN DEFAULT FALSE,
        customer_rating DECIMAL(3, 2),
        provider_rating DECIMAL(3, 2),
        customer_feedback TEXT,
        provider_feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (service_provider_id) REFERENCES users(id)
      )
    `);
    
    // Create payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT,
        user_id INT NOT NULL,
        transaction_type ENUM('booking_payment', 'refund', 'withdrawal', 'commission', 'bonus') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_id VARCHAR(255),
        payment_method ENUM('cash', 'upi', 'card', 'wallet', 'bank_transfer') NOT NULL,
        payment_details TEXT COMMENT 'JSON string with payment details',
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        transaction_time DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Create wallet table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        balance DECIMAL(10, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create wallet_transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_type ENUM('credit', 'debit') NOT NULL,
        description TEXT,
        reference_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
      )
    `);
    
    // Create otp_verifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        phone VARCHAR(20),
        email VARCHAR(255),
        otp VARCHAR(6) NOT NULL,
        type ENUM('phone', 'email', 'booking', 'password_reset') NOT NULL,
        reference_id VARCHAR(255),
        expires_at DATETIME NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('booking', 'payment', 'system', 'promotion') NOT NULL,
        reference_id VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create support_tickets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(20) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        booking_id INT,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assigned_to INT,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create support_messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        attachment VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )
    `);
    
    // Create system_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default system settings
    await connection.query(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('convenience_fee_percentage', '7.5', 'Percentage of convenience fee charged on each booking'),
      ('base_fare_driver', '50', 'Base fare in INR for driver service'),
      ('per_km_rate_driver', '12', 'Per kilometer rate in INR for driver service'),
      ('per_minute_rate_driver', '2', 'Per minute rate in INR for driver service'),
      ('base_fare_caretaker', '100', 'Base fare in INR for caretaker service'),
      ('per_hour_rate_caretaker', '150', 'Per hour rate in INR for caretaker service'),
      ('base_fare_shuttle', '80', 'Base fare in INR for shuttle service'),
      ('per_km_rate_shuttle', '15', 'Per kilometer rate in INR for shuttle service'),
      ('cancellation_fee_percentage', '10', 'Percentage of total fare charged as cancellation fee'),
      ('driver_radius_km', '3', 'Radius in kilometers to search for available drivers'),
      ('support_phone', '+91 9876543210', 'Customer support phone number'),
      ('support_email', 'support@rydo.com', 'Customer support email address'),
      ('company_address', 'RYDO Headquarters, 123 Main Street, Bangalore, Karnataka, India', 'Company address'),
      ('app_version', '1.0.0', 'Current application version')
    `);
    
    console.log('Database and tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database on server start
initDatabase();

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err);
    if (err.code === 'ECONNREFUSED') {
      console.error('Make sure your MySQL server is running');
    }
    return;
  }
  console.log('Database connected successfully!');
  connection.release();
});

// Export the promise version of the pool
module.exports = pool.promise();
