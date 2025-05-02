const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const fileUpload = require('express-fileupload');

// Import MongoDB models
const { User: MongoUser } = require('../models/mongodb');

// Try to import MySQL database, but don't fail if not available
let db = null;
try {
    db = require('../config/database');
} catch (error) {
    console.log('MySQL database not available, using MongoDB only');
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Get user profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get user data
    const [users] = await db.query(
      'SELECT id, email, phone, role, first_name, last_name, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    let additionalData = {};
    
    // Get role-specific data
    if (user.role === 'driver') {
      const [driverData] = await db.query(
        'SELECT * FROM drivers WHERE user_id = ?',
        [userId]
      );
      if (driverData.length > 0) {
        additionalData = driverData[0];
      }
    } else if (user.role === 'caretaker') {
      const [caretakerData] = await db.query(
        'SELECT * FROM caretakers WHERE user_id = ?',
        [userId]
      );
      if (caretakerData.length > 0) {
        additionalData = caretakerData[0];
      }
    } else if (user.role === 'shuttle_driver') {
      const [shuttleData] = await db.query(
        'SELECT * FROM shuttle_services WHERE user_id = ?',
        [userId]
      );
      if (shuttleData.length > 0) {
        additionalData = shuttleData[0];
      }
    }
    
    // Get user ratings
    const [ratings] = await db.query(
      'SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_to = ?',
      [userId]
    );
    
    res.status(200).json({
      user: {
        ...user,
        ...additionalData,
        average_rating: ratings[0].average_rating || 0,
        total_ratings: ratings[0].total_ratings || 0
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { first_name, last_name, phone } = req.body;
    
    // Update user data
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
      [first_name, last_name, phone, userId]
    );
    
    // Update role-specific data
    const role = req.session.user.role;
    
    if (role === 'driver' && req.body.driver) {
      const { license_number, license_expiry, vehicle_model, vehicle_color, vehicle_year, vehicle_registration } = req.body.driver;
      
      await db.query(
        `UPDATE drivers SET 
         license_number = ?, 
         license_expiry = ?, 
         vehicle_model = ?, 
         vehicle_color = ?, 
         vehicle_year = ?, 
         vehicle_registration = ? 
         WHERE user_id = ?`,
        [license_number, license_expiry, vehicle_model, vehicle_color, vehicle_year, vehicle_registration, userId]
      );
    } else if (role === 'caretaker' && req.body.caretaker) {
      const { specialization, experience_years, certification } = req.body.caretaker;
      
      await db.query(
        `UPDATE caretakers SET 
         specialization = ?, 
         experience_years = ?, 
         certification = ? 
         WHERE user_id = ?`,
        [specialization, experience_years, certification, userId]
      );
    } else if (role === 'shuttle_driver' && req.body.shuttle) {
      const { vehicle_type, passenger_capacity, route_name } = req.body.shuttle;
      
      await db.query(
        `UPDATE shuttle_services SET 
         vehicle_type = ?, 
         passenger_capacity = ?, 
         route_name = ? 
         WHERE user_id = ?`,
        [vehicle_type, passenger_capacity, route_name, userId]
      );
    }
    
    res.status(200).json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update location (for service providers)
router.put('/location', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    const { latitude, longitude } = req.body;
    
    if (role === 'customer') {
      return res.status(403).json({ message: 'Only service providers can update location' });
    }
    
    let table;
    switch (role) {
      case 'driver':
        table = 'drivers';
        break;
      case 'caretaker':
        table = 'caretakers';
        break;
      case 'shuttle_driver':
        table = 'shuttle_services';
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    await db.query(
      `UPDATE ${table} SET current_latitude = ?, current_longitude = ? WHERE user_id = ?`,
      [latitude, longitude, userId]
    );
    
    res.status(200).json({ message: 'Location updated successfully' });
    
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle availability (for service providers)
router.put('/availability', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    const { isAvailable } = req.body;
    
    if (role === 'customer') {
      return res.status(403).json({ message: 'Only service providers can update availability' });
    }
    
    let table;
    switch (role) {
      case 'driver':
        table = 'drivers';
        break;
      case 'caretaker':
        table = 'caretakers';
        break;
      case 'shuttle_driver':
        table = 'shuttle_services';
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    await db.query(
      `UPDATE ${table} SET is_available = ? WHERE user_id = ?`,
      [isAvailable, userId]
    );
    
    res.status(200).json({ message: 'Availability updated successfully' });
    
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', isAuthenticated, userController.changePassword);

// Send email verification
router.post('/verify-email', isAuthenticated, userController.sendEmailVerification);

// Verify email OTP
router.post('/verify-email-otp', isAuthenticated, userController.verifyEmailOTP);

// Send phone verification
router.post('/verify-phone', isAuthenticated, userController.sendPhoneVerification);

// Verify phone OTP
router.post('/verify-phone-otp', isAuthenticated, userController.verifyPhoneOTP);

// Delete account
router.post('/delete-account', isAuthenticated, userController.deleteAccount);

module.exports = router;
