/**
 * GetOTP Service for RYDO Web App
 * Handles phone and email verification using GetOTP API
 */
const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = 'https://api.getotp.com';
const API_KEY = process.env.GETOTP_API_KEY;
const AUTH_TOKEN = process.env.GETOTP_AUTH_TOKEN;

// Headers for API requests
const getHeaders = () => ({
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
});

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns {Promise<Object>} - Response from GetOTP API
 */
async function sendPhoneOTP(phoneNumber) {
  try {
    const response = await axios.post(
      `${BASE_URL}/v1/sms/send`,
      {
        phone: phoneNumber,
        template: 'Your RYDO verification code: {{otp}}'
      },
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('[GetOTP] SMS Error:', error.response?.data);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to send SMS OTP'
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
    const response = await axios.post(
      `${BASE_URL}/v1/email/send`,
      {
        email: email,
        subject: 'RYDO Verification Code',
        template: '<p>Your verification code is: <strong>{{otp}}</strong></p>'
      },
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('[GetOTP] Email Error:', error.response?.data);
    return { 
      success: false,
      message: error.response?.data?.message || 'Failed to send Email OTP'
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
    const response = await axios.post(
      `${BASE_URL}/v1/verify`,
      { requestId, otp },
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('[GetOTP] Verify Error:', error.response?.data);
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
