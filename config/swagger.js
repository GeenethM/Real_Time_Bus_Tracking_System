const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger API Documentation Configuration
 * Defines OpenAPI 3.0 specification for the Bus Tracking System API
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bus Tracking System API',
      version: '1.0.0',
      description: `
        Real-Time Bus Tracking System for Inter-Provincial Services in Sri Lanka.
        
        This API provides comprehensive tracking and management capabilities for 
        the National Transport Commission (NTC) bus fleet operations.
        
        ## Features
        - Real-time GPS tracking
        - Route management
        - Trip scheduling
        - User authentication
        - Multi-role access control
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. 
        Include the token in the Authorization header as: \`Bearer <token>\`
      `,
      contact: {
        name: 'Student Developer',
        email: 'student@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://your-deployed-api.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme.'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password', 'role'],
          properties: {
            _id: {
              type: 'string',
              description: 'User unique identifier'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['admin', 'operator', 'commuter'],
              description: 'User role in the system'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Bus: {
          type: 'object',
          required: ['busNumber', 'operatorId', 'capacity', 'busType'],
          properties: {
            _id: {
              type: 'string',
              description: 'Bus unique identifier'
            },
            busNumber: {
              type: 'string',
              description: 'Bus registration number'
            },
            operatorId: {
              type: 'string',
              description: 'Bus operator user ID'
            },
            capacity: {
              type: 'number',
              description: 'Bus seating capacity'
            },
            busType: {
              type: 'string',
              enum: ['normal', 'semi-luxury', 'luxury', 'air-conditioned'],
              description: 'Type of bus service'
            },
            currentLocation: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                lastUpdated: { type: 'string', format: 'date-time' }
              }
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance'],
              description: 'Current bus status'
            }
          }
        },
        Route: {
          type: 'object',
          required: ['routeNumber', 'startLocation', 'endLocation', 'distance'],
          properties: {
            _id: {
              type: 'string',
              description: 'Route unique identifier'
            },
            routeNumber: {
              type: 'string',
              description: 'Route identification number'
            },
            startLocation: {
              type: 'string',
              description: 'Starting city/location'
            },
            endLocation: {
              type: 'string',
              description: 'Destination city/location'
            },
            distance: {
              type: 'number',
              description: 'Total route distance in kilometers'
            },
            estimatedDuration: {
              type: 'number',
              description: 'Estimated travel time in minutes'
            },
            waypoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  stopDuration: { type: 'number' }
                }
              }
            }
          }
        },
        Trip: {
          type: 'object',
          required: ['busId', 'routeId', 'departureTime', 'estimatedArrival'],
          properties: {
            _id: {
              type: 'string',
              description: 'Trip unique identifier'
            },
            busId: {
              type: 'string',
              description: 'Bus ID for this trip'
            },
            routeId: {
              type: 'string',
              description: 'Route ID for this trip'
            },
            departureTime: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled departure time'
            },
            estimatedArrival: {
              type: 'string',
              format: 'date-time',
              description: 'Estimated arrival time'
            },
            actualDeparture: {
              type: 'string',
              format: 'date-time',
              description: 'Actual departure time'
            },
            actualArrival: {
              type: 'string',
              format: 'date-time',
              description: 'Actual arrival time'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'delayed'],
              description: 'Current trip status'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Buses',
        description: 'Bus management operations'
      },
      {
        name: 'Routes',
        description: 'Route management and information'
      },
      {
        name: 'Trips',
        description: 'Trip scheduling and management'
      },
      {
        name: 'Tracking',
        description: 'Real-time bus tracking operations'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJsdoc(swaggerOptions);

module.exports = specs;