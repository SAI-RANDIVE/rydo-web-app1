-- Payment Tables Migration
-- Creates tables for payment processing and wallet management

-- Create payment_orders table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create transactions table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create commissions table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add payment_status column to driver_bookings if not exists
ALTER TABLE driver_bookings 
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending';

-- Add payment_status column to caretaker_appointments if not exists
ALTER TABLE caretaker_appointments 
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending';

-- Add payment_status column to shuttle_bookings if not exists
ALTER TABLE shuttle_bookings 
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending';
