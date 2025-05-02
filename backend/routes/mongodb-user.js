/**
 * MongoDB User Routes
 * Handles user profile management and settings
 */
const express = require('express');
const router = express.Router();
const { User, Profile } = require('../models/mongodb');

// Get user profile
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
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

// Update user profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone } = req.body;
    
    // Update user basic info
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user profile'
    });
  }
});

// Update user password
router.put('/password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
});

// Update profile details
router.put('/profile-details/:userId', async (req, res) => {
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
      message: 'Profile details updated successfully',
      profile
    });
  } catch (error) {
    console.error('Error updating profile details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile details'
    });
  }
});

module.exports = router;
