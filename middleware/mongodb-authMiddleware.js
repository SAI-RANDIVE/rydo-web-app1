/**
 * Authentication Middleware for MongoDB
 * 
 * Middleware functions for authentication and authorization in the RYDO Web App.
 */

const { User } = require('../models/mongodb');

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has customer role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isCustomer = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.user.role !== 'customer') {
    return res.status(403).json({ message: 'Access denied. Only customers can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has driver role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isDriver = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.user.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Only drivers can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has caretaker role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isCaretaker = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.user.role !== 'caretaker') {
    return res.status(403).json({ message: 'Access denied. Only caretakers can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has shuttle role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isShuttle = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.user.role !== 'shuttle') {
    return res.status(403).json({ message: 'Access denied. Only shuttle providers can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Only administrators can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};

/**
 * Check if user has any service provider role (driver, caretaker, or shuttle)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isServiceProvider = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  const providerRoles = ['driver', 'caretaker', 'shuttle'];
  if (!providerRoles.includes(req.session.user.role)) {
    return res.status(403).json({ message: 'Access denied. Only service providers can access this resource.' });
  }
  
  // Store userId in req for convenience
  req.session.userId = req.session.user.id;
  req.session.userRole = req.session.user.role;
  
  next();
};
