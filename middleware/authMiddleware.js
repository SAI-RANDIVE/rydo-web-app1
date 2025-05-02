/**
 * Authentication Middleware
 * 
 * Middleware functions for authentication and authorization in the RYDO Web App.
 */

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  next();
};

/**
 * Check if user has customer role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isCustomer = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.userRole !== 'customer') {
    return res.status(403).json({ message: 'Access denied. Only customers can access this resource.' });
  }
  
  next();
};

/**
 * Check if user has driver role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isDriver = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.userRole !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Only drivers can access this resource.' });
  }
  
  next();
};

/**
 * Check if user has caretaker role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isCaretaker = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.userRole !== 'caretaker') {
    return res.status(403).json({ message: 'Access denied. Only caretakers can access this resource.' });
  }
  
  next();
};

/**
 * Check if user has shuttle role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isShuttle = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.userRole !== 'shuttle') {
    return res.status(403).json({ message: 'Access denied. Only shuttle providers can access this resource.' });
  }
  
  next();
};

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Only administrators can access this resource.' });
  }
  
  next();
};

/**
 * Check if user has any service provider role (driver, caretaker, or shuttle)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isServiceProvider = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to continue.' });
  }
  
  const providerRoles = ['driver', 'caretaker', 'shuttle'];
  if (!providerRoles.includes(req.session.userRole)) {
    return res.status(403).json({ message: 'Access denied. Only service providers can access this resource.' });
  }
  
  next();
};
