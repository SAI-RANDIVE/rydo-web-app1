/**
 * Caretaker Controller
 * Handles all caretaker-related operations
 */

const db = require('../config/database');

/**
 * Get caretaker dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get total completed services
    const [completedServicesResult] = await db.query(
      'SELECT COUNT(*) as completed_services FROM bookings WHERE provider_id = ? AND service_type = "caretaker" AND status = "completed"',
      [userId]
    );
    
    // Get total earnings
    const [earningsResult] = await db.query(
      'SELECT SUM(amount) as total_earnings FROM provider_payments WHERE provider_id = ? AND status = "completed"',
      [userId]
    );
    
    // Get average rating
    const [ratingsResult] = await db.query(
      'SELECT AVG(rating) as average_rating FROM booking_ratings WHERE rated_user_id = ?',
      [userId]
    );
    
    // Get today's earnings
    const [todayEarningsResult] = await db.query(
      'SELECT SUM(amount) as today_earnings FROM provider_payments WHERE provider_id = ? AND status = "completed" AND DATE(created_at) = CURDATE()',
      [userId]
    );
    
    // Get active bookings
    const [activeBookingsResult] = await db.query(
      'SELECT COUNT(*) as active_bookings FROM bookings WHERE provider_id = ? AND service_type = "caretaker" AND status IN ("confirmed", "in_progress")',
      [userId]
    );
    
    // Get recent bookings (limited to 5 for dashboard)
    const [recentBookingsResult] = await db.query(
      `SELECT b.*, 
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.profile_image as customer_image
      FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.provider_id = ? AND b.service_type = "caretaker"
      ORDER BY b.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    // Format the response data
    const completedServices = completedServicesResult[0].completed_services || 0;
    const totalEarnings = earningsResult[0].total_earnings || 0;
    const averageRating = ratingsResult[0].average_rating || 0;
    const todayEarnings = todayEarningsResult[0].today_earnings || 0;
    const activeBookings = activeBookingsResult[0].active_bookings || 0;
    
    // Get caretaker status
    const [caretakerStatusResult] = await db.query(
      'SELECT is_online, is_verified, specialization FROM caretaker_profiles WHERE user_id = ?',
      [userId]
    );
    
    let caretakerStatus = {
      is_online: false,
      is_verified: false,
      specialization: null
    };
    
    if (caretakerStatusResult.length > 0) {
      caretakerStatus.is_online = caretakerStatusResult[0].is_online === 1;
      caretakerStatus.is_verified = caretakerStatusResult[0].is_verified === 1;
      caretakerStatus.specialization = caretakerStatusResult[0].specialization;
    } else {
      // Create caretaker profile if not exists
      try {
        await db.query(
          'INSERT INTO caretaker_profiles (user_id, is_online, is_verified, created_at) VALUES (?, 0, 0, NOW())',
          [userId]
        );
      } catch (profileError) {
        console.error('Error creating caretaker profile:', profileError);
      }
    }
    
    res.status(200).json({
      completed_services: completedServices,
      total_earnings: parseFloat(totalEarnings).toFixed(2),
      average_rating: parseFloat(averageRating).toFixed(1),
      today_earnings: parseFloat(todayEarnings).toFixed(2),
      active_bookings: activeBookings,
      caretaker_status: caretakerStatus,
      recent_bookings: recentBookingsResult
    });
    
  } catch (error) {
    console.error('Error getting caretaker dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to load dashboard statistics', 
      error: error.message,
      // Return default values for new users
      completed_services: 0,
      total_earnings: "0.00",
      average_rating: "0.0",
      today_earnings: "0.00",
      active_bookings: 0,
      caretaker_status: {
        is_online: false,
        is_verified: false,
        specialization: null
      },
      recent_bookings: []
    });
  }
};

/**
 * Get caretaker profile
 */
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
        c.specialization, c.experience_years, c.certification, c.is_verified, c.is_online,
        c.education, c.bio, c.languages
      FROM users u
      LEFT JOIN caretaker_profiles c ON u.id = c.user_id
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
      role: userData.role || 'caretaker',
      specialization: userData.specialization || '',
      experience_years: userData.experience_years || 0,
      certification: userData.certification || '',
      education: userData.education || '',
      bio: userData.bio || '',
      languages: userData.languages || '',
      is_verified: userData.is_verified || 0,
      is_online: userData.is_online || 0,
      location: userData.location || 'Location not set',
      member_since: userData.created_at ? new Date(userData.created_at).toISOString().split('T')[0] : ''
    };
    
    res.status(200).json(userProfile);
    
  } catch (error) {
    console.error('Error getting caretaker profile:', error);
    res.status(500).json({ 
      message: 'Failed to load user profile',
      error: error.message 
    });
  }
};

/**
 * Update caretaker status (online/offline)
 */
exports.updateStatus = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { status } = req.body;
    
    if (status !== 'online' && status !== 'offline') {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const isOnline = status === 'online' ? 1 : 0;
    
    // Update caretaker status
    const [result] = await db.query(
      'UPDATE caretaker_profiles SET is_online = ? WHERE user_id = ?',
      [isOnline, userId]
    );
    
    if (result.affectedRows === 0) {
      // Create caretaker profile if not exists
      await db.query(
        'INSERT INTO caretaker_profiles (user_id, is_online, created_at) VALUES (?, ?, NOW())',
        [userId, isOnline]
      );
    }
    
    res.status(200).json({
      success: true,
      message: `You are now ${status}`,
      is_online: isOnline
    });
    
  } catch (error) {
    console.error('Error updating caretaker status:', error);
    res.status(500).json({ 
      message: 'Failed to update status',
      error: error.message 
    });
  }
};

/**
 * Update caretaker professional details
 */
exports.updateProfessionalDetails = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { 
      specialization, 
      experience_years, 
      certification, 
      education, 
      bio, 
      languages 
    } = req.body;
    
    // Validate required fields
    if (!specialization) {
      return res.status(400).json({ message: 'Specialization is required' });
    }
    
    // Update caretaker professional details
    const [caretakerResult] = await db.query(
      'SELECT id FROM caretaker_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (caretakerResult.length > 0) {
      await db.query(
        `UPDATE caretaker_profiles SET 
          specialization = ?, 
          experience_years = ?, 
          certification = ?, 
          education = ?, 
          bio = ?, 
          languages = ? 
        WHERE user_id = ?`,
        [
          specialization, 
          experience_years || 0, 
          certification || null, 
          education || null, 
          bio || null, 
          languages || null, 
          userId
        ]
      );
    } else {
      await db.query(
        `INSERT INTO caretaker_profiles (
          user_id, 
          specialization, 
          experience_years, 
          certification, 
          education, 
          bio, 
          languages, 
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, 
          specialization, 
          experience_years || 0, 
          certification || null, 
          education || null, 
          bio || null, 
          languages || null
        ]
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Professional details updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating professional details:', error);
    res.status(500).json({ 
      message: 'Failed to update professional details',
      error: error.message 
    });
  }
};

/**
 * Get caretaker's upcoming bookings
 */
exports.getUpcomingBookings = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get upcoming bookings
    const [bookingsResult] = await db.query(
      `SELECT b.*, 
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.phone as customer_phone,
        u.profile_image as customer_image
      FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.provider_id = ? AND b.service_type = "caretaker" AND b.status IN ('confirmed', 'in_progress') 
      ORDER BY b.scheduled_time ASC`,
      [userId]
    );
    
    res.status(200).json({
      bookings: bookingsResult
    });
    
  } catch (error) {
    console.error('Error getting upcoming bookings:', error);
    res.status(500).json({ 
      message: 'Failed to load upcoming bookings',
      error: error.message 
    });
  }
};

/**
 * Get caretaker's booking history
 */
exports.getBookingHistory = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get booking history
    const [bookingsResult] = await db.query(
      `SELECT b.*, 
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.profile_image as customer_image
      FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.provider_id = ? AND b.service_type = "caretaker" AND b.status IN ('completed', 'cancelled') 
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM bookings WHERE provider_id = ? AND service_type = "caretaker" AND status IN ("completed", "cancelled")',
      [userId]
    );
    
    const totalBookings = countResult[0].total;
    const totalPages = Math.ceil(totalBookings / limit);
    
    res.status(200).json({
      bookings: bookingsResult,
      current_page: page,
      total_pages: totalPages,
      total_bookings: totalBookings
    });
    
  } catch (error) {
    console.error('Error getting booking history:', error);
    res.status(500).json({ 
      message: 'Failed to load booking history',
      error: error.message 
    });
  }
};

/**
 * Get caretaker's earnings
 */
exports.getEarnings = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const period = req.query.period || 'week'; // week, month, year, all
    
    let dateCondition = '';
    let dateParams = [];
    
    if (period === 'week') {
      dateCondition = 'AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateCondition = 'AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateCondition = 'AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }
    
    // Get total earnings
    const [totalResult] = await db.query(
      `SELECT SUM(p.amount) as total_earnings 
      FROM provider_payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.provider_id = ? AND p.status = "completed" AND b.service_type = "caretaker" ${dateCondition}`,
      [userId, ...dateParams]
    );
    
    // Get daily earnings for chart
    const [dailyResult] = await db.query(
      `SELECT 
        DATE(p.created_at) as date,
        SUM(p.amount) as daily_earnings
      FROM provider_payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.provider_id = ? AND p.status = "completed" AND b.service_type = "caretaker" ${dateCondition}
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC`,
      [userId, ...dateParams]
    );
    
    // Get recent payments
    const [recentPaymentsResult] = await db.query(
      `SELECT p.*, b.booking_reference, b.service_details
      FROM provider_payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.provider_id = ? AND p.status = "completed" AND b.service_type = "caretaker"
      ORDER BY p.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    res.status(200).json({
      total_earnings: parseFloat(totalResult[0].total_earnings || 0).toFixed(2),
      daily_earnings: dailyResult,
      recent_payments: recentPaymentsResult
    });
    
  } catch (error) {
    console.error('Error getting earnings:', error);
    res.status(500).json({ 
      message: 'Failed to load earnings data',
      error: error.message 
    });
  }
};
