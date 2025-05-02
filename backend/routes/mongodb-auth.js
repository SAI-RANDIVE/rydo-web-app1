/**
 * MongoDB Authentication Routes
 * Handles user authentication, registration, and verification
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models/mongodb');
const otpService = require('../../functions/mongodb-otp-service-api');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, userType } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email or phone' 
      });
    }
    
    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password, // Will be hashed in the model's pre-save hook
      userType
    });
    
    await newUser.save();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: newUser._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    
    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: email || '' },
        { phone: phone || '' }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Validate password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Set user session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      isVerified: user.isVerified
    };
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Logout user
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    
    res.clearCookie('connect.sid');
    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Send OTP for verification
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, email, method } = req.body;
    
    if (method === 'phone' && phone) {
      // Send OTP via phone
      const result = await otpService.sendPhoneOTP(phone);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'OTP sent to phone successfully',
          requestId: result.requestId
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message || 'Failed to send OTP'
        });
      }
    } else if (method === 'email' && email) {
      // Send OTP via email
      const result = await otpService.sendEmailOTP(email);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'OTP sent to email successfully',
          requestId: result.requestId
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message || 'Failed to send OTP'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification method or missing contact information'
      });
    }
  } catch (error) {
    console.error('OTP sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { requestId, otp, userId } = req.body;
    
    // Verify OTP
    const result = await otpService.verifyOTP(requestId, otp);
    
    if (result.success) {
      // If userId is provided, update user verification status
      if (userId) {
        await User.findByIdAndUpdate(userId, { isVerified: true });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
});

module.exports = router;
