const db = require('../../config/db');

// Get customer dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get total rides (all services combined)
    const [totalRidesResult] = await db.query(
      'SELECT COUNT(*) as total_rides FROM bookings WHERE customer_id = ?',
      [userId]
    );
    
    // Get driver bookings
    const [driverBookingsResult] = await db.query(
      'SELECT COUNT(*) as driver_bookings FROM bookings WHERE customer_id = ? AND service_type = "driver"',
      [userId]
    );
    
    // Get caretaker bookings
    const [caretakerBookingsResult] = await db.query(
      'SELECT COUNT(*) as caretaker_bookings FROM bookings WHERE customer_id = ? AND service_type = "caretaker"',
      [userId]
    );
    
    // Get shuttle bookings
    const [shuttleBookingsResult] = await db.query(
      'SELECT COUNT(*) as shuttle_bookings FROM bookings WHERE customer_id = ? AND service_type = "shuttle"',
      [userId]
    );
    
    // Get wallet balance
    const [walletResult] = await db.query(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    // Get average rating as customer
    const [ratingsAsCustomerResult] = await db.query(
      'SELECT AVG(rating) as average_rating FROM booking_ratings WHERE rated_user_id = ?',
      [userId]
    );
    
    // Initialize wallet if not exists
    let walletBalance = 0;
    if (walletResult.length === 0) {
      // Create wallet for new user
      try {
        await db.query(
          'INSERT INTO wallets (user_id, balance, created_at) VALUES (?, 0, NOW())',
          [userId]
        );
      } catch (walletError) {
        console.error('Error creating wallet:', walletError);
        // Continue even if wallet creation fails
      }
    } else {
      walletBalance = parseFloat(walletResult[0].balance) || 0;
    }
    
    // Get recent bookings (limited to 3 for dashboard)
    const [recentBookingsResult] = await db.query(
      `SELECT b.*, 
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.profile_image as provider_image
      FROM bookings b
      LEFT JOIN users u ON b.provider_id = u.id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
      LIMIT 3`,
      [userId]
    );
    
    // Format the response data
    const totalRides = totalRidesResult[0].total_rides || 0;
    const driverBookings = driverBookingsResult[0].driver_bookings || 0;
    const caretakerBookings = caretakerBookingsResult[0].caretaker_bookings || 0;
    const shuttleBookings = shuttleBookingsResult[0].shuttle_bookings || 0;
    const averageRating = ratingsAsCustomerResult[0].average_rating || 0;
    
    res.status(200).json({
      total_rides: totalRides,
      driver_bookings: driverBookings,
      caretaker_bookings: caretakerBookings,
      shuttle_bookings: shuttleBookings,
      wallet_balance: walletBalance,
      average_rating: parseFloat(averageRating).toFixed(1),
      recent_bookings: recentBookingsResult
    });
    
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to load dashboard statistics', 
      error: error.message,
      // Return default values for new users
      total_rides: 0,
      driver_bookings: 0,
      caretaker_bookings: 0,
      shuttle_bookings: 0,
      wallet_balance: 0,
      average_rating: 0,
      recent_bookings: []
    });
  }
};

// Get customer profile
exports.getProfile = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get user data
    const [users] = await db.query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_image, 
        u.is_phone_verified, u.is_email_verified, u.role, u.created_at,
        c.address, c.city, c.state, c.country, c.pincode, c.referral_code, c.dob
      FROM users u
      LEFT JOIN customer_profiles c ON u.id = c.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's current location if available
    const [locationResult] = await db.query(
      `SELECT location, latitude, longitude, last_updated 
       FROM user_locations 
       WHERE user_id = ? 
       ORDER BY last_updated DESC LIMIT 1`,
      [userId]
    );
    
    const userData = users[0];
    
    // Add location data if available
    if (locationResult && locationResult.length > 0) {
      userData.location = locationResult[0].location;
      userData.latitude = locationResult[0].latitude;
      userData.longitude = locationResult[0].longitude;
    } else {
      userData.location = 'Location not set';
    }
    
    // Format the response
    const userProfile = {
      id: userData.id,
      email: userData.email || '',
      phone: userData.phone || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      profile_image: userData.profile_image || '/images/default-avatar.png',
      is_phone_verified: userData.is_phone_verified || 0,
      is_email_verified: userData.is_email_verified || 0,
      role: userData.role || 'customer',
      address: userData.address || '',
      city: userData.city || '',
      state: userData.state || '',
      country: userData.country || '',
      pincode: userData.pincode || '',
      location: userData.location || 'Location not set',
      referral_code: userData.referral_code || '',
      dob: userData.dob || null,
      member_since: userData.created_at ? new Date(userData.created_at).toISOString().split('T')[0] : ''
    };
    
    res.status(200).json(userProfile);
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ 
      message: 'Failed to load user profile',
      error: error.message 
    });
  }
};

// Update customer profile
exports.updateProfile = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { first_name, last_name, address, phone } = req.body;
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update user table
      await connection.query(
        'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
        [first_name, last_name, phone, userId]
      );
      
      // Update customer table
      await connection.query(
        'UPDATE customers SET address = ? WHERE user_id = ?',
        [address, userId]
      );
      
      // Handle profile photo upload if provided
      if (req.files && req.files.profile_photo) {
        const profilePhoto = req.files.profile_photo;
        const uploadPath = `../../public/uploads/profiles/${userId}`;
        const fileName = `profile_${Date.now()}${path.extname(profilePhoto.name)}`;
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        // Move the file
        await profilePhoto.mv(path.join(__dirname, uploadPath, fileName));
        
        // Update profile photo path in database
        await connection.query(
          'UPDATE users SET profile_photo = ? WHERE id = ?',
          [`/uploads/profiles/${userId}/${fileName}`, userId]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      // Get updated user data
      const [users] = await db.query(
        `SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.profile_photo, 
          u.is_phone_verified, u.is_email_verified, u.role,
          c.address, c.referral_code
        FROM users u
        LEFT JOIN customers c ON u.id = c.user_id
        WHERE u.id = ?`,
        [userId]
      );
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: users[0]
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

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { 
      service_type, 
      pickup_location, 
      dropoff_location, 
      scheduled_time,
      duration_hours,
      special_instructions
    } = req.body;
    
    // Validate required fields
    if (!service_type || !pickup_location || !scheduled_time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Calculate estimated fare based on service type
    let estimatedFare = 0;
    
    // Get service rates from system settings
    const [settings] = await db.query(
      'SELECT * FROM system_settings WHERE setting_key IN (?, ?, ?, ?, ?)',
      [
        'base_fare_driver',
        'per_km_rate_driver',
        'base_fare_caretaker',
        'per_hour_rate_caretaker',
        'base_fare_shuttle'
      ]
    );
    
    // Create a map of settings
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = parseFloat(setting.setting_value);
    });
    
    if (service_type === 'driver') {
      // For driver service, calculate based on distance
      const baseFare = settingsMap['base_fare_driver'] || 100;
      const perKmRate = settingsMap['per_km_rate_driver'] || 10;
      
      // In a real app, calculate distance between pickup and dropoff
      // For now, use a placeholder distance
      const distance = 10; // 10 km placeholder
      
      estimatedFare = baseFare + (perKmRate * distance);
    } else if (service_type === 'caretaker') {
      // For caretaker service, calculate based on hours
      const baseFare = settingsMap['base_fare_caretaker'] || 200;
      const perHourRate = settingsMap['per_hour_rate_caretaker'] || 150;
      
      estimatedFare = baseFare + (perHourRate * (duration_hours || 1));
    } else if (service_type === 'shuttle') {
      // For shuttle service, use base fare
      estimatedFare = settingsMap['base_fare_shuttle'] || 80;
    }
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert booking
      const [result] = await connection.query(
        `INSERT INTO bookings (
          customer_id, 
          service_type, 
          pickup_location, 
          dropoff_location, 
          scheduled_time,
          duration_hours,
          special_instructions,
          estimated_fare,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          service_type,
          pickup_location,
          dropoff_location,
          scheduled_time,
          duration_hours || null,
          special_instructions || null,
          estimatedFare,
          'pending'
        ]
      );
      
      const bookingId = result.insertId;
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({
        message: 'Booking created successfully',
        booking_id: bookingId,
        estimated_fare: estimatedFare
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer bookings
exports.getBookings = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const { status, limit } = req.query;
    
    let query = `
      SELECT b.*, 
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        u.profile_photo as provider_photo
      FROM bookings b
      LEFT JOIN users u ON b.provider_id = u.id
      WHERE b.customer_id = ?
    `;
    
    const queryParams = [userId];
    
    // Add status filter if provided
    if (status) {
      query += ' AND b.status = ?';
      queryParams.push(status);
    }
    
    // Add order by
    query += ' ORDER BY b.created_at DESC';
    
    // Add limit if provided
    if (limit) {
      query += ' LIMIT ?';
      queryParams.push(parseInt(limit));
    }
    
    const [bookings] = await db.query(query, queryParams);
    
    res.status(200).json(bookings);
    
  } catch (error) {
    console.error('Error getting bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking details
exports.getBookingDetails = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const bookingId = req.params.id;
    
    const [bookings] = await db.query(
      `SELECT b.*, 
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        u.profile_photo as provider_photo,
        u.phone as provider_phone
      FROM bookings b
      LEFT JOIN users u ON b.provider_id = u.id
      WHERE b.id = ? AND b.customer_id = ?`,
      [bookingId, userId]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.status(200).json(bookings[0]);
    
  } catch (error) {
    console.error('Error getting booking details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const bookingId = req.params.id;
    const { cancellation_reason } = req.body;
    
    // Check if booking exists and belongs to user
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ?',
      [bookingId, userId]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Check if booking can be cancelled
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be cancelled' });
    }
    
    // Calculate cancellation fee if applicable
    let cancellationFee = 0;
    
    if (booking.status === 'confirmed') {
      // Get cancellation fee percentage from system settings
      const [settings] = await db.query(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['cancellation_fee_percentage']
      );
      
      const cancellationFeePercentage = settings.length > 0 ? 
        parseFloat(settings[0].setting_value) : 10;
      
      cancellationFee = (booking.estimated_fare * cancellationFeePercentage) / 100;
    }
    
    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update booking status
      await connection.query(
        'UPDATE bookings SET status = ?, cancellation_reason = ?, cancellation_fee = ?, cancelled_at = NOW() WHERE id = ?',
        ['cancelled', cancellation_reason || null, cancellationFee, bookingId]
      );
      
      // If there's a cancellation fee, deduct from wallet
      if (cancellationFee > 0) {
        // Get wallet balance
        const [wallet] = await connection.query(
          'SELECT balance FROM wallets WHERE user_id = ?',
          [userId]
        );
        
        if (wallet.length > 0) {
          const newBalance = wallet[0].balance - cancellationFee;
          
          // Update wallet balance
          await connection.query(
            'UPDATE wallets SET balance = ? WHERE user_id = ?',
            [newBalance, userId]
          );
          
          // Add transaction record
          await connection.query(
            `INSERT INTO wallet_transactions (
              wallet_id, 
              amount, 
              transaction_type, 
              description, 
              reference_id
            ) VALUES (
              (SELECT id FROM wallets WHERE user_id = ?), 
              ?, 
              ?, 
              ?, 
              ?
            )`,
            [
              userId,
              cancellationFee,
              'debit',
              `Cancellation fee for booking #${bookingId}`,
              bookingId
            ]
          );
        }
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        message: 'Booking cancelled successfully',
        cancellation_fee: cancellationFee
      });
      
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit rating for a booking
exports.submitRating = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const bookingId = req.params.id;
    const { rating, review } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating. Must be between 1 and 5' });
    }
    
    // Check if booking exists and belongs to user
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ? AND status = "completed"',
      [bookingId, userId]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or not completed' });
    }
    
    const booking = bookings[0];
    
    // Check if rating already exists
    const [existingRatings] = await db.query(
      'SELECT * FROM ratings WHERE booking_id = ?',
      [bookingId]
    );
    
    if (existingRatings.length > 0) {
      return res.status(400).json({ message: 'Rating already submitted for this booking' });
    }
    
    // Insert rating
    await db.query(
      `INSERT INTO ratings (
        booking_id, 
        rated_by_user_id, 
        rated_user_id, 
        rating, 
        review
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        bookingId,
        userId,
        booking.provider_id,
        rating,
        review || null
      ]
    );
    
    res.status(201).json({
      message: 'Rating submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // Token valid for 24 hours
    
    // Get user email
    const [users] = await db.query(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const email = users[0].email;
    
    // Store token in database
    await db.query(
      'INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, email, token, expiryTime]
    );
    
    // Send verification email (mock implementation)
    console.log(`Email verification link sent to ${email}: http://localhost:3000/verification/email/${token}`);
    
    res.status(200).json({
      message: 'Verification email sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    
    // Get wallet
    const [wallets] = await db.query(
      'SELECT * FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (wallets.length === 0) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    const walletId = wallets[0].id;
    
    // Get transactions
    const [transactions] = await db.query(
      `SELECT * FROM wallet_transactions 
      WHERE wallet_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20`,
      [walletId]
    );
    
    res.status(200).json({
      balance: wallets[0].balance,
      transactions: transactions
    });
    
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
