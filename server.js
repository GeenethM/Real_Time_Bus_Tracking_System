/**
 * Bus Tracking System API Server
 * Real-Time Bus Tracking System for Inter-Provincial Services - Sri Lanka NTC
 * 
 * @author Your Student ID Here
 * @version 1.0.0
 * @description RESTful API for managing and tracking inter-provincial buses in Sri Lanka
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

// Import configurations
const database = require('./config/database');
const swaggerSpecs = require('./config/swagger');

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound, handleDatabaseError } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busesRoutes');
const routeRoutes = require('./routes/routesRoutes');
const tripRoutes = require('./routes/tripsRoutes');
const trackingRoutes = require('./routes/trackingRoutes');

// Initialize Express app
const app = express();

/**
 * Security Middleware Configuration
 */
// Enable trust proxy for accurate client IP detection
app.set('trust proxy', 1);

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', process.env.CORS_ORIGIN
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

/**
 * General Middleware Configuration
 */
// Request compression
app.use(compression());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', generalLimiter);

// Database error handling
app.use(handleDatabaseError);

/**
 * API Documentation
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Bus Tracking API Documentation',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Bus Tracking API is running', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: database.getConnectionStatus(),
      api: 'operational'
    }
  });
});

/**
 * Welcome Route
 */
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome to Bus Tracking System API', description: 'Real-Time Bus Tracking System for Inter-Provincial Services - Sri Lanka NTC',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      authentication: '/api/auth',
      buses: '/api/buses',
      routes: '/api/routes',
      trips: '/api/trips',
      tracking: '/api/tracking'
    },
    developer: 'Your Student ID Here',
    university: 'Coventry University (via NIBM)'
  });
});

/**
 * API Routes
 */
const API_VERSION = process.env.API_VERSION || 'v1';
const API_BASE = process.env.API_BASE_URL || '/api';

app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/buses`, busRoutes);
app.use(`${API_BASE}/routes`, routeRoutes);
app.use(`${API_BASE}/trips`, tripRoutes);
app.use(`${API_BASE}/tracking`, trackingRoutes);

/**
 * Error Handling
 */
// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

/**
 * Server Startup
 */
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`
🚌 Bus Tracking System API Server Started
================================
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server URL: http://localhost:${PORT}
📚 API Documentation: http://localhost:${PORT}/api-docs
🔗 Base API URL: http://localhost:${PORT}${API_BASE}
⚡ Database: ${database.getConnectionStatus()}
📊 Health Check: http://localhost:${PORT}/health
================================
🎓 Student: Your Student ID Here
🏫 Course: NB6007CEM - Web API Development
🎯 Project: Real-Time Bus Tracking System
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

// const express = require('express');
// const connectDB = require('./config/database');

// const app = express();

// const authRoutes = require('./routes/authRoutes');

// const port = 4000;

// const start = async () => {
//   try {
//     app.listen(port, () => {
//       console.log(`Server is running on http://localhost:${port}`);
//     });
//   } catch (error) {
//     console.error('Error starting server:', error);
//     process.exit(1);
//   }             
// };

// start();

// app.use('/api/auth', authRoutes);

// // connectDB();

// app.get('/', (req, res) => {
//   res.send('Testing');
// });