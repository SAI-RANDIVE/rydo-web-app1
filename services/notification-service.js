/**
 * Notification Service
 * Handles push notifications and in-app notifications for users
 */

const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a notification
 */
const createNotification = async (notificationData) => {
  try {
    const {
      user_id,
      title,
      message,
      type,
      reference_id,
      reference_type,
      priority = 'normal',
      action_url = null
    } = notificationData;
    
    // Insert notification into database
    const [result] = await db.query(
      `INSERT INTO notifications 
       (user_id, title, message, type, reference_id, reference_type, priority, action_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, title, message, type, reference_id, reference_type, priority, action_url]
    );
    
    // Return notification ID
    return {
      id: result.insertId,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

/**
 * Get notifications for a user
 */
const getUserNotifications = async (userId, limit = 20, offset = 0, includeRead = false) => {
  try {
    // Build query
    let query = `
      SELECT id, title, message, type, reference_id, reference_type, 
      priority, action_url, is_read, created_at
      FROM notifications
      WHERE user_id = ?
    `;
    
    if (!includeRead) {
      query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    // Get notifications
    const [notifications] = await db.query(query, [userId, limit, offset]);
    
    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM notifications 
       WHERE user_id = ? ${!includeRead ? 'AND is_read = 0' : ''}`,
      [userId]
    );
    
    return {
      notifications,
      pagination: {
        total: countResult[0].total,
        limit,
        offset,
        has_more: offset + notifications.length < countResult[0].total
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw new Error('Failed to get notifications');
  }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    // Update notification
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (userId) => {
  try {
    // Update notifications
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    return result.affectedRows;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    // Delete notification
    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
};

/**
 * Send booking confirmation notification
 */
const sendBookingConfirmationNotification = async (bookingData) => {
  try {
    const { booking_id, booking_type, user_id } = bookingData;
    
    let title, message, reference_type;
    
    switch (booking_type) {
      case 'driver':
        title = 'Driver Booking Confirmed';
        message = 'Your driver booking has been confirmed. You will be notified when the driver arrives.';
        reference_type = 'driver_booking';
        break;
      case 'caretaker':
        title = 'Caretaker Appointment Confirmed';
        message = 'Your caretaker appointment has been confirmed. The caretaker will arrive at the scheduled time.';
        reference_type = 'caretaker_appointment';
        break;
      case 'shuttle':
        title = 'Shuttle Booking Confirmed';
        message = 'Your shuttle booking has been confirmed. You will be notified when the shuttle is about to arrive.';
        reference_type = 'shuttle_booking';
        break;
      default:
        throw new Error('Invalid booking type');
    }
    
    // Create notification
    return await createNotification({
      user_id,
      title,
      message,
      type: 'booking_confirmation',
      reference_id: booking_id,
      reference_type,
      priority: 'high',
      action_url: `/bookings/${booking_id}?type=${booking_type}`
    });
  } catch (error) {
    console.error('Error sending booking confirmation notification:', error);
    throw error;
  }
};

/**
 * Send driver arrival notification
 */
const sendDriverArrivalNotification = async (bookingData) => {
  try {
    const { booking_id, user_id, driver_name, arrival_time } = bookingData;
    
    // Format arrival time
    const arrivalTime = new Date(arrival_time);
    const formattedTime = arrivalTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      user_id,
      title: 'Driver Arriving Soon',
      message: `Your driver ${driver_name} will arrive at ${formattedTime}. Please be ready.`,
      type: 'driver_arrival',
      reference_id: booking_id,
      reference_type: 'driver_booking',
      priority: 'high',
      action_url: `/bookings/${booking_id}?type=driver`
    });
  } catch (error) {
    console.error('Error sending driver arrival notification:', error);
    throw error;
  }
};

/**
 * Send shuttle arrival notification
 */
const sendShuttleArrivalNotification = async (bookingData) => {
  try {
    const { booking_id, user_id, shuttle_name, arrival_time } = bookingData;
    
    // Format arrival time
    const arrivalTime = new Date(arrival_time);
    const formattedTime = arrivalTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      user_id,
      title: 'Shuttle Arriving Soon',
      message: `Your shuttle ${shuttle_name} will arrive at ${formattedTime}. Please be at the pickup point.`,
      type: 'shuttle_arrival',
      reference_id: booking_id,
      reference_type: 'shuttle_booking',
      priority: 'high',
      action_url: `/bookings/${booking_id}?type=shuttle`
    });
  } catch (error) {
    console.error('Error sending shuttle arrival notification:', error);
    throw error;
  }
};

/**
 * Send payment confirmation notification
 */
const sendPaymentConfirmationNotification = async (paymentData) => {
  try {
    const { payment_id, user_id, amount, booking_id, booking_type } = paymentData;
    
    // Create notification
    return await createNotification({
      user_id,
      title: 'Payment Successful',
      message: `Your payment of ₹${amount.toFixed(2)} has been successfully processed.`,
      type: 'payment_confirmation',
      reference_id: payment_id,
      reference_type: 'payment',
      priority: 'normal',
      action_url: `/payments/${payment_id}`
    });
  } catch (error) {
    console.error('Error sending payment confirmation notification:', error);
    throw error;
  }
};

/**
 * Send wallet topup notification
 */
const sendWalletTopupNotification = async (topupData) => {
  try {
    const { transaction_id, user_id, amount } = topupData;
    
    // Create notification
    return await createNotification({
      user_id,
      title: 'Wallet Topped Up',
      message: `Your wallet has been topped up with ₹${amount.toFixed(2)}.`,
      type: 'wallet_topup',
      reference_id: transaction_id,
      reference_type: 'transaction',
      priority: 'normal',
      action_url: `/wallet`
    });
  } catch (error) {
    console.error('Error sending wallet topup notification:', error);
    throw error;
  }
};

/**
 * Send booking cancellation notification
 */
const sendBookingCancellationNotification = async (bookingData) => {
  try {
    const { booking_id, booking_type, user_id, reason } = bookingData;
    
    let title, message, reference_type;
    
    switch (booking_type) {
      case 'driver':
        title = 'Driver Booking Cancelled';
        message = `Your driver booking has been cancelled${reason ? `: ${reason}` : '.'}`;
        reference_type = 'driver_booking';
        break;
      case 'caretaker':
        title = 'Caretaker Appointment Cancelled';
        message = `Your caretaker appointment has been cancelled${reason ? `: ${reason}` : '.'}`;
        reference_type = 'caretaker_appointment';
        break;
      case 'shuttle':
        title = 'Shuttle Booking Cancelled';
        message = `Your shuttle booking has been cancelled${reason ? `: ${reason}` : '.'}`;
        reference_type = 'shuttle_booking';
        break;
      default:
        throw new Error('Invalid booking type');
    }
    
    // Create notification
    return await createNotification({
      user_id,
      title,
      message,
      type: 'booking_cancellation',
      reference_id: booking_id,
      reference_type,
      priority: 'high'
    });
  } catch (error) {
    console.error('Error sending booking cancellation notification:', error);
    throw error;
  }
};

/**
 * Send booking reminder notification
 */
const sendBookingReminderNotification = async (bookingData) => {
  try {
    const { booking_id, booking_type, user_id, scheduled_time } = bookingData;
    
    // Format scheduled time
    const scheduledTime = new Date(scheduled_time);
    const formattedDate = scheduledTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let title, message, reference_type;
    
    switch (booking_type) {
      case 'driver':
        title = 'Driver Booking Reminder';
        message = `Reminder: Your driver booking is scheduled for ${formattedDate} at ${formattedTime}.`;
        reference_type = 'driver_booking';
        break;
      case 'caretaker':
        title = 'Caretaker Appointment Reminder';
        message = `Reminder: Your caretaker appointment is scheduled for ${formattedDate} at ${formattedTime}.`;
        reference_type = 'caretaker_appointment';
        break;
      case 'shuttle':
        title = 'Shuttle Booking Reminder';
        message = `Reminder: Your shuttle booking is scheduled for ${formattedDate} at ${formattedTime}.`;
        reference_type = 'shuttle_booking';
        break;
      default:
        throw new Error('Invalid booking type');
    }
    
    // Create notification
    return await createNotification({
      user_id,
      title,
      message,
      type: 'booking_reminder',
      reference_id: booking_id,
      reference_type,
      priority: 'normal',
      action_url: `/bookings/${booking_id}?type=${booking_type}`
    });
  } catch (error) {
    console.error('Error sending booking reminder notification:', error);
    throw error;
  }
};

/**
 * Send new booking notification to driver
 */
const sendNewBookingNotificationToDriver = async (bookingData) => {
  try {
    const { booking_id, driver_id, pickup_location, destination, scheduled_time } = bookingData;
    
    // Format scheduled time
    const scheduledTime = new Date(scheduled_time);
    const formattedTime = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      user_id: driver_id,
      title: 'New Booking Request',
      message: `You have a new booking request from ${pickup_location} to ${destination} at ${formattedTime}.`,
      type: 'new_booking',
      reference_id: booking_id,
      reference_type: 'driver_booking',
      priority: 'high',
      action_url: `/driver/bookings/${booking_id}`
    });
  } catch (error) {
    console.error('Error sending new booking notification to driver:', error);
    throw error;
  }
};

/**
 * Send new appointment notification to caretaker
 */
const sendNewAppointmentNotificationToCaretaker = async (appointmentData) => {
  try {
    const { appointment_id, caretaker_id, service_type, location, scheduled_time } = appointmentData;
    
    // Format scheduled time
    const scheduledTime = new Date(scheduled_time);
    const formattedDate = scheduledTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      user_id: caretaker_id,
      title: 'New Appointment Request',
      message: `You have a new ${service_type} appointment at ${location} on ${formattedDate} at ${formattedTime}.`,
      type: 'new_appointment',
      reference_id: appointment_id,
      reference_type: 'caretaker_appointment',
      priority: 'high',
      action_url: `/caretaker/appointments/${appointment_id}`
    });
  } catch (error) {
    console.error('Error sending new appointment notification to caretaker:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendBookingConfirmationNotification,
  sendDriverArrivalNotification,
  sendShuttleArrivalNotification,
  sendPaymentConfirmationNotification,
  sendWalletTopupNotification,
  sendBookingCancellationNotification,
  sendBookingReminderNotification,
  sendNewBookingNotificationToDriver,
  sendNewAppointmentNotificationToCaretaker
};
