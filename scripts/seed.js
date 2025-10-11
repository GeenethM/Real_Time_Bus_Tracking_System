/**
 * Database Seeding Script
 * Run this script to populate the database with sample data
 * 
 * Usage: node scripts/seed.js
 */

require('dotenv').config();
const database = require('../config/database');
const DataSeeder = require('../data/seeder');

async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding process...');
    
    // Connect to database
    await database.connect();
    
    // Create seeder instance and run
    const seeder = new DataSeeder();
    await seeder.seedAll();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📌 You can now start the API server and test the endpoints.');
    console.log('📚 API Documentation: http://localhost:3000/api-docs');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();