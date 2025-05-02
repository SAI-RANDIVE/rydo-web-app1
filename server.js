/**
 * RYDO Web App - Ultra Simple Server
 * Minimal server for Render.com deployment
 */

const express = require('express');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('frontend'));

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

// Dashboard routes
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

// Mock API endpoint for nearby drivers (similar to Uber)
app.post('/api/drivers/nearby', (req, res) => {
  const { latitude, longitude, radius = 3, service_type = 'driver' } = req.body;
  
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
