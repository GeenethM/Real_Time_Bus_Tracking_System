const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: Password123
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [admin, operator, commuter]
 *                 example: commuter
 *               contactNumber:
 *                 type: string
 *                 example: "+94771234567"
 *               companyName:
 *                 type: string
 *                 description: Required for operators
 *                 example: ABC Bus Company
 *               licenseNumber:
 *                 type: string
 *                 description: Required for operators
 *                 example: LIC123456
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, role, contactNumber, companyName, licenseNumber } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
  }

  // Create user data object
  const userData = { username, email, password, fullName, role, contactNumber };

  // Add operator-specific fields
  if (role === 'operator') {
    userData.companyName = companyName;
    userData.licenseNumber = licenseNumber;
  }

  // Create user
  const user = await User.create(userData);

  // Generate JWT token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  res.status(201).json({ success: true, message: 'User registered successfully', data: { user: {
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    contactNumber: user.contactNumber,
    companyName: user.companyName,
    isActive: user.isActive,
    createdAt: user.createdAt
  }, token
}
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Account inactive
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for verification
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or password' });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is inactive. Please contact administrator.' });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Generate JWT token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  res.status(200).json({ success: true, message: 'Login successful', data: { user: { 
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    contactNumber: user.contactNumber,
    companyName: user.companyName,
    isActive: user.isActive,
    lastLogin: user.lastLogin
  }, token
}
});
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('buses', 'busNumber busType status currentLocation');

  res.status(200).json({ success: true, data: user });
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               companyName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, contactNumber, companyName } = req.body;

  const updateData = {};
  
  if (fullName) updateData.fullName = fullName;
  if (contactNumber) updateData.contactNumber = contactNumber;
  if (companyName && req.user.role === 'operator') updateData.companyName = companyName;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });

  res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

/**
 * Generate JWT Token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' });
};

module.exports = { register, login, getProfile, updateProfile, changePassword };

// const User = require('../models/User');
// const jwt = require('jsonwebtoken');

// // Generate JWT
// const generateToken = (id, role) => {
//   return jwt.sign({ id, role }, process.env.JWT_SECRET, {
//     expiresIn: '7d',
//   });
// };

// // Register user
// exports.registerUser = async (req, res) => {
//   try {
//     const { username, email, password, role } = req.body;

//     // Check if user exists
//     const existing = await User.findOne({ email });
//     if (existing) return res.status(400).json({ message: 'User already exists' });

//     const user = await User.create({ username, email, password, role });

//     res.status(201).json({
//       _id: user._id,
//       username: user.username,
//       email: user.email,
//       role: user.role,
//       token: generateToken(user._id, user.role),
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Login user
// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (user && (await user.matchPassword(password))) {
//       res.json({
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//         token: generateToken(user._id, user.role),
//       });
//     } else {
//       res.status(401).json({ message: 'Invalid credentials' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
