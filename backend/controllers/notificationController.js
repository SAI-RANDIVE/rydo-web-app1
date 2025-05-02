/**
 * Notification Controller
 * 
 * This controller handles notification-related functionality including
 * creating, retrieving, marking as read, and deleting notifications.
 * 
 * @module controllers/notificationController
 * @requires ../../config/db
 */

const db = require('../../config/db');

/**
 * Get all notifications for the current user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Get notifications for the user
    const [notifications] = await db.query(
      `SELECT id, title, message, type, data, is_read, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    
    // Parse data field
    notifications.forEach(notification => {
      if (notification.data) {
        try {
          notification.data = JSON.parse(notification.data);
        } catch (error) {
          console.error('Error parsing notification data:', error);
          notification.data = {};
        }
      } else {
        notification.data = {};
      }
    });
    
    res.status(200).json({ notifications });
    
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get unread notification count for the current user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Get unread notification count
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    res.status(200).json({ count: result[0].count });
    
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark a notification as read
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.markAsRead = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const notificationId = req.params.id;
    
    // Check if notification exists and belongs to user
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    if (notifications.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Mark notification as read
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );
    
    res.status(200).json({ message: 'Notification marked as read' });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark all notifications as read for the current user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.markAllAsRead = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Mark all notifications as read
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    
    res.status(200).json({ message: 'All notifications marked as read' });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a notification
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.deleteNotification = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const notificationId = req.params.id;
    
    // Check if notification exists and belongs to user
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    if (notifications.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Delete notification
    await db.query(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );
    
    res.status(200).json({ message: 'Notification deleted' });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete all notifications for the current user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Delete all notifications
    await db.query(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
    
    res.status(200).json({ message: 'All notifications deleted' });
    
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a notification
 * 
 * This function is for internal use by other controllers
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (booking, message, payment, account, system)
 * @param {Object} data - Additional data for the notification
 * @returns {number} Notification ID
 */
exports.createNotification = async (userId, title, message, type, data = {}) => {
  try {
    // Insert notification
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [userId, title, message, type, JSON.stringify(data)]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create a booking notification
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} bookingId - Booking ID
 * @returns {number} Notification ID
 */
exports.createBookingNotification = async (userId, title, message, bookingId) => {
  return await exports.createNotification(userId, title, message, 'booking', { bookingId });
};

/**
 * Create a message notification
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} conversationId - Conversation ID
 * @param {number} senderId - Sender ID
 * @returns {number} Notification ID
 */
exports.createMessageNotification = async (userId, title, message, conversationId, senderId) => {
  return await exports.createNotification(userId, title, message, 'message', { conversationId, senderId });
};

/**
 * Create a payment notification
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} paymentId - Payment ID
 * @param {number} amount - Payment amount
 * @returns {number} Notification ID
 */
exports.createPaymentNotification = async (userId, title, message, paymentId, amount) => {
  return await exports.createNotification(userId, title, message, 'payment', { paymentId, amount });
};

/**
 * Create an account notification
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} action - Account action
 * @returns {number} Notification ID
 */
exports.createAccountNotification = async (userId, title, message, action) => {
  return await exports.createNotification(userId, title, message, 'account', { action });
};

/**
 * Create a system notification
 * 
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {number} Notification ID
 */
exports.createSystemNotification = async (userId, title, message) => {
  return await exports.createNotification(userId, title, message, 'system', {});
};
