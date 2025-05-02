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

// Import MongoDB models
require('../../backend/models/mongodb/User');
require('../../backend/models/mongodb/OTP');

// Import MongoDB controllers
const authController = require('../../backend/controllers/mongodb-authController');

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO Auth API with MongoDB is running'
  });
});

// Auth routes
app.post('/login', authController.login);
app.post('/signup', authController.signup);
app.post('/send-otp', authController.sendOTP);
app.post('/verify-otp', authController.verifyOTP);
app.get('/logout', authController.logout);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Auth API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the serverless function
exports.handler = serverless(app);