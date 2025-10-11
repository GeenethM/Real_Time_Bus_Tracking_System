const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for the Bus Tracking System
 * Supports three types of users: admin (NTC), operator (Bus Companies), commuter (Public)
 * 
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password (hashed)
 *         role:
 *           type: string
 *           enum: [admin, operator, commuter]
 *           description: User role in the system
 *         fullName:
 *           type: string
 *           description: User's full name
 *         contactNumber:
 *           type: string
 *           description: User's contact phone number
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the user account is active
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 */
const userSchema = new mongoose.Schema({
  username: { type: String, required: [true, 'Username is required'], unique: true, trim: true, minlength: [3, 'Username must be at least 3 characters long'], maxlength: [30, 'Username cannot exceed 30 characters'] },
  email: { type: String, required: [true, 'Email is required'], unique: true, trim: true, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'] },
  password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters long'], select: false }, // Don't include password in queries by default
  role: { type: String, required: [true, 'User role is required'], enum: { values: ['admin', 'operator', 'commuter'], message: 'Role must be either admin, operator, or commuter' }, default: 'commuter' },
  fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: [100, 'Full name cannot exceed 100 characters'] },
  contactNumber: { type: String, trim: true, match: [/^(\+94|0)[0-9]{9}$/, 'Please enter a valid Sri Lankan phone number'] },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date}, // Additional fields for bus operators
  companyName: { type: String, required: function() { return this.role === 'operator'; }, trim: true },
  licenseNumber: { type: String, required: function() { return this.role === 'operator'; }, trim: true } }, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ role: 1 });

// Virtual for user's buses (for operators)
userSchema.virtual('buses', { ref: 'Bus', localField: '_id', foreignField: 'operatorId'});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Transform output to remove sensitive information
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { type: String, enum: ['admin', 'operator', 'commuter'], default: 'commuter' }
// });

// // Hash password before saving
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // Compare password for login
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);
