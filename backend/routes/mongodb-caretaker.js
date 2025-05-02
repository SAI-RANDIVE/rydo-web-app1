/**
 * MongoDB Caretaker Routes
 * Handles caretaker-specific functionality
 */
const express = require('express');
const router = express.Router();
const { User, Caretaker, Profile } = require('../models/mongodb');

// Register as a caretaker
router.post('/register', async (req, res) => {
  try {
    const { userId, specialization, certifications, medicalLicense, skills, servicesOffered, experience } = req.body;
    
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
    
    // Check if already registered as caretaker
    let caretaker = await Caretaker.findOne({ userId });
    
    if (caretaker) {
      return res.status(400).json({
        success: false,
        message: 'User is already registered as a caretaker'
      });
    }
    
    // Create new caretaker
    caretaker = new Caretaker({
      userId,
      profileId: profile._id,
      specialization,
      certifications,
      medicalLicense,
      skills,
      servicesOffered,
      experience,
      languages: req.body.languages || [],
      upiId: req.body.upiId || ''
    });
    
    await caretaker.save();
    
    // Update user type if needed
    if (user.userType !== 'caretaker') {
      user.userType = 'caretaker';
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Registered as caretaker successfully',
      caretaker
    });
  } catch (error) {
    console.error('Caretaker registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during caretaker registration'
    });
  }
});

// Get caretaker profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const caretaker = await Caretaker.findOne({ userId })
      .populate('userId', '-password')
      .populate('profileId');
    
    if (!caretaker) {
      return res.status(404).json({
        success: false,
        message: 'Caretaker profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      caretaker
    });
  } catch (error) {
    console.error('Error fetching caretaker profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching caretaker profile'
    });
  }
});

// Update caretaker profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const caretaker = await Caretaker.findOne({ userId });
    
    if (!caretaker) {
      return res.status(404).json({
        success: false,
        message: 'Caretaker profile not found'
      });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'userId' && key !== 'profileId') {
        caretaker[key] = updates[key];
      }
    });
    
    await caretaker.save();
    
    res.status(200).json({
      success: true,
      message: 'Caretaker profile updated successfully',
      caretaker
    });
  } catch (error) {
    console.error('Error updating caretaker profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating caretaker profile'
    });
  }
});

// Update caretaker availability
router.put('/availability/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAvailable } = req.body;
    
    const caretaker = await Caretaker.findOne({ userId });
    
    if (!caretaker) {
      return res.status(404).json({
        success: false,
        message: 'Caretaker profile not found'
      });
    }
    
    caretaker.isAvailable = isAvailable;
    await caretaker.save();
    
    res.status(200).json({
      success: true,
      message: `Caretaker is now ${isAvailable ? 'available' : 'unavailable'} for bookings`,
      isAvailable
    });
  } catch (error) {
    console.error('Error updating caretaker availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating caretaker availability'
    });
  }
});

// Update caretaker location
router.put('/location/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;
    
    const caretaker = await Caretaker.findOne({ userId });
    
    if (!caretaker) {
      return res.status(404).json({
        success: false,
        message: 'Caretaker profile not found'
      });
    }
    
    caretaker.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    
    await caretaker.save();
    
    res.status(200).json({
      success: true,
      message: 'Caretaker location updated successfully',
      location: caretaker.currentLocation
    });
  } catch (error) {
    console.error('Error updating caretaker location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating caretaker location'
    });
  }
});

// Find nearby caretakers
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 3000 } = req.query; // Default 3km radius
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const nearbyCaretakers = await Caretaker.find({
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
      isOnDuty: false
    }).populate('userId', 'name phone email')
      .populate('profileId');
    
    res.status(200).json({
      success: true,
      count: nearbyCaretakers.length,
      caretakers: nearbyCaretakers
    });
  } catch (error) {
    console.error('Error finding nearby caretakers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearby caretakers'
    });
  }
});

module.exports = router;
