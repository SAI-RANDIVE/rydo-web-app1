const express = require('express');
const router = express.Router();
const serviceProviderVerificationController = require('../controllers/serviceProviderVerificationController');
const { authenticateToken, isAdmin, isVerifier } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply admin/verifier middleware to all routes
router.use(isVerifier);

// Get all pending verification requests
router.get('/pending', serviceProviderVerificationController.getPendingVerifications);

// Get verification details for a specific user
router.get('/details/:id', serviceProviderVerificationController.getVerificationDetails);

// Approve a service provider
router.put('/approve/:id', serviceProviderVerificationController.approveServiceProvider);

// Reject a service provider
router.put('/reject/:id', serviceProviderVerificationController.rejectServiceProvider);

// Get all verified service providers
router.get('/verified', serviceProviderVerificationController.getVerifiedProviders);

// Get all rejected service providers
router.get('/rejected', serviceProviderVerificationController.getRejectedProviders);

module.exports = router;
