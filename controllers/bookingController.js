/**
 * Booking Controller
 * 
 * Handles all booking-related operations for the RYDO Web App.
 */

const db = require('../../config/db');
const notificationService = require('../services/notification-service');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBooking = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to create a booking' });
        }

        const {
            service_type,
            pickup_location,
            dropoff_location,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            booking_date,
            number_of_passengers,
            special_requirements,
            estimated_fare,
            payment_method
        } = req.body;

        // Validate required fields
        if (!service_type || !pickup_location || !booking_date || !estimated_fare) {
            return res.status(400).json({ message: 'Missing required booking information' });
        }

        // Generate a unique booking reference
        const bookingReference = generateBookingReference();

        // Create booking in database
        const [result] = await db.query(
            `INSERT INTO bookings (
                booking_reference, 
                customer_id, 
                service_type, 
                status, 
                booking_date, 
                pickup_location, 
                dropoff_location, 
                pickup_latitude, 
                pickup_longitude, 
                dropoff_latitude, 
                dropoff_longitude,
                number_of_passengers, 
                special_requirements, 
                amount, 
                payment_method, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                bookingReference,
                userId,
                service_type,
                'pending', // Initial status is pending
                booking_date,
                pickup_location,
                dropoff_location || null,
                pickup_latitude || null,
                pickup_longitude || null,
                dropoff_latitude || null,
                dropoff_longitude || null,
                number_of_passengers || 1,
                special_requirements || null,
                estimated_fare,
                payment_method || 'cash',
            ]
        );

        if (!result || !result.insertId) {
            return res.status(500).json({ message: 'Failed to create booking' });
        }

        // Get the created booking
        const [bookings] = await db.query(
            `SELECT * FROM bookings WHERE id = ?`,
            [result.insertId]
        );

        if (!bookings || bookings.length === 0) {
            return res.status(500).json({ message: 'Failed to retrieve booking' });
        }

        const booking = bookings[0];

        // Create notification for the customer
        await notificationService.createNotification({
            user_id: userId,
            title: 'Booking Confirmed',
            message: `Your ${service_type} booking (${bookingReference}) has been confirmed and we're finding a service provider for you.`,
            type: 'booking',
            reference_id: booking.id,
            reference_type: 'booking',
            priority: 'high',
            action_url: `/customer-dashboard?tab=bookings&id=${booking.id}`
        });

        // Find nearby service providers based on service type and location
        await findNearbyProviders(service_type, pickup_latitude, pickup_longitude, booking.id);

        return res.status(201).json({
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({ message: 'An error occurred while creating the booking' });
    }
};

/**
 * Get all bookings for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserBookings = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to view bookings' });
        }

        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT b.*, 
                   COALESCE(p.first_name, '') AS provider_first_name, 
                   COALESCE(p.last_name, '') AS provider_last_name,
                   COALESCE(p.profile_image, '') AS provider_image
            FROM bookings b
            LEFT JOIN users p ON b.provider_id = p.id
            WHERE b.customer_id = ?
        `;
        
        const queryParams = [userId];

        // Filter by status if provided
        if (status) {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [bookings] = await db.query(query, queryParams);

        return res.status(200).json({
            bookings,
            count: bookings.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.status(500).json({ message: 'An error occurred while fetching bookings' });
    }
};

/**
 * Get booking details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBookingById = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to view booking details' });
        }

        const bookingId = req.params.id;
        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, 
                   COALESCE(p.first_name, '') AS provider_first_name, 
                   COALESCE(p.last_name, '') AS provider_last_name,
                   COALESCE(p.profile_image, '') AS provider_image,
                   COALESCE(p.phone, '') AS provider_phone
            FROM bookings b
            LEFT JOIN users p ON b.provider_id = p.id
            WHERE b.id = ? AND (b.customer_id = ? OR b.provider_id = ?)`,
            [bookingId, userId, userId]
        );

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        return res.status(200).json({
            booking: bookings[0]
        });
    } catch (error) {
        console.error('Error fetching booking details:', error);
        return res.status(500).json({ message: 'An error occurred while fetching booking details' });
    }
};

/**
 * Update booking status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateBookingStatus = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to update booking status' });
        }

        const bookingId = req.params.id;
        const { status, reason } = req.body;

        if (!bookingId || !status) {
            return res.status(400).json({ message: 'Booking ID and status are required' });
        }

        // Check if booking exists and belongs to the user
        const [bookings] = await db.query(
            `SELECT * FROM bookings WHERE id = ? AND (customer_id = ? OR provider_id = ?)`,
            [bookingId, userId, userId]
        );

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found or you do not have permission to update it' });
        }

        const booking = bookings[0];

        // Validate status transition
        const validStatusTransitions = {
            'pending': ['accepted', 'cancelled'],
            'accepted': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        };

        if (!validStatusTransitions[booking.status].includes(status)) {
            return res.status(400).json({ 
                message: `Cannot change booking status from '${booking.status}' to '${status}'` 
            });
        }

        // Update booking status
        await db.query(
            `UPDATE bookings SET status = ?, cancellation_reason = ?, updated_at = NOW() WHERE id = ?`,
            [status, status === 'cancelled' ? reason : null, bookingId]
        );

        // Create notification for status change
        let notificationTitle, notificationMessage;
        
        if (status === 'cancelled') {
            notificationTitle = 'Booking Cancelled';
            notificationMessage = `Your booking (${booking.booking_reference}) has been cancelled. ${reason ? `Reason: ${reason}` : ''}`;
        } else if (status === 'accepted') {
            notificationTitle = 'Booking Accepted';
            notificationMessage = `Your ${booking.service_type} booking (${booking.booking_reference}) has been accepted by a service provider.`;
        } else if (status === 'in_progress') {
            notificationTitle = 'Booking In Progress';
            notificationMessage = `Your ${booking.service_type} booking (${booking.booking_reference}) is now in progress.`;
        } else if (status === 'completed') {
            notificationTitle = 'Booking Completed';
            notificationMessage = `Your ${booking.service_type} booking (${booking.booking_reference}) has been completed. Thank you for using RYDO!`;
        }

        // Send notification to customer if provider updates status
        if (userId === booking.provider_id) {
            await notificationService.createNotification({
                userId: booking.customer_id,
                title: notificationTitle,
                message: notificationMessage,
                type: 'booking',
                referenceId: booking.id,
                referenceType: 'booking',
                priority: 'high',
                actionUrl: `/customer-dashboard?tab=bookings&id=${booking.id}`,
                data: { bookingId: booking.id }
            });
        }
        
        // Send notification to provider if customer cancels
        if (userId === booking.customer_id && status === 'cancelled' && booking.provider_id) {
            await notificationService.createNotification({
                userId: booking.provider_id,
                title: 'Booking Cancelled by Customer',
                message: `Booking (${booking.booking_reference}) has been cancelled by the customer. ${reason ? `Reason: ${reason}` : ''}`,
                type: 'booking',
                referenceId: booking.id,
                referenceType: 'booking',
                priority: 'high',
                actionUrl: `/provider-dashboard?tab=bookings&id=${booking.id}`,
                data: { bookingId: booking.id }
            });
        }

        return res.status(200).json({
            message: `Booking status updated to ${status}`,
            bookingId
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({ message: 'An error occurred while updating booking status' });
    }
};

/**
 * Calculate fare for a booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.calculateFare = async (req, res) => {
    try {
        const {
            service_type,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            number_of_passengers,
            booking_date
        } = req.body;

        // Validate required fields
        if (!service_type || !pickup_latitude || !pickup_longitude) {
            return res.status(400).json({ message: 'Missing required fare calculation information' });
        }

        // Calculate distance if dropoff coordinates are provided
        let distance = 0;
        if (dropoff_latitude && dropoff_longitude) {
            distance = calculateDistance(
                pickup_latitude, 
                pickup_longitude, 
                dropoff_latitude, 
                dropoff_longitude
            );
        }

        // Base rates by service type
        const baseRates = {
            'driver': 100, // Base fare for personal driver
            'caretaker': 300, // Base fare for medical caretaker
            'shuttle': 150  // Base fare for shuttle service
        };

        // Per km rates by service type
        const perKmRates = {
            'driver': 12,
            'caretaker': 0, // Caretakers typically charge by hour, not distance
            'shuttle': 15
        };

        // Calculate base fare
        let baseFare = baseRates[service_type] || 100;
        
        // Add distance cost for applicable services
        let distanceCost = 0;
        if (service_type !== 'caretaker' && distance > 0) {
            distanceCost = distance * perKmRates[service_type];
        }
        
        // Additional charges based on service type and parameters
        let additionalCharges = 0;
        
        // For drivers and shuttles, add passenger surcharge
        if ((service_type === 'driver' || service_type === 'shuttle') && number_of_passengers > 2) {
            additionalCharges += (number_of_passengers - 2) * 20; // ₹20 per additional passenger
        }
        
        // Peak hour surcharge (7-10 AM and 5-8 PM)
        let peakHourSurcharge = 0;
        if (booking_date) {
            const bookingTime = new Date(booking_date);
            const hour = bookingTime.getHours();
            if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
                peakHourSurcharge = baseFare * 0.1; // 10% peak hour surcharge
            }
        }
        
        // Calculate total fare
        const subtotal = baseFare + distanceCost + additionalCharges + peakHourSurcharge;
        
        // Add service fee (7.5% as per requirements)
        const serviceFee = subtotal * 0.075;
        
        // Calculate total with service fee
        const total = subtotal + serviceFee;
        
        // Round to 2 decimal places
        const roundedTotal = Math.round(total * 100) / 100;
        
        return res.status(200).json({
            fare: {
                base_fare: baseFare,
                distance_km: parseFloat(distance.toFixed(2)),
                distance_cost: parseFloat(distanceCost.toFixed(2)),
                additional_charges: parseFloat(additionalCharges.toFixed(2)),
                peak_hour_surcharge: parseFloat(peakHourSurcharge.toFixed(2)),
                subtotal: parseFloat(subtotal.toFixed(2)),
                service_fee: parseFloat(serviceFee.toFixed(2)),
                total: roundedTotal
            }
        });
    } catch (error) {
        console.error('Error calculating fare:', error);
        return res.status(500).json({ message: 'An error occurred while calculating fare' });
    }
};

/**
 * Find nearby service providers based on service type and location
 * @param {string} serviceType - Type of service
 * @param {number} latitude - Pickup latitude
 * @param {number} longitude - Pickup longitude
 * @param {number} bookingId - Booking ID
 */
async function findNearbyProviders(serviceType, latitude, longitude, bookingId) {
    try {
        if (!latitude || !longitude) {
            console.log('Location coordinates not provided, skipping provider search');
            return;
        }

        // Get provider role based on service type
        let providerRole;
        if (serviceType === 'driver') {
            providerRole = 'driver';
        } else if (serviceType === 'caretaker') {
            providerRole = 'caretaker';
        } else if (serviceType === 'shuttle') {
            providerRole = 'shuttle';
        } else {
            console.log(`Invalid service type: ${serviceType}`);
            return;
        }

        // Find providers within 3km radius (as per requirements)
        const [providers] = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
                    (6371 * acos(cos(radians(?)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(?)) + sin(radians(?)) * sin(radians(p.latitude)))) AS distance
             FROM users u
             JOIN provider_profiles p ON u.id = p.user_id
             WHERE u.role = ? AND u.is_active = 1 AND p.is_available = 1
             HAVING distance < 3
             ORDER BY distance
             LIMIT 10`,
            [latitude, longitude, latitude, providerRole]
        );

        console.log(`Found ${providers.length} nearby ${providerRole}s`);

        // Send notification to each provider
        for (const provider of providers) {
            await notificationService.createNotification({
                user_id: provider.id,
                title: 'New Booking Request',
                message: `There's a new ${serviceType} booking request near your location. Check it out!`,
                type: 'booking_request',
                reference_id: bookingId,
                reference_type: 'booking',
                priority: 'high',
                action_url: `/provider-dashboard?tab=booking_requests&id=${bookingId}`
            });
        }
    } catch (error) {
        console.error('Error finding nearby providers:', error);
    }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Starting point latitude
 * @param {number} lon1 - Starting point longitude
 * @param {number} lat2 - Ending point latitude
 * @param {number} lon2 - Ending point longitude
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

/**
 * Generate a unique booking reference
 * @returns {string} - Booking reference
 */
function generateBookingReference() {
    // Format: RYD-XXXXX-XX (where X is alphanumeric)
    const uuid = uuidv4().replace(/-/g, '').toUpperCase();
    return `RYD-${uuid.substring(0, 5)}-${uuid.substring(5, 7)}`;
}
