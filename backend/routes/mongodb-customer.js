/**
 * MongoDB Customer Routes
 * Handles customer-specific functionality
 */
const express = require('express');
const router = express.Router();
const { User, Profile, Booking } = require('../models/mongodb');

// Get customer profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get profile information
    const profile = await Profile.findOne({ userId: user._id });
    
    res.status(200).json({
      success: true,
      user,
      profile
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer profile'
    });
  }
});

// Update customer profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    // Find or create profile
    let profile = await Profile.findOne({ userId });
    
    if (!profile) {
      profile = new Profile({
        userId,
        ...profileData
      });
    } else {
      // Update existing profile
      Object.keys(profileData).forEach(key => {
        profile[key] = profileData[key];
      });
    }
    
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer profile'
    });
  }
});

// Get customer booking history
router.get('/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    let query = { userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate('driverId', 'name phone')
      .populate('caretakerId', 'name phone')
      .populate('shuttleId', 'name phone');
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer bookings'
    });
  }
});

// Update customer location
router.put('/location/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude, address } = req.body;
    
    // Find or create profile
    let profile = await Profile.findOne({ userId });
    
    if (!profile) {
      profile = new Profile({
        userId,
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        address: address || {}
      });
    } else {
      // Update location
      profile.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
      
      if (address) {
        profile.address = address;
      }
    }
    
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Customer location updated successfully',
      location: profile.currentLocation,
      address: profile.address
    });
  } catch (error) {
    console.error('Error updating customer location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer location'
    });
  }
});

module.exports = router;
