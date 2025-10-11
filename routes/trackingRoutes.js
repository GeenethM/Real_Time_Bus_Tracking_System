const express = require('express');
const router = express.Router();

// Import controllers
const { getBusLocation, updateBusLocation, trackRouteProgress, getLiveTracking } = require('../controllers/trackingController');

// Import middleware
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { trackingLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { validateLocationUpdate, validateObjectId } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Tracking
 *   description: Real-time bus tracking operations
 */

/**
 * Public routes (no authentication required for commuters to track buses)
 */

// Get current location of a specific bus
router.get('/bus/:busId', validateObjectId('busId'), handleValidationErrors, getBusLocation );

// Track all active buses on a specific route
router.get('/route/:routeId', validateObjectId('routeId'), handleValidationErrors, trackRouteProgress );

/**
 * Protected routes (authentication required)
 */

// Get live tracking data for all active buses (Admin and Operators)
router.get('/live', authenticate, authorize('admin', 'operator'), getLiveTracking );

// Update bus location (GPS tracking from bus operators)
router.post('/update', authenticate, authorize('admin', 'operator'), trackingLimiter, validateLocationUpdate, handleValidationErrors, updateBusLocation );

module.exports = router;