/**
 * User Controller
 * 
 * This controller handles user profile management, verification, and account operations.
 * It includes functions for retrieving, updating, and deleting user profiles,
 * as well as email and phone verification.
 * 
 * @module controllers/userController
 * @requires ../config/database
 * @requires bcryptjs
 * @requires crypto
 * @requires path
 * @requires fs
 * @requires multer
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user profile information
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} User profile data
 */
exports.getProfile = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get basic user data
    const [users] = await db.query(
      `SELECT id, email, phone, first_name, last_name, profile_image, 
        is_phone_verified, is_email_verified, role, created_at, updated_at
      FROM users
      WHERE id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Get user's current location if available
    const [locationResult] = await db.query(
      `SELECT location, latitude, longitude, last_updated 
       FROM user_locations 
       WHERE user_id = ? AND is_current = 1
       LIMIT 1`,
      [userId]
    );
    
    // Get role-specific data
    let roleData = {};
    
    if (user.role === 'customer') {
      const [customerData] = await db.query(
        `SELECT address, city, state, country, pincode, dob, gender, 
          emergency_contact_name, emergency_contact_phone, referral_code, referred_by, preferences
        FROM customer_profiles
        WHERE user_id = ?`,
        [userId]
      );
      
      if (customerData.length > 0) {
        roleData = customerData[0];
        
        // Get referrer name if exists
        if (roleData.referred_by) {
          const [referrer] = await db.query(
            'SELECT CONCAT(first_name, " ", last_name) as referrer_name FROM users WHERE id = ?',
            [roleData.referred_by]
          );
          
          if (referrer.length > 0) {
            roleData.referrer_name = referrer[0].referrer_name;
          }
        }
      }
      
    } else if (user.role === 'driver') {
      const [driverData] = await db.query(
        `SELECT d.license_number, d.license_expiry, d.is_verified, d.is_online, d.vehicle_id,
          d.rating_count, d.total_rides, d.total_earnings
        FROM driver_profiles d
        WHERE d.user_id = ?`,
        [userId]
      );
      
      if (driverData.length > 0) {
        roleData = driverData[0];
        
        // Get vehicle data if exists
        if (roleData.vehicle_id) {
          const [vehicleData] = await db.query(
            `SELECT vehicle_type, make, model, year, color, license_plate, 
              registration_number, registration_expiry, insurance_number, insurance_expiry
            FROM vehicles
            WHERE id = ?`,
            [roleData.vehicle_id]
          );
          
          if (vehicleData.length > 0) {
            roleData.vehicle = vehicleData[0];
          }
        }
      }
      
    } else if (user.role === 'caretaker') {
      const [caretakerData] = await db.query(
        `SELECT specialization, experience_years, certification, education, 
          bio, languages, is_verified, is_online, rating_count, total_services, total_earnings
        FROM caretaker_profiles
        WHERE user_id = ?`,
        [userId]
      );
      
      if (caretakerData.length > 0) {
        roleData = caretakerData[0];
      }
      
    } else if (user.role === 'shuttle') {
      const [shuttleData] = await db.query(
        `SELECT s.license_number, s.license_expiry, s.is_verified, s.is_online, s.vehicle_id,
          s.seating_capacity, s.route_info, s.rating_count, s.total_trips, s.total_earnings
        FROM shuttle_profiles s
        WHERE s.user_id = ?`,
        [userId]
      );
      
      if (shuttleData.length > 0) {
        roleData = shuttleData[0];
        
        // Get vehicle data if exists
        if (roleData.vehicle_id) {
          const [vehicleData] = await db.query(
            `SELECT vehicle_type, make, model, year, color, license_plate, 
              registration_number, registration_expiry, insurance_number, insurance_expiry
            FROM vehicles
            WHERE id = ?`,
            [roleData.vehicle_id]
          );
          
          if (vehicleData.length > 0) {
            roleData.vehicle = vehicleData[0];
          }
        }
      }
    }
    
    // Combine all data
    const userData = {
      ...user,
      ...roleData,
      location: locationResult.length > 0 ? locationResult[0].location : 'Location not set',
      latitude: locationResult.length > 0 ? locationResult[0].latitude : null,
      longitude: locationResult.length > 0 ? locationResult[0].longitude : null,
      profile_image: user.profile_image || '/images/default-avatar.png',
      member_since: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : ''
    };
    
    res.status(200).json(userData);
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ 
      message: 'Failed to load user profile',
      error: error.message 
    });
  }
};

/**
 * Update user profile
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Updated user profile data
 */
exports.updateProfile = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get current user data to determine role
    const [userData] = await db.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    if (userData.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userRole = userData[0].role;
    
    // Extract basic user data from request
    const { 
      first_name, 
      last_name, 
      phone, 
      email,
      profile_image
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Update basic user data
      const updateFields = [];
      const updateParams = [];
      
      if (first_name) {
        updateFields.push('first_name = ?');
        updateParams.push(first_name);
      }
      
      if (last_name) {
        updateFields.push('last_name = ?');
        updateParams.push(last_name);
      }
      
      if (phone) {
        updateFields.push('phone = ?');
        updateParams.push(phone);
      }
      
      if (email) {
        updateFields.push('email = ?');
        updateParams.push(email);
      }
      
      if (profile_image) {
        updateFields.push('profile_image = ?');
        updateParams.push(profile_image);
      }
      
      // Only update if there are fields to update
      if (updateFields.length > 0) {
        updateParams.push(userId); // Add userId for WHERE clause
        
        await db.query(
          `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          updateParams
        );
      }
      
      // Update role-specific data
      if (userRole === 'customer') {
        const { 
          address, 
          city, 
          state, 
          country, 
          pincode,
          dob,
          gender,
          emergency_contact_name, 
          emergency_contact_phone
        } = req.body;
        
        // Check if customer profile exists
        const [customerResult] = await db.query(
          'SELECT id FROM customer_profiles WHERE user_id = ?', 
          [userId]
        );
        const timestamp = Date.now();
        const fileExt = path.extname(profilePhoto.name);
        const fileName = `profile_${timestamp}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Save file
        await profilePhoto.mv(filePath);
        
        // Update profile photo path in database
        const profilePhotoPath = `/uploads/profiles/${userId}/${fileName}`;
        await connection.query(
          'UPDATE users SET profile_photo = ? WHERE id = ?',
          [profilePhotoPath, userId]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      // Get updated user data
      const userData = await exports.getUserData(userId, req.session.user.role);
      
      // Update session
      req.session.user = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_verified: userData.is_phone_verified
      };
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: userData
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change user password
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.changePassword = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { current_password, new_password } = req.body;
    
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Get user's current password
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(current_password, users[0].password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    
    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.status(200).json({ message: 'Password updated successfully' });
    
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Send email verification code
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.sendEmailVerification = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Get user email
    const [users] = await db.query(
      'SELECT email, is_email_verified FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is already verified
    if (users[0].is_email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Store OTP in database
    await db.query(
      'INSERT INTO otp_verifications (user_id, email, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, users[0].email, otp, 'email', expiryTime]
    );
    
    // Send OTP via email (mock implementation)
    console.log(`Email verification OTP sent to ${users[0].email}: ${otp}`);
    
    res.status(200).json({ message: 'Verification code sent to your email' });
    
  } catch (error) {
    console.error('Error sending email verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Send phone verification code
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.sendPhoneVerification = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Get user phone
    const [users] = await db.query(
      'SELECT phone, is_phone_verified FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if phone is already verified
    if (users[0].is_phone_verified) {
      return res.status(400).json({ message: 'Phone is already verified' });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Store OTP in database
    await db.query(
      'INSERT INTO otp_verifications (user_id, phone, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, users[0].phone, otp, 'phone', expiryTime]
    );
    
    // Send OTP via SMS (mock implementation)
    console.log(`Phone verification OTP sent to ${users[0].phone}: ${otp}`);
    
    res.status(200).json({ message: 'Verification code sent to your phone' });
    
  } catch (error) {
    console.error('Error sending phone verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify email OTP
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.verifyEmailOTP = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { otp } = req.body;
    
    // Validate input
    if (!otp) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    
    // Get latest OTP record
    const [otpRecords] = await db.query(
      `SELECT * FROM otp_verifications 
      WHERE user_id = ? AND type = 'email' 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [userId]
    );
    
    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }
    
    const otpRecord = otpRecords[0];
    
    // Check if OTP is expired
    const now = new Date();
    if (now > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }
    
    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Update user's email verification status
    await db.query(
      'UPDATE users SET is_email_verified = 1 WHERE id = ?',
      [userId]
    );
    
    // Update session
    req.session.user.is_email_verified = true;
    
    res.status(200).json({ message: 'Email verified successfully' });
    
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify phone OTP
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.verifyPhoneOTP = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { otp } = req.body;
    
    // Validate input
    if (!otp) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    
    // Get latest OTP record
    const [otpRecords] = await db.query(
      `SELECT * FROM otp_verifications 
      WHERE user_id = ? AND type = 'phone' 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [userId]
    );
    
    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }
    
    const otpRecord = otpRecords[0];
    
    // Check if OTP is expired
    const now = new Date();
    if (now > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }
    
    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Update user's phone verification status
    await db.query(
      'UPDATE users SET is_phone_verified = 1 WHERE id = ?',
      [userId]
    );
    
    // Update session
    req.session.user.is_verified = true;
    
    res.status(200).json({ message: 'Phone verified successfully' });
    
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete user account
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.deleteAccount = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { password } = req.body;
    
    // Validate input
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Get user's current password
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, users[0].password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete user data based on role
      if (req.session.user.role === 'customer') {
        // Delete customer data
        await connection.query('DELETE FROM customers WHERE user_id = ?', [userId]);
        
        // Delete bookings
        await connection.query('DELETE FROM bookings WHERE customer_id = ?', [userId]);
      } else if (req.session.user.role === 'driver') {
        // Delete driver data
        await connection.query('DELETE FROM drivers WHERE user_id = ?', [userId]);
        
        // Update bookings to cancelled
        await connection.query(
          "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Driver account deleted' WHERE provider_id = ?",
          [userId]
        );
      } else if (req.session.user.role === 'caretaker') {
        // Delete caretaker data
        await connection.query('DELETE FROM caretakers WHERE user_id = ?', [userId]);
        
        // Update bookings to cancelled
        await connection.query(
          "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Caretaker account deleted' WHERE provider_id = ?",
          [userId]
        );
      } else if (req.session.user.role === 'shuttle_driver') {
        // Delete shuttle service data
        await connection.query('DELETE FROM shuttle_services WHERE user_id = ?', [userId]);
        
        // Update bookings to cancelled
        await connection.query(
          "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Shuttle service account deleted' WHERE provider_id = ?",
          [userId]
        );
      }
      
      // Delete wallet
      await connection.query('DELETE FROM wallets WHERE user_id = ?', [userId]);
      
      // Delete OTP verifications
      await connection.query('DELETE FROM otp_verifications WHERE user_id = ?', [userId]);
      
      // Delete ratings
      await connection.query('DELETE FROM ratings WHERE rated_by_user_id = ? OR rated_user_id = ?', [userId, userId]);
      
      // Delete user
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);
      
      // Commit transaction
      await connection.commit();
      
      // Destroy session
      req.session.destroy();
      
      res.status(200).json({ message: 'Account deleted successfully' });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Helper function to get user data based on role
 * 
 * @param {number} userId - User ID
 * @param {string} role - User role
 * @returns {Object} User data
 */
exports.getUserData = async (userId, role) => {
  let userData;
  
  if (role === 'customer') {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_photo, 
        u.is_phone_verified, u.is_email_verified, u.role,
        c.address, c.referral_code, c.emergency_contact_name, c.emergency_contact_phone,
        c.emergency_contact_relation
      FROM users u
      LEFT JOIN customers c ON u.id = c.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    userData = users[0];
  } else if (role === 'driver') {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_photo, 
        u.is_phone_verified, u.is_email_verified, u.role,
        d.license_number, d.license_expiry, d.vehicle_type, d.vehicle_model,
        d.vehicle_year, d.vehicle_color, d.vehicle_registration
      FROM users u
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    userData = users[0];
  } else if (role === 'caretaker') {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_photo, 
        u.is_phone_verified, u.is_email_verified, u.role,
        c.qualification, c.experience_years, c.specialization
      FROM users u
      LEFT JOIN caretakers c ON u.id = c.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    userData = users[0];
  } else if (role === 'shuttle_driver') {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_photo, 
        u.is_phone_verified, u.is_email_verified, u.role,
        s.vehicle_type, s.passenger_capacity, s.license_number, s.license_expiry
      FROM users u
      LEFT JOIN shuttle_services s ON u.id = s.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    userData = users[0];
  } else {
    const [users] = await db.query(
      `SELECT id, email, phone, first_name, last_name, profile_photo, 
        is_phone_verified, is_email_verified, role
      FROM users
      WHERE id = ?`,
      [userId]
    );
    
    userData = users[0];
  }
  
  return userData;
};
