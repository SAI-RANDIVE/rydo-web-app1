const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingControllerMongo');
const { authenticateToken, isCustomer, isServiceProvider, isVerified } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Customer booking routes
router.post('/create', isCustomer, bookingController.createBooking);
router.get('/user', bookingController.getUserBookings);
router.get('/provider', isServiceProvider, bookingController.getProviderBookings);
router.get('/:id', bookingController.getBookingById);
router.put('/:id/status', bookingController.updateBookingStatus);
router.post('/calculate-fare', bookingController.calculateFare);

module.exports = router;
