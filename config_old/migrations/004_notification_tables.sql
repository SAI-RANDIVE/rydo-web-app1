-- Notification Tables Migration
-- Creates tables for notification system

-- Create notifications table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email_notifications TINYINT(1) NOT NULL DEFAULT 1,
  sms_notifications TINYINT(1) NOT NULL DEFAULT 1,
  push_notifications TINYINT(1) NOT NULL DEFAULT 1,
  booking_confirmations TINYINT(1) NOT NULL DEFAULT 1,
  payment_confirmations TINYINT(1) NOT NULL DEFAULT 1,
  driver_arrivals TINYINT(1) NOT NULL DEFAULT 1,
  booking_reminders TINYINT(1) NOT NULL DEFAULT 1,
  promotions TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create notification_devices table for push notifications
CREATE TABLE IF NOT EXISTS notification_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_token VARCHAR(255) NOT NULL,
  device_type ENUM('android', 'ios', 'web') NOT NULL,
  device_name VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, device_token),
  INDEX (user_id),
  INDEX (device_type),
  INDEX (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
