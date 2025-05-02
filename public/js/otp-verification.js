/**
 * OTP Verification Module for RYDO Web App
 * Handles phone and email verification using GetOTP service
 */

class OTPVerification {
    constructor() {
        this.requestId = null;
        this.verificationType = null; // 'phone' or 'email'
        this.verificationValue = null; // phone number or email
    }

    /**
     * Initialize OTP verification UI
     * @param {string} containerId - ID of the container element
     * @param {Function} onVerificationComplete - Callback when verification is complete
     */
    init(containerId, onVerificationComplete) {
        this.container = document.getElementById(containerId);
        this.onVerificationComplete = onVerificationComplete;
        
        if (!this.container) {
            console.error('OTP verification container not found');
            return;
        }
        
        // Create verification UI
        this.createVerificationUI();
    }
    
    /**
     * Create verification UI elements
     */
    createVerificationUI() {
        this.container.innerHTML = `
            <div class="otp-verification-container">
                <div class="verification-step" id="verification-step-1">
                    <h3>Verify your contact information</h3>
                    <p>Please select how you'd like to receive your verification code:</p>
                    <div class="verification-options">
                        <button class="btn verification-option" data-type="phone">
                            <i class="fas fa-mobile-alt"></i> Phone
                        </button>
                        <button class="btn verification-option" data-type="email">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                    </div>
                </div>
                
                <div class="verification-step" id="verification-step-2" style="display: none;">
                    <h3>Enter verification code</h3>
                    <p id="verification-message"></p>
                    <div class="otp-input-container">
                        <input type="text" class="otp-input" maxlength="6" placeholder="Enter 6-digit code">
                    </div>
                    <div class="verification-actions">
                        <button class="btn btn-primary" id="verify-otp-btn">Verify</button>
                        <button class="btn btn-secondary" id="resend-otp-btn">Resend Code</button>
                    </div>
                    <p class="timer-text">Code expires in <span id="otp-timer">5:00</span></p>
                    <p class="error-message" id="otp-error" style="display: none;"></p>
                </div>
                
                <div class="verification-step" id="verification-step-3" style="display: none;">
                    <h3>Verification Complete</h3>
                    <p>Your contact information has been verified successfully.</p>
                    <div class="verification-success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <button class="btn btn-primary" id="continue-btn">Continue</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.addEventListeners();
    }
    
    /**
     * Add event listeners to UI elements
     */
    addEventListeners() {
        // Verification option buttons
        const optionButtons = this.container.querySelectorAll('.verification-option');
        optionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const type = button.dataset.type;
                this.verificationType = type;
                this.startVerification(type);
            });
        });
        
        // Verify OTP button
        const verifyBtn = this.container.querySelector('#verify-otp-btn');
        verifyBtn.addEventListener('click', () => {
            this.verifyOTP();
        });
        
        // Resend OTP button
        const resendBtn = this.container.querySelector('#resend-otp-btn');
        resendBtn.addEventListener('click', () => {
            this.startVerification(this.verificationType);
        });
        
        // Continue button
        const continueBtn = this.container.querySelector('#continue-btn');
        continueBtn.addEventListener('click', () => {
            if (typeof this.onVerificationComplete === 'function') {
                this.onVerificationComplete({
                    verified: true,
                    type: this.verificationType,
                    value: this.verificationValue
                });
            }
        });
        
        // OTP input
        const otpInput = this.container.querySelector('.otp-input');
        otpInput.addEventListener('input', (e) => {
            // Allow only numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Auto-submit when 6 digits are entered
            if (e.target.value.length === 6) {
                this.verifyOTP();
            }
        });
    }
    
    /**
     * Start verification process
     * @param {string} type - 'phone' or 'email'
     */
    async startVerification(type) {
        // Get user input
        let value;
        
        if (type === 'phone') {
            value = document.getElementById('phone').value;
            if (!value) {
                this.showError('Please enter your phone number first');
                return;
            }
            this.verificationValue = value;
        } else if (type === 'email') {
            value = document.getElementById('email').value;
            if (!value) {
                this.showError('Please enter your email address first');
                return;
            }
            this.verificationValue = value;
        }
        
        // Show loading state
        this.showLoading(true);
        
        try {
            // Send OTP request to our simplified API
            const endpoint = '/api/verification/send-otp';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [type]: value
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store request ID for verification
                this.requestId = data.requestId;
                
                // Show verification step
                this.showStep(2);
                
                // Update message
                const maskedValue = type === 'phone' ? data.phone : data.email;
                this.container.querySelector('#verification-message').textContent = 
                    `We've sent a verification code to ${maskedValue}. Please enter it below.`;
                
                // Start timer
                this.startTimer();
                
                // Clear any previous errors
                this.clearError();
            } else {
                this.showError(data.message || `Failed to send verification code to your ${type}`);
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            this.showError(`Failed to send verification code. Please try again.`);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Verify OTP
     */
    async verifyOTP() {
        const otpInput = this.container.querySelector('.otp-input');
        const otp = otpInput.value.trim();
        
        if (!otp || otp.length !== 6) {
            this.showError('Please enter a valid 6-digit code');
            return;
        }
        
        if (!this.requestId) {
            this.showError('Verification session expired. Please request a new code.');
            return;
        }
        
        // Show loading state
        this.showLoading(true);
        
        try {
            // Send verification request to our simplified API
            const endpoint = '/api/verification/verify-otp';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: this.requestId,
                    otp: otp
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.verified) {
                // Show success step
                this.showStep(3);
                
                // Clear timer
                this.clearTimer();
                
                // Clear any previous errors
                this.clearError();
            } else {
                this.showError(data.message || 'Invalid verification code. Please try again.');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            this.showError('Failed to verify code. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Show verification step
     * @param {number} step - Step number (1, 2, or 3)
     */
    showStep(step) {
        // Hide all steps
        const steps = this.container.querySelectorAll('.verification-step');
        steps.forEach(s => s.style.display = 'none');
        
        // Show requested step
        const stepElement = this.container.querySelector(`#verification-step-${step}`);
        if (stepElement) {
            stepElement.style.display = 'block';
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorElement = this.container.querySelector('#otp-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    /**
     * Clear error message
     */
    clearError() {
        const errorElement = this.container.querySelector('#otp-error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
    
    /**
     * Show/hide loading state
     * @param {boolean} isLoading - Whether loading is in progress
     */
    showLoading(isLoading) {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = isLoading;
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        });
    }
    
    /**
     * Start OTP expiry timer (5 minutes)
     */
    startTimer() {
        // Clear any existing timer
        this.clearTimer();
        
        const timerElement = this.container.querySelector('#otp-timer');
        if (!timerElement) return;
        
        let timeLeft = 5 * 60; // 5 minutes in seconds
        
        this.timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                this.clearTimer();
                this.requestId = null; // Invalidate request ID
                timerElement.textContent = 'Expired';
                this.showError('Verification code has expired. Please request a new one.');
            }
            
            timeLeft--;
        }, 1000);
    }
    
    /**
     * Clear timer
     */
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

// Create global instance
window.otpVerification = new OTPVerification();
