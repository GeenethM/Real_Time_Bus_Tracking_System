const express = require('express');
const router = express.Router();

// Import controllers
const { getAllBuses, getBusById, createBus, updateBus, deleteBus, getNearbyBuses, getBusesByOperator } = require('../controllers/busController');

// Import middleware
const { authenticate, authorize, ensureBusOwnership } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { validateBus, validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Buses
 *   description: Bus management operations
 */

/**
 * Public routes with optional authentication
 */

// Get nearby buses (public access for commuters)
router.get('/nearby', searchLimiter, getNearbyBuses );

/**
 * Protected routes (authentication required)
 */

// Get all buses with filtering and pagination
router.get('/', authenticate, validatePagination, handleValidationErrors, getAllBuses );

// Get buses by operator
router.get('/operator/:operatorId', authenticate, validateObjectId('operatorId'), handleValidationErrors, getBusesByOperator );

// Get specific bus by ID
router.get('/:id', authenticate, validateObjectId(), handleValidationErrors, ensureBusOwnership, getBusById );

// Create new bus (Admin or Operator only)
router.post('/', authenticate, authorize('admin', 'operator'), validateBus, handleValidationErrors, createBus );

// Update bus (Admin or Bus Owner only)
router.put('/:id', authenticate, authorize('admin', 'operator'), validateObjectId(), handleValidationErrors, ensureBusOwnership, updateBus );

// Delete bus (Admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId(), handleValidationErrors, deleteBus );

module.exports = router;