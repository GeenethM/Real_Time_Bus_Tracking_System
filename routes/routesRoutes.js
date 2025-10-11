const express = require('express');
const router = express.Router();

// Import controllers
const { getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute, getInterProvincialRoutes, searchRoutesByCity } = require('../controllers/routeController');

// Import middleware
const { authenticate, authorize } = require('../middleware/auth');
const { searchLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { validateRoute, validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Routes
 *   description: Route management and information
 */

/**
 * Public routes (no authentication required)
 */

// Get all routes with filtering and pagination
router.get('/', validatePagination, handleValidationErrors, getAllRoutes );

// Get inter-provincial routes
router.get('/inter-provincial', getInterProvincialRoutes );

// Search routes by city
router.get('/search', searchLimiter, searchRoutesByCity );

// Get specific route by ID
router.get('/:id', validateObjectId(), handleValidationErrors, getRouteById );

/**
 * Protected routes (authentication required - Admin only)
 */

// Create new route
router.post('/', authenticate, authorize('admin'), adminLimiter, validateRoute, handleValidationErrors, createRoute );

// Update route
router.put('/:id', authenticate, authorize('admin'), adminLimiter, validateObjectId(), handleValidationErrors, updateRoute );

// Delete route
router.delete('/:id', authenticate, authorize('admin'), validateObjectId(), handleValidationErrors, deleteRoute );

module.exports = router;