const express = require('express');
const router = express.Router();

// Import controllers
const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * Public routes (no authentication required)
 */

// User registration
router.post('/register', authLimiter, validateUserRegistration, handleValidationErrors, register );

// User login
router.post('/login', authLimiter, validateUserLogin, handleValidationErrors, login );

/**
 * Protected routes (authentication required)
 */

// Get current user profile
router.get('/profile', authenticate, getProfile );

// Update user profile
router.put('/profile', authenticate, updateProfile );

// Change password
router.put('/change-password', authenticate, changePassword );

module.exports = router;


// const express = require('express');
// const { registerUser, loginUser } = require('../controllers/authController');
// const router = express.Router();

// router.post('/register', registerUser);
// router.post('/login', loginUser);

// module.exports = router;
