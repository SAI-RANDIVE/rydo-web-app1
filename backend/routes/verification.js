/**
 * Verification Routes
 * Handles email and phone verification using OTP
 */

const express = require('express');
const router = express.Router();
const otpService = require('../services/otp-service');
const getOTPService = require('../services/getotp-service');
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Send email verification OTP
 * POST /verification/email/send
 */
router.post('/email/send', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Generate OTP
    const otp = await otpService.generateEmailOTP(email, userId);
    
    // Send OTP via email
    await otpService.sendEmailOTP(email, otp);
    
    res.status(200).json({ 
      message: 'OTP sent to email successfully',
      email: email.replace(/(.{2})(.*)(?=@)/, function(_, a, b) {
        return a + b.replace(/./g, '*');
      })
    });
  } catch (error) {
    console.error('Error sending email OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/**
 * Verify email OTP
 * POST /verification/email/verify
 */
router.post('/email/verify', isAuthenticated, async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    // Verify OTP
    const result = await otpService.verifyEmailOTP(email, otp);
    
    if (!result.verified) {
      return res.status(400).json({ message: result.message || 'Invalid OTP' });
    }
    
    // Update user's email_verified status in session
    req.session.user.email_verified = true;
    
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/**
 * Send phone verification OTP
 * POST /verification/phone/send
 */
router.post('/phone/send', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Generate OTP
    const otp = await otpService.generatePhoneOTP(phone, userId);
    
    // Send OTP via SMS
    await otpService.sendPhoneOTP(phone, otp);
    
    res.status(200).json({ 
      message: 'OTP sent to phone successfully',
      phone: phone.replace(/(\+\d{2})(\d{3})(.*)(\d{2})/, '$1$2***$4')
    });
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/**
 * Verify phone OTP
 * POST /verification/phone/verify
 */
router.post('/phone/verify', isAuthenticated, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }
    
    // Verify OTP
    const result = await otpService.verifyPhoneOTP(phone, otp);
    
    if (!result.verified) {
      return res.status(400).json({ message: result.message || 'Invalid OTP' });
    }
    
    // Update user's phone_verified status in session
    req.session.user.phone_verified = true;
    
    res.status(200).json({ message: 'Phone verified successfully' });
  }
  catch (error) {
    console.error('Error verifying phone OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/**
 * Send OTP for shuttle booking confirmation
 * POST /verification/shuttle/send
 */
router.post('/shuttle/send', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { booking_id, contact_type } = req.body;
    
    if (!booking_id || !contact_type) {
      return res.status(400).json({ message: 'Booking ID and contact type are required' });
    }
    
    // Get booking details
    const [bookings] = await db.query(
      `SELECT sb.id, sb.user_id, u.email, u.phone
       FROM shuttle_bookings sb
       JOIN users u ON sb.user_id = u.id
       WHERE sb.id = ? AND sb.user_id = ?`,
      [booking_id, userId]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Send OTP based on contact type
    let otp;
    if (contact_type === 'email') {
      otp = await otpService.generateEmailOTP(booking.email, userId);
      await otpService.sendEmailOTP(booking.email, otp);
      
      res.status(200).json({ 
        message: 'OTP sent to email successfully',
        email: booking.email.replace(/(.{2})(.*)(?=@)/, function(_, a, b) {
          return a + b.replace(/./g, '*');
        })
      });
    } else if (contact_type === 'phone') {
      otp = await otpService.generatePhoneOTP(booking.phone, userId);
      await otpService.sendPhoneOTP(booking.phone, otp);
      
      res.status(200).json({ 
        message: 'OTP sent to phone successfully',
        phone: booking.phone.replace(/(\+\d{2})(\d{3})(.*)(\d{2})/, '$1$2***$4')
      });
    } else {
      return res.status(400).json({ message: 'Invalid contact type' });
    }
  } catch (error) {
    console.error('Error sending shuttle booking OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/**
 * Verify OTP for shuttle booking confirmation
 * POST /verification/shuttle/verify
 */
router.post('/shuttle/verify', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { booking_id, contact_type, otp } = req.body;
    
    if (!booking_id || !contact_type || !otp) {
      return res.status(400).json({ message: 'Booking ID, contact type, and OTP are required' });
    }
    
    // Get booking details
    const [bookings] = await db.query(
      `SELECT sb.id, sb.user_id, u.email, u.phone
       FROM shuttle_bookings sb
       JOIN users u ON sb.user_id = u.id
       WHERE sb.id = ? AND sb.user_id = ?`,
      [booking_id, userId]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Verify OTP based on contact type
    let result;
    if (contact_type === 'email') {
      result = await otpService.verifyEmailOTP(booking.email, otp);
    } else if (contact_type === 'phone') {
      result = await otpService.verifyPhoneOTP(booking.phone, otp);
    } else {
      return res.status(400).json({ message: 'Invalid contact type' });
    }
    
    if (!result.verified) {
      return res.status(400).json({ message: result.message || 'Invalid OTP' });
    }
    
    // Update booking status to confirmed
    await db.query(
      `UPDATE shuttle_bookings SET status = 'confirmed' WHERE id = ?`,
      [booking_id]
    );
    
    res.status(200).json({ message: 'Booking confirmed successfully' });
  } catch (error) {
    console.error('Error verifying shuttle booking OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/**
 * Send OTP for driver arrival confirmation
 * POST /verification/driver-arrival/send
 */
router.post('/driver-arrival/send', async (req, res) => {
  try {
    const { booking_id, driver_id } = req.body;
    
    if (!booking_id || !driver_id) {
      return res.status(400).json({ message: 'Booking ID and driver ID are required' });
    }
    
    // Verify driver is assigned to this booking
    const [bookings] = await db.query(
      `SELECT sb.id, sb.user_id, u.email, u.phone
       FROM shuttle_bookings sb
       JOIN shuttle_schedules ss ON sb.schedule_id = ss.id
       JOIN shuttle_routes sr ON ss.route_id = sr.id
       JOIN shuttle_services svc ON sr.shuttle_service_id = svc.id
       JOIN users u ON sb.user_id = u.id
       WHERE sb.id = ? AND svc.user_id = ?`,
      [booking_id, driver_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or driver not authorized' });
    }
    
    const booking = bookings[0];
    
    // Generate and send OTP to customer's phone
    const otp = await otpService.generatePhoneOTP(booking.phone, booking.user_id);
    await otpService.sendPhoneOTP(booking.phone, otp);
    
    res.status(200).json({ 
      message: 'OTP sent to customer successfully',
      phone: booking.phone.replace(/(\+\d{2})(\d{3})(.*)(\d{2})/, '$1$2***$4')
    });
  } catch (error) {
    console.error('Error sending driver arrival OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/**
 * Verify OTP for driver arrival confirmation
 * POST /verification/driver-arrival/verify
 */
router.post('/driver-arrival/verify', async (req, res) => {
  try {
    const { booking_id, driver_id, otp } = req.body;
    
    if (!booking_id || !driver_id || !otp) {
      return res.status(400).json({ message: 'Booking ID, driver ID, and OTP are required' });
    }
    
    // Verify driver is assigned to this booking
    const [bookings] = await db.query(
      `SELECT sb.id, sb.user_id, u.phone
       FROM shuttle_bookings sb
       JOIN shuttle_schedules ss ON sb.schedule_id = ss.id
       JOIN shuttle_routes sr ON ss.route_id = sr.id
       JOIN shuttle_services svc ON sr.shuttle_service_id = svc.id
       JOIN users u ON sb.user_id = u.id
       WHERE sb.id = ? AND svc.user_id = ?`,
      [booking_id, driver_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or driver not authorized' });
    }
    
    const booking = bookings[0];
    
    // Verify OTP
    const result = await otpService.verifyPhoneOTP(booking.phone, otp);
    
    if (!result.verified) {
      return res.status(400).json({ message: result.message || 'Invalid OTP' });
    }
    
    // Update booking status to picked_up
    await db.query(
      `UPDATE shuttle_bookings SET status = 'picked_up', pickup_time = NOW() WHERE id = ?`,
      [booking_id]
    );
    
    res.status(200).json({ message: 'Pickup confirmed successfully' });
  } catch (error) {
    console.error('Error verifying driver arrival OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

/**
 * Send OTP for signup verification using GetOTP service
 * POST /verification/signup/send-phone
 */
router.post('/signup/send-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Phone number is required' 
      });
    }
    
    // Format phone number if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    // Send OTP using GetOTP service
    const result = await getOTPService.sendPhoneOTP(formattedPhone);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        requestId: result.requestId,
        phone: formattedPhone.replace(/(\+\d{2})(\d{3})(.*)\d{2}/, '$1$2***')
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to send OTP'
      });
    }
  } catch (error) {
    console.error('Error sending phone OTP for signup:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Send OTP for signup verification using GetOTP service
 * POST /verification/signup/send-email
 */
router.post('/signup/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }
    
    // Send OTP using GetOTP service
    const result = await getOTPService.sendEmailOTP(email);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        requestId: result.requestId,
        email: email.replace(/(.{2})(.*)(?=@)/, function(_, a, b) {
          return a + b.replace(/./g, '*');
        })
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to send OTP'
      });
    }
  } catch (error) {
    console.error('Error sending email OTP for signup:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Verify OTP for signup verification using GetOTP service
 * POST /verification/signup/verify
 */
router.post('/signup/verify', async (req, res) => {
  try {
    const { requestId, otp } = req.body;
    
    if (!requestId || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Request ID and OTP are required' 
      });
    }
    
    // Verify OTP using GetOTP service
    const result = await getOTPService.verifyOTP(requestId, otp);
    
    return res.json({
      success: result.success,
      verified: result.verified || false,
      message: result.message || (result.verified ? 'OTP verified successfully' : 'Invalid OTP')
    });
  } catch (error) {
    console.error('Error verifying OTP for signup:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Failed to verify OTP'
    });
  }
});

module.exports = router;
