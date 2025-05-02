/**
 * Nearby Drivers Routes
 * Routes for finding nearby drivers and managing booking timeouts
 */

const express = require('express');
const router = express.Router();
const nearbyDriversController = require('../controllers/nearbyDriversController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Find nearby drivers within a specified radius
router.post('/find', nearbyDriversController.findNearbyDrivers);

// Create a booking with expiration time
router.post('/book', nearbyDriversController.createBookingWithTimeout);

// Check booking status and handle expiration
router.get('/check-status/:booking_id', nearbyDriversController.checkBookingStatus);

// Retry expired booking
router.post('/retry/:booking_id', nearbyDriversController.retryExpiredBooking);

// Get booking details
router.get('/booking/:booking_id', nearbyDriversController.getBookingDetails);

module.exports = router;
