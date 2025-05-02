/**
 * Driver Controller
 * Handles all driver-related operations
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Get driver dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get total completed rides
    const [completedRidesResult] = await db.query(
      'SELECT COUNT(*) as completed_rides FROM bookings WHERE provider_id = ? AND status = "completed"',
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
      'SELECT COUNT(*) as active_bookings FROM bookings WHERE provider_id = ? AND status IN ("confirmed", "in_progress")',
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
      WHERE b.provider_id = ?
      ORDER BY b.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    // Format the response data
    const completedRides = completedRidesResult[0].completed_rides || 0;
    const totalEarnings = earningsResult[0].total_earnings || 0;
    const averageRating = ratingsResult[0].average_rating || 0;
    const todayEarnings = todayEarningsResult[0].today_earnings || 0;
    const activeBookings = activeBookingsResult[0].active_bookings || 0;
    
    // Get driver status
    const [driverStatusResult] = await db.query(
      'SELECT is_online, is_verified, vehicle_id FROM driver_profiles WHERE user_id = ?',
      [userId]
    );
    
    let driverStatus = {
      is_online: false,
      is_verified: false,
      has_vehicle: false
    };
    
    if (driverStatusResult.length > 0) {
      driverStatus.is_online = driverStatusResult[0].is_online === 1;
      driverStatus.is_verified = driverStatusResult[0].is_verified === 1;
      driverStatus.has_vehicle = driverStatusResult[0].vehicle_id !== null;
    } else {
      // Create driver profile if not exists
      try {
        await db.query(
          'INSERT INTO driver_profiles (user_id, is_online, is_verified, created_at) VALUES (?, 0, 0, NOW())',
          [userId]
        );
      } catch (profileError) {
        console.error('Error creating driver profile:', profileError);
      }
    }
    
    res.status(200).json({
      completed_rides: completedRides,
      total_earnings: parseFloat(totalEarnings).toFixed(2),
      average_rating: parseFloat(averageRating).toFixed(1),
      today_earnings: parseFloat(todayEarnings).toFixed(2),
      active_bookings: activeBookings,
      driver_status: driverStatus,
      recent_bookings: recentBookingsResult
    });
    
  } catch (error) {
    console.error('Error getting driver dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to load dashboard statistics', 
      error: error.message,
      // Return default values for new users
      completed_rides: 0,
      total_earnings: "0.00",
      average_rating: "0.0",
      today_earnings: "0.00",
      active_bookings: 0,
      driver_status: {
        is_online: false,
        is_verified: false,
        has_vehicle: false
      },
      recent_bookings: []
    });
  }
};

/**
 * Get driver profile
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
        d.license_number, d.license_expiry, d.is_verified, d.vehicle_id, d.is_online
      FROM users u
      LEFT JOIN driver_profiles d ON u.id = d.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get vehicle data if exists
    let vehicleData = null;
    if (users[0].vehicle_id) {
      const [vehicles] = await db.query(
        'SELECT * FROM vehicles WHERE id = ?',
        [users[0].vehicle_id]
      );
      
      if (vehicles.length > 0) {
        vehicleData = vehicles[0];
      }
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
      role: userData.role || 'driver',
      license_number: userData.license_number || '',
      license_expiry: userData.license_expiry || null,
      is_verified: userData.is_verified || 0,
      is_online: userData.is_online || 0,
      location: userData.location || 'Location not set',
      vehicle: vehicleData,
      member_since: userData.created_at ? new Date(userData.created_at).toISOString().split('T')[0] : ''
    };
    
    res.status(200).json(userProfile);
    
  } catch (error) {
    console.error('Error getting driver profile:', error);
    res.status(500).json({ 
      message: 'Failed to load user profile',
      error: error.message 
    });
  }
};

/**
 * Update driver status (online/offline)
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
    
    // Update driver status
    const [result] = await db.query(
      'UPDATE driver_profiles SET is_online = ? WHERE user_id = ?',
      [isOnline, userId]
    );
    
    if (result.affectedRows === 0) {
      // Create driver profile if not exists
      await db.query(
        'INSERT INTO driver_profiles (user_id, is_online, created_at) VALUES (?, ?, NOW())',
        [userId, isOnline]
      );
    }
    
    res.status(200).json({
      success: true,
      message: `You are now ${status}`,
      is_online: isOnline
    });
    
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ 
      message: 'Failed to update status',
      error: error.message 
    });
  }
};

/**
 * Add or update driver vehicle
 */
exports.updateVehicle = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { 
      vehicle_type, 
      make, 
      model, 
      year, 
      color, 
      license_plate, 
      registration_number,
      registration_expiry,
      insurance_number,
      insurance_expiry
    } = req.body;
    
    // Validate required fields
    if (!vehicle_type || !make || !model || !license_plate || !registration_number) {
      return res.status(400).json({ message: 'Missing required vehicle information' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Check if driver has a vehicle
      const [driverResult] = await db.query(
        'SELECT vehicle_id FROM driver_profiles WHERE user_id = ?',
        [userId]
      );
      
      let vehicleId;
      
      if (driverResult.length > 0 && driverResult[0].vehicle_id) {
        // Update existing vehicle
        vehicleId = driverResult[0].vehicle_id;
        
        await db.query(
          `UPDATE vehicles SET 
            vehicle_type = ?, 
            make = ?, 
            model = ?, 
            year = ?, 
            color = ?, 
            license_plate = ?, 
            registration_number = ?,
            registration_expiry = ?,
            insurance_number = ?,
            insurance_expiry = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            vehicle_type, 
            make, 
            model, 
            year || null, 
            color || null, 
            license_plate, 
            registration_number,
            registration_expiry || null,
            insurance_number || null,
            insurance_expiry || null,
            vehicleId
          ]
        );
      } else {
        // Create new vehicle
        const [newVehicle] = await db.query(
          `INSERT INTO vehicles (
            owner_id,
            vehicle_type, 
            make, 
            model, 
            year, 
            color, 
            license_plate, 
            registration_number,
            registration_expiry,
            insurance_number,
            insurance_expiry,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            userId,
            vehicle_type, 
            make, 
            model, 
            year || null, 
            color || null, 
            license_plate, 
            registration_number,
            registration_expiry || null,
            insurance_number || null,
            insurance_expiry || null
          ]
        );
        
        vehicleId = newVehicle.insertId;
        
        // Update driver profile with vehicle ID
        if (driverResult.length > 0) {
          await db.query(
            'UPDATE driver_profiles SET vehicle_id = ? WHERE user_id = ?',
            [vehicleId, userId]
          );
        } else {
          await db.query(
            'INSERT INTO driver_profiles (user_id, vehicle_id, created_at) VALUES (?, ?, NOW())',
            [userId, vehicleId]
          );
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Vehicle information updated successfully',
        vehicle_id: vehicleId
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error updating vehicle information:', error);
    res.status(500).json({ 
      message: 'Failed to update vehicle information',
      error: error.message 
    });
  }
};

/**
 * Update driver license information
 */
exports.updateLicense = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { license_number, license_expiry } = req.body;
    
    // Validate required fields
    if (!license_number || !license_expiry) {
      return res.status(400).json({ message: 'License number and expiry date are required' });
    }
    
    // Update driver license information
    const [driverResult] = await db.query(
      'SELECT id FROM driver_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (driverResult.length > 0) {
      await db.query(
        'UPDATE driver_profiles SET license_number = ?, license_expiry = ? WHERE user_id = ?',
        [license_number, license_expiry, userId]
      );
    } else {
      await db.query(
        'INSERT INTO driver_profiles (user_id, license_number, license_expiry, created_at) VALUES (?, ?, ?, NOW())',
        [userId, license_number, license_expiry]
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'License information updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating license information:', error);
    res.status(500).json({ 
      message: 'Failed to update license information',
      error: error.message 
    });
  }
};

/**
 * Get driver's upcoming bookings
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
      WHERE b.provider_id = ? AND b.status IN ('confirmed', 'in_progress') 
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
 * Get driver's booking history
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
      WHERE b.provider_id = ? AND b.status IN ('completed', 'cancelled') 
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM bookings WHERE provider_id = ? AND status IN ("completed", "cancelled")',
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
 * Get driver's earnings
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
      dateCondition = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateCondition = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateCondition = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }
    
    // Get total earnings
    const [totalResult] = await db.query(
      `SELECT SUM(amount) as total_earnings 
      FROM provider_payments 
      WHERE provider_id = ? AND status = "completed" ${dateCondition}`,
      [userId, ...dateParams]
    );
    
    // Get daily earnings for chart
    const [dailyResult] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(amount) as daily_earnings
      FROM provider_payments 
      WHERE provider_id = ? AND status = "completed" ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [userId, ...dateParams]
    );
    
    // Get earnings by service type
    const [serviceTypeResult] = await db.query(
      `SELECT 
        b.service_type,
        SUM(p.amount) as earnings
      FROM provider_payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.provider_id = ? AND p.status = "completed" ${dateCondition}
      GROUP BY b.service_type`,
      [userId, ...dateParams]
    );
    
    // Format service type earnings
    const serviceTypeEarnings = {
      driver: 0,
      caretaker: 0,
      shuttle: 0
    };
    
    serviceTypeResult.forEach(item => {
      if (item.service_type in serviceTypeEarnings) {
        serviceTypeEarnings[item.service_type] = parseFloat(item.earnings);
      }
    });
    
    // Get recent payments
    const [recentPaymentsResult] = await db.query(
      `SELECT p.*, b.service_type, b.booking_reference
      FROM provider_payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.provider_id = ? AND p.status = "completed"
      ORDER BY p.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    res.status(200).json({
      total_earnings: parseFloat(totalResult[0].total_earnings || 0).toFixed(2),
      daily_earnings: dailyResult,
      service_type_earnings: serviceTypeEarnings,
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
