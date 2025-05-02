const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
// Import the local GetOTP service
const getOTPService = require('./getotp-service');

// Initialize express app
const app = express();

// Database connection
let db = null;

// Initialize database connection
async function initDb() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rydo_db'
    });
    
    console.log('Database connected successfully');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO Auth API is running'
  });
});

// Signup route
app.post('/', async (req, res) => {
  try {
    const { 
      role, 
      first_name, 
      last_name, 
      email, 
      phone, 
      password,
      address,
      city,
      state,
      postal_code,
      country,
      verified,
      verification_type
    } = req.body;
    
    if (!role || !first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required signup information'
      });
    }
    
    // Check if user is verified
    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Phone or email verification is required'
      });
    }
    
    // Initialize database if not already initialized
    if (!db) {
      await initDb();
    }
    
    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }
    
    // Create new user
    const [result] = await db.execute(`
      INSERT INTO users (
        role,
        first_name,
        last_name,
        email,
        phone,
        password,
        address,
        city,
        state,
        postal_code,
        country,
        is_active,
        is_verified,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())
    `, [
      role,
      first_name,
      last_name,
      email,
      phone,
      password, // In a real app, you would hash this password
      address || null,
      city || null,
      state || null,
      postal_code || null,
      country || null
    ]);
    
    if (!result.insertId) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
    
    // Get the created user
    const [users] = await db.execute(`
      SELECT id, role, first_name, last_name, email, phone FROM users WHERE id = ?
    `, [result.insertId]);
    
    if (!users.length) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created user'
      });
    }
    
    const user = users[0];
    
    // If the user is a driver or caretaker, create additional records
    if (role === 'driver') {
      await db.execute(`
        INSERT INTO driver_details (
          user_id,
          license_number,
          license_expiry,
          created_at
        ) VALUES (?, NULL, NULL, NOW())
      `, [user.id]);
      
      await db.execute(`
        INSERT INTO vehicles (
          driver_id,
          vehicle_type,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_color,
          license_plate,
          created_at
        ) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NOW())
      `, [user.id]);
    } else if (role === 'caretaker') {
      await db.execute(`
        INSERT INTO caretaker_details (
          user_id,
          specialization,
          experience_years,
          certification,
          created_at
        ) VALUES (?, NULL, NULL, NULL, NOW())
      `, [user.id]);
    }
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during signup'
    });
  }
});

// Export the serverless function
exports.handler = serverless(app);
