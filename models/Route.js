const mongoose = require('mongoose');

/**
 * Route Schema for Inter-Provincial Bus Routes in Sri Lanka
 * Defines bus routes between different provinces and cities
 * 
 * @swagger
 * components:
 *   schemas:
 *     Route:
 *       type: object
 *       required:
 *         - routeNumber
 *         - startLocation
 *         - endLocation
 *         - distance
 *       properties:
 *         routeNumber:
 *           type: string
 *           description: Unique route identification number
 *         routeName:
 *           type: string
 *           description: Descriptive name for the route
 *         startLocation:
 *           type: object
 *           properties:
 *             city: 
 *               type: string
 *             province:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude: 
 *                   type: number
 *                 longitude: 
 *                   type: number
 *         endLocation:
 *           type: object
 *           properties:
 *             city: 
 *               type: string
 *             province:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude: 
 *                   type: number
 *                 longitude: 
 *                   type: number
 *         distance:
 *           type: number
 *           description: Total route distance in kilometers
 *         estimatedDuration:
 *           type: number
 *           description: Estimated travel time in minutes
 *         waypoints:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude: 
 *                     type: number
 *                   longitude: 
 *                     type: number
 *               stopDuration:
 *                 type: number
 */
const routeSchema = new mongoose.Schema({
  routeNumber: { type: String, required: [true, 'Route number is required'], unique: true, trim: true, uppercase: true, match: [/^R-[0-9]{3,4}$/, 'Route number format should be like: R-001 or R-1234' ] },
  routeName: { type: String, required: [true, 'Route name is required'], trim: true, maxlength: [100, 'Route name cannot exceed 100 characters'] },
  startLocation: { city: { type: String, required: [true, 'Start city is required'], trim: true },
    province: {
      type: String,
      required: [true, 'Start province is required'],
      enum: [
        'Western', 'Central', 'Southern', 'Northern', 'Eastern',
        'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
      ]
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Start location latitude is required'],
        min: [5.5, 'Latitude must be within Sri Lanka bounds'],
        max: [10.0, 'Latitude must be within Sri Lanka bounds']
      },
      longitude: {
        type: Number,
        required: [true, 'Start location longitude is required'],
        min: [79.0, 'Longitude must be within Sri Lanka bounds'],
        max: [82.0, 'Longitude must be within Sri Lanka bounds']
      }
    }
  },
  endLocation: {
    city: {
      type: String,
      required: [true, 'End city is required'],
      trim: true
    },
    province: {
      type: String,
      required: [true, 'End province is required'],
      enum: [
        'Western', 'Central', 'Southern', 'Northern', 'Eastern',
        'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
      ]
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'End location latitude is required'],
        min: [5.5, 'Latitude must be within Sri Lanka bounds'],
        max: [10.0, 'Latitude must be within Sri Lanka bounds']
      },
      longitude: {
        type: Number,
        required: [true, 'End location longitude is required'],
        min: [79.0, 'Longitude must be within Sri Lanka bounds'],
        max: [82.0, 'Longitude must be within Sri Lanka bounds']
      }
    }
  },
  distance: { type: Number, required: [true, 'Route distance is required'], min: [1, 'Distance must be at least 1 km'], max: [500, 'Distance cannot exceed 500 km'] },
  estimatedDuration: { type: Number, required: [true, 'Estimated duration is required'], min: [30, 'Duration must be at least 30 minutes'], max: [720, 'Duration cannot exceed 12 hours'] },
  waypoints: [{
    name: {
      type: String,
      required: [true, 'Waypoint name is required'],
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Waypoint latitude is required'],
        min: [5.5, 'Latitude must be within Sri Lanka bounds'],
        max: [10.0, 'Latitude must be within Sri Lanka bounds']
      },
      longitude: {
        type: Number,
        required: [true, 'Waypoint longitude is required'],
        min: [79.0, 'Longitude must be within Sri Lanka bounds'],
        max: [82.0, 'Longitude must be within Sri Lanka bounds']
      }
    },
    stopDuration: {
      type: Number,
      default: 5,
      min: [0, 'Stop duration cannot be negative'],
      max: [60, 'Stop duration cannot exceed 60 minutes']
    },
    distanceFromStart: {
      type: Number,
      min: 0
    }
  }],
  routeType: { type: String, enum: ['express', 'semi-express', 'normal'], default: 'normal' },
  operatingHours: {
    startTime: {
      type: String,
      required: [true, 'Operating start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
    },
    endTime: {
      type: String,
      required: [true, 'Operating end time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
    }
  },
  frequency: { type: Number, required: [true, 'Service frequency is required'], min: [15, 'Frequency must be at least 15 minutes'], max: [480, 'Frequency cannot exceed 8 hours'] },
  baseFare: { type: Number, required: [true, 'Base fare is required'], min: [10, 'Base fare must be at least Rs. 10'], max: [5000, 'Base fare cannot exceed Rs. 5000'] },
  isActive: { type: Boolean, default: true },
  difficulty: { type: String, enum: ['easy', 'moderate', 'difficult'], default: 'moderate', description: 'Route difficulty based on terrain and traffic' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// routeSchema.index({ routeNumber: 1 });
routeSchema.index({ 'startLocation.city': 1, 'endLocation.city': 1 });
routeSchema.index({ 'startLocation.province': 1, 'endLocation.province': 1 });
routeSchema.index({ isActive: 1 });

// Virtual for route description
routeSchema.virtual('description').get(function() {
  return `${this.startLocation.city} to ${this.endLocation.city} (${this.distance}km)`;
});

// Virtual for active trips on this route
routeSchema.virtual('activeTrips', {
  ref: 'Trip',
  localField: '_id',
  foreignField: 'routeId',
  match: { status: { $in: ['scheduled', 'in-progress'] } }
});

// Instance method to check if route is inter-provincial
routeSchema.methods.isInterProvincial = function() {
  return this.startLocation.province !== this.endLocation.province;
};

// Instance method to calculate fare based on distance
routeSchema.methods.calculateFare = function(busType = 'normal') {
  const multipliers = { 'normal': 1.0, 'semi-luxury': 1.3, 'luxury': 1.6, 'air-conditioned': 1.8 };
  
  const baseRate = this.baseFare / this.distance; // per km rate
  return Math.round(this.distance * baseRate * (multipliers[busType] || 1.0));
};

// Static method to find routes between provinces
routeSchema.statics.findInterProvincialRoutes = function(startProvince, endProvince) {
  const query = { isActive: true };
  
  if (startProvince) {
    query['startLocation.province'] = startProvince;
  }
  
  if (endProvince) {
    query['endLocation.province'] = endProvince;
  }
  
  return this.find(query).sort({ distance: 1 });
};

// Static method to find routes by city
routeSchema.statics.findByCity = function(city) {
  return this.find({
    $or: [
      { 'startLocation.city': new RegExp(city, 'i') },
      { 'endLocation.city': new RegExp(city, 'i') }
    ],
    isActive: true
  });
};

// Pre-save middleware to sort waypoints by distance from start
routeSchema.pre('save', function(next) {
  if (this.waypoints && this.waypoints.length > 0) {
    this.waypoints.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
  }
  next();
});

module.exports = mongoose.model('Route', routeSchema);