/**
 * RYDO Web App - Quick Render.com Deployment Script
 * This script prepares the application for deployment on Render.com
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n========================================');
console.log('  RYDO WEB APP - RENDER.COM DEPLOYMENT');
console.log('========================================\n');

// 1. Update the render.yaml file
console.log('Updating render.yaml configuration...');
const renderYaml = `services:
  # Web service for the RYDO Web App
  - type: web
    name: rydo-web-app
    env: node
    buildCommand: npm install
    startCommand: node backend/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3002
      - key: MONGODB_URI
        sync: false
      - key: SESSION_SECRET
        generateValue: true
      - key: GOOGLE_MAPS_API_KEY
        sync: false
      - key: EMAIL_SERVICE
        value: gmail
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASSWORD
        sync: false
      - key: RAZORPAY_KEY_ID
        sync: false
      - key: RAZORPAY_KEY_SECRET
        sync: false
      - key: RAZORPAY_COMMISSION_PERCENTAGE
        value: 7.5
`;

fs.writeFileSync('render.yaml', renderYaml);
console.log('render.yaml updated successfully');

// 2. Create a simple server.js file for Render.com
console.log('\nCreating simplified server.js for Render.com...');
const serverJs = `/**
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
const trackingService = require('./backend/services/mongodb-tracking-service');
const notificationService = require('./backend/services/mongodb-notification-service');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Import MongoDB routes
const authRoutes = require('./backend/routes/mongodb-auth');
const userRoutes = require('./backend/routes/mongodb-user');
const caretakerRoutes = require('./backend/routes/mongodb-caretaker');
const shuttleRoutes = require('./backend/routes/mongodb-shuttle');
const customerRoutes = require('./backend/routes/mongodb-customer');
const paymentRoutes = require('./backend/routes/mongodb-payment');
const trackingRoutes = require('./backend/routes/mongodb-tracking');
const notificationRoutes = require('./backend/routes/mongodb-notification');
const ratingRoutes = require('./backend/routes/mongodb-rating');
const bookingRoutes = require('./backend/routes/mongodb-booking');
const driverRoutes = require('./backend/routes/mongodb-driver');
const walletRoutes = require('./backend/routes/mongodb-wallet');
const nearbyDriversRoutes = require('./backend/routes/mongodb-nearbyDrivers');

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
      console.log(\`RYDO Web App server running on port \${PORT}\`);
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
          io.emit(\`location_\${userId}\`, { latitude, longitude });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      });
      
      // Handle booking updates
      socket.on('bookingUpdate', async (data) => {
        try {
          const { bookingId, status, userId, providerId } = data;
          io.emit(\`booking_\${bookingId}\`, { status });
          
          // Send notification to user and provider
          if (userId) {
            await notificationService.createNotification(
              userId,
              'Booking Update',
              \`Your booking status has been updated to \${status}\`,
              'booking'
            );
          }
          
          if (providerId) {
            await notificationService.createNotification(
              providerId,
              'Booking Update',
              \`Booking #\${bookingId} status has been updated to \${status}\`,
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
`;

fs.writeFileSync('backend/server-render.js', serverJs);
console.log('Simplified server.js for Render.com created successfully');

// 3. Create a .env.render file for Render.com
console.log('\nCreating .env.render file...');
const envRender = `# MongoDB Configuration
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

fs.writeFileSync('.env.render', envRender);
console.log('.env.render file created successfully');

// 4. Update package.json for Render.com
console.log('\nUpdating package.json for Render.com...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "start": "node backend/server.js",
    "start:render": "node backend/server-render.js"
  };
  
  // Ensure all required dependencies are included
  const requiredDependencies = {
    "express": "^4.18.2",
    "mongoose": "^7.0.3",
    "connect-mongo": "^5.0.0",
    "express-session": "^1.17.3",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "dotenv": "^16.0.3",
    "socket.io": "^4.6.1",
    "express-fileupload": "^1.4.0",
    "nodemailer": "^6.9.1",
    "uuid": "^9.0.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "moment": "^2.29.4",
    "axios": "^1.3.5"
  };
  
  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...requiredDependencies
  };
  
  // Write updated package.json
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('package.json updated successfully');
} catch (error) {
  console.error('Error updating package.json:', error);
}

// 5. Create a Procfile for Render.com
console.log('\nCreating Procfile for Render.com...');
fs.writeFileSync('Procfile', 'web: npm run start:render');
console.log('Procfile created successfully');

// 6. Create a README.md with deployment instructions
console.log('\nCreating README.md with deployment instructions...');
const readmeContent = `# RYDO Web App - MongoDB Version

## Render.com Deployment Instructions

1. Sign up for a Render.com account at https://render.com
2. Create a new Web Service by clicking the "New +" button
3. Select "Web Service" from the dropdown menu
4. Choose "Build and deploy from a Git repository" option
5. Connect your GitHub account if prompted
6. Select your RYDO Web App repository
7. Configure your web service:
   - Name: rydo-web-app
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm run start:render
8. Add the following environment variables:
   - MONGODB_URI: Your MongoDB connection string
   - SESSION_SECRET: A secure random string
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key
   - EMAIL_SERVICE: gmail
   - EMAIL_USER: Your email for sending OTPs
   - EMAIL_PASSWORD: Your app password
   - RAZORPAY_KEY_ID: Your Razorpay key ID
   - RAZORPAY_KEY_SECRET: Your Razorpay key secret
   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5
9. Click "Create Web Service" to deploy your application

## Features

- User authentication with OTP verification
- Booking system for drivers, caretakers, and shuttle services
- Real-time tracking of service providers
- Payment processing with Razorpay integration
- Rating and review system
- Admin dashboard for monitoring

## Technology Stack

- Backend: Node.js with Express.js
- Database: MongoDB (migrated from MySQL)
- Frontend: HTML, CSS, JavaScript
- Real-time Features: WebSockets
- Authentication: Session-based with OTP verification
`;

fs.writeFileSync('README-RENDER.md', readmeContent);
console.log('README.md with deployment instructions created successfully');

// 7. Print deployment steps
console.log('\n========================================');
console.log('  RENDER.COM DEPLOYMENT STEPS');
console.log('========================================');
console.log('1. Sign up for a Render.com account at https://render.com');
console.log('2. Create a new Web Service by clicking the "New +" button');
console.log('3. Select "Web Service" from the dropdown menu');
console.log('4. Choose "Build and deploy from a Git repository" option');
console.log('5. Connect your GitHub account and select your repository');
console.log('6. Configure your web service:');
console.log('   - Name: rydo-web-app');
console.log('   - Environment: Node');
console.log('   - Build Command: npm install');
console.log('   - Start Command: npm run start:render');
console.log('7. Add the required environment variables (see README-RENDER.md)');
console.log('8. Click "Create Web Service" to deploy your application');
console.log('========================================\n');

console.log('Your RYDO Web App is now ready for deployment to Render.com!');
console.log('Follow the steps above to complete the deployment process.');
console.log('For detailed instructions, refer to README-RENDER.md');
