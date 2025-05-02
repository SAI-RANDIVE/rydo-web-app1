/**
 * MongoDB Notification Service
 * Handles push notifications and in-app notifications for users
 */

const { Notification, User } = require('../models/mongodb');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a notification
 */
const createNotification = async (notificationData) => {
  try {
    const {
      userId,
      title,
      message,
      type,
      referenceId,
      referenceType,
      priority = 'normal',
      actionUrl = null
    } = notificationData;
    
    // Create notification in database
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      referenceId,
      referenceType,
      priority,
      actionUrl
    });
    
    await notification.save();
    
    // Return notification ID
    return {
      id: notification._id,
      createdAt: notification.createdAt
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
    const query = {
      userId
    };
    
    if (!includeRead) {
      query.isRead = false;
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Notification.countDocuments(query);
    
    return {
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + notifications.length < total
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
    const result = await Notification.updateOne(
      { _id: notificationId, userId },
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    
    return result.modifiedCount > 0;
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
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    
    return result.modifiedCount;
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
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    
    return result.deletedCount > 0;
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
    const { bookingId, bookingType, userId } = bookingData;
    
    let title, message, referenceType;
    
    switch (bookingType) {
      case 'driver':
        title = 'Driver Booking Confirmed';
        message = 'Your driver booking has been confirmed. You will be notified when the driver arrives.';
        referenceType = 'driver_booking';
        break;
      case 'caretaker':
        title = 'Caretaker Appointment Confirmed';
        message = 'Your caretaker appointment has been confirmed. The caretaker will arrive at the scheduled time.';
        referenceType = 'caretaker_appointment';
        break;
      case 'shuttle':
        title = 'Shuttle Booking Confirmed';
        message = 'Your shuttle booking has been confirmed. You will be notified when the shuttle is about to arrive.';
        referenceType = 'shuttle_booking';
        break;
      default:
        throw new Error('Invalid booking type');
    }
    
    // Create notification
    return await createNotification({
      userId,
      title,
      message,
      type: 'booking_confirmation',
      referenceId: bookingId,
      referenceType,
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=${bookingType}`
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
    const { bookingId, userId, driverName, arrivalTime } = bookingData;
    
    // Format arrival time
    const arrivalTimeObj = new Date(arrivalTime);
    const formattedTime = arrivalTimeObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      userId,
      title: 'Driver Arriving Soon',
      message: `Your driver ${driverName} will arrive at approximately ${formattedTime}.`,
      type: 'driver_arrival',
      referenceId: bookingId,
      referenceType: 'driver_booking',
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=driver`
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
    const { bookingId, userId, shuttleName, arrivalTime } = bookingData;
    
    // Format arrival time
    const arrivalTimeObj = new Date(arrivalTime);
    const formattedTime = arrivalTimeObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create notification
    return await createNotification({
      userId,
      title: 'Shuttle Arriving Soon',
      message: `Your shuttle ${shuttleName} will arrive at approximately ${formattedTime}.`,
      type: 'shuttle_arrival',
      referenceId: bookingId,
      referenceType: 'shuttle_booking',
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=shuttle`
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
    const { paymentId, userId, amount, bookingId, bookingType } = paymentData;
    
    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
    
    // Create notification
    return await createNotification({
      userId,
      title: 'Payment Successful',
      message: `Your payment of ${formattedAmount} has been successfully processed.`,
      type: 'payment_confirmation',
      referenceId: paymentId,
      referenceType: 'payment',
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=${bookingType}`
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
    const { transactionId, userId, amount } = topupData;
    
    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
    
    // Create notification
    return await createNotification({
      userId,
      title: 'Wallet Topup Successful',
      message: `Your wallet has been topped up with ${formattedAmount}.`,
      type: 'wallet_topup',
      referenceId: transactionId,
      referenceType: 'wallet_transaction',
      priority: 'normal',
      actionUrl: '/wallet'
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
    const { bookingId, userId, cancelledBy, reason, bookingType } = bookingData;
    
    let title, message;
    
    if (cancelledBy === 'customer') {
      title = 'Booking Cancelled';
      message = `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`;
    } else if (cancelledBy === 'provider') {
      title = 'Booking Cancelled by Provider';
      message = `Your booking has been cancelled by the provider. ${reason ? `Reason: ${reason}` : ''}`;
    } else {
      title = 'Booking Cancelled';
      message = `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`;
    }
    
    // Create notification
    return await createNotification({
      userId,
      title,
      message,
      type: 'booking_cancellation',
      referenceId: bookingId,
      referenceType: `${bookingType}_booking`,
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=${bookingType}`
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
    const { bookingId, userId, bookingType, bookingTime } = bookingData;
    
    // Format booking time
    const bookingTimeObj = new Date(bookingTime);
    const formattedDate = bookingTimeObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = bookingTimeObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let title, message;
    
    switch (bookingType) {
      case 'driver':
        title = 'Upcoming Driver Booking';
        message = `Reminder: You have a driver booking scheduled for ${formattedDate} at ${formattedTime}.`;
        break;
      case 'caretaker':
        title = 'Upcoming Caretaker Appointment';
        message = `Reminder: You have a caretaker appointment scheduled for ${formattedDate} at ${formattedTime}.`;
        break;
      case 'shuttle':
        title = 'Upcoming Shuttle Booking';
        message = `Reminder: You have a shuttle booking scheduled for ${formattedDate} at ${formattedTime}.`;
        break;
      default:
        title = 'Upcoming Booking';
        message = `Reminder: You have a booking scheduled for ${formattedDate} at ${formattedTime}.`;
    }
    
    // Create notification
    return await createNotification({
      userId,
      title,
      message,
      type: 'booking_reminder',
      referenceId: bookingId,
      referenceType: `${bookingType}_booking`,
      priority: 'high',
      actionUrl: `/bookings/${bookingId}?type=${bookingType}`
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
    const { bookingId, driverId, pickupLocation, pickupTime, fare } = bookingData;
    
    // Format pickup time
    const pickupTimeObj = new Date(pickupTime);
    const formattedTime = pickupTimeObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format fare
    const formattedFare = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(fare);
    
    // Create notification
    return await createNotification({
      userId: driverId,
      title: 'New Ride Request',
      message: `New ride request from ${pickupLocation} at ${formattedTime}. Fare: ${formattedFare}`,
      type: 'new_booking',
      referenceId: bookingId,
      referenceType: 'driver_booking',
      priority: 'high',
      actionUrl: `/driver/bookings/${bookingId}`
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
    const { bookingId, caretakerId, location, appointmentTime, duration, fare } = appointmentData;
    
    // Format appointment time
    const appointmentTimeObj = new Date(appointmentTime);
    const formattedDate = appointmentTimeObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentTimeObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format fare
    const formattedFare = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(fare);
    
    // Create notification
    return await createNotification({
      userId: caretakerId,
      title: 'New Caretaker Appointment',
      message: `New appointment at ${location} on ${formattedDate} at ${formattedTime}. Duration: ${duration} hours. Fee: ${formattedFare}`,
      type: 'new_appointment',
      referenceId: bookingId,
      referenceType: 'caretaker_appointment',
      priority: 'high',
      actionUrl: `/caretaker/appointments/${bookingId}`
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
