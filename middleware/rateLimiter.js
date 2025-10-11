const rateLimit = require('express-rate-limit');
const { handleRateLimitError } = require('./errorHandler');

/**
 * General API Rate Limiting
 * Applies to all API routes----------------------------------------------------------------------------------------------generalLimiter
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: handleRateLimitError
});

/**
 * Strict Rate Limiting for Authentication Routes
 * More restrictive for login/register endpoints----------------------------------------------------------------------------authLimiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitError,
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Location Update Rate Limiting
 * For GPS tracking updates from buses-----------------------------------------------------------------------------------trackingLimiter
 */
const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // allow 60 location updates per minute per IP
  message: {
    success: false,
    message: 'Too many tracking updates. Maximum 60 updates per minute allowed.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitError
});

/**
 * Search/Query Rate Limiting
 * For search and query operations----------------------------------------------------------------------------------------searchLimiter
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // allow 30 search requests per minute
  message: {
    success: false,
    message: 'Too many search requests. Maximum 30 searches per minute allowed.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitError
});

/**
 * Admin Operations Rate Limiting
 * For administrative operations------------------------------------------------------------------------------------------adminLimiter
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // higher limit for admin operations
  message: {
    success: false,
    message: 'Too many admin requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitError
});

/**
 * Create Trip Rate Limiting
 * Prevents spam creation of trips-------------------------------------------------------------------------------------createTripLimiter
 */
const createTripLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // allow 20 trip creations per 5 minutes
  message: {
    success: false,
    message: 'Too many trip creation requests. Please wait before creating more trips.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitError
});

module.exports = { generalLimiter, authLimiter, trackingLimiter, searchLimiter, adminLimiter, createTripLimiter };