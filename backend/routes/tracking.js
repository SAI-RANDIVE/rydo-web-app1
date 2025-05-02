/**
 * Tracking Routes
 * Handles real-time location tracking for drivers and shuttle services
 */

const express = require('express');
const router = express.Router();
const trackingService = require('../services/tracking-service');
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Create tracking session
 * POST /tracking/session
 */
router.post('/session', isAuthenticated, async (req, res) => {
  try {
    const { session_id, session_type } = req.body;
    
    if (!session_id || !session_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate session type
    if (!['driver_booking', 'shuttle_schedule'].includes(session_type)) {
      return res.status(400).json({ message: 'Invalid session type' });
    }
    
    // Check if user has permission to create this session
    let hasPermission = false;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    if (session_type === 'driver_booking') {
      if (userRole === 'driver') {
        // Check if driver is assigned to this booking
        const [bookings] = await db.query(
          'SELECT id FROM driver_bookings WHERE id = ? AND driver_id = ?',
          [session_id, userId]
        );
        
        hasPermission = bookings.length > 0;
      } else if (userRole === 'customer') {
        // Check if customer owns this booking
        const [bookings] = await db.query(
          'SELECT id FROM driver_bookings WHERE id = ? AND user_id = ?',
          [session_id, userId]
        );
        
        hasPermission = bookings.length > 0;
      }
    } else if (session_type === 'shuttle_schedule') {
      if (userRole === 'shuttle_driver') {
        // Check if shuttle driver is assigned to this schedule
        const [schedules] = await db.query(
          'SELECT id FROM shuttle_schedules WHERE id = ? AND driver_id = ?',
          [session_id, userId]
        );
        
        hasPermission = schedules.length > 0;
      } else if (userRole === 'customer') {
        // Check if customer has a booking for this schedule
        const [bookings] = await db.query(
          'SELECT id FROM shuttle_bookings WHERE schedule_id = ? AND user_id = ?',
          [session_id, userId]
        );
        
        hasPermission = bookings.length > 0;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Create tracking session
    const session = await trackingService.createTrackingSession({
      session_id,
      session_type
    });
    
    res.status(200).json(session);
  } catch (error) {
    console.error('Error creating tracking session:', error);
    res.status(500).json({ message: 'Failed to create tracking session' });
  }
});

/**
 * Get tracking session
 * GET /tracking/session/:sessionId
 */
router.get('/session/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // Check if user has permission to access this session
    let hasPermission = false;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    // Check if it's a driver booking
    const [driverBookings] = await db.query(
      'SELECT id, user_id, driver_id FROM driver_bookings WHERE id = ?',
      [sessionId]
    );
    
    if (driverBookings.length > 0) {
      const booking = driverBookings[0];
      
      if (userRole === 'driver' && booking.driver_id === userId) {
        hasPermission = true;
      } else if (userRole === 'customer' && booking.user_id === userId) {
        hasPermission = true;
      }
    } else {
      // Check if it's a shuttle schedule
      const [shuttleSchedules] = await db.query(
        'SELECT id, driver_id FROM shuttle_schedules WHERE id = ?',
        [sessionId]
      );
      
      if (shuttleSchedules.length > 0) {
        const schedule = shuttleSchedules[0];
        
        if (userRole === 'shuttle_driver' && schedule.driver_id === userId) {
          hasPermission = true;
        } else if (userRole === 'customer') {
          // Check if customer has a booking for this schedule
          const [bookings] = await db.query(
            'SELECT id FROM shuttle_bookings WHERE schedule_id = ? AND user_id = ?',
            [sessionId, userId]
          );
          
          hasPermission = bookings.length > 0;
        }
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Get tracking session
    const session = trackingService.getTrackingSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error('Error getting tracking session:', error);
    res.status(500).json({ message: 'Failed to get tracking session' });
  }
});

/**
 * Get tracking connection URL
 * GET /tracking/connect/:sessionId
 */
router.get('/connect/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    // Check if user has permission to access this session
    let hasPermission = false;
    let role = '';
    
    // Check if it's a driver booking
    const [driverBookings] = await db.query(
      'SELECT id, user_id, driver_id FROM driver_bookings WHERE id = ?',
      [sessionId]
    );
    
    if (driverBookings.length > 0) {
      const booking = driverBookings[0];
      
      if (userRole === 'driver' && booking.driver_id === userId) {
        hasPermission = true;
        role = 'driver';
      } else if (userRole === 'customer' && booking.user_id === userId) {
        hasPermission = true;
        role = 'customer';
      }
    } else {
      // Check if it's a shuttle schedule
      const [shuttleSchedules] = await db.query(
        'SELECT id, driver_id FROM shuttle_schedules WHERE id = ?',
        [sessionId]
      );
      
      if (shuttleSchedules.length > 0) {
        const schedule = shuttleSchedules[0];
        
        if (userRole === 'shuttle_driver' && schedule.driver_id === userId) {
          hasPermission = true;
          role = 'shuttle';
        } else if (userRole === 'customer') {
          // Check if customer has a booking for this schedule
          const [bookings] = await db.query(
            'SELECT id FROM shuttle_bookings WHERE schedule_id = ? AND user_id = ?',
            [sessionId, userId]
          );
          
          if (bookings.length > 0) {
            hasPermission = true;
            role = 'customer';
          }
        }
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Generate connection URL
    const host = req.get('host');
    const protocol = req.protocol === 'https' ? 'wss' : 'ws';
    const url = `${protocol}://${host}/ws?session=${sessionId}&role=${role}&userId=${userId}`;
    
    res.status(200).json({ url });
  } catch (error) {
    console.error('Error getting tracking connection URL:', error);
    res.status(500).json({ message: 'Failed to get tracking connection URL' });
  }
});

/**
 * Update location
 * POST /tracking/location
 */
router.post('/location', isAuthenticated, async (req, res) => {
  try {
    const { session_id, latitude, longitude, accuracy, speed, heading } = req.body;
    
    if (!session_id || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user has permission to update location for this session
    let hasPermission = false;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    if (userRole === 'driver') {
      // Check if driver is assigned to this booking
      const [bookings] = await db.query(
        'SELECT id FROM driver_bookings WHERE id = ? AND driver_id = ?',
        [session_id, userId]
      );
      
      hasPermission = bookings.length > 0;
    } else if (userRole === 'shuttle_driver') {
      // Check if shuttle driver is assigned to this schedule
      const [schedules] = await db.query(
        'SELECT id FROM shuttle_schedules WHERE id = ? AND driver_id = ?',
        [session_id, userId]
      );
      
      hasPermission = schedules.length > 0;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Update location in database
    let query;
    let params;
    
    if (userRole === 'driver') {
      query = `
        UPDATE driver_bookings
        SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
        WHERE id = ?
      `;
      params = [latitude, longitude, session_id];
    } else if (userRole === 'shuttle_driver') {
      query = `
        UPDATE shuttle_schedules
        SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
        WHERE id = ?
      `;
      params = [latitude, longitude, session_id];
    }
    
    if (query) {
      await db.query(query, params);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

module.exports = router;
