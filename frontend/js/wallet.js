/**
 * RYDO Wallet Management JavaScript
 * Handles wallet operations, transaction history, and payment processing
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize wallet page
    initWalletPage();
    
    // Event listeners for wallet actions
    setupEventListeners();
});

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentTransactionType = 'all';
let currentDateFilter = 'all';
let walletBalance = 0;

/**
 * Initialize wallet page with user data and transaction history
 */
async function initWalletPage() {
    try {
        // Fetch user profile data
        const profileData = await fetchUserProfile();
        updateUserInfo(profileData);
        
        // Fetch wallet balance
        const walletData = await fetchWalletBalance();
        updateWalletBalance(walletData);
        
        // Fetch transaction history
        await fetchTransactions(1, currentTransactionType, currentDateFilter);
        
    } catch (error) {
        console.error('Error initializing wallet page:', error);
        showErrorNotification('Failed to load wallet data. Please refresh the page.');
    }
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    // Quick add money options
    const amountOptions = document.querySelectorAll('.amount-option');
    amountOptions.forEach(option => {
        option.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            selectAmountOption(this, amount);
        });
    });
    
    // Add money button
    const addMoneyBtn = document.getElementById('add-money-btn');
    if (addMoneyBtn) {
        addMoneyBtn.addEventListener('click', function() {
            openAddMoneyModal();
        });
    }
    
    // Withdraw money button
    const withdrawBtn = document.getElementById('withdraw-money-btn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            openWithdrawModal();
        });
    }
    
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });
    
    // Payment method selection
    const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            togglePaymentFields(this.value);
        });
    });
    
    // Withdraw method selection
    const withdrawMethods = document.querySelectorAll('input[name="withdraw_method"]');
    withdrawMethods.forEach(method => {
        method.addEventListener('change', function() {
            toggleWithdrawFields(this.value);
        });
    });
    
    // Add money form submission
    const addMoneyForm = document.getElementById('add-money-form');
    if (addMoneyForm) {
        addMoneyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processAddMoneyRequest();
        });
    }
    
    // Withdraw form submission
    const withdrawForm = document.getElementById('withdraw-form');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processWithdrawRequest();
        });
    }
    
    // Transaction filters
    const typeFilter = document.getElementById('transaction-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            currentTransactionType = this.value;
            fetchTransactions(1, currentTransactionType, currentDateFilter);
        });
    }
    
    const dateFilter = document.getElementById('transaction-date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            currentDateFilter = this.value;
            fetchTransactions(1, currentTransactionType, currentDateFilter);
        });
    }
    
    // Pagination buttons
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                fetchTransactions(currentPage - 1, currentTransactionType, currentDateFilter);
            }
        });
    }
    
    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                fetchTransactions(currentPage + 1, currentTransactionType, currentDateFilter);
            }
        });
    }
    
    // Close success modal
    const closeSuccessBtn = document.getElementById('close-success-modal');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function() {
            document.getElementById('payment-success-modal').style.display = 'none';
            // Refresh wallet data after successful payment
            fetchWalletBalance().then(data => updateWalletBalance(data));
            fetchTransactions(1, currentTransactionType, currentDateFilter);
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Fetch user profile data from the server
 */
async function fetchUserProfile() {
    try {
        const response = await fetch('/api/customer/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

/**
 * Fetch wallet balance from the server
 */
async function fetchWalletBalance() {
    try {
        const response = await fetch('/api/wallet/balance', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch wallet balance');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        throw error;
    }
}

/**
 * Fetch transaction history from the server
 */
async function fetchTransactions(page, type = 'all', dateFilter = 'all') {
    try {
        // Show loading state
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading transactions...</p>
            </div>
        `;
        
        // Prepare query parameters
        const queryParams = new URLSearchParams({
            page: page,
            type: type,
            date_filter: dateFilter
        });
        
        const response = await fetch(`/api/wallet/transactions?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        
        // Update pagination info
        currentPage = data.current_page || 1;
        totalPages = data.total_pages || 1;
        
        // Update pagination controls
        updatePaginationControls();
        
        // Render transactions
        renderTransactions(data.transactions);
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load transactions</h3>
                <p>There was a problem loading your transaction history. Please try again later.</p>
            </div>
        `;
    }
}

/**
 * Update user information in the header
 */
function updateUserInfo(userData) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const currentLocation = document.getElementById('current-location');
    
    if (userAvatar && userData.profile_image) {
        userAvatar.src = userData.profile_image;
    }
    
    if (userName) {
        userName.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User';
    }
    
    if (currentLocation && userData.location) {
        currentLocation.textContent = userData.location;
    }
}

/**
 * Update wallet balance display
 */
function updateWalletBalance(data) {
    const walletBalanceElement = document.getElementById('wallet-balance');
    const lastUpdatedElement = document.getElementById('last-updated');
    
    if (walletBalanceElement) {
        walletBalance = parseFloat(data.balance || 0);
        walletBalanceElement.textContent = `₹${walletBalance.toFixed(2)}`;
    }
    
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleTimeString();
    }
}

/**
 * Render transaction history
 */
function renderTransactions(transactions) {
    const transactionsList = document.getElementById('transactions-list');
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No transactions yet</h3>
                <p>Your transaction history will appear here once you start using your wallet.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let iconClass = 'fas fa-exchange-alt';
        let transactionTitle = 'Transaction';
        let amountPrefix = '';
        
        if (transaction.transaction_type === 'credit') {
            iconClass = 'fas fa-arrow-down';
            transactionTitle = getTransactionTitle(transaction);
            amountPrefix = '+';
        } else if (transaction.transaction_type === 'debit') {
            iconClass = 'fas fa-arrow-up';
            transactionTitle = getTransactionTitle(transaction);
            amountPrefix = '-';
        }
        
        html += `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.transaction_type}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transactionTitle}</h4>
                        <p>${formattedDate} • ${transaction.description || 'No description'}</p>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.transaction_type}">
                    ${amountPrefix}₹${parseFloat(transaction.amount).toFixed(2)}
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
}

/**
 * Get a descriptive title for a transaction based on its type
 */
function getTransactionTitle(transaction) {
    if (transaction.transaction_reference_type === 'topup') {
        return 'Money Added';
    } else if (transaction.transaction_reference_type === 'booking') {
        return 'Booking Payment';
    } else if (transaction.transaction_reference_type === 'refund') {
        return 'Refund Received';
    } else if (transaction.transaction_reference_type === 'bonus') {
        return 'Bonus Credit';
    } else {
        return transaction.transaction_type === 'credit' ? 'Money Received' : 'Money Spent';
    }
}

/**
 * Update pagination controls
 */
function updatePaginationControls() {
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const paginationInfo = document.getElementById('pagination-info');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages;
    }
    
    if (paginationInfo) {
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

/**
 * Select an amount option for quick add
 */
function selectAmountOption(element, amount) {
    // Remove active class from all options
    document.querySelectorAll('.amount-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // Add active class to selected option
    element.classList.add('active');
    
    if (amount === 'custom') {
        openAddMoneyModal();
    } else {
        // Pre-fill amount in add money modal
        document.getElementById('amount').value = amount;
        openAddMoneyModal();
    }
}

/**
 * Open add money modal
 */
function openAddMoneyModal() {
    closeAllModals();
    document.getElementById('add-money-modal').style.display = 'block';
}

/**
 * Open withdraw modal
 */
function openWithdrawModal() {
    closeAllModals();
    document.getElementById('withdraw-modal').style.display = 'block';
}

/**
 * Close all modals
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

/**
 * Toggle payment fields based on selected payment method
 */
function togglePaymentFields(paymentMethod) {
    const upiFields = document.getElementById('upi-fields');
    const cardFields = document.getElementById('card-fields');
    const netbankingFields = document.getElementById('netbanking-fields');
    
    // Hide all fields first
    upiFields.style.display = 'none';
    cardFields.style.display = 'none';
    netbankingFields.style.display = 'none';
    
    // Show selected fields
    if (paymentMethod === 'upi') {
        upiFields.style.display = 'block';
    } else if (paymentMethod === 'card') {
        cardFields.style.display = 'block';
    } else if (paymentMethod === 'netbanking') {
        netbankingFields.style.display = 'block';
    }
}

/**
 * Toggle withdraw fields based on selected withdraw method
 */
function toggleWithdrawFields(withdrawMethod) {
    const upiFields = document.getElementById('withdraw-upi-fields');
    const bankFields = document.getElementById('withdraw-bank-fields');
    
    // Hide all fields first
    upiFields.style.display = 'none';
    bankFields.style.display = 'none';
    
    // Show selected fields
    if (withdrawMethod === 'upi') {
        upiFields.style.display = 'block';
    } else if (withdrawMethod === 'bank') {
        bankFields.style.display = 'block';
    }
}

/**
 * Process add money request
 */
async function processAddMoneyRequest() {
    const amount = document.getElementById('amount').value;
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showErrorNotification('Please enter a valid amount');
        return;
    }
    
    // Close add money modal
    document.getElementById('add-money-modal').style.display = 'none';
    
    // Show payment processing modal
    document.getElementById('payment-processing-modal').style.display = 'block';
    
    try {
        // Simulate payment processing (replace with actual API call)
        await simulatePaymentProcessing();
        
        // Show success modal
        showPaymentSuccessModal(amount, paymentMethod);
        
    } catch (error) {
        console.error('Payment processing error:', error);
        document.getElementById('payment-processing-modal').style.display = 'none';
        showErrorNotification('Payment failed. Please try again.');
    }
}

/**
 * Process withdraw request
 */
async function processWithdrawRequest() {
    const amount = document.getElementById('withdraw-amount').value;
    const withdrawMethod = document.querySelector('input[name="withdraw_method"]:checked').value;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showErrorNotification('Please enter a valid amount');
        return;
    }
    
    if (parseFloat(amount) > walletBalance) {
        showErrorNotification('Insufficient balance for withdrawal');
        return;
    }
    
    // Get additional fields based on withdraw method
    let withdrawData = {
        amount: parseFloat(amount),
        method: withdrawMethod
    };
    
    if (withdrawMethod === 'upi') {
        withdrawData.upi_id = document.getElementById('withdraw-upi-id').value;
        
        if (!withdrawData.upi_id) {
            showErrorNotification('Please enter your UPI ID');
            return;
        }
    } else if (withdrawMethod === 'bank') {
        withdrawData.account_name = document.getElementById('account-name').value;
        withdrawData.account_number = document.getElementById('account-number').value;
        withdrawData.ifsc_code = document.getElementById('ifsc-code').value;
        withdrawData.bank_name = document.getElementById('bank-name').value;
        
        if (!withdrawData.account_name || !withdrawData.account_number || !withdrawData.ifsc_code || !withdrawData.bank_name) {
            showErrorNotification('Please fill all bank account details');
            return;
        }
    }
    
    // Close withdraw modal
    document.getElementById('withdraw-modal').style.display = 'none';
    
    try {
        // Make API call to request withdrawal
        const response = await fetch('/api/wallet/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(withdrawData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Withdrawal request failed');
        }
        
        const data = await response.json();
        
        // Show success notification
        showSuccessNotification('Withdrawal request submitted successfully');
        
        // Refresh wallet data
        fetchWalletBalance().then(data => updateWalletBalance(data));
        fetchTransactions(1, currentTransactionType, currentDateFilter);
        
    } catch (error) {
        console.error('Withdrawal request error:', error);
        showErrorNotification('Withdrawal request failed. Please try again.');
    }
}

/**
 * Simulate payment processing (for demo purposes)
 */
function simulatePaymentProcessing() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

/**
 * Show payment success modal
 */
function showPaymentSuccessModal(amount, paymentMethod) {
    // Hide processing modal
    document.getElementById('payment-processing-modal').style.display = 'none';
    
    // Update success modal content
    document.getElementById('credited-amount').textContent = `₹${parseFloat(amount).toFixed(2)}`;
    document.getElementById('transaction-id').textContent = generateTransactionId();
    document.getElementById('transaction-date').textContent = new Date().toLocaleString();
    
    let methodDisplay = 'Unknown';
    if (paymentMethod === 'upi') methodDisplay = 'UPI';
    else if (paymentMethod === 'card') methodDisplay = 'Credit/Debit Card';
    else if (paymentMethod === 'netbanking') methodDisplay = 'Net Banking';
    
    document.getElementById('payment-method').textContent = methodDisplay;
    
    // Show success modal
    document.getElementById('payment-success-modal').style.display = 'block';
    
    // Make API call to add money to wallet (in a real app)
    addMoneyToWallet(amount, paymentMethod);
}

/**
 * Add money to wallet (API call)
 */
async function addMoneyToWallet(amount, paymentMethod) {
    try {
        const response = await fetch('/api/wallet/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                payment_method: paymentMethod,
                transaction_id: generateTransactionId()
            }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Failed to add money to wallet');
        }
    } catch (error) {
        console.error('Error adding money to wallet:', error);
    }
}

/**
 * Generate a random transaction ID
 */
function generateTransactionId() {
    return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
    // Implementation depends on your notification system
    alert(message);
}

/**
 * Show success notification
 */
function showSuccessNotification(message) {
    // Implementation depends on your notification system
    alert(message);
}
