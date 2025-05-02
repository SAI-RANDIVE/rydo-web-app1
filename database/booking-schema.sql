-- Booking Management Schema
-- This script creates and updates the necessary tables for the booking management system

-- Create or update bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  provider_id INT NULL,
  service_type ENUM('driver', 'caretaker', 'shuttle') NOT NULL,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  booking_date DATETIME NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NULL,
  pickup_latitude DECIMAL(10, 8) NULL,
  pickup_longitude DECIMAL(11, 8) NULL,
  dropoff_latitude DECIMAL(10, 8) NULL,
  dropoff_longitude DECIMAL(11, 8) NULL,
  special_instructions TEXT NULL,
  estimated_distance DECIMAL(10, 2) NULL COMMENT 'in kilometers',
  estimated_duration INT NULL COMMENT 'in minutes',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash', 'wallet', 'card', 'upi') DEFAULT 'cash',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  cancellation_reason TEXT NULL,
  cancelled_by ENUM('customer', 'provider', 'admin', 'system') NULL,
  cancelled_at DATETIME NULL,
  completed_at DATETIME NULL,
  is_rated TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create booking_history table to track booking status changes
CREATE TABLE IF NOT EXISTS booking_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create booking_ratings table
CREATE TABLE IF NOT EXISTS booking_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  rated_by_user_id INT NOT NULL,
  rated_user_id INT NOT NULL,
  rating DECIMAL(2, 1) NOT NULL,
  review TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_booking_rating (booking_id, rated_by_user_id, rated_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create driver_booking_details table for driver-specific booking details
CREATE TABLE IF NOT EXISTS driver_booking_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  vehicle_type VARCHAR(50) NULL,
  is_round_trip TINYINT(1) DEFAULT 0,
  return_date DATETIME NULL,
  number_of_passengers INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create caretaker_booking_details table for caretaker-specific booking details
CREATE TABLE IF NOT EXISTS caretaker_booking_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  patient_name VARCHAR(100) NULL,
  patient_age INT NULL,
  patient_gender ENUM('male', 'female', 'other') NULL,
  medical_condition TEXT NULL,
  duration_hours INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create shuttle_booking_details table for shuttle-specific booking details
CREATE TABLE IF NOT EXISTS shuttle_booking_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  route_id INT NULL,
  number_of_passengers INT DEFAULT 1,
  luggage_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE KEY unique_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create indexes for better performance
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_service_type ON bookings(service_type);
CREATE INDEX idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX idx_booking_ratings_booking_id ON booking_ratings(booking_id);
CREATE INDEX idx_booking_ratings_rated_user_id ON booking_ratings(rated_user_id);

-- Create trigger to add booking history when a booking is created
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_booking_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO booking_history (booking_id, status, notes, created_by)
    VALUES (NEW.id, NEW.status, 'Booking created', NEW.customer_id);
END //
DELIMITER ;

-- Create trigger to add booking history when a booking status is updated
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_booking_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO booking_history (booking_id, status, notes, created_by)
        VALUES (NEW.id, NEW.status, CONCAT('Status changed from ', OLD.status, ' to ', NEW.status), NULL);
    END IF;
END //
DELIMITER ;

-- Sample data for testing (uncomment to use)
/*
-- Insert sample bookings
INSERT INTO bookings (booking_reference, customer_id, provider_id, service_type, status, booking_date, pickup_location, dropoff_location, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, special_instructions, estimated_distance, estimated_duration, amount, payment_method, payment_status)
VALUES 
('BK-20250501-001', 1, 2, 'driver', 'confirmed', '2025-05-03 10:00:00', '123 Main St, City', '456 Park Ave, City', 12.9716, 77.5946, 12.9766, 77.5993, 'Please call when you arrive', 5.2, 20, 350.00, 'cash', 'pending'),
('BK-20250501-002', 1, 3, 'caretaker', 'pending', '2025-05-04 14:00:00', '123 Main St, City', NULL, 12.9716, 77.5946, NULL, NULL, 'Patient needs assistance with mobility', NULL, 120, 800.00, 'wallet', 'completed'),
('BK-20250501-003', 1, 4, 'shuttle', 'completed', '2025-05-01 08:00:00', 'Airport Terminal 1', 'City Center', 12.9499, 77.6684, 12.9716, 77.5946, NULL, 30.5, 45, 500.00, 'card', 'completed');

-- Insert driver booking details
INSERT INTO driver_booking_details (booking_id, vehicle_type, is_round_trip, number_of_passengers)
VALUES (1, 'sedan', 0, 2);

-- Insert caretaker booking details
INSERT INTO caretaker_booking_details (booking_id, service_type, patient_name, patient_age, patient_gender, medical_condition, duration_hours)
VALUES (2, 'home_care', 'John Smith', 65, 'male', 'Recovering from surgery, needs assistance with daily activities', 2);

-- Insert shuttle booking details
INSERT INTO shuttle_booking_details (booking_id, route_id, number_of_passengers, luggage_count)
VALUES (3, 1, 3, 4);
*/
