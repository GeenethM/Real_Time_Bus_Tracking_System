const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT tokens and sets user information in request object----------------------------------------------------------authenticate
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    let token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Remove 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is valid but user not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is inactive.' });
    }

    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }

    res.status(500).json({ success: false, message: 'Authentication error.', error: error.message });
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role(s)---------------------------------------------------------------------------------------authorize
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}` });
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Sets user information if token is provided, but doesn't require it-----------------------------------------------------optionalAuth
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (!token || !token.startsWith('Bearer ')) {
      return next();
    }

    token = token.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Resource Owner Middleware
 * Ensures user can only access their own resources (or admin can access all)---------------------------------------------ensureOwnership
 */
const ensureOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserField] || req.body[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only access your own resources.' });
    }

    next();
  };
};

/**
 * Bus Operator Ownership Middleware
 * Ensures operators can only access their own buses-------------------------------------------------------------------ensureBusOwnership
 */
const ensureBusOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    // Admin can access all buses
    if (req.user.role === 'admin') {
      return next();
    }

    // For operators, check if they own the bus
    if (req.user.role === 'operator') {
      const Bus = require('../models/Bus');
      const busId = req.params.id || req.params.busId;
      
      if (busId) {
        const bus = await Bus.findById(busId);
        if (!bus) {
          return res.status(404).json({ success: false, message: 'Bus not found.' });
        }

        if (bus.operatorId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Access denied. You can only access your own buses.' });
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authorization error.', error: error.message });
  }
};

module.exports = { authenticate, authorize, optionalAuth, ensureOwnership, ensureBusOwnership };


// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// exports.protect = async (req, res, next) => {
//   let token;

//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     try {
//       token = req.headers.authorization.split(' ')[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select('-password');
//       next();
//     } catch (error) {
//       res.status(401).json({ message: 'Not authorized, token failed' });
//     }
//   }

//   if (!token) {
//     res.status(401).json({ message: 'No token, authorization denied' });
//   }
// };
