/**
 * Booking Routes
 * 
 * Routes for handling booking-related operations in the RYDO Web App.
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/mongodb-bookingController');
const authMiddleware = require('../middleware/mongodb-authMiddleware');

// Apply authentication middleware to all booking routes
router.use(authMiddleware.isAuthenticated);

// Create a new booking
router.post('/', bookingController.createBooking);

// Get all bookings for the current user
router.get('/', bookingController.getUserBookings);

// Get booking details by ID
router.get('/:id', bookingController.getBookingById);

// Update booking status
router.put('/:id/status', bookingController.updateBookingStatus);

// Calculate fare for a booking
router.post('/calculate-fare', bookingController.calculateFare);

module.exports = router;
