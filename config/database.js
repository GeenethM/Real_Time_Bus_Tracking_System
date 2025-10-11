const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database configuration and connection management
 * Handles MongoDB connection with proper error handling and reconnection logic
 */
class DatabaseConfig {
  constructor() {
    this.connectionString = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_tracking_system';
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise} Database connection promise
   */
  async connect() {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      };

      await mongoose.connect(this.connectionString, options);
      console.log('✅ Database connected successfully');
      
      // Handle connection events
      this.setupConnectionEvents();
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup database connection event handlers
   */
  setupConnectionEvents() {
    mongoose.connection.on('error', (error) => {
      console.error('❌ Database connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Database disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ Database reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📤 Database connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during database shutdown:', error);
        process.exit(1);
      }
    });
  }

  /**
   * Get database connection status
   * @returns {string} Connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }
}

module.exports = new DatabaseConfig();

// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log('MongoDB connected');
//   } catch (error) {
//     console.error('MongoDB connection error:', error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;