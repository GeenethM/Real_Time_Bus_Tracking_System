const Route = require('../models/Route');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Route Controller
 * Handles CRUD operations for bus routes
 */

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Get all routes with filtering and pagination
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of routes per page
 *       - in: query
 *         name: startProvince
 *         schema:
 *           type: string
 *         description: Filter by start province
 *       - in: query
 *         name: endProvince
 *         schema:
 *           type: string
 *         description: Filter by end province
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Search routes by city name
 *       - in: query
 *         name: routeType
 *         schema:
 *           type: string
 *           enum: [express, semi-express, normal]
 *         description: Filter by route type
 *     responses:
 *       200:
 *         description: Routes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     routes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Route'
 *                     pagination:
 *                       type: object
 */
const getAllRoutes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, startProvince, endProvince, city, routeType, sort = 'routeNumber' } = req.query;

  // Build query object
  const query = { isActive: true };

  // Apply filters
  if (startProvince) query['startLocation.province'] = startProvince;
  if (endProvince) query['endLocation.province'] = endProvince;
  if (routeType) query.routeType = routeType;
  
  if (city) {
    query.$or = [
      { 'startLocation.city': { $regex: city, $options: 'i' } },
      { 'endLocation.city': { $regex: city, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const routes = await Route.find(query)
    .populate('activeTrips', 'departureTime status busId fare')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await Route.countDocuments(query);

  res.status(200).json({ success: true, data: { routes,
      pagination: {
        current: pageNum,
        total,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    }
  });
});

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Get a specific route by ID
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route retrieved successfully
 *       404:
 *         description: Route not found
 */
const getRouteById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const route = await Route.findOne({ _id: id, isActive: true })
    .populate('activeTrips');

  if (!route) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  res.status(200).json({ success: true, data: route });
});

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Create a new route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeNumber
 *               - routeName
 *               - startLocation
 *               - endLocation
 *               - distance
 *               - estimatedDuration
 *               - operatingHours
 *               - frequency
 *               - baseFare
 *             properties:
 *               routeNumber:
 *                 type: string
 *                 example: "R-001"
 *               routeName:
 *                 type: string
 *                 example: "Colombo to Kandy Express"
 *               startLocation:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Colombo"
 *                   province:
 *                     type: string
 *                     example: "Western"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         example: 6.9271
 *                       longitude:
 *                         type: number
 *                         example: 79.8612
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Kandy"
 *                   province:
 *                     type: string
 *                     example: "Central"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         example: 7.2906
 *                       longitude:
 *                         type: number
 *                         example: 80.6337
 *               distance:
 *                 type: number
 *                 example: 115
 *               estimatedDuration:
 *                 type: number
 *                 example: 180
 *               operatingHours:
 *                 type: object
 *                 properties:
 *                   startTime:
 *                     type: string
 *                     example: "05:30"
 *                   endTime:
 *                     type: string
 *                     example: "22:00"
 *               frequency:
 *                 type: number
 *                 example: 30
 *               baseFare:
 *                 type: number
 *                 example: 250
 *     responses:
 *       201:
 *         description: Route created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
const createRoute = asyncHandler(async (req, res) => {
  const route = await Route.create(req.body);

  res.status(201).json({ success: true, message: 'Route created successfully', data: route });
});

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Update a route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route updated successfully
 *       404:
 *         description: Route not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
const updateRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated
  delete updateData.routeNumber;
  delete updateData._id;

  const route = await Route.findOneAndUpdate(
    { _id: id, isActive: true },
    updateData,
    { new: true, runValidators: true }
  );

  if (!route) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  res.status(200).json({ success: true, message: 'Route updated successfully', data: route });
});

/**
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Delete a route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *       404:
 *         description: Route not found
 *       400:
 *         description: Cannot delete route with active trips
 */
const deleteRoute = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const route = await Route.findById(id);

  if (!route) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  // Check for active trips on this route
  const Trip = require('../models/Trip');
  const activeTrips = await Trip.findOne({ routeId: id, status: { $in: ['scheduled', 'in-progress'] } });

  if (activeTrips) {
    return res.status(400).json({ success: false, message: 'Cannot delete route with active trips' });
  }

  // Soft delete
  route.isActive = false;
  await route.save();

  res.status(200).json({ success: true, message: 'Route deleted successfully' });
});

/**
 * @swagger
 * /api/routes/inter-provincial:
 *   get:
 *     summary: Get inter-provincial routes
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: startProvince
 *         schema:
 *           type: string
 *         description: Start province
 *       - in: query
 *         name: endProvince
 *         schema:
 *           type: string
 *         description: End province
 *     responses:
 *       200:
 *         description: Inter-provincial routes retrieved successfully
 */
const getInterProvincialRoutes = asyncHandler(async (req, res) => {
  const { startProvince, endProvince } = req.query;

  const routes = await Route.findInterProvincialRoutes(startProvince, endProvince);

  res.status(200).json({ success: true, data: routes, count: routes.length });
});

/**
 * @swagger
 * /api/routes/search:
 *   get:
 *     summary: Search routes by city
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name to search
 *     responses:
 *       200:
 *         description: Routes found successfully
 */
const searchRoutesByCity = asyncHandler(async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ success: false, message: 'City parameter is required' });
  }

  const routes = await Route.findByCity(city);

  res.status(200).json({ success: true, data: routes, count: routes.length, searchTerm: city });
});

module.exports = { getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute, getInterProvincialRoutes, searchRoutesByCity };