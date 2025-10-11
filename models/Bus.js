const mongoose = require('mongoose');

/**
 * Bus Schema for the Inter-Provincial Bus Tracking System
 * Represents individual buses operated by different companies
 * 
 * @swagger
 * components:
 *   schemas:
 *     Bus:
 *       type: object
 *       required:
 *         - busNumber
 *         - operatorId
 *         - capacity
 *         - busType
 *       properties:
 *         busNumber:
 *           type: string
 *           description: Unique bus registration number
 *         operatorId:
 *           type: string
 *           description: Reference to the bus operator (User)
 *         capacity:
 *           type: number
 *           description: Maximum passenger capacity
 *         busType:
 *           type: string
 *           enum: [normal, semi-luxury, luxury, air-conditioned]
 *         currentLocation:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 */
const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: [true, 'Bus number is required'], unique: true, trim: true, uppercase: true, match: [/^[A-Z]{2,3}-[0-9]{4}$/, 'Bus number format should be like: ABC-1234'] },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Operator ID is required'], validate: {
      validator: async function(operatorId) {
        const User = mongoose.model('User');
        const operator = await User.findById(operatorId);
        return operator && operator.role === 'operator';
      },
      message: 'Invalid operator ID or user is not an operator'
    }
  },
  capacity: { type: Number, required: [true, 'Bus capacity is required'], min: [10, 'Bus capacity must be at least 10'], max: [100, 'Bus capacity cannot exceed 100'] },
  busType: { type: String, required: [true, 'Bus type is required'], enum: { values: ['normal', 'semi-luxury', 'luxury', 'air-conditioned'], message: 'Bus type must be one of: normal, semi-luxury, luxury, air-conditioned' } },
  currentLocation: { latitude: { type: Number, min: [-90, 'Latitude must be between -90 and 90'], max: [90, 'Latitude must be between -90 and 90']},
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    speed: {
      type: Number,
      min: 0,
      default: 0
    },
    heading: {
      type: Number,
      min: 0,
      max: 360,
      default: 0
    }
  },
  status: { type: String, enum: { values: ['active', 'inactive', 'maintenance'], message: 'Status must be either active, inactive, or maintenance' }, default: 'active' },
  specifications: { make: { type: String, trim: true },
    model: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      min: [2000, 'Year must be 2000 or later'],
      max: [new Date().getFullYear(), 'Year cannot be in the future']
    },
    fuelType: {
      type: String,
      enum: ['diesel', 'petrol', 'cng', 'electric'],
      default: 'diesel'
    }
  },
  features: [{ type: String, enum: ['wifi', 'charging-ports', 'gps', 'cctv', 'air-conditioning', 'entertainment-system'] }],
  lastMaintenance: { type: Date },
  nextMaintenanceDue: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// busSchema.index({ busNumber: 1 });
busSchema.index({ operatorId: 1 });
busSchema.index({ status: 1 });
busSchema.index({ 'currentLocation.lastUpdated': -1 });
busSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

// Virtual for operator details
busSchema.virtual('operator', { ref: 'User', localField: 'operatorId', foreignField: '_id', justOne: true });

// Virtual for current trips
busSchema.virtual('currentTrips', { ref: 'Trip', localField: '_id', foreignField: 'busId', match: { status: { $in: ['scheduled', 'in-progress'] } } });

// Instance method to update location
busSchema.methods.updateLocation = function(latitude, longitude, speed = 0, heading = 0) {
  this.currentLocation = { latitude, longitude, speed, heading, lastUpdated: new Date() };
  return this.save();
};

// Instance method to check if bus is currently on a trip
busSchema.methods.isOnTrip = async function() {
  const Trip = mongoose.model('Trip');
  const activeTrip = await Trip.findOne({ busId: this._id, status: { $in: ['scheduled', 'in-progress'] } });
  return !!activeTrip;
};

// Static method to find buses within a radius
busSchema.statics.findNearby = function(latitude, longitude, radiusInKm = 10) {
  const radiusInRadians = radiusInKm / 6371; // Earth's radius in km
  
  return this.find({
    'currentLocation.latitude': {
      $gte: latitude - radiusInRadians,
      $lte: latitude + radiusInRadians
    },
    'currentLocation.longitude': {
      $gte: longitude - radiusInRadians,
      $lte: longitude + radiusInRadians
    },
    status: 'active'
  });
};

// Static method to find buses by operator
busSchema.statics.findByOperator = function(operatorId) {
  return this.find({ operatorId, isActive: true }).populate('operator', 'fullName companyName');
};

// Pre-save middleware to update maintenance status
busSchema.pre('save', function(next) {
  // If next maintenance is overdue, change status to maintenance
  if (this.nextMaintenanceDue && this.nextMaintenanceDue < new Date() && this.status === 'active') {
    this.status = 'maintenance';
  }
  next();
});

module.exports = mongoose.model('Bus', busSchema);