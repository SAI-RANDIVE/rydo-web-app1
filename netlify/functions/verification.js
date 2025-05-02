const express = require('express');
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
    message: `Route ${req.method} ${req.url} not found`
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
exports.handler = serverless(app);