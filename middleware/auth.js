const jwt = require('jsonwebtoken');
const User = require('../models/UserMongo');

// Middleware to authenticate token
exports.authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }
    
    // Add user to request object
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is verifier
exports.isVerifier = (req, res, next) => {
  if (req.user.role !== 'verifier' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Verifier privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is a service provider (driver, caretaker, or shuttle_driver)
exports.isServiceProvider = (req, res, next) => {
  const serviceProviderRoles = ['driver', 'caretaker', 'shuttle_driver'];
  if (!serviceProviderRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Service provider privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is a customer
exports.isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Customer privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is verified
exports.isVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }
    
    if (user.verification_status !== 'verified') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account not verified. Please complete verification process.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
};

// Middleware to check if user owns the resource
exports.isResourceOwner = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found.' 
        });
      }
      
      // Check if the user ID matches the resource owner ID
      // This assumes the resource has a user_id or userId field
      const resourceUserId = resource.user_id || resource.userId;
      
      if (resourceUserId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You do not own this resource.' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error.' 
      });
    }
  };
};
