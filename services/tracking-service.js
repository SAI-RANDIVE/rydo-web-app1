/**
 * Real-time Tracking Service
 * Handles location tracking for drivers and shuttle services
 */

const WebSocket = require('ws');
const http = require('http');
let db;

try {
  db = require('../../config/db');
} catch (error) {
  console.error('Error loading database module:', error.message);
  db = {
    query: async () => [[], []],
    execute: async () => [[], []]
  };
}

// Store active tracking sessions
const activeSessions = new Map();

// Store active connections
const activeConnections = new Map();

/**
 * Initialize WebSocket server
 */
const initTrackingServer = (server) => {
  // Create WebSocket server
  const wss = new WebSocket.Server({ server });
  
  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    // Extract session ID from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session');
    const role = url.searchParams.get('role'); // 'driver', 'customer', 'shuttle'
    const userId = url.searchParams.get('userId');
    
    if (!sessionId || !role || !userId) {
      ws.close(4000, 'Missing required parameters');
      return;
    }
    
    // Validate session
    validateSession(sessionId, role, userId)
      .then(isValid => {
        if (!isValid) {
          ws.close(4001, 'Invalid session');
          return;
        }
        
        // Store connection
        if (!activeConnections.has(sessionId)) {
          activeConnections.set(sessionId, new Map());
        }
        
        const sessionConnections = activeConnections.get(sessionId);
        sessionConnections.set(`${role}_${userId}`, ws);
        
        console.log(`WebSocket connection established: ${role} ${userId} for session ${sessionId}`);
        
        // Send initial data
        sendInitialData(ws, sessionId, role);
        
        // Handle messages
        ws.on('message', (message) => {
          handleMessage(message, sessionId, role, userId);
        });
        
        // Handle connection close
        ws.on('close', () => {
          console.log(`WebSocket connection closed: ${role} ${userId} for session ${sessionId}`);
          
          const sessionConnections = activeConnections.get(sessionId);
          if (sessionConnections) {
            sessionConnections.delete(`${role}_${userId}`);
            
            // Remove session if no connections left
            if (sessionConnections.size === 0) {
              activeConnections.delete(sessionId);
              
              // Update last known location in database if driver/shuttle
              if (role === 'driver' || role === 'shuttle') {
                const session = activeSessions.get(sessionId);
                if (session && session.lastLocation) {
                  updateLastKnownLocation(sessionId, role, userId, session.lastLocation);
                }
                
                activeSessions.delete(sessionId);
              }
            }
          }
        });
      })
      .catch(error => {
        console.error('Error validating session:', error);
        ws.close(4002, 'Session validation error');
      });
  });
  
  console.log('WebSocket tracking server initialized');
  
  return wss;
};

/**
 * Validate tracking session
 */
const validateSession = async (sessionId, role, userId) => {
  try {
    // Check if session exists in database
    let query;
    let params;
    
    if (role === 'driver') {
      query = `
        SELECT b.id FROM driver_bookings b
        JOIN users u ON b.driver_id = u.id
        WHERE b.id = ? AND u.id = ? AND b.status IN ('accepted', 'in_progress')
      `;
      params = [sessionId, userId];
    } else if (role === 'shuttle') {
      query = `
        SELECT s.id FROM shuttle_schedules s
        JOIN users u ON s.driver_id = u.id
        WHERE s.id = ? AND u.id = ? AND s.status IN ('active', 'in_progress')
      `;
      params = [sessionId, userId];
    } else if (role === 'customer') {
      query = `
        SELECT b.id FROM driver_bookings b
        WHERE b.id = ? AND b.user_id = ? AND b.status IN ('accepted', 'in_progress')
        UNION
        SELECT b.id FROM shuttle_bookings b
        WHERE b.schedule_id = ? AND b.user_id = ? AND b.status IN ('confirmed', 'in_progress')
      `;
      params = [sessionId, userId, sessionId, userId];
    } else {
      return false;
    }
    
    const [rows] = await db.query(query, params);
    
    if (rows.length === 0) {
      return false;
    }
    
    // Create session if it doesn't exist
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        id: sessionId,
        lastLocation: null,
        lastUpdate: null,
        participants: new Set()
      });
    }
    
    // Add participant to session
    const session = activeSessions.get(sessionId);
    session.participants.add(`${role}_${userId}`);
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

/**
 * Send initial data to client
 */
const sendInitialData = async (ws, sessionId, role) => {
  try {
    // Get session data
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return;
    }
    
    // Send last known location if available
    if (session.lastLocation) {
      ws.send(JSON.stringify({
        type: 'location_update',
        data: {
          latitude: session.lastLocation.latitude,
          longitude: session.lastLocation.longitude,
          accuracy: session.lastLocation.accuracy,
          speed: session.lastLocation.speed,
          heading: session.lastLocation.heading,
          timestamp: session.lastUpdate
        }
      }));
    }
    
    // Send route data if available
    if (role === 'customer') {
      const routeData = await getRouteData(sessionId);
      
      if (routeData) {
        ws.send(JSON.stringify({
          type: 'route_data',
          data: routeData
        }));
      }
      
      // Send ETA if available
      const eta = await getETA(sessionId);
      
      if (eta) {
        ws.send(JSON.stringify({
          type: 'eta_update',
          data: {
            eta: eta
          }
        }));
      }
    }
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
};

/**
 * Handle incoming WebSocket message
 */
const handleMessage = (message, sessionId, role, userId) => {
  try {
    const data = JSON.parse(message);
    
    // Handle location update
    if (data.type === 'location_update' && (role === 'driver' || role === 'shuttle')) {
      handleLocationUpdate(sessionId, role, userId, data.data);
    }
    
    // Handle ETA update
    if (data.type === 'eta_update' && (role === 'driver' || role === 'shuttle')) {
      handleETAUpdate(sessionId, data.data.eta);
    }
    
    // Handle status update
    if (data.type === 'status_update') {
      handleStatusUpdate(sessionId, role, userId, data.data.status);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
};

/**
 * Handle location update
 */
const handleLocationUpdate = (sessionId, role, userId, locationData) => {
  try {
    // Validate location data
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      return;
    }
    
    // Update session
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return;
    }
    
    // Update last location
    session.lastLocation = locationData;
    session.lastUpdate = new Date().toISOString();
    
    // Broadcast to all participants
    broadcastToSession(sessionId, {
      type: 'location_update',
      data: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: session.lastUpdate
      }
    });
    
    // Update database periodically (every 30 seconds)
    const now = new Date();
    const lastDbUpdate = session.lastDbUpdate || 0;
    
    if (now - lastDbUpdate > 30000) {
      updateLastKnownLocation(sessionId, role, userId, locationData);
      session.lastDbUpdate = now;
    }
  } catch (error) {
    console.error('Error handling location update:', error);
  }
};

/**
 * Handle ETA update
 */
const handleETAUpdate = (sessionId, eta) => {
  try {
    // Validate ETA
    if (!eta) {
      return;
    }
    
    // Broadcast to all participants
    broadcastToSession(sessionId, {
      type: 'eta_update',
      data: {
        eta: eta
      }
    });
    
    // Update database
    updateETA(sessionId, eta);
  } catch (error) {
    console.error('Error handling ETA update:', error);
  }
};

/**
 * Handle status update
 */
const handleStatusUpdate = (sessionId, role, userId, status) => {
  try {
    // Validate status
    if (!status) {
      return;
    }
    
    // Broadcast to all participants
    broadcastToSession(sessionId, {
      type: 'status_update',
      data: {
        status: status,
        updatedBy: role
      }
    });
    
    // Update database
    updateStatus(sessionId, role, status);
  } catch (error) {
    console.error('Error handling status update:', error);
  }
};

/**
 * Broadcast message to all session participants
 */
const broadcastToSession = (sessionId, message) => {
  try {
    const sessionConnections = activeConnections.get(sessionId);
    
    if (!sessionConnections) {
      return;
    }
    
    const messageString = JSON.stringify(message);
    
    sessionConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  } catch (error) {
    console.error('Error broadcasting to session:', error);
  }
};

/**
 * Update last known location in database
 */
const updateLastKnownLocation = async (sessionId, role, userId, locationData) => {
  try {
    let query;
    let params;
    
    if (role === 'driver') {
      query = `
        UPDATE driver_bookings
        SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
        WHERE id = ?
      `;
      params = [locationData.latitude, locationData.longitude, sessionId];
    } else if (role === 'shuttle') {
      query = `
        UPDATE shuttle_schedules
        SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
        WHERE id = ?
      `;
      params = [locationData.latitude, locationData.longitude, sessionId];
    }
    
    if (query) {
      await db.query(query, params);
    }
  } catch (error) {
    console.error('Error updating last known location:', error);
  }
};

/**
 * Update ETA in database
 */
const updateETA = async (sessionId, eta) => {
  try {
    // Check if it's a driver booking or shuttle schedule
    const [driverBookings] = await db.query(
      'SELECT id FROM driver_bookings WHERE id = ?',
      [sessionId]
    );
    
    if (driverBookings.length > 0) {
      await db.query(
        'UPDATE driver_bookings SET estimated_arrival_time = ? WHERE id = ?',
        [eta, sessionId]
      );
    } else {
      const [shuttleSchedules] = await db.query(
        'SELECT id FROM shuttle_schedules WHERE id = ?',
        [sessionId]
      );
      
      if (shuttleSchedules.length > 0) {
        await db.query(
          'UPDATE shuttle_schedules SET estimated_arrival_time = ? WHERE id = ?',
          [eta, sessionId]
        );
      }
    }
  } catch (error) {
    console.error('Error updating ETA:', error);
  }
};

/**
 * Update status in database
 */
const updateStatus = async (sessionId, role, status) => {
  try {
    if (role === 'driver') {
      await db.query(
        'UPDATE driver_bookings SET status = ? WHERE id = ?',
        [status, sessionId]
      );
    } else if (role === 'shuttle') {
      await db.query(
        'UPDATE shuttle_schedules SET status = ? WHERE id = ?',
        [status, sessionId]
      );
    } else if (role === 'customer') {
      // Check if it's a driver booking or shuttle booking
      const [driverBookings] = await db.query(
        'SELECT id FROM driver_bookings WHERE id = ? AND status != "completed"',
        [sessionId]
      );
      
      if (driverBookings.length > 0) {
        if (status === 'cancelled') {
          await db.query(
            'UPDATE driver_bookings SET status = ? WHERE id = ?',
            [status, sessionId]
          );
        }
      } else {
        const [shuttleBookings] = await db.query(
          'SELECT id, schedule_id FROM shuttle_bookings WHERE schedule_id = ? AND status != "completed"',
          [sessionId]
        );
        
        if (shuttleBookings.length > 0) {
          if (status === 'cancelled') {
            await db.query(
              'UPDATE shuttle_bookings SET status = ? WHERE schedule_id = ?',
              [status, sessionId]
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
};

/**
 * Get route data for a session
 */
const getRouteData = async (sessionId) => {
  try {
    // Check if it's a driver booking or shuttle schedule
    const [driverBookings] = await db.query(
      `SELECT pickup_latitude, pickup_longitude, destination_latitude, destination_longitude
       FROM driver_bookings WHERE id = ?`,
      [sessionId]
    );
    
    if (driverBookings.length > 0) {
      const booking = driverBookings[0];
      
      return {
        origin: {
          latitude: booking.pickup_latitude,
          longitude: booking.pickup_longitude
        },
        destination: {
          latitude: booking.destination_latitude,
          longitude: booking.destination_longitude
        }
      };
    } else {
      const [shuttleSchedules] = await db.query(
        `SELECT r.start_latitude, r.start_longitude, r.end_latitude, r.end_longitude,
         r.waypoints
         FROM shuttle_schedules s
         JOIN shuttle_routes r ON s.route_id = r.id
         WHERE s.id = ?`,
        [sessionId]
      );
      
      if (shuttleSchedules.length > 0) {
        const schedule = shuttleSchedules[0];
        
        return {
          origin: {
            latitude: schedule.start_latitude,
            longitude: schedule.start_longitude
          },
          destination: {
            latitude: schedule.end_latitude,
            longitude: schedule.end_longitude
          },
          waypoints: schedule.waypoints ? JSON.parse(schedule.waypoints) : []
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting route data:', error);
    return null;
  }
};

/**
 * Get ETA for a session
 */
const getETA = async (sessionId) => {
  try {
    // Check if it's a driver booking or shuttle schedule
    const [driverBookings] = await db.query(
      'SELECT estimated_arrival_time FROM driver_bookings WHERE id = ?',
      [sessionId]
    );
    
    if (driverBookings.length > 0) {
      return driverBookings[0].estimated_arrival_time;
    } else {
      const [shuttleSchedules] = await db.query(
        'SELECT estimated_arrival_time FROM shuttle_schedules WHERE id = ?',
        [sessionId]
      );
      
      if (shuttleSchedules.length > 0) {
        return shuttleSchedules[0].estimated_arrival_time;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ETA:', error);
    return null;
  }
};

/**
 * Create tracking session
 */
const createTrackingSession = async (sessionData) => {
  try {
    const { session_id, session_type } = sessionData;
    
    // Validate session exists in database
    let exists = false;
    
    if (session_type === 'driver_booking') {
      const [rows] = await db.query(
        'SELECT id FROM driver_bookings WHERE id = ?',
        [session_id]
      );
      
      exists = rows.length > 0;
    } else if (session_type === 'shuttle_schedule') {
      const [rows] = await db.query(
        'SELECT id FROM shuttle_schedules WHERE id = ?',
        [session_id]
      );
      
      exists = rows.length > 0;
    }
    
    if (!exists) {
      throw new Error('Session not found');
    }
    
    // Create session
    if (!activeSessions.has(session_id)) {
      activeSessions.set(session_id, {
        id: session_id,
        type: session_type,
        lastLocation: null,
        lastUpdate: null,
        participants: new Set()
      });
    }
    
    return {
      session_id,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating tracking session:', error);
    throw error;
  }
};

/**
 * Get tracking session
 */
const getTrackingSession = (sessionId) => {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  return {
    id: session.id,
    lastLocation: session.lastLocation,
    lastUpdate: session.lastUpdate,
    participants: Array.from(session.participants)
  };
};

module.exports = {
  initTrackingServer,
  createTrackingSession,
  getTrackingSession
};
