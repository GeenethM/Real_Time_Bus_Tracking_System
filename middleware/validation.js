const { body, param, query } = require('express-validator');

/**
 * User Registration Validation---------------------------------------------------------------------------------validateUserRegistration
 */
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['admin', 'operator', 'commuter'])
    .withMessage('Role must be either admin, operator, or commuter'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('contactNumber')
    .optional()
    .matches(/^(\+94|0)[0-9]{9}$/)
    .withMessage('Please provide a valid Sri Lankan phone number'),
  
  // Additional validation for operators
  body('companyName')
    .if(body('role').equals('operator'))
    .notEmpty()
    .withMessage('Company name is required for operators'),
  
  body('licenseNumber')
    .if(body('role').equals('operator'))
    .notEmpty()
    .withMessage('License number is required for operators')
];

/**
 * User Login Validation-----------------------------------------------------------------------------------------------validateUserLogin
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Bus Creation/Update Validation-------------------------------------------------------------------------------------------validateBus
 */
const validateBus = [
  body('busNumber')
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{2,3}-[0-9]{4}$/)
    .withMessage('Bus number format should be like: ABC-1234'),
  
  body('capacity')
    .isInt({ min: 10, max: 100 })
    .withMessage('Bus capacity must be between 10 and 100'),
  
  body('busType')
    .isIn(['normal', 'semi-luxury', 'luxury', 'air-conditioned'])
    .withMessage('Bus type must be one of: normal, semi-luxury, luxury, air-conditioned'),
  
  body('specifications.make')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),
  
  body('specifications.model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),
  
  body('specifications.year')
    .optional()
    .isInt({ min: 2000, max: new Date().getFullYear() })
    .withMessage(`Year must be between 2000 and ${new Date().getFullYear()}`),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  
  body('features.*')
    .optional()
    .isIn(['wifi', 'charging-ports', 'gps', 'cctv', 'air-conditioning', 'entertainment-system'])
    .withMessage('Invalid feature specified')
];

/**
 * Route Creation/Update Validation----------------------------------------------------------------------------------------validateRoute
 */
const validateRoute = [
  body('routeNumber')
    .trim()
    .toUpperCase()
    .matches(/^R-[0-9]{3,4}$/)
    .withMessage('Route number format should be like: R-001 or R-1234'),
  
  body('routeName')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Route name must be between 5 and 100 characters'),
  
  body('startLocation.city')
    .trim()
    .notEmpty()
    .withMessage('Start city is required'),
  
  body('startLocation.province')
    .isIn(['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'])
    .withMessage('Invalid start province'),
  
  body('startLocation.coordinates.latitude')
    .isFloat({ min: 5.5, max: 10.0 })
    .withMessage('Start latitude must be within Sri Lanka bounds (5.5 to 10.0)'),
  
  body('startLocation.coordinates.longitude')
    .isFloat({ min: 79.0, max: 82.0 })
    .withMessage('Start longitude must be within Sri Lanka bounds (79.0 to 82.0)'),
  
  body('endLocation.city')
    .trim()
    .notEmpty()
    .withMessage('End city is required'),
  
  body('endLocation.province')
    .isIn(['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'])
    .withMessage('Invalid end province'),
  
  body('endLocation.coordinates.latitude')
    .isFloat({ min: 5.5, max: 10.0 })
    .withMessage('End latitude must be within Sri Lanka bounds (5.5 to 10.0)'),
  
  body('endLocation.coordinates.longitude')
    .isFloat({ min: 79.0, max: 82.0 })
    .withMessage('End longitude must be within Sri Lanka bounds (79.0 to 82.0)'),
  
  body('distance')
    .isFloat({ min: 1, max: 500 })
    .withMessage('Distance must be between 1 and 500 km'),
  
  body('estimatedDuration')
    .isInt({ min: 30, max: 720 })
    .withMessage('Estimated duration must be between 30 and 720 minutes'),
  
  body('operatingHours.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time format should be HH:MM'),
  
  body('operatingHours.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time format should be HH:MM'),
  
  body('frequency')
    .isInt({ min: 15, max: 480 })
    .withMessage('Frequency must be between 15 and 480 minutes'),
  
  body('baseFare')
    .isFloat({ min: 10, max: 5000 })
    .withMessage('Base fare must be between Rs. 10 and Rs. 5000')
];

/**
 * Trip Creation/Update Validation------------------------------------------------------------------------------------------validateTrip
 */
const validateTrip = [
  body('busId')
    .isMongoId()
    .withMessage('Invalid bus ID'),
  
  body('routeId')
    .isMongoId()
    .withMessage('Invalid route ID'),
  
  body('departureTime')
    .isISO8601()
    .withMessage('Invalid departure time format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Departure time must be in the future');
      }
      return true;
    }),
  
  body('estimatedArrival')
    .isISO8601()
    .withMessage('Invalid estimated arrival time format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.departureTime)) {
        throw new Error('Estimated arrival must be after departure time');
      }
      return true;
    }),
  
  body('fare')
    .isFloat({ min: 0 })
    .withMessage('Fare must be a positive number'),
  
  body('driver.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Driver name cannot exceed 100 characters'),
  
  body('driver.licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('License number cannot exceed 20 characters'),
  
  body('driver.contactNumber')
    .optional()
    .matches(/^(\+94|0)[0-9]{9}$/)
    .withMessage('Invalid phone number format')
];

/**
 * Location Update Validation-------------------------------------------------------------------------------------validateLocationUpdate
 */
const validateLocationUpdate = [
  body('latitude')
    .isFloat({ min: 5.5, max: 10.0 })
    .withMessage('Latitude must be within Sri Lanka bounds (5.5 to 10.0)'),
  
  body('longitude')
    .isFloat({ min: 79.0, max: 82.0 })
    .withMessage('Longitude must be within Sri Lanka bounds (79.0 to 82.0)'),
  
  body('speed')
    .optional()
    .isFloat({ min: 0, max: 200 })
    .withMessage('Speed must be between 0 and 200 km/h'),
  
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360 degrees')
];

/**
 * MongoDB ObjectID Validation------------------------------------------------------------------------------------------validateObjectId
 */
const validateObjectId = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`)
];

/**
 * Pagination Validation----------------------------------------------------------------------------------------------validatePagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .matches(/^[a-zA-Z_]+(,[a-zA-Z_]+)*$/)
    .withMessage('Sort format should be: field1,field2,...')
];

module.exports = { validateUserRegistration, validateUserLogin, validateBus, validateRoute, validateTrip, validateLocationUpdate, validateObjectId, validatePagination };