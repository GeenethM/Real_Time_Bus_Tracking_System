const { validationResult } = require('express-validator');

/**
 * Validation Error Handler Middleware
 * Processes validation errors and returns formatted response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({ success: false, message: 'Validation failed', errors: formattedErrors });
  }
  
  next();
};

/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found`, availableRoutes: {
      auth: '/api/auth',
      buses: '/api/buses',
      routes: '/api/routes',
      trips: '/api/trips',
      tracking: '/api/tracking',
      documentation: '/api-docs'
    }
  });
};

/**
 * Async Handler Wrapper
 * Wraps async functions to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Database Connection Error Handler
 * Handles database connection issues
 */
const handleDatabaseError = (err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    return res.status(503).json({ success: false, message: 'Database connection error. Please try again later.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
  next(err);
};

/**
 * Rate Limit Error Handler
 * Handles rate limiting responses
 */
const handleRateLimitError = (req, res) => {
  res.status(429).json({ success: false, message: 'Too many requests from this IP. Please try again later.', retryAfter: Math.round(req.rateLimit.resetTime / 1000) }); // in seconds
};

module.exports = { handleValidationErrors, errorHandler, notFound, asyncHandler, handleDatabaseError, handleRateLimitError };