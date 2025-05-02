/**
 * OTP Verification Service
 * Handles generation and verification of OTPs for email and phone
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const db = require('../../config/db');

// In-memory OTP storage (in production, this should be in Redis or similar)
const otpStore = new Map();

// OTP configuration
const OTP_CONFIG = {
  EMAIL_EXPIRY: 10 * 60 * 1000, // 10 minutes in milliseconds
  PHONE_EXPIRY: 5 * 60 * 1000,  // 5 minutes in milliseconds
  OTP_LENGTH: 6
};

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rydo.service@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'app_password_here'
  }
});

/**
 * Generate a random numeric OTP of specified length
 */
const generateOTP = (length = OTP_CONFIG.OTP_LENGTH) => {
  const digits = '0123456789';
  let OTP = '';
  
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  
  return OTP;
};

/**
 * Generate and store OTP for email verification
 */
const generateEmailOTP = async (email, userId) => {
  try {
    const otp = generateOTP();
    const expiryTime = Date.now() + OTP_CONFIG.EMAIL_EXPIRY;
    
    // Store OTP with expiry time
    const otpKey = `email:${email}`;
    otpStore.set(otpKey, {
      otp,
      expiryTime,
      userId
    });
    
    // Store in database for persistence
    await db.query(
      `INSERT INTO otp_verifications (user_id, type, identifier, otp, expires_at)
       VALUES (?, 'email', ?, ?, FROM_UNIXTIME(?))
       ON DUPLICATE KEY UPDATE otp = ?, expires_at = FROM_UNIXTIME(?)`,
      [userId, email, otp, Math.floor(expiryTime / 1000), otp, Math.floor(expiryTime / 1000)]
    );
    
    return otp;
  } catch (error) {
    console.error('Error generating email OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Generate and store OTP for phone verification
 */
const generatePhoneOTP = async (phone, userId) => {
  try {
    const otp = generateOTP();
    const expiryTime = Date.now() + OTP_CONFIG.PHONE_EXPIRY;
    
    // Store OTP with expiry time
    const otpKey = `phone:${phone}`;
    otpStore.set(otpKey, {
      otp,
      expiryTime,
      userId
    });
    
    // Store in database for persistence
    await db.query(
      `INSERT INTO otp_verifications (user_id, type, identifier, otp, expires_at)
       VALUES (?, 'phone', ?, ?, FROM_UNIXTIME(?))
       ON DUPLICATE KEY UPDATE otp = ?, expires_at = FROM_UNIXTIME(?)`,
      [userId, phone, otp, Math.floor(expiryTime / 1000), otp, Math.floor(expiryTime / 1000)]
    );
    
    return otp;
  } catch (error) {
    console.error('Error generating phone OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Send OTP via email
 */
const sendEmailOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'rydo.service@gmail.com',
      to: email,
      subject: 'RYDO - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #5B6EF5; margin: 0;">RYDO</h1>
            <p style="color: #666; font-size: 14px; margin: 5px 0 0;">ride with trust</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
            <p style="color: #555; font-size: 16px;">Please use the following OTP to verify your email address:</p>
            <div style="background-color: #5B6EF5; color: white; font-size: 24px; font-weight: bold; padding: 10px; border-radius: 5px; text-align: center; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #777; font-size: 14px;">This OTP is valid for 10 minutes only.</p>
          </div>
          
          <p style="color: #888; font-size: 13px; text-align: center;">
            If you did not request this verification, please ignore this email.
          </p>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e1e1;">
            <p style="color: #888; font-size: 12px; margin: 5px 0;">
              &copy; ${new Date().getFullYear()} RYDO. All rights reserved.
            </p>
          </div>
        </div>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email OTP:', error);
    throw new Error('Failed to send OTP via email');
  }
};

/**
 * Send OTP via SMS using Fast2SMS API (Free tier)
 * Note: In production, use a paid SMS service for reliability
 */
const sendPhoneOTP = async (phone, otp) => {
  try {
    // Remove country code if present
    const formattedPhone = phone.replace(/^\+91/, '');
    
    // Using Fast2SMS API (free tier for demo purposes)
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      variables_values: otp,
      route: 'otp',
      numbers: formattedPhone
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY || 'your_fast2sms_api_key',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.return === true) {
      return true;
    } else {
      throw new Error('SMS API returned error');
    }
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    throw new Error('Failed to send OTP via SMS');
  }
};

/**
 * Verify email OTP
 */
const verifyEmailOTP = async (email, otp) => {
  try {
    const otpKey = `email:${email}`;
    const storedData = otpStore.get(otpKey);
    
    // If not in memory, check database
    if (!storedData) {
      const [results] = await db.query(
        `SELECT otp, UNIX_TIMESTAMP(expires_at) as expiry, user_id
         FROM otp_verifications
         WHERE type = 'email' AND identifier = ? AND otp = ?`,
        [email, otp]
      );
      
      if (results.length === 0) {
        return { verified: false, message: 'Invalid OTP' };
      }
      
      const dbData = results[0];
      const now = Math.floor(Date.now() / 1000);
      
      if (now > dbData.expiry) {
        return { verified: false, message: 'OTP expired' };
      }
      
      // Mark as verified in database
      await db.query(
        `UPDATE users SET email_verified = 1 WHERE id = ?`,
        [dbData.user_id]
      );
      
      // Clean up OTP
      await db.query(
        `DELETE FROM otp_verifications WHERE type = 'email' AND identifier = ?`,
        [email]
      );
      
      return { verified: true, userId: dbData.user_id };
    }
    
    // Check if OTP matches and is not expired
    if (storedData.otp !== otp) {
      return { verified: false, message: 'Invalid OTP' };
    }
    
    if (Date.now() > storedData.expiryTime) {
      otpStore.delete(otpKey);
      return { verified: false, message: 'OTP expired' };
    }
    
    // Mark as verified in database
    await db.query(
      `UPDATE users SET email_verified = 1 WHERE id = ?`,
      [storedData.userId]
    );
    
    // Clean up OTP
    otpStore.delete(otpKey);
    await db.query(
      `DELETE FROM otp_verifications WHERE type = 'email' AND identifier = ?`,
      [email]
    );
    
    return { verified: true, userId: storedData.userId };
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

/**
 * Verify phone OTP
 */
const verifyPhoneOTP = async (phone, otp) => {
  try {
    const otpKey = `phone:${phone}`;
    const storedData = otpStore.get(otpKey);
    
    // If not in memory, check database
    if (!storedData) {
      const [results] = await db.query(
        `SELECT otp, UNIX_TIMESTAMP(expires_at) as expiry, user_id
         FROM otp_verifications
         WHERE type = 'phone' AND identifier = ? AND otp = ?`,
        [phone, otp]
      );
      
      if (results.length === 0) {
        return { verified: false, message: 'Invalid OTP' };
      }
      
      const dbData = results[0];
      const now = Math.floor(Date.now() / 1000);
      
      if (now > dbData.expiry) {
        return { verified: false, message: 'OTP expired' };
      }
      
      // Mark as verified in database
      await db.query(
        `UPDATE users SET phone_verified = 1 WHERE id = ?`,
        [dbData.user_id]
      );
      
      // Clean up OTP
      await db.query(
        `DELETE FROM otp_verifications WHERE type = 'phone' AND identifier = ?`,
        [phone]
      );
      
      return { verified: true, userId: dbData.user_id };
    }
    
    // Check if OTP matches and is not expired
    if (storedData.otp !== otp) {
      return { verified: false, message: 'Invalid OTP' };
    }
    
    if (Date.now() > storedData.expiryTime) {
      otpStore.delete(otpKey);
      return { verified: false, message: 'OTP expired' };
    }
    
    // Mark as verified in database
    await db.query(
      `UPDATE users SET phone_verified = 1 WHERE id = ?`,
      [storedData.userId]
    );
    
    // Clean up OTP
    otpStore.delete(otpKey);
    await db.query(
      `DELETE FROM otp_verifications WHERE type = 'phone' AND identifier = ?`,
      [phone]
    );
    
    return { verified: true, userId: storedData.userId };
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

// Cleanup expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiryTime) {
      otpStore.delete(key);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes

module.exports = {
  generateEmailOTP,
  generatePhoneOTP,
  sendEmailOTP,
  sendPhoneOTP,
  verifyEmailOTP,
  verifyPhoneOTP
};
