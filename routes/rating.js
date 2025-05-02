const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Submit a rating and review
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { booking_id, booking_type, rating, review } = req.body;
    const rated_by = req.session.user.id;
    
    // Validate booking exists and belongs to the user
    let bookingTable;
    let ratedToField;
    
    switch (booking_type) {
      case 'driver':
        bookingTable = 'driver_bookings';
        ratedToField = 'driver_id';
        break;
      case 'caretaker':
        bookingTable = 'caretaker_appointments';
        ratedToField = 'caretaker_id';
        break;
      case 'shuttle':
        bookingTable = 'shuttle_bookings';
        ratedToField = 'schedule_id';
        break;
      default:
        return res.status(400).json({ message: 'Invalid booking type' });
    }
    
    // Get booking details
    const [bookings] = await db.query(
      `SELECT id, user_id, ${ratedToField} FROM ${bookingTable} WHERE id = ?`,
      [booking_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Check if booking belongs to the user
    if (booking.user_id !== rated_by) {
      return res.status(403).json({ message: 'Unauthorized access to booking' });
    }
    
    // Get rated_to user ID
    let rated_to = booking[ratedToField];
    
    // For shuttle bookings, get the driver ID from the schedule
    if (booking_type === 'shuttle') {
      const [schedules] = await db.query(
        'SELECT driver_id FROM shuttle_schedules WHERE id = ?',
        [rated_to]
      );
      
      if (schedules.length === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
      }
      
      rated_to = schedules[0].driver_id;
    }
    
    // Check if rating already exists
    const [existingRatings] = await db.query(
      'SELECT id FROM ratings WHERE booking_id = ? AND booking_type = ?',
      [booking_id, booking_type]
    );
    
    if (existingRatings.length > 0) {
      // Update existing rating
      await db.query(
        'UPDATE ratings SET rating = ?, review = ? WHERE booking_id = ? AND booking_type = ?',
        [rating, review, booking_id, booking_type]
      );
    } else {
      // Create new rating
      await db.query(
        'INSERT INTO ratings (booking_id, booking_type, rated_by, rated_to, rating, review, rating_time) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [booking_id, booking_type, rated_by, rated_to, rating, review]
      );
    }
    
    // Update booking with rating and review
    await db.query(
      `UPDATE ${bookingTable} SET rating = ?, review = ? WHERE id = ?`,
      [rating, review, booking_id]
    );
    
    // Update user's average rating
    const [userRatings] = await db.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_to = ?',
      [rated_to]
    );
    
    if (userRatings.length > 0) {
      const avgRating = userRatings[0].avg_rating || 0;
      const totalRatings = userRatings[0].total_ratings || 0;
      
      await db.query(
        'UPDATE users SET average_rating = ?, total_ratings = ? WHERE id = ?',
        [avgRating, totalRatings, rated_to]
      );
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Get ratings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get ratings
    const [ratings] = await db.query(
      `SELECT r.*, 
       u.first_name, u.last_name, u.profile_image,
       CASE 
         WHEN r.booking_type = 'driver' THEN (SELECT CONCAT(pickup_location, ' to ', destination) FROM driver_bookings WHERE id = r.booking_id)
         WHEN r.booking_type = 'caretaker' THEN (SELECT service_type FROM caretaker_appointments WHERE id = r.booking_id)
         WHEN r.booking_type = 'shuttle' THEN (SELECT CONCAT(pickup_point, ' to ', dropoff_point) FROM shuttle_bookings WHERE id = r.booking_id)
         ELSE NULL
       END as booking_details
       FROM ratings r
       JOIN users u ON r.rated_by = u.id
       WHERE r.rated_to = ?
       ORDER BY r.rating_time DESC`,
      [userId]
    );
    
    res.status(200).json(ratings);
  } catch (error) {
    console.error('Error getting ratings:', error);
    res.status(500).json({ message: 'Failed to get ratings' });
  }
});

// Get average rating for a user
router.get('/average/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [result] = await db.query(
      'SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_to = ?',
      [userId]
    );
    
    const averageRating = result[0].average_rating || 0;
    const totalRatings = result[0].total_ratings || 0;
    
    res.status(200).json({ average_rating: averageRating, total_ratings: totalRatings });
  } catch (error) {
    console.error('Error getting average rating:', error);
    res.status(500).json({ message: 'Failed to get average rating' });
  }
});

module.exports = router;
