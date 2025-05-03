/**
 * Service Provider Verification Controller
 * Handles verification of service providers (drivers, caretakers, shuttle drivers) by admin/verifiers
 */
const User = require('../models/UserMongo');
const mongoose = require('mongoose');

/**
 * Get all pending verification requests
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    // Find all users with pending verification status
    const pendingUsers = await User.find({ 
      verification_status: 'pending',
      role: { $in: ['driver', 'caretaker', 'shuttle_driver'] }
    }).select('-password');
    
    return res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers
    });
  } catch (error) {
    console.error('Error getting pending verifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get verification details for a specific user
 */
exports.getVerificationDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Find user
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is a service provider
    if (!['driver', 'caretaker', 'shuttle_driver'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a service provider'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting verification details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Approve a service provider
 */
exports.approveServiceProvider = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is a service provider
    if (!['driver', 'caretaker', 'shuttle_driver'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a service provider'
      });
    }
    
    // Check if user is already verified
    if (user.verification_status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }
    
    // Update user verification status
    user.verification_status = 'verified';
    user.updated_at = Date.now();
    
    await user.save();
    
    // TODO: Send notification to user about verification approval
    
    return res.status(200).json({
      success: true,
      message: 'Service provider approved successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verification_status: user.verification_status
      }
    });
  } catch (error) {
    console.error('Error approving service provider:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Reject a service provider
 */
exports.rejectServiceProvider = async (req, res) => {
  try {
    const userId = req.params.id;
    const { rejection_reason } = req.body;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Validate rejection reason
    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is a service provider
    if (!['driver', 'caretaker', 'shuttle_driver'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a service provider'
      });
    }
    
    // Update user verification status
    user.verification_status = 'rejected';
    user.rejection_reason = rejection_reason;
    user.updated_at = Date.now();
    
    await user.save();
    
    // TODO: Send notification to user about verification rejection
    
    return res.status(200).json({
      success: true,
      message: 'Service provider rejected successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verification_status: user.verification_status,
        rejection_reason: user.rejection_reason
      }
    });
  } catch (error) {
    console.error('Error rejecting service provider:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all verified service providers
 */
exports.getVerifiedProviders = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { role, limit = 10, page = 1 } = req.query;
    
    // Build query
    const query = { 
      verification_status: 'verified',
      role: { $in: ['driver', 'caretaker', 'shuttle_driver'] }
    };
    
    // Filter by role if provided
    if (role && ['driver', 'caretaker', 'shuttle_driver'].includes(role)) {
      query.role = role;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find verified service providers
    const providers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ updated_at: -1 });
    
    // Get total count
    const total = await User.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: providers.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: providers
    });
  } catch (error) {
    console.error('Error getting verified providers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all rejected service providers
 */
exports.getRejectedProviders = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { role, limit = 10, page = 1 } = req.query;
    
    // Build query
    const query = { 
      verification_status: 'rejected',
      role: { $in: ['driver', 'caretaker', 'shuttle_driver'] }
    };
    
    // Filter by role if provided
    if (role && ['driver', 'caretaker', 'shuttle_driver'].includes(role)) {
      query.role = role;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find rejected service providers
    const providers = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ updated_at: -1 });
    
    // Get total count
    const total = await User.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: providers.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: providers
    });
  } catch (error) {
    console.error('Error getting rejected providers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
