/**
 * RYDO Web App - Ultra Simple Server
 * Minimal server for Render.com deployment
 */

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config({ path: './.env.render.final' });

const app = express();
const PORT = process.env.PORT || 3003;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  // Fall back to in-memory data if database connection fails
  console.log('Using in-memory data as fallback');
});

// Define User Schema
const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['customer', 'driver', 'caretaker', 'shuttle_driver', 'admin'] },
  profile_image: { type: String, default: '/images/default-profile.png' },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  is_available: { type: Boolean, default: false },
  average_rating: { type: Number, default: 0 },
  total_rides: { type: Number, default: 0 },
  wallet_balance: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Define Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle_type: { type: String, required: true },
  vehicle_make: { type: String, required: true },
  vehicle_model: { type: String, required: true },
  vehicle_year: { type: Number, required: true },
  vehicle_color: { type: String, required: true },
  vehicle_number: { type: String, required: true },
  vehicle_capacity: { type: Number, default: 4 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Define User Location Schema
const userLocationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number },
  updated_at: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const UserLocation = mongoose.model('UserLocation', userLocationSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Log when the server starts
console.log(`Starting RYDO Web App server...`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Using PORT from environment: ${process.env.PORT || '(defaulting to 3002)'}`);


// Simple API endpoint to check server status
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: '1.0.0' });
});

// Simple mock authentication endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'demo-token-123',
    user: { 
      id: 'user123',
      first_name: 'Demo', 
      last_name: 'User',
      email: 'demo@example.com',
      phone: '+91 9876543210',
      role: 'customer' 
    }
  });
});

app.post('/api/auth/signup', (req, res) => {
  // Extract user data from request body
  const { first_name, last_name, email, phone, role } = req.body;
  
  // Generate a unique user ID
  const userId = 'user_' + Date.now();
  
  // Create a response with the user's actual data
  res.json({
    success: true,
    token: 'demo-token-' + userId,
    user: { 
      id: userId,
      first_name: first_name || 'New', 
      last_name: last_name || 'User',
      email: email || 'user@example.com',
      phone: phone || '+91 9876543211',
      role: role || 'customer' 
    }
  });
});

// Serve static HTML pages
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

app.get('/terms.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'terms.html'));
});

app.get('/privacy-policy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'privacy-policy.html'));
});

// Also support routes without .html extension
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'terms.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'privacy-policy.html'));
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback to hardcoded users if database is not connected
      const validUsers = [
        {
          _id: 'usr_001',
          email: 'customer@example.com',
          password: '$2a$10$XFE/UQEjIjzxpQnFbS0Fwe7V8CvlLQJgFqJUEfH9GJxLG/G.qIxJi', // hashed 'password123'
          role: 'customer',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+91 9876543210',
          profile_image: '/images/profile/customer.jpg'
        },
        {
          _id: 'usr_002',
          email: 'driver@example.com',
          password: '$2a$10$XFE/UQEjIjzxpQnFbS0Fwe7V8CvlLQJgFqJUEfH9GJxLG/G.qIxJi', // hashed 'password123'
          role: 'driver',
          first_name: 'Rahul',
          last_name: 'Singh',
          phone: '+91 9876543211',
          profile_image: '/images/profile/driver.jpg',
          is_available: true
        }
      ];
      
      // Find user with matching email
      const user = validUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      // Check if user exists
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
      );
      
      // Remove password from user object before sending response
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userWithoutPassword
      });
    }
    
    // Find user in the database
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.SESSION_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password from user object before sending response
    const userObject = user.toObject();
    delete userObject.password;
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userObject
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Validate phone format (simple validation for demo)
    const phoneRegex = /^\+?[0-9\s]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Validate role
    const validRoles = ['customer', 'driver', 'caretaker', 'shuttle_driver'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback to in-memory signup if database is not connected
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Generate a new user ID
      const userId = `usr_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email, role },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create user object
      const newUser = {
        _id: userId,
        first_name,
        last_name,
        email,
        phone,
        role,
        created_at: new Date().toISOString()
      };
      
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: newUser
      });
    }
    
    // Check if email already exists in the database
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      first_name,
      last_name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role,
      is_verified: true // For demo purposes, auto-verify users
    });
    
    // Save user to database
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      process.env.SESSION_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password from user object before sending response
    const userObject = newUser.toObject();
    delete userObject.password;
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userObject
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during signup. Please try again.'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // In a real app with refresh tokens, we would invalidate the token in a token blacklist
  // For this demo, we'll just return a success response
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  // If the middleware passes, the token is valid
  // Return user information from the token
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback to hardcoded user if database is not connected
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          first_name: 'Demo',
          last_name: 'User'
        }
      });
    }
    
    // Find user in database
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user profile'
    });
  }
});

// Dashboard routes with authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    // In a real app, we would verify the JWT token
    // For this demo, we'll just check if it's in the expected format
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    if (!payload.id || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }
    
    req.user = payload;
    next();
  } catch (error) {
    return res.redirect('/login');
  }
};

app.get('/customer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'customer-dashboard.html'));
});

app.get('/driver-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'driver-dashboard.html'));
});

app.get('/caretaker-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'caretaker-dashboard.html'));
});

app.get('/shuttle-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'shuttle-dashboard.html'));
});

// Generic dashboard as fallback
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Dynamic API endpoints

// Dashboard stats endpoint - dynamically calculates stats based on user data
app.get('/api/dashboard/stats', (req, res) => {
    // In a real app, this would fetch data from a database based on the user's ID
    // For now, we'll generate random data that changes each time
    
    // Extract user ID from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        // Decode token to get user info
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (!payload.id || !payload.email || !payload.role) {
            throw new Error('Invalid token payload');
        }
        
        // Generate appropriate stats based on user role
        let stats = {};
        
        switch (payload.role) {
            case 'customer':
                // Customer stats
                stats = {
                    totalRides: Math.floor(Math.random() * 20) + 5,
                    caretakerBookings: Math.floor(Math.random() * 5),
                    walletBalance: Math.floor(Math.random() * 5000) + 500,
                    activeBookings: Math.floor(Math.random() * 3),
                    rating: parseFloat((4 + Math.random()).toFixed(1)),
                    recentLocations: [
                        'Home, Bangalore',
                        'Office, Bangalore',
                        'Airport, Bangalore',
                        'Mall, Bangalore'
                    ]
                };
                break;
                
            case 'driver':
                // Driver stats
                stats = {
                    totalRides: Math.floor(Math.random() * 50) + 10,
                    totalEarnings: Math.floor(Math.random() * 10000) + 5000,
                    rating: parseFloat((4 + Math.random()).toFixed(1)),
                    hoursOnline: Math.floor(Math.random() * 200) + 50,
                    avgFare: Math.floor(Math.random() * 200) + 100,
                    completionRate: Math.floor(Math.random() * 20) + 80 + '%', // 80-100%
                    cancelRate: Math.floor(Math.random() * 10) + '%' // 0-10%
                };
                break;
                
            case 'caretaker':
                // Caretaker stats
                stats = {
                    totalBookings: Math.floor(Math.random() * 30) + 5,
                    totalEarnings: Math.floor(Math.random() * 15000) + 8000,
                    rating: parseFloat((4 + Math.random()).toFixed(1)),
                    hoursWorked: Math.floor(Math.random() * 300) + 100,
                    avgBookingDuration: Math.floor(Math.random() * 5) + 2 + ' hours',
                    specializations: ['Elderly Care', 'Medical Assistance', 'Child Care']
                };
                break;
                
            case 'shuttle_driver':
                // Shuttle driver stats
                stats = {
                    totalTrips: Math.floor(Math.random() * 100) + 30,
                    totalPassengers: Math.floor(Math.random() * 1000) + 300,
                    totalEarnings: Math.floor(Math.random() * 20000) + 10000,
                    rating: parseFloat((4 + Math.random()).toFixed(1)),
                    avgOccupancy: Math.floor(Math.random() * 30) + 70 + '%', // 70-100%
                    routesServed: Math.floor(Math.random() * 5) + 1
                };
                break;
                
            default:
                // Admin or unknown role
                stats = {
                    totalUsers: Math.floor(Math.random() * 1000) + 500,
                    activeUsers: Math.floor(Math.random() * 500) + 200,
                    totalBookings: Math.floor(Math.random() * 5000) + 1000,
                    totalRevenue: Math.floor(Math.random() * 100000) + 50000,
                    growthRate: Math.floor(Math.random() * 20) + 5 + '%'
                };
        }
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error generating dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating dashboard stats'
        });
    }
});

// Mock API endpoints for dashboard data
app.get('/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    totalRides: 12,
    caretakerBookings: 5,
    walletBalance: 2500,
    activeBookings: 2
  });
});

// Dynamic API endpoint for nearby drivers with Haversine formula for accurate distance calculation
app.post('/api/drivers/nearby', (req, res) => {
  const { latitude, longitude, radius = 3, service_type = 'driver' } = req.body;
  
  // Generate dynamic nearby drivers based on user location
  const drivers = generateNearbyDrivers(parseFloat(latitude), parseFloat(longitude), radius, service_type);
  
  res.json({
    success: true,
    drivers: drivers
  });
});

// Driver ride requests endpoint - provides real-time ride requests to drivers
app.post('/api/driver/ride-requests', (req, res) => {
  const { location, radius, status } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token || status !== 'online') {
    return res.json({ success: true, requests: [] });
  }
  
  // Generate 0-2 random ride requests
  const requestCount = Math.floor(Math.random() * 3);
  const requests = [];
  
  for (let i = 0; i < requestCount; i++) {
    // Generate random pickup location near driver
    const pickupLocation = generateRandomLocation(location.latitude, location.longitude, 2);
    // Generate random dropoff location further away
    const dropoffLocation = generateRandomLocation(location.latitude, location.longitude, 10);
    
    // Calculate distance and duration
    const distance = calculateDistance(
      pickupLocation.latitude, 
      pickupLocation.longitude, 
      dropoffLocation.latitude, 
      dropoffLocation.longitude
    );
    
    // Estimate duration (roughly 2 mins per km)
    const duration = Math.round(distance * 120); // seconds
    
    // Random service type
    const serviceTypes = ['standard', 'premium', 'shuttle'];
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    
    // Generate a request
    requests.push({
      id: `request-${Date.now()}-${i}`,
      customer_name: generateRandomName(),
      customer_rating: (4 + Math.random()).toFixed(1),
      pickup_location: `${pickupLocation.address}`,
      dropoff_location: `${dropoffLocation.address}`,
      pickup_latitude: pickupLocation.latitude,
      pickup_longitude: pickupLocation.longitude,
      dropoff_latitude: dropoffLocation.latitude,
      dropoff_longitude: dropoffLocation.longitude,
      distance: distance,
      duration: duration,
      service_type: serviceType,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString() // Expires in 30 seconds
    });
  }
  
  res.json({
    success: true,
    requests: requests
  });
});

// Driver ride action endpoints
app.post('/api/driver/rides/:rideId/:action', (req, res) => {
  const { rideId, action } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Process different ride actions
  switch (action) {
    case 'accept':
      res.json({
        success: true,
        message: 'Ride accepted successfully',
        customer: generateRandomName(),
        pickup_location: generateRandomAddress(),
        dropoff_location: generateRandomAddress(),
        fare_amount: Math.floor(Math.random() * 300) + 100
      });
      break;
    
    case 'reject':
      res.json({
        success: true,
        message: 'Ride rejected successfully'
      });
      break;
    
    case 'arrived':
      res.json({
        success: true,
        message: 'Arrival confirmed successfully'
      });
      break;
    
    case 'start':
      res.json({
        success: true,
        message: 'Ride started successfully'
      });
      break;
    
    case 'complete':
      res.json({
        success: true,
        message: 'Ride completed successfully',
        fare_amount: Math.floor(Math.random() * 300) + 100
      });
      break;
    
    default:
      res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
  }
});

// Driver ride history endpoint
app.get('/api/driver/ride-history', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Generate 5-15 random past rides
  const rideCount = Math.floor(Math.random() * 11) + 5;
  const rides = [];
  
  // Status options for completed rides
  const statuses = ['completed', 'cancelled', 'completed', 'completed', 'completed'];
  
  // Service types
  const serviceTypes = ['standard', 'premium', 'shuttle', 'standard', 'standard'];
  
  for (let i = 0; i < rideCount; i++) {
    // Random date within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    // Random pickup and dropoff locations
    const pickup = generateRandomAddress();
    const dropoff = generateRandomAddress();
    
    // Random distance and duration
    const distance = Math.floor(Math.random() * 15) + 2;
    const duration = distance * 120; // seconds (2 mins per km)
    
    // Random status
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Random service type
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    
    // Generate a ride
    rides.push({
      id: `ride-${date.getTime()}-${i}`,
      customer_name: generateRandomName(),
      customer_rating: (4 + Math.random()).toFixed(1),
      pickup_location: pickup,
      dropoff_location: dropoff,
      distance: distance,
      duration: duration,
      fare_amount: Math.floor(distance * (serviceType === 'premium' ? 18 : serviceType === 'shuttle' ? 8 : 12)) + (serviceType === 'premium' ? 80 : serviceType === 'shuttle' ? 30 : 50),
      service_type: serviceType,
      status: status,
      created_at: date.toISOString()
    });
  }
  
  // Sort by date (newest first)
  rides.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({
    success: true,
    rides: rides
  });
});

// Driver status update endpoint
app.post('/api/driver/update-status', (req, res) => {
  const { status } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  res.json({
    success: true,
    message: `Status updated to ${status}`,
    status: status
  });
});

// Customer dashboard endpoints

// Recent activity endpoint
app.get('/api/customer/recent-activity', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Generate 3-7 random activities
  const activityCount = Math.floor(Math.random() * 5) + 3;
  const activities = [];
  
  // Activity types and their icons
  const activityTypes = [
    { type: 'booking', title: 'Ride Booked', icon: 'fa-car', status: 'info' },
    { type: 'booking', title: 'Ride Completed', icon: 'fa-check-circle', status: 'completed' },
    { type: 'booking', title: 'Ride Cancelled', icon: 'fa-times-circle', status: 'cancelled' },
    { type: 'payment', title: 'Payment Successful', icon: 'fa-credit-card', status: 'success' },
    { type: 'payment', title: 'Money Added to Wallet', icon: 'fa-wallet', status: 'success' },
    { type: 'system', title: 'Profile Updated', icon: 'fa-user-edit', status: 'info' },
    { type: 'system', title: 'Password Changed', icon: 'fa-key', status: 'info' }
  ];
  
  for (let i = 0; i < activityCount; i++) {
    // Random date within the last 7 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));
    
    // Random activity type
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    
    // Generate description based on activity type
    let description = '';
    
    switch (activityType.type) {
      case 'booking':
        if (activityType.title === 'Ride Booked') {
          description = `You booked a ${['standard', 'premium', 'shuttle'][Math.floor(Math.random() * 3)]} ride from ${generateRandomAddress()} to ${generateRandomAddress()}`;
        } else if (activityType.title === 'Ride Completed') {
          description = `Your ride with ${generateRandomName()} has been completed`;
        } else {
          description = 'Your scheduled ride has been cancelled';
        }
        break;
      
      case 'payment':
        if (activityType.title === 'Payment Successful') {
          const amount = Math.floor(Math.random() * 500) + 100;
          description = `Payment of ₹${amount} has been processed`;
        } else {
          const amount = Math.floor(Math.random() * 1000) + 500;
          description = `₹${amount} has been added to your wallet`;
        }
        break;
      
      case 'system':
        if (activityType.title === 'Profile Updated') {
          description = 'Your profile information has been updated';
        } else {
          description = 'Your account password has been changed';
        }
        break;
    }
    
    // Add activity
    activities.push({
      id: `activity-${date.getTime()}-${i}`,
      type: activityType.type,
      title: activityType.title,
      description: description,
      icon: activityType.icon,
      status: activityType.status,
      timestamp: date.toISOString()
    });
  }
  
  // Sort by date (newest first)
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json({
    success: true,
    activities: activities
  });
});

// Booking history endpoint
app.get('/api/customer/booking-history', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Generate 5-10 random bookings
  const bookingCount = Math.floor(Math.random() * 6) + 5;
  const bookings = [];
  
  // Status options
  const statuses = ['completed', 'cancelled', 'pending', 'in_progress', 'completed', 'completed'];
  
  // Service types
  const serviceTypes = ['standard', 'premium', 'shuttle', 'standard', 'standard'];
  
  for (let i = 0; i < bookingCount; i++) {
    // Random date within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    // Random pickup and dropoff locations
    const pickup = generateRandomAddress();
    const dropoff = generateRandomAddress();
    
    // Random distance and duration
    const distance = Math.floor(Math.random() * 15) + 2;
    const duration = distance * 120; // seconds (2 mins per km)
    
    // Random status
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Random service type
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    
    // Generate a booking
    const booking = {
      id: `booking-${date.getTime()}-${i}`,
      service_type: serviceType,
      pickup_location: pickup,
      dropoff_location: dropoff,
      distance: distance,
      duration: duration,
      fare_amount: Math.floor(distance * (serviceType === 'premium' ? 18 : serviceType === 'shuttle' ? 8 : 12)) + (serviceType === 'premium' ? 80 : serviceType === 'shuttle' ? 30 : 50),
      status: status,
      created_at: date.toISOString()
    };
    
    // Add driver details for completed or in_progress rides
    if (status === 'completed' || status === 'in_progress') {
      booking.driver_name = generateRandomName();
      booking.driver_rating = (4 + Math.random()).toFixed(1);
      booking.vehicle_type = serviceType === 'premium' ? 'Sedan' : serviceType === 'shuttle' ? 'Van' : 'Hatchback';
      booking.vehicle_number = `KA ${Math.floor(Math.random() * 99) + 1} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9999) + 1000}`;
    }
    
    bookings.push(booking);
  }
  
  // Sort by date (newest first)
  bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({
    success: true,
    bookings: bookings
  });
});

// Create booking endpoint
app.post('/api/customer/create-booking', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Extract booking details from request body
  const {
    service_type,
    pickup_location,
    dropoff_location,
    booking_date,
    booking_time,
    distance,
    duration,
    fare_amount,
    payment_method
  } = req.body;
  
  // Validate required fields
  if (!service_type || !pickup_location || !dropoff_location || !booking_date || !booking_time) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  // Generate booking reference
  const bookingReference = `RYDO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  // In a real app, this would create a booking in the database
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Booking created successfully',
    booking: {
      id: `booking-${Date.now()}`,
      reference: bookingReference,
      service_type,
      pickup_location,
      dropoff_location,
      booking_date,
      booking_time,
      distance,
      duration,
      fare_amount,
      payment_method,
      status: 'pending',
      created_at: new Date().toISOString()
    }
  });
});

// Cancel booking endpoint
app.post('/api/customer/cancel-booking/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // In a real app, this would update the booking status in the database
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    booking_id: bookingId
  });
});

// Rate booking endpoint
app.post('/api/customer/rate-booking/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const { rating, comment } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Invalid rating. Must be between 1 and 5.'
    });
  }
  
  // In a real app, this would store the rating in the database
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Rating submitted successfully',
    booking_id: bookingId,
    rating,
    comment
  });
});

// Helper function to generate nearby drivers
function generateNearbyDrivers(latitude, longitude, radius, serviceType) {
  const driverCount = Math.floor(Math.random() * 6) + 2; // 2-7 drivers
  const drivers = [];
  
  // Common Indian names for drivers
  const names = [
    'Rahul Kumar', 'Amit Singh', 'Priya Sharma', 'Vikram Patel', 
    'Sunita Desai', 'Rajesh Verma', 'Ananya Gupta', 'Suresh Reddy',
    'Neha Malhotra', 'Arjun Nair', 'Deepak Joshi', 'Kavita Rao'
  ];
  
  // Vehicle types
  const vehicleTypes = {
    driver: ['Sedan', 'Hatchback', 'SUV'],
    caretaker: ['Sedan', 'SUV', 'Van'],
    shuttle: ['Van', 'Mini Bus', 'Bus']
  };
  
  // Vehicle makes and models
  const vehicles = {
    Sedan: ['Honda City', 'Hyundai Verna', 'Maruti Suzuki Dzire', 'Toyota Etios'],
    Hatchback: ['Maruti Suzuki Swift', 'Hyundai i20', 'Tata Tiago', 'Toyota Glanza'],
    SUV: ['Hyundai Creta', 'Kia Seltos', 'Mahindra XUV300', 'Tata Nexon'],
    Van: ['Maruti Suzuki Eeco', 'Toyota Innova', 'Mahindra Marazzo'],
    'Mini Bus': ['Tata Winger', 'Force Traveller', 'Mahindra Supro'],
    Bus: ['Tata Starbus', 'Ashok Leyland Lynx', 'BharatBenz 917']
  };
  
  // Languages
  const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Gujarati'];
  
  for (let i = 0; i < driverCount; i++) {
    // Generate random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    
    // Convert distance and angle to lat/lng offset
    // 1 degree of latitude is approximately 111 km
    const latOffset = (distance / 111) * Math.cos(angle);
    const lngOffset = (distance / (111 * Math.cos(latitude * Math.PI / 180))) * Math.sin(angle);
    
    // Calculate new position
    const driverLat = latitude + latOffset;
    const driverLng = longitude + lngOffset;
    
    // Calculate actual distance using Haversine formula
    const actualDistance = calculateDistance(latitude, longitude, driverLat, driverLng);
    
    // Select random vehicle type and model
    const vehicleType = vehicleTypes[serviceType][Math.floor(Math.random() * vehicleTypes[serviceType].length)];
    const vehicleMake = vehicles[vehicleType][Math.floor(Math.random() * vehicles[vehicleType].length)];
    
    // Select 1-3 random languages
    const speaksLanguages = [];
    const languageCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < languageCount; j++) {
      const lang = languages[Math.floor(Math.random() * languages.length)];
      if (!speaksLanguages.includes(lang)) {
        speaksLanguages.push(lang);
      }
    }
    
    // Generate driver
    drivers.push({
      id: `driver-${Date.now()}-${i}`,
      name: names[Math.floor(Math.random() * names.length)],
      profile_image: null,
      latitude: driverLat,
      longitude: driverLng,
      distance: actualDistance,
      estimated_arrival_time: Math.ceil(actualDistance * 2), // ~30 km/h average speed
      rating: (4 + Math.random()).toFixed(1),
      total_rides: Math.floor(Math.random() * 500) + 50,
      vehicle_type: vehicleType,
      vehicle_make: vehicleMake.split(' ')[0],
      vehicle_model: vehicleMake,
      vehicle_color: ['White', 'Silver', 'Black', 'Grey', 'Blue'][Math.floor(Math.random() * 5)],
      vehicle_number: `KA ${Math.floor(Math.random() * 99) + 1} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9999) + 1000}`,
      speaks: speaksLanguages
    });
  }
  
  return drivers;
}

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Helper function to generate random location near a point
function generateRandomLocation(latitude, longitude, maxDistance) {
  // Generate random distance and angle
  const distance = Math.random() * maxDistance;
  const angle = Math.random() * 2 * Math.PI;
  
  // Convert distance and angle to lat/lng offset
  const latOffset = (distance / 111) * Math.cos(angle);
  const lngOffset = (distance / (111 * Math.cos(latitude * Math.PI / 180))) * Math.sin(angle);
  
  // Calculate new position
  const newLat = latitude + latOffset;
  const newLng = longitude + lngOffset;
  
  // Generate a random address
  return {
    latitude: newLat,
    longitude: newLng,
    address: generateRandomAddress()
  };
}

// Helper function to generate random Indian names
function generateRandomName() {
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Ayaan', 'Atharva',
    'Aanya', 'Diya', 'Ananya', 'Saanvi', 'Aadhya', 'Avni', 'Riya', 'Aarohi',
    'Sai', 'Aryan', 'Anant', 'Ishaan', 'Shaurya', 'Advait', 'Dhruv', 'Krishna',
    'Saisha', 'Kiara', 'Sara', 'Myra', 'Pari', 'Lavanya', 'Ira', 'Aisha'
  ];
  
  const lastNames = [
    'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Nair', 'Reddy', 'Rao',
    'Joshi', 'Malhotra', 'Verma', 'Desai', 'Shah', 'Mehta', 'Iyer', 'Agarwal',
    'Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Bose', 'Dutta', 'Sen', 'Roy',
    'Kapoor', 'Khanna', 'Chopra', 'Bhatia', 'Gill', 'Anand', 'Mehra', 'Bajwa'
  ];
  
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// Helper function to generate random addresses in Bangalore
function generateRandomAddress() {
  const areas = [
    'Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Electronic City',
    'Marathahalli', 'JP Nagar', 'Bannerghatta Road', 'MG Road', 'Jayanagar',
    'Malleshwaram', 'Yelahanka', 'Hebbal', 'BTM Layout', 'Banashankari',
    'Basavanagudi', 'Rajajinagar', 'Vijayanagar', 'RT Nagar', 'Kalyan Nagar'
  ];
  
  const streets = [
    'Main Road', 'Cross', 'Avenue', 'Layout', 'Main', 'Street', 'Circle',
    'Extension', 'Phase', 'Block', 'Sector', 'Colony'
  ];
  
  const landmarks = [
    'near Park', 'opposite Hospital', 'behind Temple', 'next to Mall',
    'near Metro Station', 'opposite School', 'near Market', 'behind Lake',
    'near Bus Stop', 'opposite Restaurant', 'near Garden', 'behind College'
  ];
  
  const area = areas[Math.floor(Math.random() * areas.length)];
  const number = Math.floor(Math.random() * 1000) + 1;
  const street = `${Math.floor(Math.random() * 10) + 1}${['st', 'nd', 'rd', 'th'][Math.min(3, Math.floor(Math.random() * 10))]} ${streets[Math.floor(Math.random() * streets.length)]}`;
  const landmark = Math.random() > 0.5 ? `, ${landmarks[Math.floor(Math.random() * landmarks.length)]}` : '';
  
  return `${number}, ${street}, ${area}${landmark}, Bangalore`;
}

// Mock API endpoint for nearby drivers (legacy version - keeping for compatibility)
app.post('/api/nearby-drivers', (req, res) => {
  const { latitude, longitude, radius = 3 } = req.body;
  
  // Mock data for nearby drivers
  const mockDrivers = [
    {
      id: 'driver1',
      name: 'Rahul Kumar',
      profile_image: null,
      latitude: parseFloat(latitude) + 0.002,
      longitude: parseFloat(longitude) + 0.003,
      distance: 0.8,
      estimated_arrival_time: 4, // minutes
      rating: 4.8,
      total_rides: 342,
      languages: ['English', 'Hindi', 'Kannada'],
      vehicle: {
        type: 'sedan',
        make: 'Honda',
        model: 'City',
        color: 'White',
        license_plate: 'KA 01 AB 1234'
      }
    },
    {
      id: 'driver2',
      name: 'Priya Singh',
      profile_image: null,
      latitude: parseFloat(latitude) - 0.003,
      longitude: parseFloat(longitude) + 0.002,
      distance: 1.2,
      estimated_arrival_time: 6, // minutes
      rating: 4.9,
      total_rides: 512,
      languages: ['English', 'Hindi', 'Tamil'],
      vehicle: {
        type: 'suv',
        make: 'Toyota',
        model: 'Innova',
        color: 'Silver',
        license_plate: 'KA 01 CD 5678'
      }
    },
    {
      id: 'driver3',
      name: 'Suresh Patel',
      profile_image: null,
      latitude: parseFloat(latitude) + 0.005,
      longitude: parseFloat(longitude) - 0.002,
      distance: 1.5,
      estimated_arrival_time: 8, // minutes
      rating: 4.7,
      total_rides: 289,
      languages: ['English', 'Hindi', 'Gujarati'],
      vehicle: {
        type: 'hatchback',
        make: 'Maruti Suzuki',
        model: 'Swift',
        color: 'Red',
        license_plate: 'KA 01 EF 9012'
      }
    }
  ];
  
  // Filter drivers based on radius
  const driversInRadius = mockDrivers.filter(driver => driver.distance <= radius);
  
  res.json({
    success: true,
    drivers: driversInRadius
  });
});

// Mock API endpoint for booking a ride
app.post('/api/booking/create', (req, res) => {
  const { 
    service_type,
    driver_id,
    pickup_location,
    dropoff_location,
    pickup_latitude,
    pickup_longitude,
    dropoff_latitude,
    dropoff_longitude,
    booking_time,
    payment_method,
    fare_amount,
    preferred_language,
    special_requirements
  } = req.body;
  
  // Generate a unique booking ID
  const bookingId = 'BK' + Date.now().toString().substring(6);
  
  // Create a booking with expiration time (15 minutes)
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 15 * 60000); // 15 minutes
  
  res.json({
    success: true,
    booking: {
      id: bookingId,
      service_type: service_type || 'driver',
      status: 'pending',
      driver_id: driver_id,
      pickup_location: pickup_location,
      dropoff_location: dropoff_location,
      pickup_latitude: pickup_latitude,
      pickup_longitude: pickup_longitude,
      dropoff_latitude: dropoff_latitude,
      dropoff_longitude: dropoff_longitude,
      booking_time: booking_time || new Date().toISOString(),
      payment_method: payment_method || 'wallet',
      fare_amount: fare_amount || 450,
      preferred_language: preferred_language,
      special_requirements: special_requirements,
      created_at: new Date().toISOString(),
      expiration_time: expirationTime.toISOString()
    }
  });
});

// Mock API endpoint for checking booking status
app.get('/api/booking/:id', (req, res) => {
  const bookingId = req.params.id;
  
  // Simulate different booking statuses based on the last digit of the booking ID
  const lastDigit = bookingId.slice(-1);
  let status;
  
  switch(lastDigit) {
    case '1':
      status = 'confirmed';
      break;
    case '2':
      status = 'driver_assigned';
      break;
    case '3':
      status = 'driver_arrived';
      break;
    case '4':
      status = 'in_progress';
      break;
    case '5':
      status = 'completed';
      break;
    case '6':
      status = 'cancelled';
      break;
    case '7':
      status = 'expired';
      break;
    default:
      status = 'pending';
  }
  
  res.json({
    success: true,
    booking: {
      id: bookingId,
      status: status,
      driver: {
        id: 'driver1',
        name: 'Rahul Kumar',
        phone: '+91 9876543210',
        rating: 4.8,
        vehicle: {
          type: 'sedan',
          make: 'Honda',
          model: 'City',
          color: 'White',
          license_plate: 'KA 01 AB 1234'
        },
        current_location: {
          latitude: 12.9716,
          longitude: 77.5946
        },
        estimated_arrival_time: 5, // minutes
        languages: ['English', 'Hindi', 'Kannada']
      },
      pickup_location: 'Home, Bangalore',
      dropoff_location: 'Office, Bangalore',
      fare_amount: 450,
      payment_method: 'wallet',
      booking_time: new Date().toISOString(),
      estimated_arrival_time: new Date(Date.now() + 5 * 60000).toISOString(),
      estimated_completion_time: new Date(Date.now() + 35 * 60000).toISOString()
    }
  });
});

// Mock API endpoint for confirming a booking
app.post('/api/booking/:id/confirm', (req, res) => {
  const bookingId = req.params.id;
  
  res.json({
    success: true,
    message: 'Booking confirmed successfully',
    booking: {
      id: bookingId,
      status: 'confirmed',
      driver: {
        id: 'driver1',
        name: 'Rahul Kumar',
        phone: '+91 9876543210',
        rating: 4.8,
        vehicle: {
          type: 'sedan',
          make: 'Honda',
          model: 'City',
          color: 'White',
          license_plate: 'KA 01 AB 1234'
        }
      },
      estimated_arrival_time: 5 // minutes
    }
  });
});

// Mock API endpoint for cancelling a booking
app.post('/api/booking/:id/cancel', (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  // Calculate cancellation fee based on booking status
  let cancellationFee = 0;
  const status = req.body.status || 'pending';
  
  if (status === 'driver_assigned') {
    cancellationFee = 30;
  } else if (status === 'driver_arrived') {
    cancellationFee = 50;
  }
  
  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    booking: {
      id: bookingId,
      status: 'cancelled',
      cancellation_reason: reason || 'User cancelled',
      cancellation_fee: cancellationFee,
      cancelled_at: new Date().toISOString()
    }
  });
});

// Mock API endpoint for shuttle service stops
app.get('/api/shuttle/stops', (req, res) => {
  res.json({
    success: true,
    stops: [
      {
        id: 'stop1',
        name: 'City Center',
        address: 'MG Road, Bangalore',
        latitude: 12.9716,
        longitude: 77.5946
      },
      {
        id: 'stop2',
        name: 'Tech Park',
        address: 'Whitefield, Bangalore',
        latitude: 12.9698,
        longitude: 77.7499
      },
      {
        id: 'stop3',
        name: 'Airport',
        address: 'Kempegowda International Airport, Bangalore',
        latitude: 13.1989,
        longitude: 77.7068
      },
      {
        id: 'stop4',
        name: 'Railway Station',
        address: 'Bangalore City Railway Station, Bangalore',
        latitude: 12.9783,
        longitude: 77.5732
      },
      {
        id: 'stop5',
        name: 'Electronic City',
        address: 'Electronic City, Bangalore',
        latitude: 12.8399,
        longitude: 77.6770
      }
    ]
  });
});

// Mock API endpoint for shuttle service routes
app.get('/api/shuttle/routes', (req, res) => {
  res.json({
    success: true,
    routes: [
      {
        id: 'route1',
        name: 'City Center to Airport',
        stops: ['stop1', 'stop2', 'stop3'],
        schedule: [
          { departure_time: '06:00', arrival_time: '07:30' },
          { departure_time: '08:00', arrival_time: '09:30' },
          { departure_time: '10:00', arrival_time: '11:30' },
          { departure_time: '12:00', arrival_time: '13:30' },
          { departure_time: '14:00', arrival_time: '15:30' },
          { departure_time: '16:00', arrival_time: '17:30' },
          { departure_time: '18:00', arrival_time: '19:30' },
          { departure_time: '20:00', arrival_time: '21:30' }
        ],
        fare: 150
      },
      {
        id: 'route2',
        name: 'City Center to Electronic City',
        stops: ['stop1', 'stop4', 'stop5'],
        schedule: [
          { departure_time: '07:00', arrival_time: '08:15' },
          { departure_time: '09:00', arrival_time: '10:15' },
          { departure_time: '11:00', arrival_time: '12:15' },
          { departure_time: '13:00', arrival_time: '14:15' },
          { departure_time: '15:00', arrival_time: '16:15' },
          { departure_time: '17:00', arrival_time: '18:15' },
          { departure_time: '19:00', arrival_time: '20:15' }
        ],
        fare: 120
      }
    ]
  });
});

// Mock API endpoint for shuttle availability
app.get('/api/shuttle/availability', (req, res) => {
  const { route_id, date, time } = req.query;
  
  res.json({
    success: true,
    availability: {
      route_id: route_id || 'route1',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '10:00',
      total_seats: 20,
      available_seats: 8,
      seat_map: [
        { id: 'A1', status: 'occupied' },
        { id: 'A2', status: 'available' },
        { id: 'A3', status: 'available' },
        { id: 'A4', status: 'occupied' },
        { id: 'B1', status: 'occupied' },
        { id: 'B2', status: 'available' },
        { id: 'B3', status: 'available' },
        { id: 'B4', status: 'occupied' },
        { id: 'C1', status: 'occupied' },
        { id: 'C2', status: 'occupied' },
        { id: 'C3', status: 'available' },
        { id: 'C4', status: 'occupied' },
        { id: 'D1', status: 'occupied' },
        { id: 'D2', status: 'occupied' },
        { id: 'D3', status: 'available' },
        { id: 'D4', status: 'occupied' },
        { id: 'E1', status: 'occupied' },
        { id: 'E2', status: 'available' },
        { id: 'E3', status: 'available' },
        { id: 'E4', status: 'occupied' }
      ],
      fare: 150
    }
  });
});

// Mock API endpoint for booking a shuttle seat
app.post('/api/shuttle/book', (req, res) => {
  const { route_id, date, time, seat_ids, passenger_details } = req.body;
  
  // Generate a unique booking ID
  const bookingId = 'SH' + Date.now().toString().substring(6);
  
  res.json({
    success: true,
    booking: {
      id: bookingId,
      route_id: route_id || 'route1',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '10:00',
      seats: seat_ids || ['A2', 'A3'],
      passenger_details: passenger_details || {
        name: 'Demo User',
        phone: '+91 9876543210',
        email: 'demo@example.com'
      },
      status: 'confirmed',
      fare_amount: 300, // 150 per seat for 2 seats
      payment_method: 'wallet',
      booking_time: new Date().toISOString()
    }
  });
});

app.get('/user/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'user123',
      first_name: 'Demo',
      last_name: 'User',
      email: 'demo@example.com',
      phone: '+91 9876543210',
      address: 'Bangalore, India',
      profile_image: null,
      wallet_balance: 2500,
      total_rides: 12,
      member_since: '2024-01-15',
      preferred_payment: 'wallet'
    }
  });
});

app.get('/booking', (req, res) => {
  res.json({
    success: true,
    bookings: [
      {
        id: 'BK12345',
        service_type: 'driver',
        status: 'completed',
        booking_date: '2025-05-01T10:30:00',
        pickup_location: 'Home, Bangalore',
        dropoff_location: 'Airport, Bangalore',
        provider_first_name: 'Rahul',
        provider_last_name: 'K',
        amount: 450,
        distance: '15 km',
        duration: '35 min'
      },
      {
        id: 'BK12346',
        service_type: 'caretaker',
        status: 'upcoming',
        booking_date: '2025-05-04T09:00:00',
        location: 'Home, Bangalore',
        provider_first_name: 'Priya',
        provider_last_name: 'M',
        amount: 800,
        hours: 4
      },
      {
        id: 'BK12347',
        service_type: 'shuttle',
        status: 'active',
        booking_date: '2025-05-03T08:30:00',
        pickup_location: 'Home, Bangalore',
        dropoff_location: 'Office, Bangalore',
        provider_first_name: 'Suresh',
        provider_last_name: 'P',
        amount: 350,
        passengers: 3,
        distance: '12 km',
        duration: '30 min'
      }
    ]
  });
});

// Default route serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
