/**
 * RYDO Web App - MongoDB Server
 * Main server file for Render.com deployment
 */

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Import MongoDB models
require('./models/mongodb/User');
require('./models/mongodb/Driver');
require('./models/mongodb/Caretaker');
require('./models/mongodb/Shuttle');
require('./models/mongodb/Booking');
require('./models/mongodb/Payment');
require('./models/mongodb/Rating');
require('./models/mongodb/Notification');
require('./models/mongodb/Wallet');
require('./models/mongodb/OTP');
require('./models/mongodb/Profile');
require('./models/mongodb/VehicleType');

// Import MongoDB services
const trackingService = require('./services/mongodb-tracking-service');
const notificationService = require('./services/mongodb-notification-service');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://rydoapp:RydoApp2025!@rydo-cluster.mongodb.net/rydo_db?retryWrites=true&w=majority';
    console.log('Connecting to MongoDB with URI:', mongoUrl);
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('Please check your MongoDB URI and credentials');
    process.exit(1);
  }
};

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

// Session middleware with MongoDB store
const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://rydoapp:RydoApp2025!@rydo-cluster.mongodb.net/rydo_db?retryWrites=true&w=majority';
console.log('MongoDB URI for session store:', mongoUrl);

app.use(session({
  secret: process.env.SESSION_SECRET || 'rydo_secure_session_key_for_production_2025',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUrl,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native',
    touchAfter: 24 * 3600 // Only update the session once per day unless data changes
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Import MongoDB routes
const authRoutes = require('./routes/mongodb-auth');
const userRoutes = require('./routes/mongodb-user');
const caretakerRoutes = require('./routes/mongodb-caretaker');
const shuttleRoutes = require('./routes/mongodb-shuttle');
const customerRoutes = require('./routes/mongodb-customer');
const paymentRoutes = require('./routes/mongodb-payment');
const trackingRoutes = require('./routes/mongodb-tracking');
const notificationRoutes = require('./routes/notification');
const ratingRoutes = require('./routes/rating');
const bookingRoutes = require('./routes/booking');
const driverRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const nearbyDriversRoutes = require('./routes/nearbyDrivers');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/caretaker', caretakerRoutes);
app.use('/api/shuttle', shuttleRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/nearby-drivers', nearbyDriversRoutes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Initialize services
    await trackingService.initialize();
    await notificationService.initialize();
    
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
    
    // Verify payment signature
    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
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
