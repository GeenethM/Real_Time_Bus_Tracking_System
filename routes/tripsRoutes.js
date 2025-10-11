const express = require('express');
const router = express.Router();

// Import controllers
const { getAllTrips, getTripById, createTrip, updateTrip, startTrip, completeTrip, cancelTrip, getActiveTrips } = require('../controllers/tripController');

// Import middleware
const { authenticate, authorize } = require('../middleware/auth');
const { createTripLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { validateTrip, validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Trips
 *   description: Trip scheduling and management
 */

/**
 * Protected routes (authentication required)
 */

// Get all trips with filtering and pagination
router.get('/', authenticate, validatePagination, handleValidationErrors, getAllTrips );

// Get active trips
router.get('/active', authenticate, getActiveTrips );

// Get specific trip by ID
router.get('/:id', authenticate, validateObjectId(), handleValidationErrors, getTripById );

// Create new trip (Admin or Operator only)
router.post('/', authenticate, authorize('admin', 'operator'), createTripLimiter, validateTrip, handleValidationErrors, createTrip );

// Update trip (Admin or Trip Owner only)
router.put('/:id', authenticate, authorize('admin', 'operator'), validateObjectId(), handleValidationErrors, updateTrip );

// Start trip (Admin or Operator only)
router.post('/:id/start', authenticate, authorize('admin', 'operator'), validateObjectId(), handleValidationErrors, startTrip );

// Complete trip (Admin or Operator only)
router.post('/:id/complete', authenticate, authorize('admin', 'operator'), validateObjectId(), handleValidationErrors, completeTrip );

// Cancel trip (Admin or Operator only)
router.post('/:id/cancel', authenticate, authorize('admin', 'operator'), validateObjectId(), handleValidationErrors, cancelTrip );

module.exports = router;