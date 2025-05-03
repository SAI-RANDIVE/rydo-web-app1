const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const User = require('../models/UserMongo');
const mongoose = require('mongoose');

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to save uploaded file
const saveFile = (file, folder, userId) => {
  // Create directory if it doesn't exist
  const uploadDir = path.join(__dirname, '../../public/uploads', folder, userId.toString());
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const fileExt = path.extname(file.name);
  const fileName = `${timestamp}${fileExt}`;
  const filePath = path.join(uploadDir, fileName);
  
  // Save file
  fs.writeFileSync(filePath, file.data);
  
  // Return relative path for database storage
  return `/uploads/${folder}/${userId}/${fileName}`;
};

// Register a new user
exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    
    // Validate required fields
    const requiredFields = ['role', 'first_name', 'last_name', 'email', 'phone', 'password'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field.replace('_', ' ')} is required` });
      }
    }
    const { 
      role, 
      first_name, 
      last_name, 
      email, 
      phone, 
      password 
    } = req.body;
    
    // Check if email already exists
    try {
      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE email = ? OR phone = ?',
        [email, phone]
      );
      
      if (existingUsers.length > 0) {
        console.log('User already exists:', email, phone);
        return res.status(400).json({ 
          message: 'Email or phone number already registered' 
        });
      }
    } catch (dbError) {
      console.error('Database error checking existing users:', dbError);
      return res.status(500).json({ message: 'Error checking user existence' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert user
      const [result] = await connection.query(
        'INSERT INTO users (email, phone, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        [email, phone, hashedPassword, role, first_name, last_name]
      );
      
      const userId = result.insertId;
      
      // Generate OTP for verification
      const otp = generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
      
      // Store OTP in database
      await connection.query(
        'INSERT INTO otp_verifications (user_id, phone, email, otp, type, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, phone, email, otp, 'phone', expiryTime]
      );
      
      // Insert role-specific data
      if (role === 'driver') {
        await connection.query(
          'INSERT INTO drivers (user_id) VALUES (?)',
          [userId]
        );
      } else if (role === 'caretaker') {
        await connection.query(
          'INSERT INTO caretakers (user_id) VALUES (?)',
          [userId]
        );
      } else if (role === 'shuttle_driver') {
        await connection.query(
          'INSERT INTO shuttle_services (user_id, vehicle_type, passenger_capacity) VALUES (?, ?, ?)',
          [userId, 'Standard', 4]
        );
      } else if (role === 'customer') {
        // Generate referral code
        const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        await connection.query(
          'INSERT INTO customers (user_id, referral_code) VALUES (?, ?)',
          [userId, referralCode]
        );
      }
      
      // Create wallet for user
      await connection.query(
        'INSERT INTO wallets (user_id) VALUES (?)',
        [userId]
      );
      
      // Commit transaction
      await connection.commit();
      
      // Send OTP via SMS (mock implementation)
      console.log(`OTP sent to ${phone}: ${otp}`);
      
      // Set user session
      req.session.user = {
        id: userId,
        email,
        role,
        first_name,
        last_name,
        is_verified: false
      };
      
      res.status(201).json({
        message: 'Registration successful. Please verify your phone number.',
        user: {
          id: userId,
          email,
          role,
          first_name,
          last_name,
          is_verified: false
        },
        verification_required: true
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// Register a driver with comprehensive information
exports.driverSignup = async (req, res) => {
  try {
    // Extract basic user information
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      password,
      gender,
      date_of_birth,
      address,
      city,
      state,
      pincode,
      id_proof_type,
      id_proof_number,
      license_number,
      license_expiry,
      aadhar_number,
      education_level,
      languages_known,
      experience_years,
      vehicle_types,
      skills,
      preferred_locations,
      emergency_contact_name,
      emergency_contact_phone,
      upi_id
    } = req.body;
    
    // Check if email or phone already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'Email or phone number already registered' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert user
      const [result] = await connection.query(
        `INSERT INTO users (
          email, phone, password, role, first_name, last_name, gender, date_of_birth,
          address, city, state, pincode, id_proof_type, id_proof_number,
          emergency_contact_name, emergency_contact_phone, upi_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email, phone, hashedPassword, 'driver', first_name, last_name, gender, date_of_birth,
          address, city, state, pincode, id_proof_type, id_proof_number,
          emergency_contact_name, emergency_contact_phone, upi_id
        ]
      );
      
      const userId = result.insertId;
      
      // Save uploaded files
      let profilePhotoPath = null;
      let idProofPhotoPath = null;
      let licensePhotoFrontPath = null;
      let licensePhotoBackPath = null;
      let aadharPhotoFrontPath = null;
      let aadharPhotoBackPath = null;
      
      if (req.files) {
        if (req.files.profile_photo) {
          profilePhotoPath = saveFile(req.files.profile_photo, 'profile', userId);
        }
        
        if (req.files.id_proof_photo) {
          idProofPhotoPath = saveFile(req.files.id_proof_photo, 'id_proof', userId);
        }
        
        if (req.files.license_photo_front) {
          licensePhotoFrontPath = saveFile(req.files.license_photo_front, 'license', userId);
        }
        
        if (req.files.license_photo_back) {
          licensePhotoBackPath = saveFile(req.files.license_photo_back, 'license', userId);
        }
        
        if (req.files.aadhar_photo_front) {
          aadharPhotoFrontPath = saveFile(req.files.aadhar_photo_front, 'aadhar', userId);
        }
        
        if (req.files.aadhar_photo_back) {
          aadharPhotoBackPath = saveFile(req.files.aadhar_photo_back, 'aadhar', userId);
        }
      }
      
      // Update user with photo paths
      await connection.query(
        'UPDATE users SET profile_photo = ?, id_proof_photo = ? WHERE id = ?',
        [profilePhotoPath, idProofPhotoPath, userId]
      );
      
      // Insert driver data
      await connection.query(
        `INSERT INTO drivers (
          user_id, license_number, license_expiry, license_photo_front, license_photo_back,
          aadhar_number, aadhar_photo_front, aadhar_photo_back, education_level,
          languages_known, experience_years, vehicle_types, preferred_locations, skills
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, license_number, license_expiry, licensePhotoFrontPath, licensePhotoBackPath,
          aadhar_number, aadharPhotoFrontPath, aadharPhotoBackPath, education_level,
          languages_known, experience_years, vehicle_types, preferred_locations, skills
        ]
      );
      
      // Generate OTP for verification
      const otp = generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
      
      // Store OTP in database
      await connection.query(
        'INSERT INTO otp_verifications (user_id, phone, email, otp, type, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, phone, email, otp, 'phone', expiryTime]
      );
      
      // Create wallet for user
      await connection.query(
        'INSERT INTO wallets (user_id) VALUES (?)',
        [userId]
      );
      
      // Commit transaction
      await connection.commit();
      
      // Send OTP via SMS (mock implementation)
      console.log(`OTP sent to ${phone}: ${otp}`);
      
      // Set user session
      req.session.user = {
        id: userId,
        email,
        role: 'driver',
        first_name,
        last_name,
        is_verified: false
      };
      
      res.status(201).json({
        message: 'Registration successful. Please verify your phone number.',
        user: {
          id: userId,
          email,
          role: 'driver',
          first_name,
          last_name,
          is_verified: false
        },
        verification_required: true
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Driver signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email exists in database
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [email, email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.is_phone_verified) {
      // Generate new OTP for verification
      const otp = generateOTP();
      const expiryTime = new Date();
      
      return res.status(403).json({ 
        success: false,
        message: user.verification_status === 'pending' ? 
          'Your account is pending verification. Please wait for admin approval.' : 
          'Your account verification was rejected. Please contact support.',
        verification_status: user.verification_status,
        rejection_reason: user.rejection_reason || null
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, 
      process.env.SESSION_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Prepare user data for response (excluding sensitive information)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile_image: user.profile_image,
      verification_status: user.verification_status
    };
    
    // Add role-specific data
    if (user.role === 'driver' || user.role === 'caretaker' || user.role === 'shuttle_driver') {
      userData.service_details = user.service_details;
      userData.rating = user.rating;
      userData.total_rides = user.total_rides;
      userData.total_earnings = user.total_earnings;
      userData.is_online = user.is_online;
    }
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Signup user
exports.signup = async (req, res) => {
  try {
    // Extract required fields
    const {
      email, phone, password, role, first_name, last_name, gender, date_of_birth,
      address, city, state, pincode, id_proof_type, id_proof_number,
      emergency_contact_name, emergency_contact_phone, upi_id
    } = req.body;
    
    // Check if email or phone already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      email,
      phone,
      password: hashedPassword,
      role,
      first_name,
      last_name,
      gender,
      date_of_birth,
      address,
      city,
      state,
      pincode,
      id_proof_type,
      id_proof_number,
      emergency_contact_name,
      emergency_contact_phone,
      upi_id
    });
    
    // Save user to database
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, 
      process.env.SESSION_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Prepare user data for response (excluding sensitive information)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile_image: user.profile_image,
      verification_status: user.verification_status
    };
    
    res.status(201).json({
      success: true,
      message: 'Signup successful',
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { otp, phone } = req.body;
    const userId = req.session.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find the latest OTP for this user/phone
    const [otpRecords] = await db.query(
      'SELECT * FROM otp_verifications WHERE user_id = ? AND phone = ? AND type = ? AND verified = ? ORDER BY created_at DESC LIMIT 1',
      [userId, phone, 'phone', false]
    );
    
    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'No OTP verification pending' });
    }
    
    const otpRecord = otpRecords[0];
    
    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    
    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark OTP as verified
    await db.query(
      'UPDATE otp_verifications SET verified = ? WHERE id = ?',
      [true, otpRecord.id]
    );
    
    // Update user as verified
    await db.query(
      'UPDATE users SET is_phone_verified = ? WHERE id = ?',
      [true, userId]
    );
    
    // Update session
    req.session.user.is_verified = true;
    
    res.status(200).json({
      message: 'Phone number verified successfully',
      user: {
        ...req.session.user,
        is_verified: true
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.session.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Store OTP in database
    await db.query(
      'INSERT INTO otp_verifications (user_id, phone, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, phone, otp, 'phone', expiryTime]
    );
    
    // Send OTP via SMS (mock implementation)
    console.log(`OTP resent to ${phone}: ${otp}`);
    
    res.status(200).json({
      message: 'OTP resent successfully'
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Could not log out' });
    }
    
    // Clear any cookies
    res.clearCookie('connect.sid');
    
    // Redirect to home page instead of returning JSON
    res.redirect('/');
  });
};
