const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Initialize express app
const app = express();

// Database connection
let db = null;

// Initialize database connection
async function initDb() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rydo_db'
    });
    
    console.log('Database connected successfully');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'rydo_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// If in production, use MySQL session store
if (process.env.NODE_ENV === 'production') {
  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  sessionOptions.store = sessionStore;
}

app.use(session(sessionOptions));

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'RYDO API is running'
  });
});

// Auth routes
app.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Initialize database if not already initialized
    if (!db) {
      await initDb();
    }
    
    // Check if user exists
    const [users] = await db.execute(
      'SELECT id, email, password, role, first_name, last_name FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = users[0];
    
    // In a real app, you would use bcrypt to compare passwords
    // For simplicity, we're doing a direct comparison here
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Set session data
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

// Check auth status
app.get('/api/auth/check-auth', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        email: req.session.userEmail,
        role: req.session.userRole
      }
    });
  }
  
  res.json({
    authenticated: false
  });
});

// User profile route
app.get('/api/user/profile', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in to continue.'
      });
    }
    
    // Initialize database if not already initialized
    if (!db) {
      await initDb();
    }
    
    // Get user profile
    const [users] = await db.execute(
      'SELECT id, email, phone, first_name, last_name, profile_image, role FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Nearby drivers route
app.post('/api/nearby-drivers/find', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in to continue.'
      });
    }
    
    const { latitude, longitude, radius = 3 } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Initialize database if not already initialized
    if (!db) {
      await initDb();
    }
    
    // Find drivers within the specified radius (3km by default)
    // Using Haversine formula to calculate distance
    const [drivers] = await db.execute(`
      SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.profile_image,
        ul.latitude, 
        ul.longitude,
        u.average_rating,
        u.total_rides,
        v.vehicle_type,
        v.vehicle_make,
        v.vehicle_model,
        (
          6371 * acos(
            cos(radians(?)) * 
            cos(radians(ul.latitude)) * 
            cos(radians(ul.longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(ul.latitude))
          )
        ) AS distance
      FROM 
        users u
      JOIN 
        user_locations ul ON u.id = ul.user_id
      LEFT JOIN
        vehicles v ON u.id = v.user_id
      WHERE 
        u.role = 'driver'
        AND u.is_active = 1
        AND u.is_verified = 1
        AND u.is_available = 1
      HAVING 
        distance <= ?
      ORDER BY 
        distance
      LIMIT 10
    `, [latitude, longitude, latitude, radius]);
    
    return res.json({
      success: true,
      drivers: drivers.map(driver => ({
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        profile_image: driver.profile_image,
        distance: parseFloat(driver.distance).toFixed(2),
        rating: driver.average_rating || 0,
        total_rides: driver.total_rides || 0,
        vehicle: {
          type: driver.vehicle_type,
          make: driver.vehicle_make,
          model: driver.vehicle_model
        }
      }))
    });
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to find nearby drivers'
    });
  }
});

// Create booking with timeout
app.post('/api/nearby-drivers/book', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in to continue.'
      });
    }
    
    const { 
      service_type, 
      provider_id, 
      pickup_location, 
      dropoff_location,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude,
      dropoff_longitude,
      booking_date,
      booking_time,
      payment_method,
      fare_amount,
      notes
    } = req.body;
    
    const customer_id = req.session.userId;
    
    if (!service_type || !provider_id || !pickup_location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information'
      });
    }
    
    // Initialize database if not already initialized
    if (!db) {
      await initDb();
    }
    
    // Generate unique booking reference
    const booking_reference = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Set expiration time (15 minutes from now)
    const now = new Date();
    const expiration_time = new Date(now.getTime() + 15 * 60000); // 15 minutes in milliseconds
    
    // Insert booking with expiration time
    const [result] = await db.execute(`
      INSERT INTO bookings (
        customer_id, 
        provider_id, 
        service_type, 
        pickup_location, 
        dropoff_location,
        pickup_latitude,
        pickup_longitude,
        dropoff_latitude,
        dropoff_longitude,
        booking_date,
        booking_time,
        payment_method,
        fare_amount,
        notes,
        status,
        reference_id,
        expiration_time,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
    `, [
      customer_id,
      provider_id,
      service_type,
      pickup_location,
      dropoff_location || null,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude || null,
      dropoff_longitude || null,
      booking_date,
      booking_time,
      payment_method,
      fare_amount,
      notes || null,
      booking_reference,
      expiration_time
    ]);
    
    if (!result.insertId) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }
    
    // Get the created booking
    const [bookings] = await db.execute(`
      SELECT * FROM bookings WHERE id = ?
    `, [result.insertId]);
    
    if (!bookings.length) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created booking'
      });
    }
    
    const booking = bookings[0];
    
    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        reference_id: booking.reference_id,
        status: booking.status,
        expiration_time: booking.expiration_time,
        service_type: booking.service_type
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

// Export the serverless function
exports.handler = serverless(app);
