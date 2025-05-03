/**
 * API Routes for RYDO Web App
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, isVerifier, isServiceProvider, isCustomer } = require('../middleware/auth');
const bookingController = require('../controllers/bookingControllerMongo');
const profileController = require('../controllers/profileController');
const serviceProviderVerificationController = require('../controllers/serviceProviderVerificationController');

// Public routes
router.get('/status', (req, res) => {
  res.json({ status: 'online', version: '1.0.0' });
});

// Protected routes - require authentication
router.use('/protected', authenticateToken);

// User profile routes
router.get('/protected/profile', authenticateToken, profileController.getUserProfile);
router.put('/protected/profile', authenticateToken, profileController.updateProfile);
router.put('/protected/profile/service-details', authenticateToken, profileController.updateServiceProviderDetails);
router.put('/protected/profile/password', authenticateToken, profileController.changePassword);
router.put('/protected/profile/location', authenticateToken, profileController.updateLocation);

// Booking routes
router.post('/protected/booking/create', authenticateToken, isCustomer, bookingController.createBooking);
router.get('/protected/booking/user', authenticateToken, bookingController.getUserBookings);
router.get('/protected/booking/provider', authenticateToken, isServiceProvider, bookingController.getProviderBookings);
router.get('/protected/booking/:id', authenticateToken, bookingController.getBookingById);
router.put('/protected/booking/:id/status', authenticateToken, bookingController.updateBookingStatus);
router.post('/protected/booking/calculate-fare', bookingController.calculateFare);

// Service provider verification routes
router.get('/protected/verification/pending', authenticateToken, isVerifier, serviceProviderVerificationController.getPendingVerifications);
router.get('/protected/verification/details/:id', authenticateToken, isVerifier, serviceProviderVerificationController.getVerificationDetails);
router.put('/protected/verification/approve/:id', authenticateToken, isVerifier, serviceProviderVerificationController.approveServiceProvider);
router.put('/protected/verification/reject/:id', authenticateToken, isVerifier, serviceProviderVerificationController.rejectServiceProvider);
router.get('/protected/verification/verified', authenticateToken, isVerifier, serviceProviderVerificationController.getVerifiedProviders);
router.get('/protected/verification/rejected', authenticateToken, isVerifier, serviceProviderVerificationController.getRejectedProviders);

// Admin routes
router.get('/protected/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const User = require('../models/UserMongo');
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
