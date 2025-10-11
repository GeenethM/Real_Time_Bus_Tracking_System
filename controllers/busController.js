const Bus = require('../models/Bus');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Bus Controller
 * Handles CRUD operations for buses
 */

/**
 * @swagger
 * /api/buses:
 *   get:
 *     summary: Get all buses with filtering and pagination
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
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
 *         description: Number of buses per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Filter by bus status
 *       - in: query
 *         name: busType
 *         schema:
 *           type: string
 *           enum: [normal, semi-luxury, luxury, air-conditioned]
 *         description: Filter by bus type
 *       - in: query
 *         name: operator
 *         schema:
 *           type: string
 *         description: Filter by operator ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by bus number
 *     responses:
 *       200:
 *         description: Buses retrieved successfully
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
 *                     buses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Bus'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
const getAllBuses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, busType, operator, search, sort = '-createdAt' } = req.query;

  // Build query object
  const query = { isActive: true };

  // Apply filters
  if (status) query.status = status;
  if (busType) query.busType = busType;
  if (operator) query.operatorId = operator;
  if (search) {
    query.busNumber = { $regex: search, $options: 'i' };
  }

  // For operators, only show their own buses
  if (req.user.role === 'operator') {
    query.operatorId = req.user._id;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Execute query with population
  const buses = await Bus.find(query)
    .populate('operator', 'fullName companyName contactNumber')
    .populate('currentTrips', 'departureTime estimatedArrival status routeId')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await Bus.countDocuments(query);

  res.status(200).json({ success: true, data: { buses, pagination: {
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
 * /api/buses/{id}:
 *   get:
 *     summary: Get a specific bus by ID
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     responses:
 *       200:
 *         description: Bus retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus not found
 *       401:
 *         description: Unauthorized
 */
const getBusById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = { _id: id, isActive: true };

  // For operators, only allow access to their own buses
  if (req.user.role === 'operator') {
    query.operatorId = req.user._id;
  }

  const bus = await Bus.findOne(query)
    .populate('operator', 'fullName companyName contactNumber email')
    .populate('currentTrips');

  if (!bus) {
    return res.status(404).json({ success: false, message: 'Bus not found' });
  }

  res.status(200).json({ success: true, data: bus });
});

/**
 * @swagger
 * /api/buses:
 *   post:
 *     summary: Create a new bus
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busNumber
 *               - capacity
 *               - busType
 *             properties:
 *               busNumber:
 *                 type: string
 *                 example: "ABC-1234"
 *               capacity:
 *                 type: number
 *                 example: 45
 *               busType:
 *                 type: string
 *                 enum: [normal, semi-luxury, luxury, air-conditioned]
 *                 example: "semi-luxury"
 *               specifications:
 *                 type: object
 *                 properties:
 *                   make:
 *                     type: string
 *                     example: "Tata"
 *                   model:
 *                     type: string
 *                     example: "LP 407"
 *                   year:
 *                     type: number
 *                     example: 2022
 *                   fuelType:
 *                     type: string
 *                     enum: [diesel, petrol, cng, electric]
 *                     example: "diesel"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [wifi, charging-ports, gps, cctv, air-conditioning, entertainment-system]
 *                 example: ["wifi", "gps", "air-conditioning"]
 *     responses:
 *       201:
 *         description: Bus created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Bus'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Operator only
 */
const createBus = asyncHandler(async (req, res) => {
  const busData = { ...req.body };

  // Set operator ID based on user role
  if (req.user.role === 'operator') {
    busData.operatorId = req.user._id;
  } else if (req.user.role === 'admin' && !busData.operatorId) {
    return res.status(400).json({ success: false, message: 'Operator ID is required for admin to create buses' });
  }

  const bus = await Bus.create(busData);

  // Populate operator details
  await bus.populate('operator', 'fullName companyName');

  res.status(201).json({ success: true, message: 'Bus created successfully', data: bus });
});

/**
 * @swagger
 * /api/buses/{id}:
 *   put:
 *     summary: Update a bus
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               capacity:
 *                 type: number
 *               busType:
 *                 type: string
 *                 enum: [normal, semi-luxury, luxury, air-conditioned]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               specifications:
 *                 type: object
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *       404:
 *         description: Bus not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
const updateBus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated
  delete updateData.busNumber;
  delete updateData.operatorId;
  delete updateData._id;

  const query = { _id: id, isActive: true };

  // For operators, only allow updating their own buses
  if (req.user.role === 'operator') {
    query.operatorId = req.user._id;
  }

  const bus = await Bus.findOneAndUpdate(
    query,
    updateData,
    { new: true, runValidators: true }
  ).populate('operator', 'fullName companyName');

  if (!bus) {
    return res.status(404).json({ success: false, message: 'Bus not found or access denied' });
  }

  res.status(200).json({ success: true, message: 'Bus updated successfully', data: bus });
});

/**
 * @swagger
 * /api/buses/{id}:
 *   delete:
 *     summary: Delete a bus (soft delete)
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     responses:
 *       200:
 *         description: Bus deleted successfully
 *       404:
 *         description: Bus not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
const deleteBus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bus = await Bus.findById(id);

  if (!bus) {
    return res.status(404).json({ success: false, message: 'Bus not found' });
  }

  // Check if bus is currently on a trip
  const isOnTrip = await bus.isOnTrip();
  if (isOnTrip) {
    return res.status(400).json({ success: false, message: 'Cannot delete bus that is currently on a trip' });
  }

  // Soft delete
  bus.isActive = false;
  bus.status = 'inactive';
  await bus.save();

  res.status(200).json({ success: true, message: 'Bus deleted successfully' });
});

/**
 * @swagger
 * /api/buses/nearby:
 *   get:
 *     summary: Find buses nearby a location
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Nearby buses found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bus'
 *       400:
 *         description: Invalid coordinates
 */
const getNearbyBuses = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radiusKm = parseFloat(radius);

  if (lat < 5.5 || lat > 10.0 || lng < 79.0 || lng > 82.0) {
    return res.status(400).json({ success: false, message: 'Coordinates must be within Sri Lanka bounds' });
  }

  const buses = await Bus.findNearby(lat, lng, radiusKm);

  res.status(200).json({ success: true, data: buses, count: buses.length, searchParams: { latitude: lat, longitude: lng, radius: radiusKm } });
});

/**
 * @swagger
 * /api/buses/operator/{operatorId}:
 *   get:
 *     summary: Get buses by operator
 *     tags: [Buses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operator user ID
 *     responses:
 *       200:
 *         description: Operator buses retrieved successfully
 *       404:
 *         description: Operator not found
 */
const getBusesByOperator = asyncHandler(async (req, res) => {
  const { operatorId } = req.params;

  // For operators, only allow access to their own buses
  if (req.user.role === 'operator' && req.user._id.toString() !== operatorId) {
    return res.status(403).json({ success: false, message: 'Access denied. You can only view your own buses.' });
  }

  const buses = await Bus.findByOperator(operatorId);

  res.status(200).json({ success: true, data: buses, count: buses.length });
});

module.exports = { getAllBuses, getBusById, createBus, updateBus, deleteBus, getNearbyBuses, getBusesByOperator };