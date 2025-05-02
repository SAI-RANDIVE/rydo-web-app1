/**
 * RYDO Web App - Simple Server
 * Main server file for Render.com deployment
 * Simplified version without database dependencies
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

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
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  createParentPath: true
}));

// Simple in-memory session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'rydo_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

console.log('Using in-memory session storage');

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Simple API routes with mock data
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: process.env.APP_VERSION || '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Mock authentication route
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: '12345',
      name: 'Demo User',
      role: 'customer'
    },
    token: 'demo-token-12345'
  });
});

// Mock nearby drivers route
app.post('/api/nearby-drivers/find', (req, res) => {
  res.json({
    success: true,
    drivers: [
      {
        id: 'driver1',
        name: 'John Driver',
        profile_image: '/public/images/driver1.jpg',
        distance: '1.2',
        rating: 4.8,
        total_rides: 120,
        vehicle: {
          type: 'sedan',
          make: 'Toyota',
          model: 'Camry'
        }
      },
      {
        id: 'driver2',
        name: 'Sarah Driver',
        profile_image: '/public/images/driver2.jpg',
        distance: '2.5',
        rating: 4.9,
        total_rides: 200,
        vehicle: {
          type: 'suv',
          make: 'Honda',
          model: 'CR-V'
        }
      }
    ]
  });
});

// Mock auth endpoints
app.post('/api/auth/signup', (req, res) => {
  // Get user data from request body
  const { role, first_name, last_name, email, phone, password } = req.body;
  
  console.log(`Creating new user: ${first_name} ${last_name}, Email: ${email}, Role: ${role}`);
  
  // Generate a random token
  const token = 'demo-token-' + Math.random().toString(36).substring(2, 10);
  
  // Return a success response with mock user data
  res.json({
    success: true,
    message: 'User registered successfully',
    token: token,
    user: {
      id: Math.floor(Math.random() * 1000),
      first_name,
      last_name,
      email,
      phone,
      role,
      created_at: new Date().toISOString()
    }
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  // Get login credentials from request body
  const { email, password } = req.body;
  
  console.log(`User login attempt: ${email}`);
  
  // Generate a random token
  const token = 'demo-token-' + Math.random().toString(36).substring(2, 10);
  
  // Return a success response with mock user data
  res.json({
    success: true,
    message: 'Login successful',
    token: token,
    user: {
      id: Math.floor(Math.random() * 1000),
      first_name: 'Demo',
      last_name: 'User',
      email,
      phone: '1234567890',
      role: 'customer',
      created_at: new Date().toISOString()
    }
  });
});

console.log('API routes with mock data initialized');

// Specific routes for static pages
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'terms.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'privacy-policy.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'contact.html'));
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server directly (no async needed for a simple server)
const server = app.listen(PORT, () => {
  console.log(`RYDO Web App server running on port ${PORT}`);
});

// Initialize a simplified Socket.IO for basic real-time features
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Set up simplified Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle mock location updates
  socket.on('updateLocation', (data) => {
    const { userId, latitude, longitude } = data;
    console.log(`Location update for user ${userId}: ${latitude}, ${longitude}`);
    io.emit(`location_${userId}`, { latitude, longitude });
  });
  
  // Handle mock booking updates
  socket.on('bookingUpdate', (data) => {
    const { bookingId, status } = data;
    console.log(`Booking ${bookingId} updated to ${status}`);
    io.emit(`booking_${bookingId}`, { status });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

console.log('Socket.IO initialized with mock handlers');
