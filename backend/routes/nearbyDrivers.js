/**
 * Nearby Drivers Routes
 * Routes for finding nearby drivers and managing booking timeouts
 */

const express = require('express');
const router = express.Router();
const nearbyDriversController = require('../controllers/nearbyDriversController');

// Authentication middleware function
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Authentication required' });
  }
};

// Find nearby drivers within a specified radius
router.post('/find', isAuthenticated, nearbyDriversController.findNearbyDrivers);

// Create a booking with expiration time
router.post('/book', isAuthenticated, nearbyDriversController.createBookingWithTimeout);

// Check booking status and handle expiration
router.get('/check-status/:booking_id', isAuthenticated, nearbyDriversController.checkBookingStatus);

// Retry expired booking
router.post('/retry/:booking_id', isAuthenticated, nearbyDriversController.retryExpiredBooking);

// Get booking details
router.get('/booking/:booking_id', isAuthenticated, nearbyDriversController.getBookingDetails);

// Cancel booking
router.post('/cancel/:booking_id', isAuthenticated, nearbyDriversController.cancelBooking);

module.exports = router;
