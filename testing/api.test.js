const request = require('supertest');
const app = require('../server');
const database = require('../config/database');
const mongoose = require('mongoose');

describe('Bus Tracking API', () => {
  let authToken;
  let adminToken;
  let operatorToken;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    test('GET /health should return API status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Bus Tracking API is running');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/register should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        fullName: 'Test User',
        role: 'commuter',
        contactNumber: '+94771234567'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      
      authToken = response.body.data.token;
    });

    test('POST /api/auth/login should authenticate user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    test('GET /api/auth/profile should return user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });
  });

  describe('Routes', () => {
    test('GET /api/routes should return all routes', async () => {
      const response = await request(app)
        .get('/api/routes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.routes).toBeDefined();
      expect(Array.isArray(response.body.data.routes)).toBe(true);
    });

    test('GET /api/routes/search should search routes by city', async () => {
      const response = await request(app)
        .get('/api/routes/search?city=Colombo')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Buses', () => {
    test('GET /api/buses should require authentication', async () => {
      await request(app)
        .get('/api/buses')
        .expect(401);
    });

    test('GET /api/buses with auth should return buses', async () => {
      const response = await request(app)
        .get('/api/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.buses).toBeDefined();
    });

    test('GET /api/buses/nearby should return nearby buses', async () => {
      const response = await request(app)
        .get('/api/buses/nearby?latitude=6.9271&longitude=79.8612&radius=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Tracking', () => {
    test('GET /api/tracking/bus/:busId should return bus location', async () => {
      // This test would need a valid bus ID from seeded data
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/api/tracking/bus/invalidid')
        .expect(400); // Invalid ObjectId format

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('POST /api/auth/login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});