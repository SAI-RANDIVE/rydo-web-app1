/**
 * Nearby Drivers Controller
 * Handles finding drivers within a specific radius and managing booking timeouts
 */

const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Find nearby drivers within a specified radius
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.findNearbyDrivers = async (req, res) => {
    try {
        const { latitude, longitude, radius = 3 } = req.body; // Default radius is 3km
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }
        
        // Find drivers within the specified radius (3km by default)
        // Using Haversine formula to calculate distance
        const [drivers] = await db.query(`
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.profile_image,
                ul.latitude, 
                ul.longitude,
                u.average_rating,
                u.total_rides,
                v.vehicle_type,
                v.vehicle_make,
                v.vehicle_model,
                (
                    6371 * acos(
                        cos(radians(?)) * 
                        cos(radians(ul.latitude)) * 
                        cos(radians(ul.longitude) - radians(?)) + 
                        sin(radians(?)) * 
                        sin(radians(ul.latitude))
                    )
                ) AS distance
            FROM 
                users u
            JOIN 
                user_locations ul ON u.id = ul.user_id
            LEFT JOIN
                vehicles v ON u.id = v.user_id
            WHERE 
                u.role = 'driver'
                AND u.is_active = 1
                AND u.is_verified = 1
                AND u.is_available = 1
            HAVING 
                distance <= ?
            ORDER BY 
                distance
            LIMIT 10
        `, [latitude, longitude, latitude, radius]);
        
        return res.status(200).json({
            success: true,
            drivers: drivers.map(driver => ({
                id: driver.id,
                name: `${driver.first_name} ${driver.last_name}`,
                profile_image: driver.profile_image,
                distance: parseFloat(driver.distance).toFixed(2),
                rating: driver.average_rating || 0,
                total_rides: driver.total_rides || 0,
                vehicle: {
                    type: driver.vehicle_type,
                    make: driver.vehicle_make,
                    model: driver.vehicle_model
                }
            }))
        });
    } catch (error) {
        console.error('Error finding nearby drivers:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to find nearby drivers'
        });
    }
};

/**
 * Create a booking with expiration time
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBookingWithTimeout = async (req, res) => {
    try {
        const { 
            service_type, 
            provider_id, 
            pickup_location, 
            dropoff_location,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            booking_date,
            booking_time,
            payment_method,
            fare_amount,
            notes
        } = req.body;
        
        const customer_id = req.session.userId;
        
        if (!customer_id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        if (!service_type || !provider_id || !pickup_location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking information'
            });
        }
        
        // Generate unique booking reference
        const booking_reference = uuidv4().substring(0, 8).toUpperCase();
        
        // Set expiration time (15 minutes from now)
        const now = new Date();
        const expiration_time = new Date(now.getTime() + 15 * 60000); // 15 minutes in milliseconds
        
        // Insert booking with expiration time
        const [result] = await db.query(`
            INSERT INTO bookings (
                customer_id, 
                provider_id, 
                service_type, 
                pickup_location, 
                dropoff_location,
                pickup_latitude,
                pickup_longitude,
                dropoff_latitude,
                dropoff_longitude,
                booking_date,
                booking_time,
                payment_method,
                fare_amount,
                notes,
                status,
                reference_id,
                expiration_time,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
        `, [
            customer_id,
            provider_id,
            service_type,
            pickup_location,
            dropoff_location || null,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude || null,
            dropoff_longitude || null,
            booking_date,
            booking_time,
            payment_method,
            fare_amount,
            notes || null,
            booking_reference,
            expiration_time
        ]);
        
        if (!result.insertId) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create booking'
            });
        }
        
        // Get the created booking
        const [bookings] = await db.query(`
            SELECT * FROM bookings WHERE id = ?
        `, [result.insertId]);
        
        if (!bookings.length) {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve created booking'
            });
        }
        
        const booking = bookings[0];
        
        // Send notification to provider
        try {
            await db.query(`
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    data,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                provider_id,
                'New Booking Request',
                `You have a new booking request for ${service_type} service`,
                'booking_request',
                JSON.stringify({ booking_id: booking.id })
            ]);
        } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Continue despite notification error
        }
        
        return res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: booking.id,
                reference_id: booking.reference_id,
                status: booking.status,
                expiration_time: booking.expiration_time,
                service_type: booking.service_type
            }
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create booking'
        });
    }
};

/**
 * Check booking status and handle expiration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkBookingStatus = async (req, res) => {
    try {
        const { booking_id } = req.params;
        
        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }
        
        // Get booking details
        const [bookings] = await db.query(`
            SELECT * FROM bookings WHERE id = ?
        `, [booking_id]);
        
        if (!bookings.length) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        const booking = bookings[0];
        
        // Check if booking is expired
        const now = new Date();
        const expirationTime = new Date(booking.expiration_time);
        
        if (booking.status === 'pending' && now > expirationTime) {
            // Update booking status to expired
            await db.query(`
                UPDATE bookings SET status = 'expired' WHERE id = ?
            `, [booking_id]);
            
            booking.status = 'expired';
        }
        
        return res.status(200).json({
            success: true,
            booking: {
                id: booking.id,
                reference_id: booking.reference_id,
                status: booking.status,
                expiration_time: booking.expiration_time,
                provider_id: booking.provider_id,
                service_type: booking.service_type
            }
        });
    } catch (error) {
        console.error('Error checking booking status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check booking status'
        });
    }
};

/**
 * Retry expired booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.retryExpiredBooking = async (req, res) => {
    try {
        const { booking_id } = req.params;
        
        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }
        
        // Get booking details
        const [bookings] = await db.query(`
            SELECT * FROM bookings WHERE id = ?
        `, [booking_id]);
        
        if (!bookings.length) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        const booking = bookings[0];
        
        // Check if booking is expired
        if (booking.status !== 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Only expired bookings can be retried'
            });
        }
        
        // Set new expiration time (15 minutes from now)
        const now = new Date();
        const expiration_time = new Date(now.getTime() + 15 * 60000); // 15 minutes in milliseconds
        
        // Update booking status and expiration time
        await db.query(`
            UPDATE bookings 
            SET status = 'pending', expiration_time = ? 
            WHERE id = ?
        `, [expiration_time, booking_id]);
        
        // Get updated booking
        const [updatedBookings] = await db.query(`
            SELECT * FROM bookings WHERE id = ?
        `, [booking_id]);
        
        if (!updatedBookings.length) {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve updated booking'
            });
        }
        
        const updatedBooking = updatedBookings[0];
        
        // Send notification to provider
        try {
            await db.query(`
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    data,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                updatedBooking.provider_id,
                'Booking Request Retry',
                `A booking request for ${updatedBooking.service_type} service has been retried`,
                'booking_retry',
                JSON.stringify({ booking_id: updatedBooking.id })
            ]);
        } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Continue despite notification error
        }
        
        return res.status(200).json({
            success: true,
            message: 'Booking retried successfully',
            booking: {
                id: updatedBooking.id,
                reference_id: updatedBooking.reference_id,
                status: updatedBooking.status,
                expiration_time: updatedBooking.expiration_time,
                service_type: updatedBooking.service_type
            }
        });
    } catch (error) {
        console.error('Error retrying booking:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retry booking'
        });
    }
};

/**
 * Get booking details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBookingDetails = async (req, res) => {
    try {
        const { booking_id } = req.params;
        
        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }
        
        // Get booking details with provider information
        const [bookings] = await db.query(`
            SELECT 
                b.*,
                u.first_name as provider_first_name,
                u.last_name as provider_last_name,
                u.profile_image as provider_profile_image,
                u.phone as provider_phone,
                u.average_rating as provider_rating,
                v.vehicle_type,
                v.vehicle_make,
                v.vehicle_model,
                v.license_plate
            FROM 
                bookings b
            LEFT JOIN 
                users u ON b.provider_id = u.id
            LEFT JOIN
                vehicles v ON u.id = v.user_id
            WHERE 
                b.id = ?
        `, [booking_id]);
        
        if (!bookings.length) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        const booking = bookings[0];
        
        // Check if booking is expired
        const now = new Date();
        const expirationTime = new Date(booking.expiration_time);
        
        if (booking.status === 'pending' && now > expirationTime) {
            // Update booking status to expired
            await db.query(`
                UPDATE bookings SET status = 'expired' WHERE id = ?
            `, [booking_id]);
            
            booking.status = 'expired';
        }
        
        return res.status(200).json({
            success: true,
            booking: {
                id: booking.id,
                reference_id: booking.reference_id,
                status: booking.status,
                service_type: booking.service_type,
                pickup_location: booking.pickup_location,
                dropoff_location: booking.dropoff_location,
                booking_date: booking.booking_date,
                booking_time: booking.booking_time,
                payment_method: booking.payment_method,
                fare_amount: booking.fare_amount,
                notes: booking.notes,
                expiration_time: booking.expiration_time,
                created_at: booking.created_at,
                provider: {
                    id: booking.provider_id,
                    name: `${booking.provider_first_name} ${booking.provider_last_name}`,
                    profile_image: booking.provider_profile_image,
                    phone: booking.provider_phone,
                    rating: booking.provider_rating || 0,
                    vehicle: {
                        type: booking.vehicle_type,
                        make: booking.vehicle_make,
                        model: booking.vehicle_model,
                        license_plate: booking.license_plate
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting booking details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get booking details'
        });
    }
};
