/**
 * MongoDB OTP Service for RYDO Web App
 * Handles phone and email verification using MongoDB
 */
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import the OTP model
const { OTP } = require('../backend/models/mongodb');

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns {Promise<Object>} - Response with requestId
 */
async function sendPhoneOTP(phoneNumber) {
  try {
    // Generate OTP
    const otp = generateOTP();
    const requestId = uuidv4();
    
    // Set expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Save OTP to MongoDB
    await OTP.create({
      requestId,
      phone: phoneNumber,
      otp,
      expiresAt
    });
    
    // In a production environment, you would integrate with an SMS service here
    // For now, we'll just log the OTP (in production, remove this log)
    console.log(`[DEV ONLY] Phone OTP for ${phoneNumber}: ${otp}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      requestId
    };
  } catch (error) {
    console.error('[MongoDB OTP] SMS Error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send SMS OTP'
    };
  }
}

/**
 * Send OTP to email
 * @param {string} email - Email address
 * @returns {Promise<Object>} - Response with requestId
 */
async function sendEmailOTP(email) {
  try {
    // Generate OTP
    const otp = generateOTP();
    const requestId = uuidv4();
    
    // Set expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Save OTP to MongoDB
    await OTP.create({
      requestId,
      email,
      otp,
      expiresAt
    });
    
    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'RYDO Verification Code',
      html: `<p>Your verification code is: <strong>${otp}</strong></p>
             <p>This code will expire in 10 minutes.</p>`
    };
    
    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      requestId
    };
  } catch (error) {
    console.error('[MongoDB OTP] Email Error:', error);
    return { 
      success: false,
      message: error.message || 'Failed to send Email OTP'
    };
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
    // Find the OTP document
    const otpDoc = await OTP.findOne({ requestId });
    
    if (!otpDoc) {
      return {
        success: false,
        verified: false,
        message: 'Invalid OTP request'
      };
    }
    
    // Check if OTP is expired
    if (new Date() > otpDoc.expiresAt) {
      return {
        success: false,
        verified: false,
        message: 'OTP has expired'
      };
    }
    
    // Check if OTP is already verified
    if (otpDoc.verified) {
      return {
        success: true,
        verified: true,
        message: 'OTP already verified'
      };
    }
    
    // Increment attempts
    otpDoc.attempts += 1;
    
    // Check if OTP matches
    if (otpDoc.otp === otp) {
      otpDoc.verified = true;
      await otpDoc.save();
      
      return {
        success: true,
        verified: true,
        message: 'OTP verified successfully'
      };
    } else {
      // Save the attempt
      await otpDoc.save();
      
      return {
        success: false,
        verified: false,
        message: 'Invalid OTP'
      };
    }
  } catch (error) {
    console.error('[MongoDB OTP] Verify Error:', error);
    return {
      success: false,
      verified: false,
      message: error.message || 'OTP verification failed'
    };
  }
}

module.exports = {
  sendPhoneOTP,
  sendEmailOTP,
  verifyOTP
};
