/**
 * RYDO Web App - MongoDB Netlify Deployment Script
 * This script prepares the application for Netlify deployment with MongoDB integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n========================================');
console.log('  RYDO WEB APP - MONGODB NETLIFY DEPLOYMENT');
console.log('========================================\n');

// Create MongoDB-specific Netlify functions
console.log('Creating MongoDB-specific Netlify functions...');

// Create the api.js function
const apiFunction = `const express = require('express');
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
    message: \`Route \${req.method} \${req.url} not found\`
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
exports.handler = serverless(app);`;

// Create the auth.js function
const authFunction = `const express = require('express');
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
    message: \`Route \${req.method} \${req.url} not found\`
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
exports.handler = serverless(app);`;

// Create the verification.js function
const verificationFunction = `const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// Import MongoDB models
require('../../backend/models/mongodb/OTP');

// Import MongoDB OTP service
const otpService = require('../../functions/mongodb-otp-service');

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO Verification API with MongoDB is running'
  });
});

// Verification routes
app.post('/send-phone-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await otpService.sendPhoneOTP(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP', message: error.message });
  }
});

app.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await otpService.sendEmailOTP(email);
    res.json(result);
  } catch (error) {
    console.error('Error sending email OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP', message: error.message });
  }
});

app.post('/verify-otp', async (req, res) => {
  try {
    const { requestId, otp } = req.body;
    
    if (!requestId || !otp) {
      return res.status(400).json({ error: 'Request ID and OTP are required' });
    }
    
    const result = await otpService.verifyOTP(requestId, otp);
    res.json(result);
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP', message: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: \`Route \${req.method} \${req.url} not found\`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Verification API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the serverless function
exports.handler = serverless(app);`;

// Ensure the functions directory exists
if (!fs.existsSync('netlify/functions')) {
  fs.mkdirSync('netlify/functions', { recursive: true });
}

// Write the functions
fs.writeFileSync('netlify/functions/api.js', apiFunction);
fs.writeFileSync('netlify/functions/auth.js', authFunction);
fs.writeFileSync('netlify/functions/verification.js', verificationFunction);

console.log('MongoDB-specific Netlify functions created successfully');

// Create a clean netlify.toml file
console.log('\nCreating clean Netlify configuration...');
const netlifyToml = `[build]
  publish = "frontend"
  functions = "netlify/functions"
  command = "node netlify-deploy.js"
  
[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "production"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/auth/*"
  to = "/.netlify/functions/auth/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/verification/*"
  to = "/.netlify/functions/verification/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

fs.writeFileSync('netlify.toml', netlifyToml);
console.log('Clean Netlify configuration created successfully');

// Create a safe .env.production file
console.log('\nCreating safe environment variables file...');
const envProduction = `# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rydo_db?retryWrites=true&w=majority

# Server Configuration
PORT=3002
NODE_ENV=production

# Session Configuration
SESSION_SECRET=rydo_secure_session_key_for_production_2025

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Razorpay Configuration (for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_COMMISSION_PERCENTAGE=7.5

# Email Configuration for OTP Verification
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
`;

fs.writeFileSync('.env.production', envProduction);
console.log('Safe environment variables file created successfully');

// Print deployment steps
console.log('\n========================================');
console.log('  DEPLOYMENT STEPS');
console.log('========================================');
console.log('1. Run: netlify login (if not already logged in)');
console.log('2. Run: netlify deploy --prod');
console.log('3. After deployment, set environment variables in the Netlify dashboard:');
console.log('   - MONGODB_URI: Your MongoDB connection string');
console.log('   - SESSION_SECRET: A secure random string');
console.log('   - GOOGLE_MAPS_API_KEY: Your Google Maps API key');
console.log('   - EMAIL_SERVICE: gmail');
console.log('   - EMAIL_USER: Your email for sending OTPs');
console.log('   - EMAIL_PASSWORD: Your app password');
console.log('   - RAZORPAY_KEY_ID: Your Razorpay key ID');
console.log('   - RAZORPAY_KEY_SECRET: Your Razorpay key secret');
console.log('   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5');
console.log('========================================\n');
