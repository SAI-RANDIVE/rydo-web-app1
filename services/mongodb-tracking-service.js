/**
 * Real-time Tracking Service for MongoDB
 * Handles location tracking for drivers and shuttle services
 */

const WebSocket = require('ws');
const http = require('http');
const { Booking, User, Profile } = require('../models/mongodb');
const mongoose = require('mongoose');

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
    let booking;
    
    if (role === 'driver') {
      booking = await Booking.findOne({
        _id: sessionId,
        providerId: userId,
        status: { $in: ['accepted', 'in-progress'] }
      });
    } else if (role === 'shuttle') {
      booking = await Booking.findOne({
        _id: sessionId,
        providerId: userId,
        serviceType: 'shuttle',
        status: { $in: ['accepted', 'in-progress'] }
      });
    } else if (role === 'customer') {
      booking = await Booking.findOne({
        _id: sessionId,
        customerId: userId,
        status: { $in: ['accepted', 'in-progress'] }
      });
    } else {
      return false;
    }
    
    if (!booking) {
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
    
    switch (data.type) {
      case 'location_update':
        handleLocationUpdate(sessionId, role, userId, data.data);
        break;
      case 'eta_update':
        handleETAUpdate(sessionId, data.data.eta);
        break;
      case 'status_update':
        handleStatusUpdate(sessionId, role, userId, data.data.status);
        break;
      default:
        console.log(`Unknown message type: ${data.type}`);
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
      console.error('Invalid location data');
      return;
    }
    
    // Only drivers and shuttles can update location
    if (role !== 'driver' && role !== 'shuttle') {
      console.error('Only drivers and shuttles can update location');
      return;
    }
    
    // Get session
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      console.error('Session not found');
      return;
    }
    
    // Update session location
    session.lastLocation = locationData;
    session.lastUpdate = new Date().toISOString();
    
    // Update location in database
    updateLastKnownLocation(sessionId, role, userId, locationData);
    
    // Broadcast location update to all session participants
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
      console.error('Invalid ETA');
      return;
    }
    
    // Update ETA in database
    updateETA(sessionId, eta);
    
    // Broadcast ETA update to all session participants
    broadcastToSession(sessionId, {
      type: 'eta_update',
      data: {
        eta: eta
      }
    });
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
      console.error('Invalid status');
      return;
    }
    
    // Update status in database
    updateStatus(sessionId, role, status);
    
    // Broadcast status update to all session participants
    broadcastToSession(sessionId, {
      type: 'status_update',
      data: {
        status: status,
        role: role,
        userId: userId
      }
    });
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
    
    // Send message to all connections in session
    sessionConnections.forEach((ws, key) => {
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
    // Update user location
    await User.findByIdAndUpdate(userId, {
      'location.coordinates': [
        parseFloat(locationData.longitude),
        parseFloat(locationData.latitude)
      ]
    });
    
    // Update booking location if it's a driver or shuttle
    if (role === 'driver' || role === 'shuttle') {
      await Booking.findByIdAndUpdate(sessionId, {
        currentLocation: {
          coordinates: [
            parseFloat(locationData.longitude),
            parseFloat(locationData.latitude)
          ],
          accuracy: locationData.accuracy || 0,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          updatedAt: new Date()
        }
      });
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
    // Update booking ETA
    await Booking.findByIdAndUpdate(sessionId, {
      eta: eta,
      etaUpdatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating ETA:', error);
  }
};

/**
 * Update status in database
 */
const updateStatus = async (sessionId, role, status) => {
  try {
    // Map WebSocket status to database status
    let bookingStatus;
    
    switch (status) {
      case 'arrived':
        bookingStatus = 'in-progress';
        break;
      case 'started':
        bookingStatus = 'in-progress';
        break;
      case 'completed':
        bookingStatus = 'completed';
        break;
      case 'cancelled':
        bookingStatus = 'cancelled';
        break;
      default:
        bookingStatus = status;
    }
    
    // Update booking status
    const booking = await Booking.findById(sessionId);
    
    if (!booking) {
      console.error('Booking not found');
      return;
    }
    
    booking.status = bookingStatus;
    
    // Set timestamps based on status
    if (status === 'started') {
      booking.startTime = new Date();
    } else if (status === 'completed') {
      booking.endTime = new Date();
    }
    
    await booking.save();
  } catch (error) {
    console.error('Error updating status:', error);
  }
};

/**
 * Get route data for a session
 */
const getRouteData = async (sessionId) => {
  try {
    // Get booking
    const booking = await Booking.findById(sessionId);
    
    if (!booking) {
      return null;
    }
    
    // Get provider
    const provider = await User.findById(booking.providerId);
    
    if (!provider) {
      return null;
    }
    
    // Return route data
    return {
      pickup: {
        latitude: booking.pickupLocation.coordinates[1],
        longitude: booking.pickupLocation.coordinates[0],
        address: booking.pickupLocation.address
      },
      dropoff: {
        latitude: booking.dropLocation.coordinates[1],
        longitude: booking.dropLocation.coordinates[0],
        address: booking.dropLocation.address
      },
      provider: {
        id: provider._id,
        name: `${provider.firstName} ${provider.lastName}`,
        phone: provider.phone,
        photo: provider.profileImage,
        vehicle: booking.vehicleDetails ? {
          model: booking.vehicleDetails.model,
          color: booking.vehicleDetails.color,
          registrationNumber: booking.vehicleDetails.registrationNumber
        } : null
      },
      booking: {
        id: booking._id,
        status: booking.status,
        fare: booking.fare,
        distance: booking.distance,
        serviceType: booking.serviceType,
        createdAt: booking.createdAt
      }
    };
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
    // Get booking
    const booking = await Booking.findById(sessionId);
    
    if (!booking) {
      return null;
    }
    
    // Return ETA
    return booking.eta;
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
    const { bookingId, providerId, customerId, serviceType } = sessionData;
    
    // Validate required fields
    if (!bookingId || !providerId || !customerId) {
      throw new Error('Missing required fields');
    }
    
    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Check if provider exists
    const provider = await User.findById(providerId);
    
    if (!provider) {
      throw new Error('Provider not found');
    }
    
    // Check if customer exists
    const customer = await User.findById(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Create session
    if (!activeSessions.has(bookingId)) {
      activeSessions.set(bookingId, {
        id: bookingId,
        lastLocation: null,
        lastUpdate: null,
        participants: new Set([`driver_${providerId}`, `customer_${customerId}`])
      });
    }
    
    return {
      sessionId: bookingId,
      success: true
    };
  } catch (error) {
    console.error('Error creating tracking session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get tracking session
 */
const getTrackingSession = (sessionId) => {
  try {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    return {
      id: session.id,
      lastUpdate: session.lastUpdate,
      participants: Array.from(session.participants)
    };
  } catch (error) {
    console.error('Error getting tracking session:', error);
    return null;
  }
};

module.exports = {
  initTrackingServer,
  createTrackingSession,
  getTrackingSession
};
