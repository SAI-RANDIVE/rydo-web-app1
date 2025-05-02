/**
 * MongoDB Shuttle Routes
 * Handles shuttle service-specific functionality
 */
const express = require('express');
const router = express.Router();
const { User, Shuttle, Profile } = require('../models/mongodb');

// Register as a shuttle service
router.post('/register', async (req, res) => {
  try {
    const { 
      userId, 
      vehicleDetails, 
      passengerCapacity, 
      amenities, 
      insuranceDetails, 
      drivingLicense, 
      permitDetails,
      serviceAreas,
      farePerKm,
      baseFare
    } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if profile exists, create if not
    let profile = await Profile.findOne({ userId });
    if (!profile) {
      profile = new Profile({
        userId,
        address: req.body.address || {},
        gender: req.body.gender || '',
        dateOfBirth: req.body.dateOfBirth || null,
        profilePicture: req.body.profilePicture || ''
      });
      await profile.save();
    }
    
    // Check if already registered as shuttle
    let shuttle = await Shuttle.findOne({ userId });
    
    if (shuttle) {
      return res.status(400).json({
        success: false,
        message: 'User is already registered as a shuttle service'
      });
    }
    
    // Create new shuttle service
    shuttle = new Shuttle({
      userId,
      profileId: profile._id,
      vehicleDetails,
      passengerCapacity,
      amenities,
      insuranceDetails,
      drivingLicense,
      permitDetails,
      serviceAreas,
      farePerKm: farePerKm || 10, // Default fare per km
      baseFare: baseFare || 50, // Default base fare
      upiId: req.body.upiId || ''
    });
    
    await shuttle.save();
    
    // Update user type if needed
    if (user.userType !== 'shuttle') {
      user.userType = 'shuttle';
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Registered as shuttle service successfully',
      shuttle
    });
  } catch (error) {
    console.error('Shuttle registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during shuttle registration'
    });
  }
});

// Get shuttle profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const shuttle = await Shuttle.findOne({ userId })
      .populate('userId', '-password')
      .populate('profileId');
    
    if (!shuttle) {
      return res.status(404).json({
        success: false,
        message: 'Shuttle profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      shuttle
    });
  } catch (error) {
    console.error('Error fetching shuttle profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching shuttle profile'
    });
  }
});

// Update shuttle profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const shuttle = await Shuttle.findOne({ userId });
    
    if (!shuttle) {
      return res.status(404).json({
        success: false,
        message: 'Shuttle profile not found'
      });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'userId' && key !== 'profileId') {
        shuttle[key] = updates[key];
      }
    });
    
    await shuttle.save();
    
    res.status(200).json({
      success: true,
      message: 'Shuttle profile updated successfully',
      shuttle
    });
  } catch (error) {
    console.error('Error updating shuttle profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating shuttle profile'
    });
  }
});

// Update shuttle availability
router.put('/availability/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAvailable } = req.body;
    
    const shuttle = await Shuttle.findOne({ userId });
    
    if (!shuttle) {
      return res.status(404).json({
        success: false,
        message: 'Shuttle profile not found'
      });
    }
    
    shuttle.isAvailable = isAvailable;
    await shuttle.save();
    
    res.status(200).json({
      success: true,
      message: `Shuttle is now ${isAvailable ? 'available' : 'unavailable'} for bookings`,
      isAvailable
    });
  } catch (error) {
    console.error('Error updating shuttle availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating shuttle availability'
    });
  }
});

// Update shuttle location
router.put('/location/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;
    
    const shuttle = await Shuttle.findOne({ userId });
    
    if (!shuttle) {
      return res.status(404).json({
        success: false,
        message: 'Shuttle profile not found'
      });
    }
    
    shuttle.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    
    await shuttle.save();
    
    res.status(200).json({
      success: true,
      message: 'Shuttle location updated successfully',
      location: shuttle.currentLocation
    });
  } catch (error) {
    console.error('Error updating shuttle location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating shuttle location'
    });
  }
});

// Find nearby shuttles
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 3000 } = req.query; // Default 3km radius
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const nearbyShuttles = await Shuttle.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isAvailable: true,
      isOnTrip: false
    }).populate('userId', 'name phone email')
      .populate('profileId');
    
    res.status(200).json({
      success: true,
      count: nearbyShuttles.length,
      shuttles: nearbyShuttles
    });
  } catch (error) {
    console.error('Error finding nearby shuttles:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearby shuttles'
    });
  }
});

module.exports = router;
