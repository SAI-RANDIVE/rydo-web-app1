/**
 * Notification Routes
 * Handles notifications for users
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification-service');
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Get notifications for authenticated user
 * GET /notification
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const includeRead = req.query.include_read === 'true';
    
    // Get notifications
    const result = await notificationService.getUserNotifications(userId, limit, offset, includeRead);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

/**
 * Get unread notification count
 * GET /notification/count
 */
router.get('/count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get unread notification count
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    res.status(200).json({ count: result[0].count });
  } catch (error) {
    console.error('Error getting notification count:', error);
    res.status(500).json({ message: 'Failed to get notification count' });
  }
});

/**
 * Mark notification as read
 * PUT /notification/:id/read
 */
router.put('/:id/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const notificationId = req.params.id;
    
    // Mark notification as read
    const success = await notificationService.markNotificationAsRead(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

/**
 * Mark all notifications as read
 * PUT /notification/read-all
 */
router.put('/read-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Mark all notifications as read
    const count = await notificationService.markAllNotificationsAsRead(userId);
    
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

/**
 * Delete notification
 * DELETE /notification/:id
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const notificationId = req.params.id;
    
    // Delete notification
    const success = await notificationService.deleteNotification(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;
