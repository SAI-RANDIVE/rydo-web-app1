const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// Initialize express app
const app = express();

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Connect to MongoDB before handling requests
connectMongoDB();

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

// Session middleware with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'rydo_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO API with MongoDB is running'
  });
});

// Import MongoDB models
require('../../backend/models/mongodb/User');
require('../../backend/models/mongodb/Driver');
require('../../backend/models/mongodb/Caretaker');
require('../../backend/models/mongodb/Shuttle');
require('../../backend/models/mongodb/Booking');
require('../../backend/models/mongodb/Payment');
require('../../backend/models/mongodb/Rating');
require('../../backend/models/mongodb/Notification');
require('../../backend/models/mongodb/Wallet');
require('../../backend/models/mongodb/OTP');

// Import MongoDB controllers
const authController = require('../../backend/controllers/mongodb-authController');
const userController = require('../../backend/controllers/mongodb-userController');
const bookingController = require('../../backend/controllers/mongodb-bookingController');
const paymentController = require('../../backend/controllers/mongodb-paymentController');
const driverController = require('../../backend/controllers/mongodb-driverController');
const caretakerController = require('../../backend/controllers/mongodb-caretakerController');
const shuttleController = require('../../backend/controllers/mongodb-shuttleController');
const ratingController = require('../../backend/controllers/mongodb-ratingController');
const notificationController = require('../../backend/controllers/mongodb-notificationController');
const walletController = require('../../backend/controllers/mongodb-walletController');

// Define API routes
app.post('/auth/login', authController.login);
app.post('/auth/signup', authController.signup);
app.post('/auth/send-otp', authController.sendOTP);
app.post('/auth/verify-otp', authController.verifyOTP);
app.get('/auth/logout', authController.logout);

app.get('/user/profile', userController.getProfile);
app.put('/user/profile', userController.updateProfile);

app.post('/booking/create', bookingController.createBooking);
app.get('/booking/user/:userId', bookingController.getUserBookings);
app.get('/booking/provider/:providerId', bookingController.getProviderBookings);
app.put('/booking/:bookingId/status', bookingController.updateBookingStatus);

app.post('/payment/create', paymentController.createPayment);
app.get('/payment/booking/:bookingId', paymentController.getPaymentByBooking);

app.get('/driver/nearby', driverController.getNearbyDrivers);
app.post('/driver/register', driverController.registerDriver);
app.get('/driver/:driverId', driverController.getDriverProfile);

app.post('/caretaker/register', caretakerController.registerCaretaker);
app.get('/caretaker/nearby', caretakerController.getNearbyCaretakers);
app.get('/caretaker/:caretakerId', caretakerController.getCaretakerProfile);

app.post('/shuttle/register', shuttleController.registerShuttle);
app.get('/shuttle/available', shuttleController.getAvailableShuttles);
app.get('/shuttle/:shuttleId', shuttleController.getShuttleProfile);

app.post('/rating/create', ratingController.createRating);
app.get('/rating/provider/:providerId', ratingController.getProviderRatings);

app.get('/notification/user/:userId', notificationController.getUserNotifications);
app.post('/notification/mark-read/:notificationId', notificationController.markAsRead);

app.get('/wallet/user/:userId', walletController.getUserWallet);
app.post('/wallet/add-funds', walletController.addFunds);
app.post('/wallet/withdraw', walletController.withdrawFunds);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the serverless function
exports.handler = serverless(app);