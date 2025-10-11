const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Tracking Controller
 * Handles real-time GPS tracking operations
 */

/**
 * @swagger
 * /api/tracking/bus/{busId}:
 *   get:
 *     summary: Get current location of a specific bus
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: busId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     responses:
 *       200:
 *         description: Bus location retrieved successfully
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
 *                     busId:
 *                       type: string
 *                     busNumber:
 *                       type: string
 *                     currentLocation:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         speed:
 *                           type: number
 *                         heading:
 *                           type: number
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                     status:
 *                       type: string
 *                     currentTrip:
 *                       type: object
 *       404:
 *         description: Bus not found
 */
const getBusLocation = asyncHandler(async (req, res) => {
  const { busId } = req.params;

  const bus = await Bus.findOne({ _id: busId, isActive: true })
    .populate('operator', 'fullName companyName')
    .populate('currentTrips', 'departureTime estimatedArrival status routeId');

  if (!bus) {
    return res.status(404).json({ success: false, message: 'Bus not found' });
  }

  // Get current active trip if any
  const currentTrip = await Trip.findOne({
    busId: busId,
    status: { $in: ['scheduled', 'in-progress'] }
  }).populate('routeId', 'routeNumber routeName startLocation endLocation');

  res.status(200).json({ success: true,
    data: {
      busId: bus._id,
      busNumber: bus.busNumber,
      busType: bus.busType,
      capacity: bus.capacity,
      currentLocation: bus.currentLocation,
      status: bus.status,
      operator: bus.operator,
      currentTrip: currentTrip || null,
      lastLocationUpdate: bus.currentLocation?.lastUpdated || null
    }
  });
});

/**
 * @swagger
 * /api/tracking/update:
 *   post:
 *     summary: Update bus location (GPS tracking)
 *     tags: [Tracking]
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
 *               - latitude
 *               - longitude
 *             properties:
 *               busId:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789012345a"
 *               latitude:
 *                 type: number
 *                 minimum: 5.5
 *                 maximum: 10.0
 *                 example: 6.9271
 *               longitude:
 *                 type: number
 *                 minimum: 79.0
 *                 maximum: 82.0
 *                 example: 79.8612
 *               speed:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 200
 *                 example: 65
 *               heading:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 360
 *                 example: 180
 *     responses:
 *       200:
 *         description: Location updated successfully
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
 *                   type: object
 *                   properties:
 *                     busId:
 *                       type: string
 *                     location:
 *                       type: object
 *                     updateTime:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid location data
 *       403:
 *         description: Unauthorized to update this bus location
 *       404:
 *         description: Bus not found
 */
const updateBusLocation = asyncHandler(async (req, res) => {
  const { busId, latitude, longitude, speed = 0, heading = 0 } = req.body;

  // Find the bus
  const bus = await Bus.findOne({ _id: busId, isActive: true })
    .populate('operatorId', '_id');

  if (!bus) {
    return res.status(404).json({ success: false, message: 'Bus not found' });
  }

  // Check if user has permission to update this bus location
  if (req.user.role === 'operator' && bus.operatorId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You can only update location for your own buses' });
  }

  // Update bus location
  await bus.updateLocation(latitude, longitude, speed, heading);

  // If bus is on an active trip, update trip progress
  const activeTrip = await Trip.findOne({
    busId: busId,
    status: 'in-progress'
  }).populate('routeId', 'waypoints');

  let tripProgress = null;
  if (activeTrip && activeTrip.routeId.waypoints.length > 0) {
    // Simple progress calculation based on proximity to waypoints
    // In a real system, this would be more sophisticated
    const currentWaypoint = calculateNearestWaypoint(
      latitude, 
      longitude, 
      activeTrip.routeId.waypoints
    );
    
    if (currentWaypoint !== activeTrip.currentWaypoint) {
      activeTrip.currentWaypoint = currentWaypoint;
      await activeTrip.save();
    }

    tripProgress = {
      tripId: activeTrip._id,
      currentWaypoint: currentWaypoint,
      progress: Math.round((currentWaypoint / activeTrip.routeId.waypoints.length) * 100)
    };
  }

  res.status(200).json({ success: true, message: 'Bus location updated successfully',
    data: {
      busId: bus._id,
      busNumber: bus.busNumber,
      location: {
        latitude,
        longitude,
        speed,
        heading,
        lastUpdated: new Date()
      },
      tripProgress,
      updateTime: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /api/tracking/route/{routeId}:
 *   get:
 *     summary: Track all active buses on a specific route
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route tracking data retrieved successfully
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
 *                     route:
 *                       $ref: '#/components/schemas/Route'
 *                     activeBuses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bus:
 *                             $ref: '#/components/schemas/Bus'
 *                           trip:
 *                             $ref: '#/components/schemas/Trip'
 *                           estimatedArrival:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Route not found
 */
const trackRouteProgress = asyncHandler(async (req, res) => {
  const { routeId } = req.params;

  // Get route information
  const Route = require('../models/Route');
  const route = await Route.findOne({ _id: routeId, isActive: true });

  if (!route) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  // Get all active trips on this route
  const activeTrips = await Trip.find({
    routeId: routeId,
    status: { $in: ['scheduled', 'in-progress'] }
  })
  .populate('busId', 'busNumber busType currentLocation status operatorId')
  .populate({
    path: 'busId',
    populate: {
      path: 'operatorId',
      select: 'fullName companyName'
    }
  })
  .sort({ departureTime: 1 });

  // Format response data
  const activeBuses = activeTrips.map(trip => ({
    trip: {
      id: trip._id,
      status: trip.status,
      departureTime: trip.departureTime,
      estimatedArrival: trip.estimatedArrival,
      actualDeparture: trip.actualDeparture,
      currentWaypoint: trip.currentWaypoint,
      delay: trip.delay,
      occupancy: trip.occupancy,
      fare: trip.fare
    },
    bus: {
      id: trip.busId._id,
      busNumber: trip.busId.busNumber,
      busType: trip.busId.busType,
      currentLocation: trip.busId.currentLocation,
      status: trip.busId.status,
      operator: trip.busId.operatorId
    },
    estimatedTimeToDestination: calculateETA(trip, route)
  }));

  res.status(200).json({ success: true,
    data: {
      route: {
        id: route._id,
        routeNumber: route.routeNumber,
        routeName: route.routeName,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        distance: route.distance,
        estimatedDuration: route.estimatedDuration,
        waypoints: route.waypoints
      },
      activeBuses,
      totalActiveBuses: activeBuses.length,
      lastUpdated: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /api/tracking/live:
 *   get:
 *     summary: Get live tracking data for all active buses
 *     tags: [Tracking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bounds
 *         schema:
 *           type: string
 *         description: Geographic bounds in format "north,south,east,west"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of buses to return
 *     responses:
 *       200:
 *         description: Live tracking data retrieved successfully
 */
const getLiveTracking = asyncHandler(async (req, res) => {
  const { bounds, limit = 50 } = req.query;
  
  // Build query for active buses
  const query = { 
    status: 'active', 
    isActive: true,
    'currentLocation.latitude': { $exists: true },
    'currentLocation.longitude': { $exists: true }
  };

  // Apply geographic bounds if provided
  if (bounds) {
    const [north, south, east, west] = bounds.split(',').map(Number);
    query['currentLocation.latitude'] = { 
      $gte: south, 
      $lte: north 
    };
    query['currentLocation.longitude'] = { 
      $gte: west, 
      $lte: east 
    };
  }

  // For operators, only show their own buses
  if (req.user.role === 'operator') {
    query.operatorId = req.user._id;
  }

  const buses = await Bus.find(query)
    .populate('operatorId', 'fullName companyName')
    .populate('currentTrips', 'departureTime estimatedArrival status routeId')
    .limit(parseInt(limit))
    .sort({ 'currentLocation.lastUpdated': -1 });

  const trackingData = buses.map(bus => ({
    busId: bus._id,
    busNumber: bus.busNumber,
    busType: bus.busType,
    currentLocation: bus.currentLocation,
    status: bus.status,
    operator: bus.operatorId,
    currentTrip: bus.currentTrips[0] || null,
    lastSeen: bus.currentLocation?.lastUpdated
  }));

  res.status(200).json({ success: true, data: trackingData, count: trackingData.length, bounds: bounds || 'all', timestamp: new Date().toISOString() });
});

/**
 * Helper function to calculate nearest waypoint
 */
const calculateNearestWaypoint = (lat, lng, waypoints) => {
  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;

  waypoints.forEach((waypoint, index) => {
    const distance = calculateDistance(
      lat, lng, 
      waypoint.coordinates.latitude, 
      waypoint.coordinates.longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

/**
 * Helper function to calculate distance between two points
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Helper function to convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Helper function to calculate ETA
 */
const calculateETA = (trip, route) => {
  if (!trip.busId.currentLocation || trip.status !== 'in-progress') {
    return null;
  }

  const remainingDistance = route.distance * (1 - (trip.currentWaypoint / route.waypoints.length));
  const averageSpeed = 50; // km/h - simplified calculation
  const remainingTimeMinutes = (remainingDistance / averageSpeed) * 60;
  
  const eta = new Date(Date.now() + remainingTimeMinutes * 60000);
  return eta.toISOString();
};

module.exports = { getBusLocation, updateBusLocation, trackRouteProgress, getLiveTracking };