const mongoose = require('mongoose');

/**
 * Trip Schema for Scheduled Bus Trips
 * Represents individual trip instances for buses on specific routes
 * 
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       required:
 *         - busId
 *         - routeId
 *         - departureTime
 *         - estimatedArrival
 *       properties:
 *         busId:
 *           type: string
 *           description: Reference to the bus
 *         routeId:
 *           type: string
 *           description: Reference to the route
 *         departureTime:
 *           type: string
 *           format: date-time
 *           description: Scheduled departure time
 *         estimatedArrival:
 *           type: string
 *           format: date-time
 *           description: Estimated arrival time
 *         actualDeparture:
 *           type: string
 *           format: date-time
 *           description: Actual departure time
 *         actualArrival:
 *           type: string
 *           format: date-time
 *           description: Actual arrival time
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, delayed]
 *           description: Current trip status
 *         occupancy:
 *           type: number
 *           description: Current passenger count
 *         fare:
 *           type: number
 *           description: Trip fare amount
 */
const tripSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: [true, 'Bus ID is required'],
    validate: {
      validator: async function(busId) {
        const Bus = mongoose.model('Bus');
        const bus = await Bus.findById(busId);
        return bus && bus.status === 'active';
      },
      message: 'Invalid bus ID or bus is not active'
    }
  },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: [true, 'Route ID is required'],
    validate: {
      validator: async function(routeId) {
        const Route = mongoose.model('Route');
        const route = await Route.findById(routeId);
        return route && route.isActive;
      },
      message: 'Invalid route ID or route is not active'
    }
  },
  departureTime: { type: Date, required: [true, 'Departure time is required'],
    validate: {
      validator: function(departureTime) {
        // Allow past departureTime for completed/in-progress trips
        if (['completed', 'in-progress'].includes(this.status)) return true;
        return departureTime > new Date();
      },
      message: 'Departure time must be in the future'
    }
  },
  estimatedArrival: { type: Date, required: [true, 'Estimated arrival time is required'],
    validate: {
      validator: function(estimatedArrival) {
        return estimatedArrival > this.departureTime;
      },
      message: 'Estimated arrival must be after departure time'
    }
  },
  actualDeparture: { type: Date,
    validate: {
      validator: function(actualDeparture) {
        if (!actualDeparture) return true; // Optional field
        console.log('Time of  actualDeparture:', actualDeparture);
        return actualDeparture >= this.departureTime - (30 * 60 * 1000); // Allow 30 min early
      },
      message: 'Actual departure cannot be more than 30 minutes early'
    }
  },
  actualArrival: { type: Date,
    validate: {
      validator: function(actualArrival) {
        if (!actualArrival || !this.actualDeparture) return true;
        return actualArrival > this.actualDeparture;
      },
      message: 'Actual arrival must be after actual departure'
    }
  },
  status: { type: String,
    enum: {
      values: ['scheduled', 'in-progress', 'completed', 'cancelled', 'delayed'],
      message: 'Status must be one of: scheduled, in-progress, completed, cancelled, delayed'
    },
    default: 'scheduled'
  },
  occupancy: { type: Number, default: 0, min: [0, 'Occupancy cannot be negative'],
    validate: {
      validator: async function(occupancy) {
        if (!this.busId) return true;
        const Bus = mongoose.model('Bus');
        const bus = await Bus.findById(this.busId);
        return !bus || occupancy <= bus.capacity;
      },
      message: 'Occupancy cannot exceed bus capacity'
    }
  },
  fare: { type: Number, required: [true, 'Fare is required'], min: [0, 'Fare cannot be negative'] },
  delay: { type: Number, default: 0, description: 'Delay in minutes (positive for late, negative for early)' },
  currentWaypoint: { type: Number, default: 0, min: 0, description: 'Index of current waypoint (0 = not started)' },
  driver: { name: { type: String, trim: true }, licenseNumber: { type: String, trim: true }, contactNumber: { type: String, match: [/^(\+94|0)[0-9]{9}$/, 'Invalid phone number format'] } },
  conductor: { name: { type: String, trim: true }, employeeId: { type: String, trim: true } },
  weather: { condition: { type: String, enum: ['clear', 'cloudy', 'rainy', 'stormy', 'foggy'] }, temperature: { type: Number, min: 15, max: 45 }, recorded: { type: Date, default: Date.now } },
  notes: { type: String, maxlength: [500, 'Notes cannot exceed 500 characters'] }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
tripSchema.index({ busId: 1, departureTime: -1 });
tripSchema.index({ routeId: 1, departureTime: 1 });
tripSchema.index({ status: 1, departureTime: 1 });
tripSchema.index({ departureTime: 1 });

// Virtual for bus details
tripSchema.virtual('bus', { ref: 'Bus', localField: 'busId', foreignField: '_id', justOne: true });

// Virtual for route details
tripSchema.virtual('route', { ref: 'Route', localField: 'routeId', foreignField: '_id', justOne: true });

// Virtual for trip duration
tripSchema.virtual('plannedDuration').get(function() {
  if (!this.departureTime || !this.estimatedArrival) return null;
  return Math.round((this.estimatedArrival - this.departureTime) / (1000 * 60)); // in minutes
});

// Virtual for actual duration
tripSchema.virtual('actualDuration').get(function() {
  if (!this.actualDeparture || !this.actualArrival) return null;
  return Math.round((this.actualArrival - this.actualDeparture) / (1000 * 60)); // in minutes
});

// Virtual for progress percentage
tripSchema.virtual('progressPercentage').get(function() {
  if (this.status === 'scheduled') return 0;
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  
  // Simple progress based on current waypoint
  if (!this.route || !this.route.waypoints) return 0;
  const totalWaypoints = this.route.waypoints.length;
  if (totalWaypoints === 0) return 50; // Assume 50% if no waypoints
  
  return Math.round((this.currentWaypoint / totalWaypoints) * 100);
});

// Instance method to start trip
tripSchema.methods.startTrip = function() {
  this.status = 'in-progress';
  this.actualDeparture = new Date();
  return this.save();
};

// Instance method to complete trip
tripSchema.methods.completeTrip = function() {
  this.status = 'completed';
  this.actualArrival = new Date();
  
  // Calculate delay
  if (this.estimatedArrival) {
    this.delay = Math.round((this.actualArrival - this.estimatedArrival) / (1000 * 60));
  }
  
  return this.save();
};

// Instance method to cancel trip
tripSchema.methods.cancelTrip = function(reason = '') {
  this.status = 'cancelled';
  if (reason) {
    this.notes = this.notes ? `${this.notes}. Cancelled: ${reason}` : `Cancelled: ${reason}`;
  }
  return this.save();
};

// Instance method to update occupancy
tripSchema.methods.updateOccupancy = async function(newOccupancy) {
  const bus = await mongoose.model('Bus').findById(this.busId);
  if (bus && newOccupancy <= bus.capacity) {
    this.occupancy = newOccupancy;
    return this.save();
  }
  throw new Error('Occupancy exceeds bus capacity');
};

// Static method to find trips by date range
tripSchema.statics.findByDateRange = function(startDate, endDate, status = null) {
  const query = {
    departureTime: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('busId', 'busNumber busType capacity')
    .populate('routeId', 'routeNumber routeName startLocation endLocation')
    .sort({ departureTime: 1 });
};

// Static method to find active trips
tripSchema.statics.findActiveTrips = function() {
  return this.find({ status: 'in-progress' })
    .populate('busId', 'busNumber currentLocation')
    .populate('routeId', 'routeNumber routeName startLocation endLocation');
};

// Static method to find trips for a specific bus
tripSchema.statics.findByBus = function(busId, limit = 10) {
  return this.find({ busId })
    .populate('routeId', 'routeNumber routeName startLocation endLocation')
    .sort({ departureTime: -1 })
    .limit(limit);
};

// Pre-save middleware to set status based on time
tripSchema.pre('save', function(next) {
  const now = new Date();
  
  // Auto-set status based on time if not manually set
  if (this.status === 'scheduled' && this.departureTime <= now) {
    this.status = 'in-progress';
    if (!this.actualDeparture) {
      this.actualDeparture = now;
    }
  }
  
  next();
});

module.exports = mongoose.model('Trip', tripSchema);