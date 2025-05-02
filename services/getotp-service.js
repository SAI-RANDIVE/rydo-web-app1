/**
 * GetOTP Service for RYDO Web App
 * Handles phone and email verification using GetOTP API
 */
const axios = require('axios');

// Configuration
const API_KEY = process.env.GETOTP_API_KEY;
const AUTH_TOKEN = process.env.GETOTP_AUTH_TOKEN || ''; // Default to empty string if not available
const BASE_URL = 'https://api.getotp.dev';

// Headers for API requests
const getHeaders = () => {
  return {
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  };
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns {Promise<Object>} - Response from GetOTP API
 */
async function sendPhoneOTP(phoneNumber) {
  try {
    const response = await axios.post(`${BASE_URL}/v1/sms/send`, {
      phone: phoneNumber,
      template: 'Your RYDO verification code is: {{otp}}. Valid for 10 minutes.'
    }, { headers: getHeaders() });
    
    return {
      success: true,
      requestId: response.data.requestId,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending phone OTP:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send OTP'
    };
  }
}

/**
 * Send OTP to email
 * @param {string} email - Email address
 * @returns {Promise<Object>} - Response from GetOTP API
 */
async function sendEmailOTP(email) {
  try {
    const response = await axios.post(`${BASE_URL}/v1/email/send`, {
      email: email,
      subject: 'RYDO Account Verification',
      template: '<h1>RYDO Verification</h1><p>Your verification code is: <strong>{{otp}}</strong></p><p>This code is valid for 10 minutes.</p>'
    }, { headers: getHeaders() });
    
    return {
      success: true,
      requestId: response.data.requestId,
      message: 'Email OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending email OTP:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send email OTP'
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
    const response = await axios.post(`${BASE_URL}/v1/verify`, {
      requestId: requestId,
      otp: otp
    }, { headers: getHeaders() });
    
    return {
      success: true,
      verified: response.data.verified,
      message: 'OTP verification successful'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error.response?.data || error.message);
    return {
      success: false,
      verified: false,
      message: error.response?.data?.message || 'OTP verification failed'
    };
  }
}

module.exports = {
  sendPhoneOTP,
  sendEmailOTP,
  verifyOTP
};
