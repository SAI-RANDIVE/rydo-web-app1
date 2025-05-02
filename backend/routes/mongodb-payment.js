/**
 * MongoDB Payment Routes
 * Handles payment processing and transactions
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Payment, Booking, User, Wallet } = require('../models/mongodb');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new payment order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingId, userId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `booking_${bookingId || Date.now()}`,
      notes: {
        bookingId: bookingId || '',
        userId: userId || ''
      }
    });
    
    // Create payment record
    const payment = new Payment({
      userId,
      bookingId,
      amount,
      currency,
      gatewayOrderId: order.id,
      status: 'created'
    });
    
    await payment.save();
    
    res.status(200).json({
      success: true,
      order,
      payment: {
        id: payment._id,
        amount,
        currency
      },
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payment order'
    });
  }
});

// Verify and capture payment
router.post('/verify', async (req, res) => {
  try {
    const { paymentId, orderId, signature, bookingId, userId, providerId, providerType, amount } = req.body;
    
    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
    
    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { gatewayOrderId: orderId },
      { 
        gatewayPaymentId: paymentId,
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update booking status if bookingId is provided
    if (bookingId) {
      await Booking.findByIdAndUpdate(
        bookingId,
        { paymentStatus: 'paid', paymentId: payment._id }
      );
    }
    
    // Calculate commission (7.5%)
    const commissionPercentage = parseFloat(process.env.RAZORPAY_COMMISSION_PERCENTAGE || 7.5);
    const commissionAmount = (amount * commissionPercentage) / 100;
    const providerAmount = amount - commissionAmount;
    
    // Update provider wallet if providerId is provided
    if (providerId && providerType) {
      // Find or create provider wallet
      let providerWallet = await Wallet.findOne({ userId: providerId });
      
      if (!providerWallet) {
        providerWallet = new Wallet({ userId: providerId });
      }
      
      // Add transaction to provider wallet
      providerWallet.transactions.push({
        type: 'credit',
        amount: providerAmount,
        description: `Payment for booking ${bookingId}`,
        bookingId,
        paymentId: payment._id,
        status: 'completed'
      });
      
      // Update balance
      providerWallet.balance += providerAmount;
      
      await providerWallet.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully',
      payment,
      commission: {
        percentage: commissionPercentage,
        amount: commissionAmount
      },
      providerAmount
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying payment'
    });
  }
});

// Get payment details
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment details'
    });
  }
});

// Get user payment history
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    let query = { userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate('bookingId');
    
    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user payments'
    });
  }
});

module.exports = router;
