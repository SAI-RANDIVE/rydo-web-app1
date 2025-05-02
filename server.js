/**
 * RYDO Web App - Unified Server
 * Main server file for Render.com deployment
 * Supports both MongoDB and MySQL databases
 */

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Import the unified database interface
const db = require('./backend/config/db');

// Conditionally import models based on database configuration
const useMongoDb = process.env.USE_MONGODB === 'true' || !!process.env.MONGODB_URI;
const useMySql = process.env.USE_MYSQL === 'true' || !!process.env.DB_HOST;

// Import services with conditional loading
let trackingService, notificationService;

if (useMongoDb) {
  // Import MongoDB models if MongoDB is enabled
  try {
    require('./backend/models/mongodb/User');
    require('./backend/models/mongodb/Driver');
    require('./backend/models/mongodb/Caretaker');
    require('./backend/models/mongodb/Shuttle');
    require('./backend/models/mongodb/Booking');
    require('./backend/models/mongodb/Payment');
    require('./backend/models/mongodb/Rating');
    require('./backend/models/mongodb/Notification');
    require('./backend/models/mongodb/Wallet');
    require('./backend/models/mongodb/OTP');
    require('./backend/models/mongodb/Profile');
    require('./backend/models/mongodb/VehicleType');
    
    // Import MongoDB services
    trackingService = require('./backend/services/mongodb-tracking-service');
    notificationService = require('./backend/services/mongodb-notification-service');
  } catch (error) {
    console.warn('Error loading MongoDB models:', error.message);
  }
}

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

// Session middleware with appropriate store based on database configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'rydo_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
};

// Use MongoDB for session store if MongoDB is enabled
if (useMongoDb && process.env.MONGODB_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native'
    });
    console.log('Using MongoDB for session storage');
  } catch (error) {
    console.warn('Error setting up MongoDB session store:', error.message);
    // Will fall back to memory store
  }
}

app.use(session(sessionConfig));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Import routes based on database configuration
let authRoutes, userRoutes, caretakerRoutes, shuttleRoutes, customerRoutes;
let paymentRoutes, trackingRoutes, notificationRoutes, ratingRoutes;
let bookingRoutes, driverRoutes, walletRoutes, nearbyDriversRoutes;

// Load appropriate routes based on database configuration
if (useMongoDb) {
  try {
    // Import MongoDB routes - using try/catch for each route to prevent one missing route from breaking everything
    try { authRoutes = require('./backend/routes/mongodb-auth'); } catch (e) { console.log('Auth routes not found:', e.message); }
    try { userRoutes = require('./backend/routes/mongodb-user'); } catch (e) { console.log('User routes not found:', e.message); }
    try { caretakerRoutes = require('./backend/routes/mongodb-caretaker'); } catch (e) { console.log('Caretaker routes not found:', e.message); }
    try { shuttleRoutes = require('./backend/routes/mongodb-shuttle'); } catch (e) { console.log('Shuttle routes not found:', e.message); }
    try { customerRoutes = require('./backend/routes/mongodb-customer'); } catch (e) { console.log('Customer routes not found:', e.message); }
    try { paymentRoutes = require('./backend/routes/mongodb-payment'); } catch (e) { console.log('Payment routes not found:', e.message); }
    try { trackingRoutes = require('./backend/routes/mongodb-tracking'); } catch (e) { console.log('Tracking routes not found:', e.message); }
    try { notificationRoutes = require('./routes/notification'); } catch (e) {
      try { notificationRoutes = require('./backend/routes/notification'); } catch (e2) {
        console.log('Notification routes not found in either location');
      }
    }
    try { ratingRoutes = require('./backend/routes/mongodb-rating'); } catch (e) { console.log('Rating routes not found:', e.message); }
    try { bookingRoutes = require('./backend/routes/mongodb-booking'); } catch (e) { console.log('Booking routes not found:', e.message); }
    try { driverRoutes = require('./backend/routes/mongodb-driver'); } catch (e) { console.log('Driver routes not found:', e.message); }
    try { walletRoutes = require('./backend/routes/mongodb-wallet'); } catch (e) { console.log('Wallet routes not found:', e.message); }
    try { nearbyDriversRoutes = require('./backend/routes/mongodb-nearbyDrivers'); } catch (e) {
      try { nearbyDriversRoutes = require('./routes/nearbyDrivers'); } catch (e2) {
        console.log('NearbyDrivers routes not found in either location');
      }
    }
    console.log('MongoDB routes loaded successfully');
  } catch (error) {
    console.error('Error in route loading process:', error.message);
  }
} else if (useMySql) {
  try {
    // Import MySQL routes (assuming they follow a similar naming convention)
    authRoutes = require('./routes/auth');
    userRoutes = require('./routes/user');
    // Try to load the nearbyDrivers route from the correct location
    try {
      nearbyDriversRoutes = require('./routes/nearbyDrivers');
      console.log('Loaded nearbyDrivers route from /routes');
    } catch (error) {
      try {
        nearbyDriversRoutes = require('./backend/routes/nearbyDrivers');
        console.log('Loaded nearbyDrivers route from /backend/routes');
      } catch (subError) {
        console.error('Could not load nearbyDrivers route:', subError.message);
      }
    }
    console.log('MySQL routes loaded successfully');
  } catch (error) {
    console.error('Error loading MySQL routes:', error.message);
  }
}

// API Routes - only register routes that were successfully loaded
if (authRoutes) app.use('/api/auth', authRoutes);
if (userRoutes) app.use('/api/user', userRoutes);
if (caretakerRoutes) app.use('/api/caretaker', caretakerRoutes);
if (shuttleRoutes) app.use('/api/shuttle', shuttleRoutes);
if (customerRoutes) app.use('/api/customer', customerRoutes);
if (paymentRoutes) app.use('/api/payment', paymentRoutes);
if (trackingRoutes) app.use('/api/tracking', trackingRoutes);
if (notificationRoutes) app.use('/api/notification', notificationRoutes);
if (ratingRoutes) app.use('/api/rating', ratingRoutes);
if (bookingRoutes) app.use('/api/booking', bookingRoutes);
if (driverRoutes) app.use('/api/driver', driverRoutes);
if (walletRoutes) app.use('/api/wallet', walletRoutes);
if (nearbyDriversRoutes) app.use('/api/nearby-drivers', nearbyDriversRoutes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server
const startServer = async () => {
  try {
    // Connect to the database using the unified interface
    await db.connect();
    
    // Initialize services only if they exist
    if (trackingService && typeof trackingService.initialize === 'function') {
      await trackingService.initialize();
    }
    
    if (notificationService && typeof notificationService.initialize === 'function') {
      await notificationService.initialize();
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`RYDO Web App server running on port ${PORT}`);
    });
    
    // Initialize Socket.IO for real-time features
    const io = require('socket.io')(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Set up Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('New client connected');
      
      // Handle tracking updates
      socket.on('updateLocation', async (data) => {
        try {
          const { userId, latitude, longitude } = data;
          await trackingService.updateLocation(userId, latitude, longitude);
          io.emit(`location_${userId}`, { latitude, longitude });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      });
      
      // Handle booking updates
      socket.on('bookingUpdate', async (data) => {
        try {
          const { bookingId, status, userId, providerId } = data;
          io.emit(`booking_${bookingId}`, { status });
          
          // Send notification to user and provider
          if (userId) {
            await notificationService.createNotification(
              userId,
              'Booking Update',
              `Your booking status has been updated to ${status}`,
              'booking'
            );
          }
          
          if (providerId) {
            await notificationService.createNotification(
              providerId,
              'Booking Update',
              `Booking #${bookingId} status has been updated to ${status}`,
              'booking'
            );
          }
        } catch (error) {
          console.error('Error updating booking:', error);
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
