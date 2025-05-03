const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { User, Profile, OTP } = require('../models/mongodb');

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
    
    // Check if email or phone already exists
    try {
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }]
      });
      
      if (existingUser) {
        console.log('User already exists:', email, phone);
        return res.status(400).json({ 
          message: 'Email or phone number already registered' 
        });
      }
    } catch (dbError) {
      console.error('Database error checking existing users:', dbError);
      return res.status(500).json({ message: 'Error checking user existence' });
    }
    
    // Map role to userType
    const userType = role === 'shuttle_driver' ? 'shuttle' : role;
    
    try {
      // Create new user
      const newUser = new User({
        email,
        phone,
        password, // Will be hashed by the pre-save hook
        firstName: first_name,
        lastName: last_name,
        userType,
        isVerified: false
      });
      
      // Save user
      const savedUser = await newUser.save();
      
      // Generate OTP for verification
      const otp = generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
      
      // Create OTP document
      const otpDoc = new OTP({
        requestId: uuidv4(),
        email,
        phone,
        otp,
        expiresAt: expiryTime
      });
      
      await otpDoc.save();
      
      // Create profile based on role
      const profileData = {
        userId: savedUser._id,
        userType: savedUser.userType,
      };
      
      if (role === 'customer') {
        // Generate referral code
        profileData.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      } else if (role === 'shuttle') {
        // Set default shuttle details
        profileData.vehicleDetails = {
          model: 'Standard',
          passengerCapacity: 4
        };
      }
      
      // Save profile
      const newProfile = new Profile(profileData);
      await newProfile.save();
      
      // Send OTP via SMS (mock implementation)
      console.log(`OTP sent to ${phone}: ${otp}`);
      
      // Set user session
      req.session.user = {
        id: savedUser._id,
        email,
        role: userType,
        first_name,
        last_name,
        is_verified: false
      };
      
      res.status(201).json({
        message: 'Registration successful. Please verify your phone number.',
        user: {
          id: savedUser._id,
          email,
          role: userType,
          first_name,
          last_name,
          is_verified: false
        },
        verification_required: true
      });
      
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
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
      upi_id
    } = req.body;
    
    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email or phone number already registered' 
      });
    }
    
    // Create new user
    const newUser = new User({
      email,
      phone,
      password, // Will be hashed by the pre-save hook
      firstName: first_name,
      lastName: last_name,
      userType: 'driver',
      isVerified: false
    });
    
    // Save user
    const savedUser = await newUser.save();
    
    // Process document uploads
    let licenseDocUrl = '';
    let aadharDocUrl = '';
    
    if (req.files) {
      if (req.files.license_document) {
        licenseDocUrl = saveFile(req.files.license_document, 'licenses', savedUser._id);
      }
      
      if (req.files.aadhar_document) {
        aadharDocUrl = saveFile(req.files.aadhar_document, 'aadhar', savedUser._id);
      }
    }
    
    // Create driver profile
    const profileData = {
      userId: savedUser._id,
      userType: 'driver',
      gender,
      dateOfBirth: date_of_birth,
      address: {
        street: address,
        city,
        state,
        zipCode: pincode,
        country: 'India'
      },
      documents: {
        drivingLicense: {
          number: license_number,
          expiryDate: license_expiry,
          verified: false,
          documentUrl: licenseDocUrl
        },
        aadharCard: {
          number: aadhar_number,
          verified: false,
          documentUrl: aadharDocUrl
        }
      },
      professionalDetails: {
        education: education_level,
        languages: languages_known ? languages_known.split(',').map(lang => lang.trim()) : [],
        skills: skills ? skills.split(',').map(skill => skill.trim()) : [],
        experience: experience_years
      },
      paymentInfo: {
        upiId: upi_id
      }
    };
    
    // Save profile
    const newProfile = new Profile(profileData);
    await newProfile.save();
    
    // Generate OTP for verification
    const otp = generateOTP();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes
    
    // Create OTP document
    const otpDoc = new OTP({
      requestId: uuidv4(),
      email,
      phone,
      otp,
      expiresAt: expiryTime
    });
    
    await otpDoc.save();
    
    // Send OTP via SMS (mock implementation)
    console.log(`OTP sent to ${phone}: ${otp}`);
    
    // Set user session
    req.session.user = {
      id: savedUser._id,
      email,
      role: 'driver',
      first_name,
      last_name,
      is_verified: false
    };
    
    res.status(201).json({
      message: 'Driver registration successful. Please verify your phone number.',
      user: {
        id: savedUser._id,
        email,
        role: 'driver',
        first_name,
        last_name,
        is_verified: false
      },
      verification_required: true
    });
    
  } catch (error) {
    console.error('Driver signup error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// Login user
const jwt = require('jsonwebtoken');
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      // Generate new OTP for verification
      const otp = generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10);
      
      // Create OTP document
      const otpDoc = new OTP({
        requestId: uuidv4(),
        email: user.email,
        phone: user.phone,
        otp,
        expiresAt: expiryTime
      });
      
      await otpDoc.save();
      
      // Send OTP via SMS (mock implementation)
      console.log(`OTP sent to ${user.phone}: ${otp}`);
      
      return res.status(200).json({
        message: 'Account not verified. Please verify your phone number.',
        user: {
          id: user._id,
          email: user.email,
          role: user.userType,
          first_name: user.firstName,
          last_name: user.lastName,
          is_verified: false
        },
        verification_required: true
      });
    }
    
    // Set user session
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.userType,
      first_name: user.firstName,
      last_name: user.lastName,
      is_verified: true
    };

    // Generate JWT token
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.userType
    };
    const jwtSecret = process.env.SESSION_SECRET || 'your_local_secret';
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.userType,
        first_name: user.firstName,
        last_name: user.lastName,
        is_verified: true
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    // Find the most recent OTP for this email
    const otpDoc = await OTP.findOne({ 
      email,
      verified: false
    }).sort({ createdAt: -1 });
    
    if (!otpDoc) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }
    
    // Check if OTP is expired
    if (new Date() > otpDoc.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Check if OTP matches
    if (otpDoc.otp !== otp) {
      // Increment attempts
      otpDoc.attempts += 1;
      await otpDoc.save();
      
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark OTP as verified
    otpDoc.verified = true;
    await otpDoc.save();
    
    // Update user verification status
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isVerified = true;
    await user.save();
    
    // Update session
    if (req.session.user) {
      req.session.user.is_verified = true;
    }
    
    res.status(200).json({
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.userType,
        first_name: user.firstName,
        last_name: user.lastName,
        is_verified: true
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    
    // Create OTP document
    const otpDoc = new OTP({
      requestId: uuidv4(),
      email: user.email,
      phone: user.phone,
      otp,
      expiresAt: expiryTime
    });
    
    await otpDoc.save();
    
    // Send OTP via SMS (mock implementation)
    console.log(`OTP resent to ${user.phone}: ${otp}`);
    
    res.status(200).json({
      message: 'OTP resent successfully',
      phone: user.phone.replace(/(\+\d{2})(\d{3})(.*)\d{2}/, '$1$2***')
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // Destroy session
    req.session.destroy(err => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ message: 'Error logging out' });
      }
      
      res.status(200).json({ message: 'Logged out successfully' });
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};
