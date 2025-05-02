-- User Location and Profile Schema
-- This script creates and updates the necessary tables for user locations and profiles

-- Create user_locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2) NULL,
  is_current TINYINT(1) DEFAULT 1,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create customer_profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NULL DEFAULT 'India',
  pincode VARCHAR(20) NULL,
  dob DATE NULL,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
  emergency_contact_name VARCHAR(100) NULL,
  emergency_contact_phone VARCHAR(20) NULL,
  referral_code VARCHAR(20) NULL,
  referred_by INT NULL,
  preferences JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_profile (user_id),
  UNIQUE KEY unique_referral_code (referral_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create trigger to mark only one location as current per user
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_user_location_insert
AFTER INSERT ON user_locations
FOR EACH ROW
BEGIN
    UPDATE user_locations 
    SET is_current = 0 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_current = 1;
END //
DELIMITER ;

-- Create trigger to mark only one location as current per user on update
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_user_location_update
AFTER UPDATE ON user_locations
FOR EACH ROW
BEGIN
    IF NEW.is_current = 1 AND OLD.is_current = 0 THEN
        UPDATE user_locations 
        SET is_current = 0 
        WHERE user_id = NEW.user_id 
          AND id != NEW.id 
          AND is_current = 1;
    END IF;
END //
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_is_current ON user_locations(is_current);
CREATE INDEX idx_user_locations_coordinates ON user_locations(latitude, longitude);
CREATE INDEX idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_city ON customer_profiles(city);
CREATE INDEX idx_customer_profiles_referral_code ON customer_profiles(referral_code);
