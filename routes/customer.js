/**
 * Customer Routes Module
 * 
 * This module defines all routes related to customer functionality in the RYDO application.
 * It includes routes for dashboard data, profile management, bookings, ratings, and wallet operations.
 * 
 * @module routes/customer
 * @requires express
 * @requires ../controllers/customerController
 */

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

/**
 * Middleware to verify user is authenticated and has customer role
 * 
 * @middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const isCustomer = async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.session.user.role !== 'customer') {
    return res.status(403).json({ message: 'Access denied. Only customers can access this resource.' });
  }
  
  next();
};

// Dashboard and Profile Routes

/**
 * Route to get customer dashboard statistics
 * @name GET /customer/dashboard-stats
 */
router.get('/dashboard-stats', isCustomer, customerController.getDashboardStats);

/**
 * Route to get customer profile information
 * @name GET /customer/profile
 */
router.get('/profile', isCustomer, customerController.getProfile);

/**
 * Route to update customer profile information
 * @name PUT /customer/profile
 */
router.put('/profile', isCustomer, customerController.updateProfile);

// Booking Routes

/**
 * Route to create a new booking
 * @name POST /customer/bookings
 */
router.post('/bookings', isCustomer, customerController.createBooking);

/**
 * Route to get all customer bookings
 * @name GET /customer/bookings
 */
router.get('/bookings', isCustomer, customerController.getBookings);

/**
 * Route to get details of a specific booking
 * @name GET /customer/bookings/:id
 */
router.get('/bookings/:id', isCustomer, customerController.getBookingDetails);

/**
 * Route to cancel a booking
 * @name POST /customer/bookings/:id/cancel
 */
router.post('/bookings/:id/cancel', isCustomer, customerController.cancelBooking);

/**
 * Route to submit a rating for a completed booking
 * @name POST /customer/bookings/:id/rate
 */
router.post('/bookings/:id/rate', isCustomer, customerController.submitRating);

// Verification Routes

/**
 * Route to send email verification link
 * @name POST /customer/verify-email
 */
router.post('/verify-email', isCustomer, customerController.verifyEmail);

// Wallet Routes

/**
 * Route to get wallet balance and transaction history
 * @name GET /customer/wallet
 */
router.get('/wallet', isCustomer, customerController.getWalletTransactions);

module.exports = router;
