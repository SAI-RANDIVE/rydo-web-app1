-- Tracking Tables Migration
-- Creates and updates tables for real-time location tracking

-- Add location tracking columns to driver_bookings if not exists
ALTER TABLE driver_bookings 
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8) NULL,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS estimated_arrival_time TIMESTAMP NULL;

-- Add location tracking columns to shuttle_schedules if not exists
ALTER TABLE shuttle_schedules 
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8) NULL,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS estimated_arrival_time TIMESTAMP NULL;

-- Create tracking_sessions table
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  session_type ENUM('driver_booking', 'shuttle_schedule') NOT NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  INDEX (session_id),
  INDEX (session_type),
  INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create location_history table
CREATE TABLE IF NOT EXISTS location_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2) NULL,
  speed DECIMAL(10, 2) NULL,
  heading DECIMAL(10, 2) NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES tracking_sessions(session_id) ON DELETE CASCADE,
  INDEX (session_id),
  INDEX (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add status column to driver_bookings if not exists or update it
ALTER TABLE driver_bookings 
MODIFY COLUMN status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'failed') NOT NULL DEFAULT 'pending';

-- Add status column to shuttle_bookings if not exists or update it
ALTER TABLE shuttle_bookings 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'failed') NOT NULL DEFAULT 'pending';

-- Add status column to shuttle_schedules if not exists or update it
ALTER TABLE shuttle_schedules 
MODIFY COLUMN status ENUM('scheduled', 'active', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled';
