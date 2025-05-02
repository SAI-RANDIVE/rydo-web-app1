/**
 * Wallet Routes
 * Defines all routes related to wallet management
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { isAuthenticated, isCustomer } = require('../middleware/authMiddleware');

// Get wallet balance
router.get('/balance', isAuthenticated, walletController.getWalletBalance);

// Get transaction history
router.get('/transactions', isAuthenticated, walletController.getTransactions);

// Get wallet summary (balance, recent transactions, stats)
router.get('/summary', isAuthenticated, walletController.getWalletSummary);

// Add money to wallet
router.post('/add', isAuthenticated, walletController.addMoney);

// Request withdrawal
router.post('/withdraw', isAuthenticated, walletController.requestWithdrawal);

module.exports = router;
