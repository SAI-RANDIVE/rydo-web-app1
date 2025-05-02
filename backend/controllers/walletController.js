/**
 * Wallet Controller
 * Handles all wallet-related operations including balance checks, transactions, and wallet management
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Get wallet balance for the current user
 */
exports.getWalletBalance = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get wallet balance
    const [walletResult] = await db.query(
      'SELECT id, balance, currency, updated_at FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    // If wallet doesn't exist, create one
    if (walletResult.length === 0) {
      // Create new wallet with 0 balance
      const [newWallet] = await db.query(
        'INSERT INTO wallets (user_id, balance, currency, created_at) VALUES (?, 0, "INR", NOW())',
        [userId]
      );
      
      return res.status(200).json({
        wallet_id: newWallet.insertId,
        balance: 0,
        currency: 'INR',
        last_updated: new Date()
      });
    }
    
    // Return wallet data
    res.status(200).json({
      wallet_id: walletResult[0].id,
      balance: parseFloat(walletResult[0].balance),
      currency: walletResult[0].currency || 'INR',
      last_updated: walletResult[0].updated_at
    });
    
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ 
      message: 'Failed to get wallet balance',
      error: error.message
    });
  }
};

/**
 * Get transaction history for the current user
 */
exports.getTransactions = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const type = req.query.type || 'all';
    const dateFilter = req.query.date_filter || 'all';
    
    // Get wallet ID
    const [walletResult] = await db.query(
      'SELECT id FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (walletResult.length === 0) {
      return res.status(200).json({
        transactions: [],
        current_page: 1,
        total_pages: 0,
        total_transactions: 0
      });
    }
    
    const walletId = walletResult[0].id;
    
    // Build query based on filters
    let query = 'SELECT * FROM wallet_transactions WHERE wallet_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ?';
    let queryParams = [walletId];
    
    // Apply transaction type filter
    if (type !== 'all') {
      query += ' AND transaction_type = ?';
      countQuery += ' AND transaction_type = ?';
      queryParams.push(type);
    }
    
    // Apply date filter
    let dateCondition = '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    if (dateFilter === 'today') {
      dateCondition = ' AND DATE(created_at) = CURDATE()';
    } else if (dateFilter === 'week') {
      dateCondition = ' AND created_at >= ?';
      queryParams.push(startOfWeek);
    } else if (dateFilter === 'month') {
      dateCondition = ' AND created_at >= ?';
      queryParams.push(startOfMonth);
    } else if (dateFilter === 'year') {
      dateCondition = ' AND created_at >= ?';
      queryParams.push(startOfYear);
    }
    
    query += dateCondition;
    countQuery += dateCondition;
    
    // Add order and pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Execute queries
    const [transactions] = await db.query(query, queryParams);
    const [countResult] = await db.query(countQuery, queryParams.slice(0, -2));
    
    const totalTransactions = countResult[0].total;
    const totalPages = Math.ceil(totalTransactions / limit);
    
    res.status(200).json({
      transactions: transactions,
      current_page: page,
      total_pages: totalPages,
      total_transactions: totalTransactions
    });
    
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      message: 'Failed to get transaction history',
      error: error.message
    });
  }
};

/**
 * Add money to wallet
 */
exports.addMoney = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { amount, payment_method, transaction_id } = req.body;
    
    // Validate input
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Get wallet ID or create if not exists
    let walletId;
    const [walletResult] = await db.query(
      'SELECT id FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (walletResult.length === 0) {
      // Create new wallet
      const [newWallet] = await db.query(
        'INSERT INTO wallets (user_id, balance, currency, created_at) VALUES (?, 0, "INR", NOW())',
        [userId]
      );
      walletId = newWallet.insertId;
    } else {
      walletId = walletResult[0].id;
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create topup request
      const [topupRequest] = await db.query(
        `INSERT INTO wallet_topup_requests 
        (user_id, amount, payment_method, payment_gateway, payment_gateway_reference, status, created_at) 
        VALUES (?, ?, ?, ?, ?, 'completed', NOW())`,
        [userId, amount, payment_method, 'demo_gateway', transaction_id]
      );
      
      // Create wallet transaction
      const transactionReference = uuidv4().substring(0, 8).toUpperCase();
      const [transaction] = await db.query(
        `INSERT INTO wallet_transactions 
        (wallet_id, amount, transaction_type, transaction_reference_id, transaction_reference_type, 
        description, status, payment_method, payment_gateway, payment_gateway_reference, created_at) 
        VALUES (?, ?, 'credit', ?, 'topup', ?, 'completed', ?, 'demo_gateway', ?, NOW())`,
        [
          walletId, 
          amount, 
          transactionReference, 
          `Added money via ${payment_method}`, 
          payment_method, 
          transaction_id
        ]
      );
      
      // Update topup request with transaction ID
      await db.query(
        'UPDATE wallet_topup_requests SET transaction_id = ? WHERE id = ?',
        [transaction.insertId, topupRequest.insertId]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Get updated wallet balance
      const [updatedWallet] = await db.query(
        'SELECT balance FROM wallets WHERE id = ?',
        [walletId]
      );
      
      res.status(200).json({
        success: true,
        message: 'Money added successfully',
        transaction_id: transactionReference,
        new_balance: parseFloat(updatedWallet[0].balance)
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    res.status(500).json({ 
      message: 'Failed to add money to wallet',
      error: error.message
    });
  }
};

/**
 * Request withdrawal from wallet
 */
exports.requestWithdrawal = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const { amount, method, upi_id, account_name, account_number, ifsc_code, bank_name } = req.body;
    
    // Validate input
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Get wallet and check balance
    const [walletResult] = await db.query(
      'SELECT id, balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (walletResult.length === 0) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    const walletId = walletResult[0].id;
    const currentBalance = parseFloat(walletResult[0].balance);
    
    if (parseFloat(amount) > currentBalance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create withdrawal request
      let withdrawalData = [userId, amount, 'pending'];
      let withdrawalQuery = `INSERT INTO wallet_withdrawal_requests 
        (user_id, amount, status, created_at) 
        VALUES (?, ?, ?, NOW())`;
      
      if (method === 'upi') {
        withdrawalQuery = `INSERT INTO wallet_withdrawal_requests 
          (user_id, amount, upi_id, status, created_at) 
          VALUES (?, ?, ?, ?, NOW())`;
        withdrawalData = [userId, amount, upi_id, 'pending'];
      } else if (method === 'bank') {
        // Store bank details in admin_notes for simplicity
        // In a real app, you would have a separate table for bank accounts
        const bankDetails = JSON.stringify({
          account_name,
          account_number,
          ifsc_code,
          bank_name
        });
        
        withdrawalQuery = `INSERT INTO wallet_withdrawal_requests 
          (user_id, amount, admin_notes, status, created_at) 
          VALUES (?, ?, ?, ?, NOW())`;
        withdrawalData = [userId, amount, bankDetails, 'pending'];
      }
      
      const [withdrawalRequest] = await db.query(withdrawalQuery, withdrawalData);
      
      // Create wallet transaction (pending until admin approves)
      const transactionReference = uuidv4().substring(0, 8).toUpperCase();
      const [transaction] = await db.query(
        `INSERT INTO wallet_transactions 
        (wallet_id, amount, transaction_type, transaction_reference_id, transaction_reference_type, 
        description, status, created_at) 
        VALUES (?, ?, 'debit', ?, 'withdrawal', ?, 'pending', NOW())`,
        [
          walletId, 
          amount, 
          transactionReference, 
          `Withdrawal request via ${method}`
        ]
      );
      
      // Update withdrawal request with transaction ID
      await db.query(
        'UPDATE wallet_withdrawal_requests SET transaction_id = ? WHERE id = ?',
        [transaction.insertId, withdrawalRequest.insertId]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        withdrawal_id: withdrawalRequest.insertId,
        status: 'pending'
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    res.status(500).json({ 
      message: 'Failed to process withdrawal request',
      error: error.message
    });
  }
};

/**
 * Get wallet summary including recent transactions
 */
exports.getWalletSummary = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;
    
    // Get wallet data
    const [walletResult] = await db.query(
      'SELECT id, balance, currency, updated_at FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    // If wallet doesn't exist, create one
    let wallet;
    if (walletResult.length === 0) {
      // Create new wallet with 0 balance
      const [newWallet] = await db.query(
        'INSERT INTO wallets (user_id, balance, currency, created_at) VALUES (?, 0, "INR", NOW())',
        [userId]
      );
      
      wallet = {
        id: newWallet.insertId,
        balance: 0,
        currency: 'INR',
        updated_at: new Date()
      };
    } else {
      wallet = walletResult[0];
    }
    
    // Get recent transactions (last 3)
    const [recentTransactions] = await db.query(
      `SELECT * FROM wallet_transactions 
      WHERE wallet_id = ? 
      ORDER BY created_at DESC 
      LIMIT 3`,
      [wallet.id]
    );
    
    // Get pending withdrawals
    const [pendingWithdrawals] = await db.query(
      `SELECT * FROM wallet_withdrawal_requests 
      WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );
    
    // Get transaction counts
    const [transactionCounts] = await db.query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'credit' THEN 1 ELSE 0 END) as total_credits,
        SUM(CASE WHEN transaction_type = 'debit' THEN 1 ELSE 0 END) as total_debits
      FROM wallet_transactions 
      WHERE wallet_id = ?`,
      [wallet.id]
    );
    
    res.status(200).json({
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency || 'INR',
        last_updated: wallet.updated_at
      },
      recent_transactions: recentTransactions,
      pending_withdrawals: pendingWithdrawals,
      transaction_stats: {
        total_transactions: transactionCounts[0].total_transactions || 0,
        total_credits: transactionCounts[0].total_credits || 0,
        total_debits: transactionCounts[0].total_debits || 0
      }
    });
    
  } catch (error) {
    console.error('Error getting wallet summary:', error);
    res.status(500).json({ 
      message: 'Failed to get wallet summary',
      error: error.message
    });
  }
};

/**
 * Deduct money from wallet (for bookings)
 * This function is meant to be called from other controllers, not directly as an API endpoint
 */
exports.deductFromWallet = async (userId, amount, referenceId, referenceType, description) => {
  try {
    // Get wallet ID
    const [walletResult] = await db.query(
      'SELECT id, balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (walletResult.length === 0) {
      throw new Error('Wallet not found');
    }
    
    const walletId = walletResult[0].id;
    const currentBalance = parseFloat(walletResult[0].balance);
    
    if (parseFloat(amount) > currentBalance) {
      throw new Error('Insufficient balance');
    }
    
    // Create wallet transaction
    const [transaction] = await db.query(
      `INSERT INTO wallet_transactions 
      (wallet_id, amount, transaction_type, transaction_reference_id, transaction_reference_type, 
      description, status, created_at) 
      VALUES (?, ?, 'debit', ?, ?, ?, 'completed', NOW())`,
      [
        walletId, 
        amount, 
        referenceId, 
        referenceType, 
        description
      ]
    );
    
    return {
      success: true,
      transaction_id: transaction.insertId,
      new_balance: currentBalance - parseFloat(amount)
    };
    
  } catch (error) {
    console.error('Error deducting from wallet:', error);
    throw error;
  }
};

/**
 * Add money to wallet (for refunds, bonuses)
 * This function is meant to be called from other controllers, not directly as an API endpoint
 */
exports.addToWallet = async (userId, amount, referenceId, referenceType, description) => {
  try {
    // Get wallet ID or create if not exists
    let walletId;
    const [walletResult] = await db.query(
      'SELECT id, balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    if (walletResult.length === 0) {
      // Create new wallet
      const [newWallet] = await db.query(
        'INSERT INTO wallets (user_id, balance, currency, created_at) VALUES (?, 0, "INR", NOW())',
        [userId]
      );
      walletId = newWallet.insertId;
      currentBalance = 0;
    } else {
      walletId = walletResult[0].id;
      currentBalance = parseFloat(walletResult[0].balance);
    }
    
    // Create wallet transaction
    const [transaction] = await db.query(
      `INSERT INTO wallet_transactions 
      (wallet_id, amount, transaction_type, transaction_reference_id, transaction_reference_type, 
      description, status, created_at) 
      VALUES (?, ?, 'credit', ?, ?, ?, 'completed', NOW())`,
      [
        walletId, 
        amount, 
        referenceId, 
        referenceType, 
        description
      ]
    );
    
    return {
      success: true,
      transaction_id: transaction.insertId,
      new_balance: currentBalance + parseFloat(amount)
    };
    
  } catch (error) {
    console.error('Error adding to wallet:', error);
    throw error;
  }
};
