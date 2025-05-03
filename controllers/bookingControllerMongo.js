/**
 * MongoDB Booking Controller
 * 
 * Handles all booking-related operations for the RYDO Web App using MongoDB.
 */

const Booking = require('../models/BookingMongo');
const User = require('../models/UserMongo');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

/**
 * Create a new booking
 */
exports.createBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const {
            service_type,
            booking_type,
            pickup_location,
            pickup_latitude,
            pickup_longitude,
            dropoff_location,
            dropoff_latitude,
            dropoff_longitude,
            booking_date,
            booking_time,
            duration_hours,
            passengers,
            special_instructions,
            fare,
            payment_method,
            vehicle_type,
            care_type,
            shuttle_type,
            medical_conditions
        } = req.body;

        // Validate required fields
        if (!service_type || !pickup_location || !booking_date || !booking_time || !fare) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking information'
            });
        }

        // Create new booking
        const newBooking = new Booking({
            user_id: userId,
            service_type,
            booking_type: booking_type || 'onCall',
            pickup_location,
            pickup_coordinates: {
                type: 'Point',
                coordinates: [parseFloat(pickup_longitude) || 0, parseFloat(pickup_latitude) || 0]
            },
            dropoff_location,
            dropoff_coordinates: {
                type: 'Point',
                coordinates: [parseFloat(dropoff_longitude) || 0, parseFloat(dropoff_latitude) || 0]
            },
            booking_date,
            booking_time,
            duration_hours: duration_hours || 1,
            passengers: passengers || 1,
            special_instructions,
            fare,
            payment_method: payment_method || 'cash',
            payment_status: 'pending',
            vehicle_type,
            care_type,
            shuttle_type,
            medical_conditions,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
        });

        // Save booking to database
        const savedBooking = await newBooking.save();

        // Find nearby service providers
        await findNearbyProviders(service_type, pickup_latitude, pickup_longitude, savedBooking._id);

        return res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: savedBooking
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the booking'
        });
    }
};

/**
 * Get all bookings for the current user
 */
exports.getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 10, page = 1 } = req.query;
        
        // Build query
        const query = { user_id: userId };
        
        // Filter by status if provided
        if (status && ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'].includes(status)) {
            query.status = status;
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get bookings
        const bookings = await Booking.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('service_provider_id', 'name email phone role');
        
        // Get total count
        const total = await Booking.countDocuments(query);
        
        return res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            bookings
        });
    } catch (error) {
        console.error('Error getting user bookings:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving bookings'
        });
    }
};

/**
 * Get bookings for a service provider
 */
exports.getProviderBookings = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { status, limit = 10, page = 1 } = req.query;
        
        // Build query
        const query = { service_provider_id: providerId };
        
        // Filter by status if provided
        if (status && ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'].includes(status)) {
            query.status = status;
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get bookings
        const bookings = await Booking.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user_id', 'name email phone');
        
        // Get total count
        const total = await Booking.countDocuments(query);
        
        return res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            bookings
        });
    } catch (error) {
        console.error('Error getting provider bookings:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving bookings'
        });
    }
};

/**
 * Get booking details by ID
 */
exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        // Get booking
        const booking = await Booking.findById(id)
            .populate('user_id', 'name email phone')
            .populate('service_provider_id', 'name email phone role');
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check if user is authorized to view this booking
        if (booking.user_id._id.toString() !== userId && 
            (!booking.service_provider_id || booking.service_provider_id._id.toString() !== userId) && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this booking'
            });
        }
        
        return res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error('Error getting booking details:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving booking details'
        });
    }
};

/**
 * Update booking status
 */
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancellation_reason } = req.body;
        const userId = req.user.id;
        
        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        // Validate status
        if (!status || !['accepted', 'ongoing', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        
        // Get booking
        const booking = await Booking.findById(id);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check if user is authorized to update this booking
        const isCustomer = booking.user_id.toString() === userId;
        const isProvider = booking.service_provider_id && booking.service_provider_id.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        
        if (!isCustomer && !isProvider && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this booking'
            });
        }
        
        // Check if status transition is valid
        const currentStatus = booking.status;
        
        // Define valid status transitions
        const validTransitions = {
            'pending': ['accepted', 'cancelled'],
            'accepted': ['ongoing', 'cancelled'],
            'ongoing': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        };
        
        if (!validTransitions[currentStatus].includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${status}`
            });
        }
        
        // Update booking status
        booking.status = status;
        booking.updated_at = new Date();
        
        // If cancelling, add cancellation details
        if (status === 'cancelled') {
            if (!cancellation_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required'
                });
            }
            
            booking.cancellation_reason = cancellation_reason;
            booking.cancelled_by = isCustomer ? 'user' : (isProvider ? 'service_provider' : 'admin');
            booking.cancelled_at = new Date();
        }
        
        // If accepting, set service provider
        if (status === 'accepted' && isProvider) {
            booking.service_provider_id = userId;
        }
        
        // If starting, set start time
        if (status === 'ongoing') {
            booking.start_time = new Date();
        }
        
        // If completing, set end time and calculate duration
        if (status === 'completed') {
            booking.end_time = new Date();
            
            if (booking.start_time) {
                const durationMs = booking.end_time - booking.start_time;
                booking.duration_hours = durationMs / (1000 * 60 * 60); // Convert ms to hours
            }
        }
        
        // Save updated booking
        await booking.save();
        
        // TODO: Send notifications to relevant parties
        
        return res.status(200).json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating booking status'
        });
    }
};

/**
 * Calculate fare for a booking
 */
exports.calculateFare = async (req, res) => {
    try {
        const {
            service_type,
            booking_type,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            duration_hours,
            distance,
            vehicle_type,
            care_type,
            shuttle_type
        } = req.body;
        
        // Validate required fields
        if (!service_type) {
            return res.status(400).json({
                success: false,
                message: 'Service type is required'
            });
        }
        
        let calculatedDistance = distance;
        
        // Calculate distance if not provided
        if (!calculatedDistance && pickup_latitude && pickup_longitude && dropoff_latitude && dropoff_longitude) {
            calculatedDistance = calculateDistance(
                parseFloat(pickup_latitude),
                parseFloat(pickup_longitude),
                parseFloat(dropoff_latitude),
                parseFloat(dropoff_longitude)
            );
        }
        
        // Default distance if not calculable
        if (!calculatedDistance) {
            calculatedDistance = 5; // Default 5 km
        }
        
        // Calculate base fare based on service type
        let baseFare = 0;
        let ratePerKm = 0;
        let ratePerHour = 0;
        
        if (service_type === 'driver') {
            // Driver service pricing
            baseFare = 100; // Base fare in INR
            ratePerKm = 15;  // Rate per km in INR
            
            // Adjust based on vehicle type
            if (vehicle_type === 'luxury') {
                baseFare = 200;
                ratePerKm = 25;
            } else if (vehicle_type === 'suv') {
                baseFare = 150;
                ratePerKm = 20;
            }
        } else if (service_type === 'caretaker') {
            // Caretaker service pricing
            baseFare = 200; // Base fare in INR
            ratePerHour = 150; // Rate per hour in INR
            
            // Adjust based on care type
            if (care_type === 'medical') {
                baseFare = 300;
                ratePerHour = 250;
            } else if (care_type === 'specialized') {
                baseFare = 350;
                ratePerHour = 300;
            }
        } else if (service_type === 'shuttle') {
            // Shuttle service pricing
            baseFare = 150; // Base fare in INR
            ratePerKm = 12;  // Rate per km in INR
            
            // Adjust based on shuttle type
            if (shuttle_type === 'luxury') {
                baseFare = 250;
                ratePerKm = 20;
            } else if (shuttle_type === 'large') {
                baseFare = 200;
                ratePerKm = 15;
            }
        }
        
        // Calculate fare based on service type
        let totalFare = baseFare;
        
        if (service_type === 'driver' || service_type === 'shuttle') {
            totalFare += calculatedDistance * ratePerKm;
        } else if (service_type === 'caretaker') {
            const hours = duration_hours || 1;
            totalFare += hours * ratePerHour;
        }
        
        // Apply booking type adjustments
        if (booking_type === 'monthly') {
            // 10% discount for monthly bookings
            totalFare = totalFare * 0.9;
        } else if (booking_type === 'permanent') {
            // 15% discount for permanent bookings
            totalFare = totalFare * 0.85;
        }
        
        // Round to nearest rupee
        const roundedFare = Math.round(totalFare);
        
        return res.status(200).json({
            success: true,
            fare: {
                base_fare: baseFare,
                distance_km: calculatedDistance.toFixed(2),
                duration_hours: duration_hours || 1,
                total_fare: roundedFare
            }
        });
    } catch (error) {
        console.error('Error calculating fare:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while calculating fare'
        });
    }
};

/**
 * Find nearby service providers
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
            providerRole = 'shuttle_driver';
        } else {
            console.log(`Invalid service type: ${serviceType}`);
            return;
        }
        
        // Find providers within 3km radius who are verified
        const providers = await User.find({
            role: providerRole,
            verification_status: 'verified',
            'current_location.coordinates': {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: 3000 // 3km in meters
                }
            }
        }).limit(10);
        
        console.log(`Found ${providers.length} nearby ${providerRole}s`);
        
        // TODO: Send notifications to each provider
        
        return providers;
    } catch (error) {
        console.error('Error finding nearby providers:', error);
        return [];
    }
}

/**
 * Calculate distance between two coordinates using Haversine formula
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
 */
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

/**
 * Generate a unique booking reference
 */
function generateBookingReference() {
    // Format: RYD-XXXXX-XX (where X is alphanumeric)
    const uuid = uuidv4().replace(/-/g, '').toUpperCase();
    return `RYD-${uuid.substring(0, 5)}-${uuid.substring(5, 7)}`;
}
