/**
 * Verification Controller for RYDO Web App
 * Handles OTP verification for phone and email
 */
const getOTPService = require('../services/getotp-service');
const mysql = require('mysql2/promise');

// Database connection
let db = null;

// Initialize database connection
async function getDbConnection() {
  if (!db) {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rydo_db'
    });
  }
  return db;
}

/**
 * Send OTP to phone number
 */
async function sendPhoneOTP(req, res) {
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
    
    // Send OTP
    const result = await getOTPService.sendPhoneOTP(formattedPhone);
    
    if (result.success) {
      // Store requestId in session for verification later
      if (req.session) {
        req.session.phoneOtpRequestId = result.requestId;
        req.session.phoneNumber = formattedPhone;
      }
      
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        requestId: result.requestId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in sendPhoneOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
}

/**
 * Send OTP to email
 */
async function sendEmailOTP(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Send OTP
    const result = await getOTPService.sendEmailOTP(email);
    
    if (result.success) {
      // Store requestId in session for verification later
      if (req.session) {
        req.session.emailOtpRequestId = result.requestId;
        req.session.email = email;
      }
      
      return res.json({
        success: true,
        message: 'Email OTP sent successfully',
        requestId: result.requestId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in sendEmailOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email OTP'
    });
  }
}

/**
 * Verify phone OTP
 */
async function verifyPhoneOTP(req, res) {
  try {
    const { otp, requestId } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }
    
    // Get requestId from session if not provided
    const otpRequestId = requestId || req.session?.phoneOtpRequestId;
    
    if (!otpRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification request'
      });
    }
    
    // Verify OTP
    const result = await getOTPService.verifyOTP(otpRequestId, otp);
    
    if (result.success && result.verified) {
      // If user is logged in, update their phone verification status
      if (req.session && req.session.userId) {
        try {
          const db = await getDbConnection();
          await db.execute(
            'UPDATE users SET phone_verified = 1 WHERE id = ?',
            [req.session.userId]
          );
        } catch (dbError) {
          console.error('Database error updating phone verification:', dbError);
        }
      }
      
      return res.json({
        success: true,
        verified: true,
        message: 'Phone number verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        message: result.message || 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('Error in verifyPhoneOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
}

/**
 * Verify email OTP
 */
async function verifyEmailOTP(req, res) {
  try {
    const { otp, requestId } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }
    
    // Get requestId from session if not provided
    const otpRequestId = requestId || req.session?.emailOtpRequestId;
    
    if (!otpRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification request'
      });
    }
    
    // Verify OTP
    const result = await getOTPService.verifyOTP(otpRequestId, otp);
    
    if (result.success && result.verified) {
      // If user is logged in, update their email verification status
      if (req.session && req.session.userId) {
        try {
          const db = await getDbConnection();
          await db.execute(
            'UPDATE users SET email_verified = 1, is_verified = 1 WHERE id = ?',
            [req.session.userId]
          );
        } catch (dbError) {
          console.error('Database error updating email verification:', dbError);
        }
      }
      
      return res.json({
        success: true,
        verified: true,
        message: 'Email verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        message: result.message || 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('Error in verifyEmailOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
}

module.exports = {
  sendPhoneOTP,
  sendEmailOTP,
  verifyPhoneOTP,
  verifyEmailOTP
};
