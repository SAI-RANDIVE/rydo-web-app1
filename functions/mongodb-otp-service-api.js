/**
 * MongoDB OTP Service for RYDO Web App
 * Handles phone and email verification using API-based OTP service
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import the OTP model
const { OTP } = require('../backend/models/mongodb');

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP API Configuration
const OTP_API_KEY = process.env.OTP_API_KEY;
const OTP_AUTH_TOKEN = process.env.OTP_AUTH_TOKEN;
const OTP_API_URL = 'https://api.otpservice.com/v1';

/**
 * Send OTP to phone number using the OTP API
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns {Promise<Object>} - Response with requestId
 */
async function sendPhoneOTP(phoneNumber) {
  try {
    // Generate OTP
    const otp = generateOTP();
    const requestId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    // Save OTP to database
    await OTP.create({
      requestId,
      phoneNumber,
      otp,
      expiresAt,
      verified: false
    });

    // Send OTP via API
    const response = await axios.post(`${OTP_API_URL}/send`, {
      phone: phoneNumber,
      message: `Your RYDO verification code is: ${otp}. Valid for 10 minutes.`,
    }, {
      headers: {
        'Authorization': `Bearer ${OTP_AUTH_TOKEN}`,
        'X-API-Key': OTP_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`OTP sent to ${phoneNumber}`);
    return {
      success: true,
      requestId,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    throw new Error('Failed to send OTP');
  }
}

/**
 * Send OTP to email using the OTP API
 * @param {string} email - Email address
 * @returns {Promise<Object>} - Response with requestId
 */
async function sendEmailOTP(email) {
  try {
    // Generate OTP
    const otp = generateOTP();
    const requestId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    // Save OTP to database
    await OTP.create({
      requestId,
      email,
      otp,
      expiresAt,
      verified: false
    });

    // Send OTP via API
    const response = await axios.post(`${OTP_API_URL}/send-email`, {
      email: email,
      subject: 'RYDO Verification Code',
      message: `Your RYDO verification code is: ${otp}. Valid for 10 minutes.`,
    }, {
      headers: {
        'Authorization': `Bearer ${OTP_AUTH_TOKEN}`,
        'X-API-Key': OTP_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`OTP sent to ${email}`);
    return {
      success: true,
      requestId,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending email OTP:', error);
    throw new Error('Failed to send OTP');
  }
}

/**
 * Verify OTP
 * @param {string} requestId - Request ID received when sending OTP
 * @param {string} otp - OTP entered by user
 * @returns {Promise<Object>} - Verification result
 */
async function verifyOTP(requestId, otp) {
  try {
    // Find OTP record in database
    const otpRecord = await OTP.findOne({ requestId });

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid request ID'
      };
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return {
        success: false,
        message: 'OTP has expired'
      };
    }

    // Check if OTP is already verified
    if (otpRecord.verified) {
      return {
        success: false,
        message: 'OTP already verified'
      };
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return {
      success: true,
      message: 'OTP verified successfully',
      phoneNumber: otpRecord.phoneNumber,
      email: otpRecord.email
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
}

module.exports = {
  sendPhoneOTP,
  sendEmailOTP,
  verifyOTP
};
