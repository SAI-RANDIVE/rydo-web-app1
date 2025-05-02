const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Middleware to check if user is authenticated and is a shuttle driver
const isShuttleDriver = async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.session.user.role !== 'shuttle_driver') {
    return res.status(403).json({ message: 'Access denied. Only shuttle drivers can access this resource.' });
  }
  
  next();
};

// Get shuttle driver routes
router.get('/routes', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    
    // Get routes for the shuttle driver
    const [routes] = await db.query(
      `SELECT r.id, r.name, r.description, r.start_point, r.end_point, 
       r.distance, r.estimated_duration, r.fare
       FROM shuttle_routes r
       JOIN shuttle_services s ON r.shuttle_service_id = s.id
       WHERE s.user_id = ?
       ORDER BY r.name ASC`,
      [shuttleDriverId]
    );
    
    res.status(200).json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shuttle driver schedule
router.get('/schedule', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    
    // Get schedule for the shuttle driver
    const [schedule] = await db.query(
      `SELECT s.id, r.name as route_name, s.departure_time, s.arrival_time, 
       s.status, s.current_passengers, r.passenger_capacity
       FROM shuttle_schedules s
       JOIN shuttle_routes r ON s.route_id = r.id
       JOIN shuttle_services ss ON r.shuttle_service_id = ss.id
       WHERE ss.user_id = ? AND s.departure_time >= NOW()
       ORDER BY s.departure_time ASC`,
      [shuttleDriverId]
    );
    
    res.status(200).json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get passengers for today's schedules
router.get('/passengers', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    
    // Get passengers for today's schedules
    const [passengers] = await db.query(
      `SELECT b.id, CONCAT(u.first_name, ' ', u.last_name) as name, 
       u.phone, b.pickup_point, b.dropoff_point, b.booking_time,
       b.status, b.payment_status, b.fare
       FROM shuttle_bookings b
       JOIN users u ON b.user_id = u.id
       JOIN shuttle_schedules s ON b.schedule_id = s.id
       JOIN shuttle_routes r ON s.route_id = r.id
       JOIN shuttle_services ss ON r.shuttle_service_id = ss.id
       WHERE ss.user_id = ? AND DATE(s.departure_time) = CURDATE()
       ORDER BY s.departure_time ASC`,
      [shuttleDriverId]
    );
    
    res.status(200).json({ passengers });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shuttle driver statistics
router.get('/stats', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    
    // Get total routes
    const [routesResult] = await db.query(
      `SELECT COUNT(DISTINCT r.id) as total_routes
       FROM shuttle_routes r
       JOIN shuttle_services s ON r.shuttle_service_id = s.id
       WHERE s.user_id = ?`,
      [shuttleDriverId]
    );
    
    // Get total passengers
    const [passengersResult] = await db.query(
      `SELECT COUNT(*) as total_passengers
       FROM shuttle_bookings b
       JOIN shuttle_schedules s ON b.schedule_id = s.id
       JOIN shuttle_routes r ON s.route_id = r.id
       JOIN shuttle_services ss ON r.shuttle_service_id = ss.id
       WHERE ss.user_id = ? AND b.status = 'completed'`,
      [shuttleDriverId]
    );
    
    // Get total earnings
    const [earningsResult] = await db.query(
      `SELECT SUM(t.amount) as total_earnings
       FROM transactions t
       JOIN shuttle_bookings b ON t.booking_id = b.id
       JOIN shuttle_schedules s ON b.schedule_id = s.id
       JOIN shuttle_routes r ON s.route_id = r.id
       JOIN shuttle_services ss ON r.shuttle_service_id = ss.id
       WHERE ss.user_id = ? AND t.status = 'completed'`,
      [shuttleDriverId]
    );
    
    // Get average rating
    const [ratingResult] = await db.query(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
       FROM ratings
       WHERE rated_to = ?`,
      [shuttleDriverId]
    );
    
    const stats = {
      total_routes: routesResult[0].total_routes || 0,
      total_passengers: passengersResult[0].total_passengers || 0,
      total_earnings: earningsResult[0].total_earnings || 0,
      average_rating: ratingResult[0].average_rating || 0,
      total_ratings: ratingResult[0].total_ratings || 0
    };
    
    res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching shuttle stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a route
router.post('/start-route', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    const { routeName } = req.body;
    
    // Find the route
    const [routes] = await db.query(
      `SELECT r.id
       FROM shuttle_routes r
       JOIN shuttle_services s ON r.shuttle_service_id = s.id
       WHERE s.user_id = ? AND r.name = ?`,
      [shuttleDriverId, routeName]
    );
    
    if (routes.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    const routeId = routes[0].id;
    
    // Check if there's an active schedule for this route today
    const [schedules] = await db.query(
      `SELECT id, status FROM shuttle_schedules
       WHERE route_id = ? AND DATE(departure_time) = CURDATE()
       ORDER BY departure_time ASC LIMIT 1`,
      [routeId]
    );
    
    let scheduleId;
    
    if (schedules.length > 0) {
      scheduleId = schedules[0].id;
      
      // Update schedule status to 'in_progress'
      await db.query(
        'UPDATE shuttle_schedules SET status = ? WHERE id = ?',
        ['in_progress', scheduleId]
      );
    } else {
      // Create a new schedule for today
      const [result] = await db.query(
        `INSERT INTO shuttle_schedules (route_id, departure_time, arrival_time, status, current_passengers)
         VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 2 HOUR), 'in_progress', 0)`,
        [routeId]
      );
      
      scheduleId = result.insertId;
    }
    
    // Update shuttle service status to 'on_route'
    await db.query(
      `UPDATE shuttle_services SET status = 'on_route', current_route_id = ?
       WHERE user_id = ?`,
      [routeId, shuttleDriverId]
    );
    
    res.status(200).json({ 
      message: 'Route started successfully',
      scheduleId
    });
  } catch (error) {
    console.error('Error starting route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete a route
router.post('/complete-route', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    const { scheduleId } = req.body;
    
    // Update schedule status to 'completed'
    await db.query(
      'UPDATE shuttle_schedules SET status = ?, arrival_time = NOW() WHERE id = ?',
      ['completed', scheduleId]
    );
    
    // Update shuttle service status to 'available'
    await db.query(
      `UPDATE shuttle_services SET status = 'available', current_route_id = NULL
       WHERE user_id = ?`,
      [shuttleDriverId]
    );
    
    // Update all bookings for this schedule to 'completed'
    await db.query(
      'UPDATE shuttle_bookings SET status = ? WHERE schedule_id = ?',
      ['completed', scheduleId]
    );
    
    res.status(200).json({ message: 'Route completed successfully' });
  } catch (error) {
    console.error('Error completing route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vehicle details
router.get('/vehicle', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    
    // Get vehicle details
    const [vehicles] = await db.query(
      `SELECT vehicle_type, vehicle_model, vehicle_color, vehicle_year,
       vehicle_registration, passenger_capacity, last_maintenance_date, 
       next_maintenance_date, fuel_type, fuel_efficiency
       FROM shuttle_services
       WHERE user_id = ?`,
      [shuttleDriverId]
    );
    
    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    res.status(200).json({ vehicle: vehicles[0] });
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vehicle details
router.put('/vehicle', isShuttleDriver, async (req, res) => {
  try {
    const shuttleDriverId = req.session.user.id;
    const { 
      vehicle_model, vehicle_color, vehicle_year, vehicle_registration,
      last_maintenance_date, next_maintenance_date, fuel_type, fuel_efficiency 
    } = req.body;
    
    // Update vehicle details
    await db.query(
      `UPDATE shuttle_services SET 
       vehicle_model = ?, vehicle_color = ?, vehicle_year = ?, 
       vehicle_registration = ?, last_maintenance_date = ?,
       next_maintenance_date = ?, fuel_type = ?, fuel_efficiency = ?
       WHERE user_id = ?`,
      [
        vehicle_model, vehicle_color, vehicle_year, vehicle_registration,
        last_maintenance_date, next_maintenance_date, fuel_type, fuel_efficiency,
        shuttleDriverId
      ]
    );
    
    res.status(200).json({ message: 'Vehicle details updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
