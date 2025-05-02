-- RYDO Web App Database Schema
-- Migration 001: Create initial tables

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

-- Driver Services Table
CREATE TABLE IF NOT EXISTS driver_services (
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

-- Caretaker Services Table
CREATE TABLE IF NOT EXISTS caretaker_services (
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

-- Shuttle Services Table
CREATE TABLE IF NOT EXISTS shuttle_services (
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
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  fuel_type VARCHAR(20),
  fuel_efficiency DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shuttle Routes Table
CREATE TABLE IF NOT EXISTS shuttle_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shuttle_service_id INT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_point VARCHAR(100) NOT NULL,
  end_point VARCHAR(100) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  estimated_duration VARCHAR(20) NOT NULL,
  base_fare DECIMAL(10,2) NOT NULL,
  per_km_rate DECIMAL(5,2) NOT NULL,
  passenger_capacity INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shuttle_service_id) REFERENCES shuttle_services(id) ON DELETE SET NULL
);

-- Route Stops Table
CREATE TABLE IF NOT EXISTS route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  stop_order INT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE CASCADE
);

-- Shuttle Schedules Table
CREATE TABLE IF NOT EXISTS shuttle_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  current_passengers INT DEFAULT 0,
  max_passengers INT NOT NULL,
  is_peak_hour BOOLEAN DEFAULT FALSE,
  fare DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE CASCADE
);

-- Driver Bookings Table
CREATE TABLE IF NOT EXISTS driver_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  driver_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  pickup_time DATETIME NOT NULL,
  dropoff_time DATETIME,
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  fare DECIMAL(10,2) NOT NULL,
  distance DECIMAL(10,2),
  duration INT,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('cash', 'wallet', 'card', 'upi') DEFAULT 'cash',
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
  status ENUM('pending', 'confirmed', 'picked_up', 'completed', 'cancelled') DEFAULT 'pending',
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

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT,
  booking_type ENUM('driver', 'caretaker', 'shuttle'),
  amount DECIMAL(10,2) NOT NULL,
  transaction_type ENUM('credit', 'debit') NOT NULL,
  payment_method ENUM('cash', 'wallet', 'card', 'upi') NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  reference_id VARCHAR(100),
  transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  booking_type ENUM('driver', 'caretaker', 'shuttle') NOT NULL,
  rated_by INT NOT NULL,
  rated_to INT NOT NULL,
  rating DECIMAL(3,2) NOT NULL,
  review TEXT,
  rating_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rated_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_to) REFERENCES users(id) ON DELETE CASCADE
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

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  related_to VARCHAR(50),
  related_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_driver_services_status ON driver_services(status);
CREATE INDEX idx_caretaker_services_status ON caretaker_services(status);
CREATE INDEX idx_shuttle_services_status ON shuttle_services(status);
CREATE INDEX idx_shuttle_routes_active ON shuttle_routes(is_active);
CREATE INDEX idx_shuttle_schedules_departure ON shuttle_schedules(departure_time);
CREATE INDEX idx_shuttle_schedules_status ON shuttle_schedules(status);
CREATE INDEX idx_driver_bookings_status ON driver_bookings(status);
CREATE INDEX idx_caretaker_appointments_status ON caretaker_appointments(status);
CREATE INDEX idx_shuttle_bookings_status ON shuttle_bookings(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
