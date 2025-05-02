require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const WebSocket = require('ws');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = http.createServer(app);


const connectMongoDB = require('./config/mongodb'); // MongoDB connection function

// Load MongoDB models
require('./models/mongodb'); // Ensure MongoDB models are loaded

// Connect to MongoDB
const connectDB = async () => {
  try {
    await connectMongoDB();
    console.log('MongoDB Database connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};


// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  createParentPath: true
}));

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  next();
});

// Serve static files with proper MIME types
// This is the most important part for fixing the MIME type errors
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Additional explicit routes for specific file types
app.use('/css', express.static(path.join(__dirname, '../public/css'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

app.use('/js', express.static(path.join(__dirname, '../public/js'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.use('/images', express.static(path.join(__dirname, '../public/images'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'rydo_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  })
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const caretakerRoutes = require('./routes/caretaker');
const shuttleRoutes = require('./routes/shuttle');
const customerRoutes = require('./routes/customer');
const verificationRoutes = require('./routes/verification');
const paymentRoutes = require('./routes/payment');
const trackingRoutes = require('./routes/mongodb-tracking');
const notificationRoutes = require('./routes/notification');
const ratingRoutes = require('./routes/rating');
const bookingRoutes = require('./routes/booking');
const walletRoutes = require('./routes/wallet');
const nearbyDriversRoutes = require('./routes/nearbyDrivers');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/caretaker', caretakerRoutes);
app.use('/shuttle', shuttleRoutes);
app.use('/customer', customerRoutes);
app.use('/verification', verificationRoutes);
app.use('/payment', paymentRoutes);
app.use('/tracking', trackingRoutes);
app.use('/notification', notificationRoutes);
app.use('/rating', ratingRoutes);
app.use('/booking', bookingRoutes);
app.use('/wallet', walletRoutes);
app.use('/nearby-drivers', nearbyDriversRoutes);

// Initialize tracking WebSocket server
const trackingService = require('./services/mongodb-tracking-service');
trackingService.initTrackingServer(server);

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

// Serve privacy policy page
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/privacy-policy.html'));
});

// Serve terms of service page
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/terms.html'));
});

// Serve contact page
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

// Serve edit profile page
app.get('/edit-profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/edit-profile.html'));
});

// Serve caretaker dashboard page
app.get('/caretaker-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/caretaker-dashboard.html'));
});

// Serve shuttle dashboard page
app.get('/shuttle-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/shuttle-dashboard.html'));
});

// Serve admin dashboard page
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

// Serve book service page
app.get('/book-service', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/book-service.html'));
});

// Serve wallet page
app.get('/wallet', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/wallet.html'));
});

// Serve provider registration page
app.get('/provider-registration', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/provider-registration.html'));
});

// Serve new booking service page
app.get('/book-service-new', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/book-service-new.html'));
});

// Start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
