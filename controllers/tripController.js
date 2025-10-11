const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Trip Controller
 * Handles CRUD operations for bus trips
 */

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all trips with filtering and pagination
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, delayed]
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           description: Filter trips by specific date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
 */
const getAllTrips = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, busId, routeId, date, sort = '-departureTime' } = req.query;

  // Build query object
  const query = {};

  // Apply filters
  if (status) query.status = status;
  if (busId) query.busId = busId;
  if (routeId) query.routeId = routeId;
  
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    query.departureTime = {
      $gte: startDate,
      $lt: endDate
    };
  }

  // For operators, only show trips for their buses
  if (req.user.role === 'operator') {
    const operatorBuses = await Bus.find({ operatorId: req.user._id }).select('_id');
    const busIds = operatorBuses.map(bus => bus._id);
    query.busId = { $in: busIds };
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Execute query with population
  const trips = await Trip.find(query)
    .populate('busId', 'busNumber busType capacity operatorId')
    .populate('routeId', 'routeNumber routeName startLocation endLocation distance')
    .populate({
      path: 'busId',
      populate: {
        path: 'operatorId',
        select: 'fullName companyName contactNumber'
      }
    })
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await Trip.countDocuments(query);

  res.status(200).json({ success: true,
    data: {
      trips,
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
 * /api/trips/{id}:
 *   get:
 *     summary: Get a specific trip by ID
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip retrieved successfully
 *       404:
 *         description: Trip not found
 */
const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id)
    .populate('busId', 'busNumber busType capacity currentLocation operatorId')
    .populate('routeId', 'routeNumber routeName startLocation endLocation waypoints distance')
    .populate({
      path: 'busId',
      populate: {
        path: 'operatorId',
        select: 'fullName companyName contactNumber'
      }
    });

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  // Check access permissions for operators
  if (req.user.role === 'operator') {
    if (trip.busId.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view trips for your own buses.' });
    }
  }

  res.status(200).json({ success: true, data: trip });
});

/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Create a new trip
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - routeId
 *               - departureTime
 *               - estimatedArrival
 *               - fare
 *             properties:
 *               busId:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789012345a"
 *               routeId:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789012345b"
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-25T08:30:00.000Z"
 *               estimatedArrival:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-25T11:30:00.000Z"
 *               fare:
 *                 type: number
 *                 example: 350
 *               driver:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Sunil Perera"
 *                   licenseNumber:
 *                     type: string
 *                     example: "DL123456"
 *                   contactNumber:
 *                     type: string
 *                     example: "+94771234567"
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
const createTrip = asyncHandler(async (req, res) => {
  const tripData = { ...req.body };

  // For operators, ensure they can only create trips for their own buses
  if (req.user.role === 'operator') {
    const bus = await Bus.findById(tripData.busId);
    if (!bus || bus.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only create trips for your own buses' });
    }
  }

  const trip = await Trip.create(tripData);

  // Populate the created trip
  await trip.populate('busId', 'busNumber busType capacity');
  await trip.populate('routeId', 'routeNumber routeName startLocation endLocation');

  res.status(201).json({ success: true, message: 'Trip created successfully', data: trip });
});

/**
 * @swagger
 * /api/trips/{id}:
 *   put:
 *     summary: Update a trip
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       404:
 *         description: Trip not found
 *       403:
 *         description: Forbidden
 */
const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.busId;
  delete updateData.routeId;

  const trip = await Trip.findById(id).populate('busId', 'operatorId');

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  // Check access permissions for operators
  if (req.user.role === 'operator') {
    if (trip.busId.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update trips for your own buses.' });
    }
  }

  // Update trip
  Object.assign(trip, updateData);
  await trip.save();

  // Populate updated trip
  await trip.populate('busId', 'busNumber busType capacity');
  await trip.populate('routeId', 'routeNumber routeName startLocation endLocation');

  res.status(200).json({ success: true, message: 'Trip updated successfully', data: trip });
});

/**
 * @swagger
 * /api/trips/{id}/start:
 *   post:
 *     summary: Start a trip
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip started successfully
 *       400:
 *         description: Trip cannot be started
 *       404:
 *         description: Trip not found
 */
const startTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id).populate('busId', 'operatorId status');

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  // Check access permissions for operators
  if (req.user.role === 'operator') {
    if (trip.busId.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only start trips for your own buses.' });
    }
  }

  // Check if trip can be started
  if (trip.status !== 'scheduled') {
    return res.status(400).json({ success: false, message: `Trip cannot be started. Current status: ${trip.status}` });
  }

  if (trip.busId.status !== 'active') {
    return res.status(400).json({ success: false, message: 'Bus is not active and cannot start trip' });
  }

  // Start the trip
  await trip.startTrip();

  res.status(200).json({ success: true, message: 'Trip started successfully', data: trip });
});

/**
 * @swagger
 * /api/trips/{id}/complete:
 *   post:
 *     summary: Complete a trip
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip completed successfully
 *       400:
 *         description: Trip cannot be completed
 *       404:
 *         description: Trip not found
 */
const completeTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await Trip.findById(id).populate('busId', 'operatorId');

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  // Check access permissions for operators
  if (req.user.role === 'operator') {
    if (trip.busId.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only complete trips for your own buses.' });
    }
  }

  // Check if trip can be completed
  if (trip.status !== 'in-progress') {
    return res.status(400).json({ success: false, message: `Trip cannot be completed. Current status: ${trip.status}` });
  }

  // Complete the trip
  await trip.completeTrip();

  res.status(200).json({ success: true, message: 'Trip completed successfully', data: trip });
});

/**
 * @swagger
 * /api/trips/{id}/cancel:
 *   post:
 *     summary: Cancel a trip
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Vehicle breakdown"
 *     responses:
 *       200:
 *         description: Trip cancelled successfully
 *       400:
 *         description: Trip cannot be cancelled
 *       404:
 *         description: Trip not found
 */
const cancelTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const trip = await Trip.findById(id).populate('busId', 'operatorId');

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  // Check access permissions for operators
  if (req.user.role === 'operator') {
    if (trip.busId.operatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only cancel trips for your own buses.' });
    }
  }

  // Check if trip can be cancelled
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    return res.status(400).json({ success: false, message: `Trip cannot be cancelled. Current status: ${trip.status}` });
  }

  // Cancel the trip
  await trip.cancelTrip(reason);

  res.status(200).json({ success: true, message: 'Trip cancelled successfully', data: trip });
});

/**
 * @swagger
 * /api/trips/active:
 *   get:
 *     summary: Get all active trips
 *     tags: [Trips]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active trips retrieved successfully
 */
const getActiveTrips = asyncHandler(async (req, res) => {
  let trips = await Trip.findActiveTrips();

  // For operators, filter their own buses only
  if (req.user.role === 'operator') {
    trips = trips.filter(trip => 
      trip.busId.operatorId && trip.busId.operatorId.toString() === req.user._id.toString()
    );
  }

  res.status(200).json({ success: true, data: trips, count: trips.length });
});

module.exports = { getAllTrips, getTripById, createTrip, updateTrip, startTrip, completeTrip, cancelTrip, getActiveTrips };