/**
 * MongoDB Nearby Drivers Controller
 * Handles finding drivers within a specific radius and managing booking timeouts
 */

const mongoose = require('mongoose');
const NearbyDriver = require('../models/mongodb/NearbyDriver');
const User = require('../models/mongodb/User');
const Booking = require('../models/mongodb/Booking');
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
        
        // Find drivers within the specified radius using MongoDB's geospatial queries
        const drivers = await User.aggregate([
            {
                $match: {
                    role: 'driver',
                    is_active: true,
                    is_verified: true,
                    is_available: true
                }
            },
            {
                $lookup: {
                    from: 'nearbydriver', // Collection name (automatically lowercased and pluralized by Mongoose)
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'location'
                }
            },
            {
                $unwind: '$location'
            },
            {
                $lookup: {
                    from: 'vehicles',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'vehicle'
                }
            },
            {
                $unwind: {
                    path: '$vehicle',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    'location.service_area.coordinates': {
                        $nearSphere: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [parseFloat(longitude), parseFloat(latitude)]
                            },
                            $maxDistance: radius * 1000 // Convert km to meters
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    first_name: 1,
                    last_name: 1,
                    profile_image: 1,
                    average_rating: { $ifNull: ['$average_rating', 0] },
                    total_rides: { $ifNull: ['$total_rides', 0] },
                    location: 1,
                    vehicle: {
                        type: '$vehicle.vehicle_type',
                        make: '$vehicle.vehicle_make',
                        model: '$vehicle.vehicle_model'
                    },
                    distance: {
                        $divide: [
                            {
                                $distance: {
                                    $geometry: {
                                        type: 'Point',
                                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                                    },
                                    $geometryField: '$location.service_area'
                                }
                            },
                            1000 // Convert meters to kilometers
                        ]
                    }
                }
            },
            {
                $sort: { distance: 1 }
            },
            {
                $limit: 10
            }
        ]);
        
        return res.status(200).json({
            success: true,
            drivers: drivers.map(driver => ({
                id: driver._id,
                name: `${driver.first_name} ${driver.last_name}`,
                profile_image: driver.profile_image,
                distance: parseFloat(driver.distance).toFixed(2),
                rating: driver.average_rating || 0,
                total_rides: driver.total_rides || 0,
                vehicle: driver.vehicle
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
        
        // Create a new booking with MongoDB
        const newBooking = new Booking({
            reference_id: uuidv4().substring(0, 8).toUpperCase(),
            customer_id: mongoose.Types.ObjectId(customer_id),
            provider_id: mongoose.Types.ObjectId(provider_id),
            service_type,
            pickup_location,
            dropoff_location,
            pickup_coordinates: {
                type: 'Point',
                coordinates: [parseFloat(pickup_longitude), parseFloat(pickup_latitude)]
            },
            dropoff_coordinates: {
                type: 'Point',
                coordinates: [parseFloat(dropoff_longitude), parseFloat(dropoff_latitude)]
            },
            booking_date,
            booking_time,
            payment_method,
            fare_amount,
            notes,
            status: 'pending',
            expiration_time: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
        });
        
        await newBooking.save();
        
        // Set up expiration timeout
        setTimeout(async () => {
            try {
                const booking = await Booking.findById(newBooking._id);
                
                if (booking && booking.status === 'pending') {
                    booking.status = 'expired';
                    await booking.save();
                    
                    console.log(`Booking ${booking.reference_id} has expired`);
                }
            } catch (error) {
                console.error('Error in booking expiration timeout:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        return res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: {
                id: newBooking._id,
                reference_id: newBooking.reference_id,
                status: newBooking.status,
                expiration_time: newBooking.expiration_time,
                service_type: newBooking.service_type
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
        
        // Find booking by ID
        const booking = await Booking.findById(booking_id);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check if booking is expired
        const now = new Date();
        const expirationTime = new Date(booking.expiration_time);
        
        if (booking.status === 'pending' && now > expirationTime) {
            booking.status = 'expired';
            await booking.save();
        }
        
        return res.status(200).json({
            success: true,
            booking: {
                id: booking._id,
                reference_id: booking.reference_id,
                status: booking.status,
                expiration_time: booking.expiration_time,
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
        
        // Find booking by ID
        const booking = await Booking.findById(booking_id);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check if booking is expired
        if (booking.status !== 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Only expired bookings can be retried'
            });
        }
        
        // Update booking status and expiration time
        booking.status = 'pending';
        booking.expiration_time = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        await booking.save();
        
        // Set up expiration timeout
        setTimeout(async () => {
            try {
                const updatedBooking = await Booking.findById(booking_id);
                
                if (updatedBooking && updatedBooking.status === 'pending') {
                    updatedBooking.status = 'expired';
                    await updatedBooking.save();
                    
                    console.log(`Booking ${updatedBooking.reference_id} has expired again`);
                }
            } catch (error) {
                console.error('Error in booking expiration timeout:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        return res.status(200).json({
            success: true,
            message: 'Booking retried successfully',
            booking: {
                id: booking._id,
                reference_id: booking.reference_id,
                status: booking.status,
                expiration_time: booking.expiration_time,
                service_type: booking.service_type
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
        
        // Get booking details with provider information using MongoDB aggregation
        const bookings = await Booking.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(booking_id)
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'provider_id',
                    foreignField: '_id',
                    as: 'provider'
                }
            },
            {
                $unwind: '$provider'
            },
            {
                $lookup: {
                    from: 'vehicles',
                    localField: 'provider_id',
                    foreignField: 'user_id',
                    as: 'vehicle'
                }
            },
            {
                $unwind: {
                    path: '$vehicle',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);
        
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
            await Booking.findByIdAndUpdate(booking_id, { status: 'expired' });
            booking.status = 'expired';
        }
        
        return res.status(200).json({
            success: true,
            booking: {
                id: booking._id,
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
                    id: booking.provider._id,
                    name: `${booking.provider.first_name} ${booking.provider.last_name}`,
                    profile_image: booking.provider.profile_image,
                    phone: booking.provider.phone,
                    rating: booking.provider.average_rating || 0,
                    vehicle: booking.vehicle ? {
                        type: booking.vehicle.vehicle_type,
                        make: booking.vehicle.vehicle_make,
                        model: booking.vehicle.vehicle_model,
                        license_plate: booking.vehicle.license_plate
                    } : null
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
