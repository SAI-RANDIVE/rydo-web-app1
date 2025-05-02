-- RYDO Web App Database Setup Script
-- Creates the database and essential tables

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS rydo_project;

-- Use the database
USE rydo_project;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'driver', 'caretaker', 'shuttle_driver', 'admin') NOT NULL,
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'India',
  postal_code VARCHAR(10),
  profile_image VARCHAR(255),
  is_available BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  vehicle_model VARCHAR(50) NOT NULL,
  vehicle_color VARCHAR(30) NOT NULL,
  vehicle_year INT NOT NULL,
  vehicle_registration VARCHAR(20) NOT NULL UNIQUE,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  experience_years INT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  status ENUM('available', 'on_trip', 'offline') DEFAULT 'offline',
  current_trip_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Caretakers Table
CREATE TABLE IF NOT EXISTS caretakers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  qualification VARCHAR(100) NOT NULL,
  experience_years INT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  status ENUM('available', 'on_appointment', 'offline') DEFAULT 'offline',
  current_appointment_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shuttle Drivers Table
CREATE TABLE IF NOT EXISTS shuttle_drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  vehicle_model VARCHAR(50) NOT NULL,
  vehicle_color VARCHAR(30) NOT NULL,
  vehicle_year INT NOT NULL,
  vehicle_registration VARCHAR(20) NOT NULL UNIQUE,
  passenger_capacity INT NOT NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  experience_years INT NOT NULL,
  status ENUM('available', 'on_route', 'offline') DEFAULT 'offline',
  current_route_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shuttle Routes Table
CREATE TABLE IF NOT EXISTS shuttle_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_point VARCHAR(100) NOT NULL,
  end_point VARCHAR(100) NOT NULL,
  start_latitude DECIMAL(10,8) NOT NULL,
  start_longitude DECIMAL(11,8) NOT NULL,
  end_latitude DECIMAL(10,8) NOT NULL,
  end_longitude DECIMAL(11,8) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  estimated_duration INT NOT NULL COMMENT 'Duration in minutes',
  base_fare DECIMAL(10,2) NOT NULL,
  per_km_rate DECIMAL(5,2) NOT NULL,
  passenger_capacity INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  waypoints TEXT COMMENT 'JSON array of waypoints with lat/lng',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Shuttle Schedules Table
CREATE TABLE IF NOT EXISTS shuttle_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  driver_id INT NOT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  status ENUM('scheduled', 'active', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  current_passengers INT DEFAULT 0,
  max_passengers INT NOT NULL,
  is_peak_hour BOOLEAN DEFAULT FALSE,
  fare DECIMAL(10,2) NOT NULL,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP NULL,
  estimated_arrival_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Driver Bookings Table
CREATE TABLE IF NOT EXISTS driver_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  driver_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,
  destination_latitude DECIMAL(10,8) NOT NULL,
  destination_longitude DECIMAL(11,8) NOT NULL,
  pickup_time DATETIME NOT NULL,
  dropoff_time DATETIME,
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
  fare DECIMAL(10,2) NOT NULL,
  distance DECIMAL(10,2),
  duration INT,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('cash', 'wallet', 'card', 'upi') DEFAULT 'cash',
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP NULL,
  estimated_arrival_time TIMESTAMP NULL,
  rating DECIMAL(3,2),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Caretaker Appointments Table
CREATE TABLE IF NOT EXISTS caretaker_appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  caretaker_id INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  service_type VARCHAR(100) NOT NULL,
  special_requirements TEXT,
  fare DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('cash', 'wallet', 'card', 'upi') DEFAULT 'cash',
  rating DECIMAL(3,2),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shuttle Bookings Table
CREATE TABLE IF NOT EXISTS shuttle_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  schedule_id INT NOT NULL,
  pickup_point VARCHAR(100) NOT NULL,
  dropoff_point VARCHAR(100) NOT NULL,
  passenger_count INT NOT NULL DEFAULT 1,
  seat_ids VARCHAR(100),
  passenger_gender ENUM('male', 'female', 'other'),
  special_requirements TEXT,
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pickup_time DATETIME,
  dropoff_time DATETIME,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
  fare DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('cash', 'wallet', 'card', 'upi') DEFAULT 'cash',
  rating DECIMAL(3,2),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES shuttle_schedules(id) ON DELETE CASCADE
);

-- Shuttle Seats Table
CREATE TABLE IF NOT EXISTS shuttle_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  is_booked BOOLEAN DEFAULT FALSE,
  passenger_id INT,
  passenger_gender ENUM('male', 'female', 'other'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES shuttle_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_seat_schedule (schedule_id, seat_number)
);

-- Payment Orders Table
CREATE TABLE IF NOT EXISTS payment_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  booking_id INT NOT NULL,
  booking_type ENUM('driver', 'caretaker', 'shuttle') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  receipt VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  INDEX (booking_id, booking_type),
  INDEX (order_id),
  INDEX (payment_id)
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT,
  booking_type ENUM('driver', 'caretaker', 'shuttle'),
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type ENUM('credit', 'debit', 'refund') NOT NULL,
  payment_method ENUM('card', 'upi', 'netbanking', 'wallet', 'cash') NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  reference_id VARCHAR(255),
  transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  INDEX (booking_id, booking_type),
  INDEX (reference_id),
  INDEX (transaction_time)
);

-- Commissions Table
CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  booking_type ENUM('driver', 'caretaker', 'shuttle') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (booking_id, booking_type),
  INDEX (payment_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(255),
  reference_type VARCHAR(50),
  priority ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
  action_url VARCHAR(255),
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id),
  INDEX (is_read),
  INDEX (type),
  INDEX (created_at)
);

-- OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('email', 'phone') NOT NULL,
  identifier VARCHAR(100) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_type (user_id, type)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
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
('driver_radius_km', '3', 'Radius in kilometers to search for available drivers');

-- Create migrations table to track executed migrations
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO migrations (name) VALUES ('setup-database.sql');
