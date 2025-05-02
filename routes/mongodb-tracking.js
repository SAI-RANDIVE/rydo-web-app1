/**
 * MongoDB Tracking Routes
 * Handles real-time location tracking for drivers and shuttle services
 */

const express = require('express');
const router = express.Router();
const trackingService = require('../services/mongodb-tracking-service');
const { Booking, User } = require('../models/mongodb');
const mongoose = require('mongoose');

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
    const { booking_id, service_type } = req.body;
    
    if (!booking_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate service type
    if (!['driver', 'caretaker', 'shuttle'].includes(service_type)) {
      return res.status(400).json({ message: 'Invalid service type' });
    }
    
    // Check if user has permission to create this session
    let hasPermission = false;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    // Find the booking
    const booking = await Booking.findById(booking_id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check permissions based on role
    if (userRole === 'driver' || userRole === 'caretaker' || userRole === 'shuttle') {
      // Check if provider is assigned to this booking
      hasPermission = booking.providerId && booking.providerId.toString() === userId;
    } else if (userRole === 'customer') {
      // Check if customer owns this booking
      hasPermission = booking.customerId && booking.customerId.toString() === userId;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Create tracking session
    const session = await trackingService.createTrackingSession({
      bookingId: booking_id,
      providerId: booking.providerId,
      customerId: booking.customerId,
      serviceType: service_type
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
    
    // Find the booking
    const booking = await Booking.findById(sessionId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check permissions based on role
    if (userRole === 'driver' || userRole === 'caretaker' || userRole === 'shuttle') {
      // Check if provider is assigned to this booking
      hasPermission = booking.providerId && booking.providerId.toString() === userId;
    } else if (userRole === 'customer') {
      // Check if customer owns this booking
      hasPermission = booking.customerId && booking.customerId.toString() === userId;
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
    
    // Find the booking
    const booking = await Booking.findById(sessionId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check permissions based on role
    if (userRole === 'driver') {
      hasPermission = booking.providerId && booking.providerId.toString() === userId && booking.serviceType === 'driver';
      role = 'driver';
    } else if (userRole === 'caretaker') {
      hasPermission = booking.providerId && booking.providerId.toString() === userId && booking.serviceType === 'caretaker';
      role = 'caretaker';
    } else if (userRole === 'shuttle') {
      hasPermission = booking.providerId && booking.providerId.toString() === userId && booking.serviceType === 'shuttle';
      role = 'shuttle';
    } else if (userRole === 'customer') {
      hasPermission = booking.customerId && booking.customerId.toString() === userId;
      role = 'customer';
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Generate WebSocket URL
    const host = req.get('host');
    const protocol = req.protocol === 'https' ? 'wss' : 'ws';
    
    const wsUrl = `${protocol}://${host}/ws/tracking?session=${sessionId}&role=${role}&userId=${userId}`;
    
    res.status(200).json({
      url: wsUrl,
      session_id: sessionId,
      role: role
    });
  } catch (error) {
    console.error('Error generating tracking connection URL:', error);
    res.status(500).json({ message: 'Failed to generate tracking connection URL' });
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
    
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    // Only drivers and shuttles can update location
    if (userRole !== 'driver' && userRole !== 'caretaker' && userRole !== 'shuttle') {
      return res.status(403).json({ message: 'Only service providers can update location' });
    }
    
    // Find the booking
    const booking = await Booking.findById(session_id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if provider is assigned to this booking
    if (!booking.providerId || booking.providerId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Update location in database
    await User.findByIdAndUpdate(userId, {
      'location.coordinates': [parseFloat(longitude), parseFloat(latitude)]
    });
    
    // Update booking location
    await Booking.findByIdAndUpdate(session_id, {
      currentLocation: {
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        accuracy: accuracy || 0,
        speed: speed || 0,
        heading: heading || 0,
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

/**
 * Update ETA
 * POST /tracking/eta
 */
router.post('/eta', isAuthenticated, async (req, res) => {
  try {
    const { session_id, eta } = req.body;
    
    if (!session_id || !eta) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    // Only drivers and shuttles can update ETA
    if (userRole !== 'driver' && userRole !== 'caretaker' && userRole !== 'shuttle') {
      return res.status(403).json({ message: 'Only service providers can update ETA' });
    }
    
    // Find the booking
    const booking = await Booking.findById(session_id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if provider is assigned to this booking
    if (!booking.providerId || booking.providerId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }
    
    // Update ETA in database
    await Booking.findByIdAndUpdate(session_id, {
      eta: eta,
      etaUpdatedAt: new Date()
    });
    
    res.status(200).json({ message: 'ETA updated successfully' });
  } catch (error) {
    console.error('Error updating ETA:', error);
    res.status(500).json({ message: 'Failed to update ETA' });
  }
});

/**
 * Get provider location
 * GET /tracking/provider/:providerId
 */
router.get('/provider/:providerId', isAuthenticated, async (req, res) => {
  try {
    const providerId = req.params.providerId;
    
    // Find the provider
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    // Get provider location
    const location = provider.location && provider.location.coordinates ? {
      latitude: provider.location.coordinates[1],
      longitude: provider.location.coordinates[0]
    } : null;
    
    res.status(200).json({
      provider_id: provider._id,
      location: location,
      last_update: provider.updatedAt
    });
  } catch (error) {
    console.error('Error getting provider location:', error);
    res.status(500).json({ message: 'Failed to get provider location' });
  }
});

module.exports = router;
