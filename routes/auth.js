const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const authController = require('../controllers/mongodb-authController');

// Middleware for file uploads
router.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Authentication routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/driver-signup', authController.driverSignup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/logout', authController.logout);

module.exports = router;
