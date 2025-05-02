/**
 * Payment Routes
 * Handles payment processing and wallet management
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-service');
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Create a payment order
 * POST /payment/create-order
 */
router.post('/create-order', isAuthenticated, async (req, res) => {
  try {
    const { booking_id, booking_type, amount } = req.body;
    
    if (!booking_id || !booking_type || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate booking exists and belongs to the user
    let bookingTable;
    switch (booking_type) {
      case 'driver':
        bookingTable = 'driver_bookings';
        break;
      case 'caretaker':
        bookingTable = 'caretaker_appointments';
        break;
      case 'shuttle':
        bookingTable = 'shuttle_bookings';
        break;
      default:
        return res.status(400).json({ message: 'Invalid booking type' });
    }
    
    const [bookings] = await db.query(
      `SELECT id, user_id, fare FROM ${bookingTable} WHERE id = ?`,
      [booking_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Check if booking belongs to the user
    if (booking.user_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to booking' });
    }
    
    // Validate amount matches booking fare
    if (parseFloat(booking.fare) !== parseFloat(amount)) {
      return res.status(400).json({ 
        message: 'Amount does not match booking fare',
        expected: booking.fare,
        received: amount
      });
    }
    
    // Create Razorpay order
    const order = await paymentService.createPaymentOrder({
      booking_id,
      booking_type,
      amount: parseFloat(amount),
      notes: {
        user_id: req.session.user.id,
        user_email: req.session.user.email
      }
    });
    
    res.status(200).json({
      order_id: order.id,
      amount: order.amount / 100, // Convert from paise to rupees
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_PScFROiY2zKvdv'
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

/**
 * Verify and process payment
 * POST /payment/verify
 */
router.post('/verify', isAuthenticated, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }
    
    // Process payment
    const result = await paymentService.processPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    
    res.status(200).json({
      success: true,
      payment_id: result.payment_id,
      order_id: result.order_id,
      amount: result.amount
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

/**
 * Get wallet balance
 * GET /payment/wallet/balance
 */
router.get('/wallet/balance', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get wallet balance
    const balance = await paymentService.getWalletBalance(userId);
    
    res.status(200).json({ balance });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ message: 'Failed to get wallet balance' });
  }
});

/**
 * Add money to wallet
 * POST /payment/wallet/add
 */
router.post('/wallet/add', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { amount, payment_method, reference_id } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    if (!payment_method) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    
    // Add money to wallet
    const result = await paymentService.addMoneyToWallet(
      userId,
      parseFloat(amount),
      payment_method,
      reference_id
    );
    
    res.status(200).json({
      success: true,
      transaction_id: result.transaction_id,
      amount: result.amount,
      new_balance: result.new_balance
    });
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    res.status(500).json({ message: 'Failed to add money to wallet' });
  }
});

/**
 * Pay from wallet
 * POST /payment/wallet/pay
 */
router.post('/wallet/pay', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { booking_id, booking_type, amount } = req.body;
    
    if (!booking_id || !booking_type || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate booking exists and belongs to the user
    let bookingTable;
    switch (booking_type) {
      case 'driver':
        bookingTable = 'driver_bookings';
        break;
      case 'caretaker':
        bookingTable = 'caretaker_appointments';
        break;
      case 'shuttle':
        bookingTable = 'shuttle_bookings';
        break;
      default:
        return res.status(400).json({ message: 'Invalid booking type' });
    }
    
    const [bookings] = await db.query(
      `SELECT id, user_id, fare FROM ${bookingTable} WHERE id = ?`,
      [booking_id]
    );
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Check if booking belongs to the user
    if (booking.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to booking' });
    }
    
    // Validate amount matches booking fare
    if (parseFloat(booking.fare) !== parseFloat(amount)) {
      return res.status(400).json({ 
        message: 'Amount does not match booking fare',
        expected: booking.fare,
        received: amount
      });
    }
    
    // Pay from wallet
    const result = await paymentService.payFromWallet(userId, {
      booking_id,
      booking_type,
      amount: parseFloat(amount)
    });
    
    res.status(200).json({
      success: true,
      transaction_id: result.transaction_id,
      amount: result.amount,
      new_balance: result.new_balance
    });
  } catch (error) {
    console.error('Error paying from wallet:', error);
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }
    
    res.status(500).json({ message: 'Failed to process wallet payment' });
  }
});

/**
 * Get payment history
 * GET /payment/history
 */
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get payment history
    const result = await paymentService.getPaymentHistory(userId, limit, offset);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ message: 'Failed to get payment history' });
  }
});

/**
 * Generate receipt
 * GET /payment/receipt/:transactionId
 */
router.get('/receipt/:transactionId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const transactionId = req.params.transactionId;
    
    // Check if transaction belongs to the user
    const [transactions] = await db.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Generate receipt
    const receiptData = await paymentService.generateReceipt(transactionId);
    
    res.status(200).json(receiptData);
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ message: 'Failed to generate receipt' });
  }
});

module.exports = router;
