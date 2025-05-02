-- Notifications Schema
-- This script creates the necessary tables for the notification system

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'booking, message, payment, account, system',
  reference_id VARCHAR(50) NULL COMMENT 'ID of the referenced item (booking_id, message_id, etc.)',
  reference_type VARCHAR(50) NULL COMMENT 'Type of the referenced item',
  priority VARCHAR(20) DEFAULT 'normal' COMMENT 'low, normal, high',
  action_url VARCHAR(255) NULL,
  data JSON NULL COMMENT 'Additional data for the notification',
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create notification_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email_notifications TINYINT(1) DEFAULT 1,
  push_notifications TINYINT(1) DEFAULT 1,
  sms_notifications TINYINT(1) DEFAULT 1,
  booking_notifications TINYINT(1) DEFAULT 1,
  message_notifications TINYINT(1) DEFAULT 1,
  payment_notifications TINYINT(1) DEFAULT 1,
  account_notifications TINYINT(1) DEFAULT 1,
  system_notifications TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create notification_devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_token VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL COMMENT 'android, ios, web',
  device_name VARCHAR(255) NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_device_token (device_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Insert default notification settings for existing users
INSERT IGNORE INTO notification_settings (user_id)
SELECT id FROM users;

-- Create trigger to add notification settings for new users
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO notification_settings (user_id) VALUES (NEW.id);
END //
DELIMITER ;

-- Sample notifications for testing
-- Uncomment and modify as needed
/*
INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, priority, action_url, data, is_read)
VALUES 
(1, 'Welcome to RYDO', 'Thank you for joining RYDO. We\'re excited to have you on board!', 'system', NULL, NULL, 'normal', NULL, '{}', 0),
(1, 'Booking Confirmed', 'Your ride has been confirmed for tomorrow at 10:00 AM.', 'booking', '123', 'driver_booking', 'high', '/bookings/123', '{"booking_id": 123, "driver_name": "John Smith"}', 0),
(1, 'Payment Successful', 'Your payment of ₹250 has been processed successfully.', 'payment', '456', 'payment', 'normal', '/payments/456', '{"payment_id": 456, "amount": 250}', 1),
(1, 'New Message', 'You have a new message from your driver.', 'message', '789', 'conversation', 'normal', '/messages/789', '{"conversation_id": 789, "sender_name": "John Smith"}', 0);
*/
