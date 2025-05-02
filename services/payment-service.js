/**
 * Payment Service
 * Handles payment processing with Razorpay integration and wallet management
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_PScFROiY2zKvdv',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '5ZuCT4wWtv1b6gPW9b160Lvy'
});

// Company commission percentage (7.5% as per requirements)
const COMMISSION_PERCENTAGE = 7.5;

/**
 * Create a Razorpay order for a booking
 */
const createPaymentOrder = async (bookingData) => {
  try {
    const { 
      booking_id, 
      booking_type, 
      amount, 
      currency = 'INR',
      receipt = `rcpt_${booking_id}`,
      notes = {}
    } = bookingData;
    
    // Add booking details to notes
    notes.booking_id = booking_id;
    notes.booking_type = booking_type;
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt,
      notes,
      payment_capture: 1 // Auto-capture payment
    });
    
    // Store order details in database
    await db.query(
      `INSERT INTO payment_orders 
       (order_id, booking_id, booking_type, amount, currency, receipt, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [order.id, booking_id, booking_type, amount, currency, receipt, order.status]
    );
    
    return order;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = (paymentData) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = paymentData;
    
    // Create signature verification string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Create HMAC SHA256 hash
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '5ZuCT4wWtv1b6gPW9b160Lvy')
      .update(signatureString)
      .digest('hex');
    
    // Verify signature
    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Process successful payment
 */
const processPayment = async (paymentData) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = paymentData;
    
    // Verify payment signature
    const isValid = verifyPaymentSignature(paymentData);
    
    if (!isValid) {
      throw new Error('Invalid payment signature');
    }
    
    // Get order details from database
    const [orders] = await db.query(
      'SELECT * FROM payment_orders WHERE order_id = ?',
      [razorpay_order_id]
    );
    
    if (orders.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orders[0];
    
    // Start a transaction
    await db.query('START TRANSACTION');
    
    try {
      // Update payment order status
      await db.query(
        'UPDATE payment_orders SET status = ?, payment_id = ?, updated_at = NOW() WHERE order_id = ?',
        ['paid', razorpay_payment_id, razorpay_order_id]
      );
      
      // Update booking payment status
      let bookingTable;
      switch (order.booking_type) {
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
          throw new Error('Invalid booking type');
      }
      
      await db.query(
        `UPDATE ${bookingTable} SET payment_status = ? WHERE id = ?`,
        ['paid', order.booking_id]
      );
      
      // Create transaction record
      const [bookingResult] = await db.query(
        `SELECT user_id FROM ${bookingTable} WHERE id = ?`,
        [order.booking_id]
      );
      
      if (bookingResult.length === 0) {
        throw new Error('Booking not found');
      }
      
      const userId = bookingResult[0].user_id;
      
      await db.query(
        `INSERT INTO transactions 
         (user_id, booking_id, booking_type, amount, transaction_type, payment_method, 
          status, reference_id, transaction_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, 
          order.booking_id, 
          order.booking_type, 
          order.amount, 
          'debit', 
          'card', 
          'completed', 
          razorpay_payment_id
        ]
      );
      
      // Calculate and record company commission
      const commissionAmount = (order.amount * COMMISSION_PERCENTAGE) / 100;
      
      await db.query(
        `INSERT INTO commissions 
         (booking_id, booking_type, amount, percentage, payment_id, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          order.booking_id, 
          order.booking_type, 
          commissionAmount, 
          COMMISSION_PERCENTAGE, 
          razorpay_payment_id
        ]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      return {
        success: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: order.amount
      };
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    throw new Error('Failed to process payment');
  }
};

/**
 * Get wallet balance for a user
 */
const getWalletBalance = async (userId) => {
  try {
    // Check if wallet exists
    const [wallets] = await db.query(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (wallets.length === 0) {
      // Create wallet if it doesn't exist
      await db.query(
        'INSERT INTO wallets (user_id, balance) VALUES (?, 0)',
        [userId]
      );
      
      return 0;
    }
    
    return wallets[0].balance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error('Failed to get wallet balance');
  }
};

/**
 * Add money to wallet
 */
const addMoneyToWallet = async (userId, amount, paymentMethod, referenceId) => {
  try {
    // Start a transaction
    await db.query('START TRANSACTION');
    
    try {
      // Check if wallet exists
      const [wallets] = await db.query(
        'SELECT id FROM wallets WHERE user_id = ?',
        [userId]
      );
      
      if (wallets.length === 0) {
        // Create wallet if it doesn't exist
        await db.query(
          'INSERT INTO wallets (user_id, balance) VALUES (?, ?)',
          [userId, amount]
        );
      } else {
        // Update existing wallet
        await db.query(
          'UPDATE wallets SET balance = balance + ?, last_updated = NOW() WHERE user_id = ?',
          [amount, userId]
        );
      }
      
      // Create transaction record
      const [result] = await db.query(
        `INSERT INTO transactions 
         (user_id, amount, transaction_type, payment_method, status, reference_id, transaction_time)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userId, amount, 'credit', paymentMethod, 'completed', referenceId || uuidv4()]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      return {
        success: true,
        transaction_id: result.insertId,
        amount,
        new_balance: await getWalletBalance(userId)
      };
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    throw new Error('Failed to add money to wallet');
  }
};

/**
 * Pay from wallet
 */
const payFromWallet = async (userId, bookingData) => {
  try {
    const { booking_id, booking_type, amount } = bookingData;
    
    // Start a transaction
    await db.query('START TRANSACTION');
    
    try {
      // Check wallet balance
      const balance = await getWalletBalance(userId);
      
      if (balance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct from wallet
      await db.query(
        'UPDATE wallets SET balance = balance - ?, last_updated = NOW() WHERE user_id = ?',
        [amount, userId]
      );
      
      // Create transaction record
      const [result] = await db.query(
        `INSERT INTO transactions 
         (user_id, booking_id, booking_type, amount, transaction_type, payment_method, 
          status, reference_id, transaction_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, 
          booking_id, 
          booking_type, 
          amount, 
          'debit', 
          'wallet', 
          'completed', 
          `wallet_${uuidv4()}`
        ]
      );
      
      // Update booking payment status
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
          throw new Error('Invalid booking type');
      }
      
      await db.query(
        `UPDATE ${bookingTable} SET payment_status = ? WHERE id = ?`,
        ['paid', booking_id]
      );
      
      // Calculate and record company commission
      const commissionAmount = (amount * COMMISSION_PERCENTAGE) / 100;
      
      await db.query(
        `INSERT INTO commissions 
         (booking_id, booking_type, amount, percentage, payment_id, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          booking_id, 
          booking_type, 
          commissionAmount, 
          COMMISSION_PERCENTAGE, 
          `wallet_${result.insertId}`
        ]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      return {
        success: true,
        transaction_id: result.insertId,
        amount,
        new_balance: await getWalletBalance(userId)
      };
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error paying from wallet:', error);
    throw new Error('Failed to process wallet payment');
  }
};

/**
 * Get payment history for a user
 */
const getPaymentHistory = async (userId, limit = 10, offset = 0) => {
  try {
    // Get transactions
    const [transactions] = await db.query(
      `SELECT t.*, 
       CASE 
         WHEN t.booking_type = 'driver' THEN (SELECT CONCAT(pickup_location, ' to ', destination) FROM driver_bookings WHERE id = t.booking_id)
         WHEN t.booking_type = 'caretaker' THEN (SELECT service_type FROM caretaker_appointments WHERE id = t.booking_id)
         WHEN t.booking_type = 'shuttle' THEN (SELECT CONCAT(pickup_point, ' to ', dropoff_point) FROM shuttle_bookings WHERE id = t.booking_id)
         ELSE NULL
       END as booking_details
       FROM transactions t
       WHERE t.user_id = ?
       ORDER BY t.transaction_time DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );
    
    return {
      transactions,
      pagination: {
        total: countResult[0].total,
        limit,
        offset,
        has_more: offset + transactions.length < countResult[0].total
      }
    };
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw new Error('Failed to get payment history');
  }
};

/**
 * Generate receipt for a transaction
 */
const generateReceipt = async (transactionId) => {
  try {
    // Get transaction details
    const [transactions] = await db.query(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone,
       CASE 
         WHEN t.booking_type = 'driver' THEN (SELECT CONCAT(pickup_location, ' to ', destination) FROM driver_bookings WHERE id = t.booking_id)
         WHEN t.booking_type = 'caretaker' THEN (SELECT service_type FROM caretaker_appointments WHERE id = t.booking_id)
         WHEN t.booking_type = 'shuttle' THEN (SELECT CONCAT(pickup_point, ' to ', dropoff_point) FROM shuttle_bookings WHERE id = t.booking_id)
         ELSE NULL
       END as booking_details
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [transactionId]
    );
    
    if (transactions.length === 0) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactions[0];
    
    // Format receipt data
    const receiptData = {
      receipt_number: `RYDO-${transaction.id.toString().padStart(6, '0')}`,
      transaction_id: transaction.id,
      reference_id: transaction.reference_id,
      customer_name: `${transaction.first_name} ${transaction.last_name}`,
      customer_email: transaction.email,
      customer_phone: transaction.phone,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      payment_method: transaction.payment_method,
      status: transaction.status,
      transaction_time: transaction.transaction_time,
      booking_type: transaction.booking_type,
      booking_id: transaction.booking_id,
      booking_details: transaction.booking_details,
      company_name: 'RYDO Services',
      company_address: 'RYDO Headquarters, 123 Main Street, Bangalore, Karnataka, India',
      company_email: 'support@rydo.com',
      company_phone: '+91 9876543210',
      company_gst: 'GSTIN12345678901'
    };
    
    return receiptData;
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw new Error('Failed to generate receipt');
  }
};

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  processPayment,
  getWalletBalance,
  addMoneyToWallet,
  payFromWallet,
  getPaymentHistory,
  generateReceipt
};
