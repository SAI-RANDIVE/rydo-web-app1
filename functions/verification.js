const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
// Import the local GetOTP service
const otpService = require('./mongodb-otp-service');

// Initialize express app
const app = express();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'RYDO Verification API is running'
  });
});

/**
 * Send OTP for phone verification
 * POST /send-phone
 */
app.post('/send-phone', async (req, res) => {
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
    
    // Send OTP using MongoDB OTP service
    const result = await otpService.sendPhoneOTP(formattedPhone);
    
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
    console.error('Error sending phone OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Send OTP for email verification
 * POST /send-email
 */
app.post('/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }
    
    // Send OTP using MongoDB OTP service
    const result = await otpService.sendEmailOTP(email);
    
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
    console.error('Error sending email OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * Verify OTP
 * POST /verify
 */
app.post('/verify', async (req, res) => {
  try {
    const { requestId, otp } = req.body;
    
    if (!requestId || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Request ID and OTP are required' 
      });
    }
    
    // Verify OTP using MongoDB OTP service
    const result = await otpService.verifyOTP(requestId, otp);
    
    return res.json({
      success: result.success,
      verified: result.verified || false,
      message: result.message || (result.verified ? 'OTP verified successfully' : 'Invalid OTP')
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Export the serverless function
exports.handler = serverless(app);
