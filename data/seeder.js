const mongoose = require('mongoose');
const User = require('../models/User');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');

// Sample data
const users = require('./users.json');
const routes = require('./routes.json');

/**
 * Data Seeder for Bus Tracking System
 * Populates the database with initial sample data for demonstration
 */
class DataSeeder {
  constructor() {
    this.users = [];
    this.routes = [];
    this.buses = [];
    this.trips = [];
  }

  /**
   * Seed all data
   */
  async seedAll() {
    try {
      console.log('🌱 Starting data seeding...');
      
      // Clear existing data
      await this.clearData();
      
      // Seed data in order
      await this.seedUsers();
      await this.seedRoutes();
      await this.seedBuses();
      await this.seedTrips();
      
      console.log('✅ Data seeding completed successfully!');
      console.log(`📊 Created: ${this.users.length} users, ${this.routes.length} routes, ${this.buses.length} buses, ${this.trips.length} trips`);
      
    } catch (error) {
      console.error('❌ Data seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear existing data
   */
  async clearData() {
    console.log('🧹 Clearing existing data...');
    await Trip.deleteMany({});
    await Bus.deleteMany({});
    await Route.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Existing data cleared');
  }

  /**
   * Seed users
   */
  async seedUsers() {
    console.log('👥 Seeding users...');
    this.users = await User.insertMany(users);
    console.log(`✅ Created ${this.users.length} users`);
  }

  /**
   * Seed routes
   */
  async seedRoutes() {
    console.log('🛣️ Seeding routes...');
    this.routes = await Route.insertMany(routes);
    console.log(`✅ Created ${this.routes.length} routes`);
  }

  /**
   * Seed buses
   */
  async seedBuses() {
    console.log('🚌 Seeding buses...');
    
    const operators = this.users.filter(user => user.role === 'operator');
    const busData = [];

    // Generate buses for each operator
    operators.forEach((operator, operatorIndex) => {
      const busCount = 5; // 5 buses per operator
      
      for (let i = 0; i < busCount; i++) {
        const busNumber = `${this.generateBusPrefix(operatorIndex)}-${String(1000 + (operatorIndex * 100) + i).padStart(4, '0')}`;
        
        busData.push({
          busNumber,
          operatorId: operator._id,
          capacity: this.getRandomCapacity(),
          busType: this.getRandomBusType(),
          currentLocation: this.getRandomSriLankanLocation(),
          status: 'active',
          specifications: {
            make: this.getRandomMake(),
            model: this.getRandomModel(),
            year: this.getRandomYear(),
            fuelType: 'diesel'
          },
          features: this.getRandomFeatures(),
          isActive: true
        });
      }
    });

    this.buses = await Bus.insertMany(busData);
    console.log(`✅ Created ${this.buses.length} buses`);
  }

  /**
   * Seed trips
   */
  async seedTrips() {
    console.log('🎫 Seeding trips...');
    
    const tripData = [];
    const today = new Date();
    
    // Generate trips for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      
      // Generate trips for each route
      this.routes.forEach(route => {
        const availableBuses = this.buses.slice(0, 3); // Use first 3 buses for variety
        
        // Generate 3-5 trips per day per route
        const tripsPerDay = Math.floor(Math.random() * 3) + 3;
        
        for (let trip = 0; trip < tripsPerDay; trip++) {
          const bus = availableBuses[trip % availableBuses.length];
          const departureTime = this.generateDepartureTime(currentDate, route, trip);
          const estimatedArrival = new Date(departureTime.getTime() + (route.estimatedDuration * 60000));
          
          // Determine trip status based on time
          let status = 'scheduled';
          let actualDeparture = null;
          let actualArrival = null;
          
          if (departureTime < new Date()) {
            if (estimatedArrival < new Date()) {
              status = 'completed';
              actualDeparture = new Date(departureTime.getTime() + (Math.random() * 30 - 15) * 60000); // ±15 minutes
              actualArrival = new Date(estimatedArrival.getTime() + (Math.random() * 60 - 30) * 60000); // ±30 minutes
            } else {
              status = 'in-progress';
              actualDeparture = new Date(departureTime.getTime() + (Math.random() * 20 - 10) * 60000); // ±10 minutes
            }
          }
          
          tripData.push({
            busId: bus._id,
            routeId: route._id,
            departureTime,
            estimatedArrival,
            actualDeparture,
            actualArrival,
            status,
            occupancy: Math.floor(Math.random() * bus.capacity * 0.8), // Random occupancy up to 80%
            fare: route.calculateFare(bus.busType),
            delay: actualDeparture ? Math.round((actualDeparture - departureTime) / 60000) : 0,
            currentWaypoint: status === 'in-progress' ? Math.floor(Math.random() * route.waypoints.length) : 0,
            driver: {
              name: this.getRandomDriverName(),
              licenseNumber: `DL${Math.floor(Math.random() * 900000) + 100000}`,
              contactNumber: `+9477${Math.floor(Math.random() * 9000000) + 1000000}`
            },
            conductor: {
              name: this.getRandomConductorName(),
              employeeId: `EMP${Math.floor(Math.random() * 9000) + 1000}`
            },
            weather: {
              condition: this.getRandomWeather(),
              temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
              recorded: departureTime
            }
          });
        }
      });
    }

    this.trips = await Trip.insertMany(tripData);
    console.log(`✅ Created ${this.trips.length} trips`);
  }

  /**
   * Helper methods
   */
  generateBusPrefix(operatorIndex) {
    const prefixes = ['ABC', 'EXP', 'GAR', 'CTS', 'ISL'];
    return prefixes[operatorIndex] || 'BUS';
  }

  getRandomCapacity() {
    const capacities = [35, 45, 52, 60, 72];
    return capacities[Math.floor(Math.random() * capacities.length)];
  }

  getRandomBusType() {
    const types = ['normal', 'semi-luxury', 'luxury', 'air-conditioned'];
    const weights = [0.4, 0.3, 0.2, 0.1]; // More normal buses
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return types[i];
      }
    }
    return types[0];
  }

  getRandomSriLankanLocation() {
    const locations = [
      { latitude: 6.9271, longitude: 79.8612 }, // Colombo
      { latitude: 7.2906, longitude: 80.6337 }, // Kandy
      { latitude: 6.0535, longitude: 80.2210 }, // Galle
      { latitude: 9.6615, longitude: 80.0255 }, // Jaffna
      { latitude: 7.7102, longitude: 81.6924 }, // Batticaloa
      { latitude: 6.9895, longitude: 81.0557 }, // Badulla
      { latitude: 7.4867, longitude: 80.3647 }, // Kurunegala
      { latitude: 8.3114, longitude: 80.4037 }  // Anuradhapura
    ];
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    return {
      latitude: location.latitude + (Math.random() - 0.5) * 0.1, // Add small variation
      longitude: location.longitude + (Math.random() - 0.5) * 0.1,
      lastUpdated: new Date(),
      speed: Math.floor(Math.random() * 80), // 0-80 km/h
      heading: Math.floor(Math.random() * 360) // 0-360 degrees
    };
  }

  getRandomMake() {
    const makes = ['Tata', 'Ashok Leyland', 'Mahindra', 'Isuzu', 'Mitsubishi'];
    return makes[Math.floor(Math.random() * makes.length)];
  }

  getRandomModel() {
    const models = ['LP 407', 'Viking', 'Tourister', 'Rosa', 'Coaster'];
    return models[Math.floor(Math.random() * models.length)];
  }

  getRandomYear() {
    return Math.floor(Math.random() * 10) + 2015; // 2015-2024
  }

  getRandomFeatures() {
    const allFeatures = ['wifi', 'charging-ports', 'gps', 'cctv', 'air-conditioning', 'entertainment-system'];
    const featureCount = Math.floor(Math.random() * 4) + 1; // 1-4 features
    const shuffled = allFeatures.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, featureCount);
  }

  generateDepartureTime(date, route, tripIndex) {
    const startHour = parseInt(route.operatingHours.startTime.split(':')[0]);
    const endHour = parseInt(route.operatingHours.endTime.split(':')[0]);
    const operatingHours = endHour - startHour;
    
    const hourInterval = operatingHours / 4; // Distribute trips throughout the day
    const departureHour = startHour + (tripIndex * hourInterval) + (Math.random() * 2 - 1); // Add variation
    
    const departure = new Date(date);
    departure.setHours(Math.max(startHour, Math.min(endHour, Math.floor(departureHour))));
    departure.setMinutes(Math.floor(Math.random() * 60));
    departure.setSeconds(0);
    departure.setMilliseconds(0);
    
    return departure;
  }

  getRandomDriverName() {
    const names = [
      'Sunil Perera', 'Kamal Silva', 'Bandula Fernando', 'Nihal Jayawardena',
      'Ranjith Mendis', 'Chaminda Wickrama', 'Priyantha Dias', 'Ajith Gunawardena',
      'Tissa Rathnayake', 'Mahinda Samaraweera', 'Sampath Wijesinghe', 'Ruwan Perera'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomConductorName() {
    const names = [
      'Janaka Perera', 'Lalith Silva', 'Nimal Fernando', 'Rohan Jayawardena',
      'Asitha Mendis', 'Gayan Wickrama', 'Nuwan Dias', 'Sandun Gunawardena',
      'Indika Rathnayake', 'Dasun Samaraweera', 'Chathura Wijesinghe', 'Dilshan Perera'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomWeather() {
    const conditions = ['clear', 'cloudy', 'rainy', 'foggy'];
    const weights = [0.4, 0.3, 0.2, 0.1]; // More clear days
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < conditions.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return conditions[i];
      }
    }
    return conditions[0];
  }
}

module.exports = DataSeeder;