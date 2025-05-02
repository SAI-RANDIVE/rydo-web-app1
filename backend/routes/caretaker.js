const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Middleware to check if user is authenticated and is a caretaker
const isCaretaker = async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.session.user.role !== 'caretaker') {
    return res.status(403).json({ message: 'Access denied. Only caretakers can access this resource.' });
  }
  
  next();
};

// Get caretaker appointments
router.get('/appointments', isCaretaker, async (req, res) => {
  try {
    const caretakerId = req.session.user.id;
    
    // Get appointments for the caretaker
    const [appointments] = await db.query(
      `SELECT a.id, a.appointment_time, a.status, a.service_type, 
       a.notes, a.location, a.duration, a.created_at,
       u.first_name, u.last_name, u.phone, 
       CONCAT(u.first_name, ' ', u.last_name) as patient_name
       FROM appointments a
       JOIN users u ON a.user_id = u.id
       WHERE a.caretaker_id = ? AND a.appointment_time >= NOW()
       ORDER BY a.appointment_time ASC`,
      [caretakerId]
    );
    
    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get caretaker transactions
router.get('/transactions', isCaretaker, async (req, res) => {
  try {
    const caretakerId = req.session.user.id;
    
    // Get transactions for the caretaker
    const [transactions] = await db.query(
      `SELECT t.id, t.amount, t.transaction_date, t.status, t.payment_method,
       a.service_type, a.appointment_time,
       CONCAT(u.first_name, ' ', u.last_name) as patient_name
       FROM transactions t
       JOIN appointments a ON t.appointment_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE a.caretaker_id = ?
       ORDER BY t.transaction_date DESC`,
      [caretakerId]
    );
    
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get caretaker earnings data
router.get('/earnings', isCaretaker, async (req, res) => {
  try {
    const caretakerId = req.session.user.id;
    const { period } = req.query; // week, month, year
    
    let query;
    let params = [caretakerId];
    
    switch (period) {
      case 'week':
        query = `
          SELECT 
            DAYNAME(t.transaction_date) as label,
            SUM(t.amount) as value
          FROM transactions t
          JOIN appointments a ON t.appointment_id = a.id
          WHERE a.caretaker_id = ? 
          AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY DAYNAME(t.transaction_date)
          ORDER BY DAYOFWEEK(t.transaction_date)
        `;
        break;
      case 'month':
        query = `
          SELECT 
            CONCAT('Week ', FLOOR((DAY(t.transaction_date)-1)/7)+1) as label,
            SUM(t.amount) as value
          FROM transactions t
          JOIN appointments a ON t.appointment_id = a.id
          WHERE a.caretaker_id = ? 
          AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
          GROUP BY FLOOR((DAY(t.transaction_date)-1)/7)
          ORDER BY FLOOR((DAY(t.transaction_date)-1)/7)
        `;
        break;
      case 'year':
      default:
        query = `
          SELECT 
            MONTHNAME(t.transaction_date) as label,
            SUM(t.amount) as value
          FROM transactions t
          JOIN appointments a ON t.appointment_id = a.id
          WHERE a.caretaker_id = ? 
          AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
          GROUP BY MONTHNAME(t.transaction_date)
          ORDER BY MONTH(t.transaction_date)
        `;
    }
    
    const [earnings] = await db.query(query, params);
    
    res.status(200).json({ earnings });
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get caretaker statistics
router.get('/stats', isCaretaker, async (req, res) => {
  try {
    const caretakerId = req.session.user.id;
    
    // Get total appointments
    const [appointmentsResult] = await db.query(
      'SELECT COUNT(*) as total_appointments FROM appointments WHERE caretaker_id = ?',
      [caretakerId]
    );
    
    // Get active patients (unique patients in the last 30 days)
    const [patientsResult] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as active_patients 
       FROM appointments 
       WHERE caretaker_id = ? AND appointment_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [caretakerId]
    );
    
    // Get hours worked (sum of appointment durations)
    const [hoursResult] = await db.query(
      `SELECT SUM(duration) as total_minutes 
       FROM appointments 
       WHERE caretaker_id = ? AND status = 'completed'`,
      [caretakerId]
    );
    
    // Get total earnings
    const [earningsResult] = await db.query(
      `SELECT SUM(t.amount) as total_earnings
       FROM transactions t
       JOIN appointments a ON t.appointment_id = a.id
       WHERE a.caretaker_id = ? AND t.status = 'completed'`,
      [caretakerId]
    );
    
    const stats = {
      total_appointments: appointmentsResult[0].total_appointments || 0,
      active_patients: patientsResult[0].active_patients || 0,
      hours_worked: Math.round((hoursResult[0].total_minutes || 0) / 60), // Convert minutes to hours
      total_earnings: earningsResult[0].total_earnings || 0
    };
    
    res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching caretaker stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status
router.put('/appointments/:id/status', isCaretaker, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const caretakerId = req.session.user.id;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if appointment belongs to this caretaker
    const [appointment] = await db.query(
      'SELECT * FROM appointments WHERE id = ? AND caretaker_id = ?',
      [id, caretakerId]
    );
    
    if (appointment.length === 0) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }
    
    // Update appointment status
    await db.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.status(200).json({ message: 'Appointment status updated successfully' });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
