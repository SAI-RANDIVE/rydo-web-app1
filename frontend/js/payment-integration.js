/**
 * Payment Integration
 * Handles Razorpay payment integration and wallet operations
 */

class PaymentIntegration {
  constructor() {
    this.razorpayKeyId = 'rzp_test_PScFROiY2zKvdv';
    this.walletBalance = 0;
    this.currentBooking = null;
    this.paymentModalId = 'payment-modal';
    this.walletTopupModalId = 'wallet-topup-modal';
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize payment integration
   */
  init() {
    // Create payment modal if it doesn't exist
    this.createPaymentModal();
    this.createWalletTopupModal();
    
    // Load Razorpay script
    this.loadRazorpayScript();
    
    // Fetch wallet balance if user is logged in
    this.fetchWalletBalance();
  }
  
  /**
   * Load Razorpay script
   */
  loadRazorpayScript() {
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }
  
  /**
   * Create payment modal
   */
  createPaymentModal() {
    if (document.getElementById(this.paymentModalId)) {
      return;
    }
    
    const modalHtml = `
      <div id="${this.paymentModalId}" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Payment Options</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="payment-amount-container text-center mb-4">
                <h3>Total Amount</h3>
                <h2 class="payment-amount">₹0.00</h2>
              </div>
              
              <div class="payment-options">
                <div class="card mb-3 payment-option" id="wallet-payment-option">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 class="mb-1">Pay with Wallet</h5>
                        <p class="mb-0 text-muted wallet-balance">Balance: ₹0.00</p>
                      </div>
                      <i class="fas fa-wallet fa-2x text-primary"></i>
                    </div>
                  </div>
                </div>
                
                <div class="card payment-option" id="razorpay-payment-option">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 class="mb-1">Pay Online</h5>
                        <p class="mb-0 text-muted">Credit/Debit Card, UPI, NetBanking</p>
                      </div>
                      <i class="fas fa-credit-card fa-2x text-primary"></i>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="insufficient-balance-alert alert alert-warning mt-3" style="display: none;">
                <i class="fas fa-exclamation-triangle"></i> Insufficient wallet balance. Please add money to your wallet or choose another payment method.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Add event listeners
    this.addPaymentModalEventListeners();
  }
  
  /**
   * Create wallet topup modal
   */
  createWalletTopupModal() {
    if (document.getElementById(this.walletTopupModalId)) {
      return;
    }
    
    const modalHtml = `
      <div id="${this.walletTopupModalId}" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Money to Wallet</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="topup-amount">Enter Amount (₹)</label>
                <input type="number" class="form-control" id="topup-amount" min="100" step="100" value="500">
              </div>
              
              <div class="quick-amounts d-flex justify-content-between mb-4">
                <button class="btn btn-outline-primary quick-amount" data-amount="500">₹500</button>
                <button class="btn btn-outline-primary quick-amount" data-amount="1000">₹1000</button>
                <button class="btn btn-outline-primary quick-amount" data-amount="2000">₹2000</button>
              </div>
              
              <div class="wallet-balance-container text-center mb-3">
                <p class="mb-0">Current Balance</p>
                <h4 class="wallet-balance">₹0.00</h4>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="proceed-topup-btn">Proceed to Add</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Add event listeners
    this.addWalletTopupModalEventListeners();
  }
  
  /**
   * Add payment modal event listeners
   */
  addPaymentModalEventListeners() {
    const walletPaymentOption = document.getElementById('wallet-payment-option');
    const razorpayPaymentOption = document.getElementById('razorpay-payment-option');
    
    if (walletPaymentOption) {
      walletPaymentOption.addEventListener('click', () => {
        this.handleWalletPayment();
      });
    }
    
    if (razorpayPaymentOption) {
      razorpayPaymentOption.addEventListener('click', () => {
        this.handleRazorpayPayment();
      });
    }
  }
  
  /**
   * Add wallet topup modal event listeners
   */
  addWalletTopupModalEventListeners() {
    const quickAmountButtons = document.querySelectorAll('.quick-amount');
    const topupAmountInput = document.getElementById('topup-amount');
    const proceedTopupBtn = document.getElementById('proceed-topup-btn');
    
    if (quickAmountButtons) {
      quickAmountButtons.forEach(button => {
        button.addEventListener('click', () => {
          const amount = button.getAttribute('data-amount');
          if (topupAmountInput) {
            topupAmountInput.value = amount;
          }
        });
      });
    }
    
    if (proceedTopupBtn) {
      proceedTopupBtn.addEventListener('click', () => {
        const amount = topupAmountInput ? parseFloat(topupAmountInput.value) : 0;
        if (amount < 100) {
          alert('Minimum amount to add is ₹100');
          return;
        }
        
        this.topupWallet(amount);
      });
    }
  }
  
  /**
   * Fetch wallet balance
   */
  async fetchWalletBalance() {
    try {
      const response = await fetch('/payment/wallet/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      
      const data = await response.json();
      this.walletBalance = data.balance;
      
      // Update wallet balance display
      this.updateWalletBalanceDisplay();
      
      return this.walletBalance;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }
  
  /**
   * Update wallet balance display
   */
  updateWalletBalanceDisplay() {
    const walletBalanceElements = document.querySelectorAll('.wallet-balance');
    
    walletBalanceElements.forEach(element => {
      element.textContent = `₹${this.walletBalance.toFixed(2)}`;
    });
  }
  
  /**
   * Show payment modal
   */
  showPaymentModal(bookingData) {
    this.currentBooking = bookingData;
    
    const paymentModal = document.getElementById(this.paymentModalId);
    const paymentAmountElement = paymentModal.querySelector('.payment-amount');
    const insufficientBalanceAlert = paymentModal.querySelector('.insufficient-balance-alert');
    const walletPaymentOption = document.getElementById('wallet-payment-option');
    
    // Update payment amount
    if (paymentAmountElement) {
      paymentAmountElement.textContent = `₹${bookingData.amount.toFixed(2)}`;
    }
    
    // Check if wallet balance is sufficient
    if (this.walletBalance < bookingData.amount) {
      if (insufficientBalanceAlert) {
        insufficientBalanceAlert.style.display = 'block';
      }
      
      if (walletPaymentOption) {
        walletPaymentOption.classList.add('disabled');
        walletPaymentOption.style.opacity = '0.6';
      }
    } else {
      if (insufficientBalanceAlert) {
        insufficientBalanceAlert.style.display = 'none';
      }
      
      if (walletPaymentOption) {
        walletPaymentOption.classList.remove('disabled');
        walletPaymentOption.style.opacity = '1';
      }
    }
    
    // Show modal
    $(paymentModal).modal('show');
  }
  
  /**
   * Show wallet topup modal
   */
  showWalletTopupModal() {
    const walletTopupModal = document.getElementById(this.walletTopupModalId);
    
    // Update wallet balance display
    this.updateWalletBalanceDisplay();
    
    // Show modal
    $(walletTopupModal).modal('show');
  }
  
  /**
   * Handle wallet payment
   */
  async handleWalletPayment() {
    if (!this.currentBooking) {
      console.error('No booking data available');
      return;
    }
    
    if (this.walletBalance < this.currentBooking.amount) {
      alert('Insufficient wallet balance. Please add money to your wallet or choose another payment method.');
      return;
    }
    
    try {
      const response = await fetch('/payment/wallet/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: this.currentBooking.booking_id,
          booking_type: this.currentBooking.booking_type,
          amount: this.currentBooking.amount
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment failed');
      }
      
      const data = await response.json();
      
      // Update wallet balance
      this.walletBalance = data.new_balance;
      this.updateWalletBalanceDisplay();
      
      // Hide payment modal
      $(`#${this.paymentModalId}`).modal('hide');
      
      // Show success message
      this.showPaymentSuccessMessage(data.transaction_id);
      
      // Call onPaymentSuccess callback if provided
      if (this.currentBooking.onPaymentSuccess) {
        this.currentBooking.onPaymentSuccess({
          transaction_id: data.transaction_id,
          payment_method: 'wallet'
        });
      }
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      alert(`Payment failed: ${error.message}`);
    }
  }
  
  /**
   * Handle Razorpay payment
   */
  async handleRazorpayPayment() {
    if (!this.currentBooking) {
      console.error('No booking data available');
      return;
    }
    
    try {
      // Create payment order
      const orderResponse = await fetch('/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: this.currentBooking.booking_id,
          booking_type: this.currentBooking.booking_type,
          amount: this.currentBooking.amount
        }),
        credentials: 'include'
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }
      
      const orderData = await orderResponse.json();
      
      // Hide payment modal
      $(`#${this.paymentModalId}`).modal('hide');
      
      // Get user details
      const userDetails = await this.getUserDetails();
      
      // Configure Razorpay options
      const options = {
        key: this.razorpayKeyId,
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency,
        name: 'RYDO Services',
        description: `Payment for ${this.currentBooking.booking_type} booking`,
        order_id: orderData.order_id,
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone
        },
        theme: {
          color: '#5B6EF5'
        },
        modal: {
          ondismiss: () => {
            // Show payment modal again
            $(`#${this.paymentModalId}`).modal('show');
          }
        },
        handler: (response) => {
          this.verifyRazorpayPayment(response);
        }
      };
      
      // Open Razorpay checkout
      const razorpay = new Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error initiating Razorpay payment:', error);
      alert(`Payment initiation failed: ${error.message}`);
    }
  }
  
  /**
   * Verify Razorpay payment
   */
  async verifyRazorpayPayment(paymentResponse) {
    try {
      const response = await fetch('/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }
      
      const data = await response.json();
      
      // Show success message
      this.showPaymentSuccessMessage(paymentResponse.razorpay_payment_id);
      
      // Call onPaymentSuccess callback if provided
      if (this.currentBooking && this.currentBooking.onPaymentSuccess) {
        this.currentBooking.onPaymentSuccess({
          transaction_id: paymentResponse.razorpay_payment_id,
          payment_method: 'card'
        });
      }
    } catch (error) {
      console.error('Error verifying Razorpay payment:', error);
      alert(`Payment verification failed: ${error.message}`);
      
      // Show payment modal again
      $(`#${this.paymentModalId}`).modal('show');
    }
  }
  
  /**
   * Topup wallet
   */
  async topupWallet(amount) {
    try {
      // Get user details
      const userDetails = await this.getUserDetails();
      
      // Configure Razorpay options
      const options = {
        key: this.razorpayKeyId,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: 'RYDO Services',
        description: 'Wallet Topup',
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone
        },
        theme: {
          color: '#5B6EF5'
        },
        handler: async (response) => {
          try {
            // Add money to wallet
            const walletResponse = await fetch('/payment/wallet/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                amount: amount,
                payment_method: 'card',
                reference_id: response.razorpay_payment_id
              }),
              credentials: 'include'
            });
            
            if (!walletResponse.ok) {
              const errorData = await walletResponse.json();
              throw new Error(errorData.message || 'Failed to add money to wallet');
            }
            
            const data = await walletResponse.json();
            
            // Update wallet balance
            this.walletBalance = data.new_balance;
            this.updateWalletBalanceDisplay();
            
            // Hide wallet topup modal
            $(`#${this.walletTopupModalId}`).modal('hide');
            
            // Show success message
            alert(`Successfully added ₹${amount} to your wallet. New balance: ₹${data.new_balance.toFixed(2)}`);
          } catch (error) {
            console.error('Error adding money to wallet:', error);
            alert(`Failed to add money to wallet: ${error.message}`);
          }
        }
      };
      
      // Open Razorpay checkout
      const razorpay = new Razorpay(options);
      razorpay.open();
      
      // Hide wallet topup modal
      $(`#${this.walletTopupModalId}`).modal('hide');
    } catch (error) {
      console.error('Error initiating wallet topup:', error);
      alert(`Wallet topup failed: ${error.message}`);
    }
  }
  
  /**
   * Get user details
   */
  async getUserDetails() {
    try {
      const response = await fetch('/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const user = await response.json();
      
      return {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return {
        name: '',
        email: '',
        phone: ''
      };
    }
  }
  
  /**
   * Show payment success message
   */
  showPaymentSuccessMessage(transactionId) {
    // Create success alert
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success payment-success-alert';
    successAlert.innerHTML = `
      <i class="fas fa-check-circle"></i> 
      Payment successful! Transaction ID: ${transactionId}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;
    
    // Add styles
    successAlert.style.position = 'fixed';
    successAlert.style.top = '20px';
    successAlert.style.right = '20px';
    successAlert.style.zIndex = '9999';
    successAlert.style.minWidth = '300px';
    
    // Append to body
    document.body.appendChild(successAlert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      successAlert.remove();
    }, 5000);
  }
  
  /**
   * Process payment for a booking
   */
  processPayment(bookingData) {
    // Validate booking data
    if (!bookingData || !bookingData.booking_id || !bookingData.booking_type || !bookingData.amount) {
      console.error('Invalid booking data');
      return;
    }
    
    // Show payment modal
    this.showPaymentModal(bookingData);
  }
}

// Create global instance
const paymentIntegration = new PaymentIntegration();
