const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
require('dotenv').config();

// Import MongoDB models
require('../../backend/models/mongodb');

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
      console.log('MongoDB connected in serverless function');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
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

// Import routes
const authRoutes = require('../../backend/routes/auth');
const userRoutes = require('../../backend/routes/user');
const caretakerRoutes = require('../../backend/routes/caretaker');
const shuttleRoutes = require('../../backend/routes/shuttle');
const customerRoutes = require('../../backend/routes/customer');
const paymentRoutes = require('../../backend/routes/payment');
const notificationRoutes = require('../../backend/routes/notification');
const ratingRoutes = require('../../backend/routes/rating');
const bookingRoutes = require('../../backend/routes/booking');
const walletRoutes = require('../../backend/routes/wallet');
const nearbyDriversRoutes = require('../../backend/routes/nearbyDrivers');

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO API is running'
  });
});

// Apply routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/caretaker', caretakerRoutes);
app.use('/shuttle', shuttleRoutes);
app.use('/customer', customerRoutes);
app.use('/payment', paymentRoutes);
app.use('/notification', notificationRoutes);
app.use('/rating', ratingRoutes);
app.use('/booking', bookingRoutes);
app.use('/wallet', walletRoutes);
app.use('/nearby-drivers', nearbyDriversRoutes);

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectMongoDB();
    next();
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Export the serverless function
exports.handler = serverless(app);
