-- Wallet Management Schema
-- This script creates and updates the necessary tables for the wallet management system

-- Create or update wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'INR',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_wallet (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type ENUM('credit', 'debit') NOT NULL,
  transaction_reference_id VARCHAR(100) NULL,
  transaction_reference_type ENUM('booking', 'topup', 'refund', 'bonus', 'other') NOT NULL,
  description TEXT NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
  payment_method ENUM('cash', 'card', 'upi', 'netbanking', 'wallet', 'other') NULL,
  payment_gateway VARCHAR(50) NULL,
  payment_gateway_reference VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create wallet_topup_requests table
CREATE TABLE IF NOT EXISTS wallet_topup_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('card', 'upi', 'netbanking', 'other') NOT NULL,
  payment_gateway VARCHAR(50) NOT NULL,
  payment_gateway_reference VARCHAR(100) NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  transaction_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create wallet_withdrawal_requests table
CREATE TABLE IF NOT EXISTS wallet_withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  bank_account_id INT NULL,
  upi_id VARCHAR(100) NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  transaction_id INT NULL,
  admin_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create trigger to update wallet balance after transaction
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_wallet_transaction_insert
AFTER INSERT ON wallet_transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        IF NEW.transaction_type = 'credit' THEN
            UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
        ELSEIF NEW.transaction_type = 'debit' THEN
            UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
        END IF;
    END IF;
END //
DELIMITER ;

-- Create trigger to update wallet balance after transaction status update
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_wallet_transaction_update
AFTER UPDATE ON wallet_transactions
FOR EACH ROW
BEGIN
    -- If status changed to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        IF NEW.transaction_type = 'credit' THEN
            UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
        ELSEIF NEW.transaction_type = 'debit' THEN
            UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
        END IF;
    -- If status changed from completed to something else
    ELSEIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        IF OLD.transaction_type = 'credit' THEN
            UPDATE wallets SET balance = balance - OLD.amount WHERE id = NEW.wallet_id;
        ELSEIF OLD.transaction_type = 'debit' THEN
            UPDATE wallets SET balance = balance + OLD.amount WHERE id = NEW.wallet_id;
        END IF;
    END IF;
END //
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_transaction_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_topup_requests_user_id ON wallet_topup_requests(user_id);
CREATE INDEX idx_wallet_topup_requests_status ON wallet_topup_requests(status);
CREATE INDEX idx_wallet_withdrawal_requests_user_id ON wallet_withdrawal_requests(user_id);
CREATE INDEX idx_wallet_withdrawal_requests_status ON wallet_withdrawal_requests(status);
