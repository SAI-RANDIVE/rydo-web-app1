/**
 * Booking Controller for MongoDB
 * 
 * Handles all booking-related operations for the RYDO Web App.
 */

const { Booking, User, Profile } = require('../models/mongodb');
const notificationService = require('../services/mongodb-notification-service');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBooking = async (req, res) => {
    try {
        const userId = req.session.user?.id;
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
        const newBooking = new Booking({
            bookingId: bookingReference,
            customerId: userId,
            serviceType: service_type,
            status: 'pending',
            pickupLocation: {
                coordinates: [
                    pickup_longitude || 0,
                    pickup_latitude || 0
                ],
                address: pickup_location
            },
            dropLocation: {
                coordinates: [
                    dropoff_longitude || 0,
                    dropoff_latitude || 0
                ],
                address: dropoff_location || ''
            },
            bookingDate: booking_date,
            numberOfPassengers: number_of_passengers || 1,
            specialRequirements: special_requirements || '',
            fare: estimated_fare,
            paymentMethod: payment_method || 'cash',
            paymentStatus: 'pending'
        });

        const savedBooking = await newBooking.save();

        // Create notification for the customer
        await notificationService.createNotification({
            userId: userId,
            title: 'Booking Confirmed',
            message: `Your ${service_type} booking (${bookingReference}) has been confirmed and we're finding a service provider for you.`,
            type: 'booking',
            referenceId: savedBooking._id,
            referenceType: 'booking',
            priority: 'high',
            actionUrl: `/customer-dashboard?tab=bookings&id=${savedBooking._id}`
        });

        // Find nearby service providers based on service type and location
        await findNearbyProviders(service_type, pickup_latitude, pickup_longitude, savedBooking._id);

        return res.status(201).json({
            message: 'Booking created successfully',
            booking: savedBooking
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
        const userId = req.session.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to view bookings' });
        }

        const { status, limit = 50, offset = 0 } = req.query;

        // Build query
        const query = { customerId: userId };
        
        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Get bookings with provider information
        const bookings = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .lean();

        // Get provider details for each booking
        const bookingsWithProviderDetails = await Promise.all(bookings.map(async (booking) => {
            if (booking.providerId) {
                const provider = await User.findById(booking.providerId).lean();
                if (provider) {
                    return {
                        ...booking,
                        provider_first_name: provider.firstName || '',
                        provider_last_name: provider.lastName || '',
                        provider_image: provider.profileImage || '',
                        provider_phone: provider.phone || ''
                    };
                }
            }
            return {
                ...booking,
                provider_first_name: '',
                provider_last_name: '',
                provider_image: '',
                provider_phone: ''
            };
        }));

        return res.status(200).json({
            bookings: bookingsWithProviderDetails,
            count: bookingsWithProviderDetails.length,
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
        const userId = req.session.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to view booking details' });
        }

        const bookingId = req.params.id;
        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        // Find booking where user is either customer or provider
        const booking = await Booking.findOne({
            _id: bookingId,
            $or: [
                { customerId: userId },
                { providerId: userId }
            ]
        }).lean();

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found or you do not have permission to view it' });
        }

        // Get provider details if available
        let providerDetails = {
            provider_first_name: '',
            provider_last_name: '',
            provider_image: '',
            provider_phone: ''
        };

        if (booking.providerId) {
            const provider = await User.findById(booking.providerId).lean();
            if (provider) {
                providerDetails = {
                    provider_first_name: provider.firstName || '',
                    provider_last_name: provider.lastName || '',
                    provider_image: provider.profileImage || '',
                    provider_phone: provider.phone || ''
                };
            }
        }

        // Get customer details
        const customer = await User.findById(booking.customerId).lean();
        const customerDetails = customer ? {
            customer_first_name: customer.firstName || '',
            customer_last_name: customer.lastName || '',
            customer_image: customer.profileImage || '',
            customer_phone: customer.phone || ''
        } : {};

        return res.status(200).json({
            booking: {
                ...booking,
                ...providerDetails,
                ...customerDetails
            }
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
        const userId = req.session.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to update booking status' });
        }

        const { bookingId, status } = req.body;
        if (!bookingId || !status) {
            return res.status(400).json({ message: 'Booking ID and status are required' });
        }

        // Validate status
        const validStatuses = ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
        }

        // Find booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if user is authorized to update this booking
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine if user is customer or provider
        const isCustomer = booking.customerId.toString() === userId;
        const isProvider = booking.providerId && booking.providerId.toString() === userId;

        if (!isCustomer && !isProvider && user.userType !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to update this booking' });
        }

        // Apply status-specific logic
        if (status === 'accepted' && !isProvider && user.userType !== 'admin') {
            return res.status(403).json({ message: 'Only providers can accept bookings' });
        }

        if (status === 'cancelled' && !isCustomer && !isProvider && user.userType !== 'admin') {
            return res.status(403).json({ message: 'Only customers, providers, or admins can cancel bookings' });
        }

        // Update booking status
        booking.status = status;

        // Set timestamps based on status
        if (status === 'in-progress') {
            booking.startTime = new Date();
        } else if (status === 'completed') {
            booking.endTime = new Date();
        }

        // If provider is accepting booking, set provider ID
        if (status === 'accepted' && isProvider) {
            booking.providerId = userId;
        }

        await booking.save();

        // Create notification for the other party
        let notificationRecipientId, notificationTitle, notificationMessage;

        if (isCustomer) {
            notificationRecipientId = booking.providerId;
            notificationTitle = 'Booking Update';
            notificationMessage = `Booking #${booking.bookingId} has been ${status} by the customer.`;
        } else {
            notificationRecipientId = booking.customerId;
            notificationTitle = 'Booking Update';
            notificationMessage = `Your booking #${booking.bookingId} has been ${status} by the provider.`;
        }

        if (notificationRecipientId) {
            await notificationService.createNotification({
                userId: notificationRecipientId,
                title: notificationTitle,
                message: notificationMessage,
                type: 'booking',
                referenceId: bookingId,
                referenceType: 'booking',
                priority: 'high',
                actionUrl: `/dashboard?tab=bookings&id=${bookingId}`
            });
        }

        return res.status(200).json({
            message: `Booking status updated to ${status}`,
            booking
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
            distance_km,
            duration_min
        } = req.body;

        // Validate required fields
        if (!service_type) {
            return res.status(400).json({ message: 'Service type is required' });
        }

        // Calculate distance if not provided but coordinates are
        let distance = distance_km;
        if (!distance && pickup_latitude && pickup_longitude && dropoff_latitude && dropoff_longitude) {
            distance = calculateDistance(
                pickup_latitude,
                pickup_longitude,
                dropoff_latitude,
                dropoff_longitude
            );
        }

        if (!distance) {
            return res.status(400).json({ message: 'Distance or coordinates are required' });
        }

        // Get base fare and per km rate based on service type
        let baseFare, perKmRate, perMinRate;

        switch (service_type) {
            case 'driver':
                baseFare = 50; // Base fare in INR
                perKmRate = 12; // Rate per km in INR
                perMinRate = 2; // Rate per minute in INR
                break;
            case 'caretaker':
                baseFare = 100; // Higher base fare for caretakers
                perKmRate = 10;
                perMinRate = 3;
                break;
            case 'shuttle':
                baseFare = 80;
                perKmRate = 15;
                perMinRate = 1.5;
                break;
            default:
                baseFare = 50;
                perKmRate = 12;
                perMinRate = 2;
        }

        // Calculate fare components
        const distanceFare = distance * perKmRate;
        const timeFare = duration_min ? duration_min * perMinRate : 0;
        
        // Calculate total fare
        let totalFare = baseFare + distanceFare + timeFare;
        
        // Round to nearest whole number
        totalFare = Math.round(totalFare);
        
        // Apply minimum fare if total is less than minimum
        const minimumFare = 50;
        if (totalFare < minimumFare) {
            totalFare = minimumFare;
        }

        // Calculate convenience fee (7.5%)
        const convenienceFee = Math.round(totalFare * 0.075);
        
        // Calculate final amount
        const finalAmount = totalFare + convenienceFee;

        return res.status(200).json({
            base_fare: baseFare,
            distance_fare: distanceFare,
            time_fare: timeFare,
            subtotal: totalFare,
            convenience_fee: convenienceFee,
            total_fare: finalAmount,
            distance_km: distance,
            duration_min: duration_min || 0
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
            console.log('Skipping nearby provider search: Missing coordinates');
            return;
        }

        // Map service type to user type
        const userType = serviceType === 'shuttle' ? 'shuttle' : serviceType;

        // Find providers within 3km radius
        const providers = await User.find({
            userType,
            isVerified: true,
            isActive: true,
            'location.coordinates': {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: 3000 // 3km in meters
                }
            }
        }).limit(10);

        console.log(`Found ${providers.length} nearby ${serviceType} providers`);

        // Send notification to each provider
        for (const provider of providers) {
            await notificationService.createNotification({
                userId: provider._id,
                title: 'New Booking Request',
                message: `A new ${serviceType} booking is available near your location.`,
                type: 'booking_request',
                referenceId: bookingId,
                referenceType: 'booking',
                priority: 'high',
                actionUrl: `/provider-dashboard?tab=bookings&id=${bookingId}`
            });
        }

        return providers;
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
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
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
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RYDO${timestamp}${random}`;
}
