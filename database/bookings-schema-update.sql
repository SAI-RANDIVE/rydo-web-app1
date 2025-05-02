-- Bookings Schema Update
-- This script updates the bookings table to add expiration time and other fields needed for the timeout feature

-- Add expiration_time column to bookings table if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS expiration_time DATETIME NULL AFTER created_at;

-- Add retry_count column to track how many times a booking has been retried
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0 AFTER expiration_time;

-- Add last_retry_time column to track when a booking was last retried
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS last_retry_time DATETIME NULL AFTER retry_count;

-- Create index for faster queries on expiration_time
CREATE INDEX IF NOT EXISTS idx_bookings_expiration_time ON bookings(expiration_time);

-- Create index for status and expiration_time combination
CREATE INDEX IF NOT EXISTS idx_bookings_status_expiration ON bookings(status, expiration_time);

-- Create a stored procedure to automatically expire pending bookings
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS expire_pending_bookings()
BEGIN
    UPDATE bookings
    SET status = 'expired'
    WHERE status = 'pending'
    AND expiration_time IS NOT NULL
    AND expiration_time < NOW();
END //
DELIMITER ;

-- Create an event to run the expire_pending_bookings procedure every minute
DELIMITER //
CREATE EVENT IF NOT EXISTS event_expire_pending_bookings
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
    CALL expire_pending_bookings();
END //
DELIMITER ;

-- Make sure event scheduler is turned on
SET GLOBAL event_scheduler = ON;
