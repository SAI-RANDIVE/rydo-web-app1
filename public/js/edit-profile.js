document.addEventListener('DOMContentLoaded', function() {
    // Initialize user data
    initUserData();
    
    // Toggle password visibility
    initPasswordToggle();
    
    // Initialize form submission
    initFormSubmission();
    
    // Initialize verification modals
    initVerificationModals();
    
    // Initialize delete account functionality
    initDeleteAccount();
    
    // Initialize sidebar toggle for mobile
    initSidebarToggle();
    
    // Initialize profile photo upload
    initProfilePhotoUpload();
    
    // Initialize password strength meter
    initPasswordStrengthMeter();
});

// Initialize user data from session or API
async function initUserData() {
    try {
        // Get user data from session storage or fetch from server
        let userData = null;
        
        // Try to get user data from session storage
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            userData = JSON.parse(sessionUser);
            console.log('User data loaded from session storage:', userData);
        } else {
            // Fetch user data from server
            const response = await fetch('/user/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                userData = await response.json();
                // Store in session storage for future use
                sessionStorage.setItem('user', JSON.stringify(userData));
                console.log('User data fetched from server:', userData);
            } else {
                console.error('Failed to fetch user data:', await response.text());
                // Redirect to login if unauthorized
                if (response.status === 401) {
                    window.location.href = '/';
                    return;
                }
            }
        }
        
        // If we have user data, update the form fields
        if (userData) {
            // Update user profile in sidebar
            document.getElementById('user-name').textContent = `${userData.first_name} ${userData.last_name}`;
            document.getElementById('user-email').textContent = userData.email;
            
            // Update form fields
            document.getElementById('first-name').value = userData.first_name || '';
            document.getElementById('last-name').value = userData.last_name || '';
            document.getElementById('email').value = userData.email || '';
            document.getElementById('phone').value = userData.phone || '';
            
            // Update address fields if available
            if (userData.address) {
                document.getElementById('address').value = userData.address || '';
                
                // Try to parse city, state, pincode from address
                const addressParts = userData.address.split(',');
                if (addressParts.length >= 3) {
                    document.getElementById('city').value = addressParts[0].trim() || '';
                    document.getElementById('state').value = addressParts[1].trim() || '';
                    
                    // Try to extract pincode
                    const pincodeMatch = addressParts[2].match(/\d{6}/);
                    if (pincodeMatch) {
                        document.getElementById('pincode').value = pincodeMatch[0] || '';
                    }
                }
            }
            
            // Set profile image if available
            if (userData.profile_photo) {
                document.getElementById('user-avatar').src = userData.profile_photo;
                document.getElementById('profile-preview').src = userData.profile_photo;
            }
            
            // Show verification badges
            if (userData.is_email_verified) {
                document.getElementById('email-verified').style.display = 'flex';
                document.getElementById('email-unverified').style.display = 'none';
                document.getElementById('verify-email-btn').style.display = 'none';
            } else {
                document.getElementById('email-verified').style.display = 'none';
                document.getElementById('email-unverified').style.display = 'flex';
                document.getElementById('verify-email-btn').style.display = 'inline-flex';
            }
            
            if (userData.is_phone_verified) {
                document.getElementById('phone-verified').style.display = 'flex';
                document.getElementById('phone-unverified').style.display = 'none';
                document.getElementById('verify-phone-btn').style.display = 'none';
            } else {
                document.getElementById('phone-verified').style.display = 'none';
                document.getElementById('phone-unverified').style.display = 'flex';
                document.getElementById('verify-phone-btn').style.display = 'inline-flex';
            }
        }
    } catch (error) {
        console.error('Error initializing user data:', error);
        showAlert('error', 'Error loading user data. Please refresh the page.');
    }
}

// Initialize password toggle functionality
function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
}

// Initialize form submission
function initFormSubmission() {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Get form data
                const formData = new FormData(profileForm);
                
                // Add profile photo if selected
                const profilePhotoInput = document.getElementById('profile-photo');
                if (profilePhotoInput.files.length > 0) {
                    formData.append('profile_photo', profilePhotoInput.files[0]);
                }
                
                // Combine address fields
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const state = document.getElementById('state').value;
                const pincode = document.getElementById('pincode').value;
                const country = document.getElementById('country').value;
                
                formData.append('address', `${address}, ${city}, ${state} ${pincode}, ${country}`);
                
                // Send update request
                const response = await fetch('/user/profile', {
                    method: 'PUT',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update session storage
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    showAlert('success', 'Profile updated successfully!');
                    
                    // Reload user data
                    initUserData();
                } else {
                    const error = await response.json();
                    showAlert('error', error.message || 'Error updating profile. Please try again.');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showAlert('error', 'Error updating profile. Please try again.');
            }
        });
    }
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                showAlert('error', 'New passwords do not match.');
                return;
            }
            
            try {
                // Send password update request
                const response = await fetch('/user/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                if (response.ok) {
                    // Show success message
                    showAlert('success', 'Password updated successfully!');
                    
                    // Reset form
                    passwordForm.reset();
                } else {
                    const error = await response.json();
                    showAlert('error', error.message || 'Error updating password. Please try again.');
                }
            } catch (error) {
                console.error('Error updating password:', error);
                showAlert('error', 'Error updating password. Please try again.');
            }
        });
    }
}

// Initialize verification modals
function initVerificationModals() {
    const verifyEmailBtn = document.getElementById('verify-email-btn');
    const verifyPhoneBtn = document.getElementById('verify-phone-btn');
    const verificationModal = document.getElementById('verification-modal');
    const closeModal = document.querySelectorAll('.close-modal');
    const verifyBtn = document.getElementById('verify-btn');
    const resendBtn = document.getElementById('resend-btn');
    
    // Initialize OTP input behavior
    initOtpInputs();
    
    // Show email verification modal
    if (verifyEmailBtn) {
        verifyEmailBtn.addEventListener('click', function() {
            document.getElementById('verification-type').textContent = 'Email';
            document.getElementById('verification-message').textContent = 'We\'ve sent a verification code to your email. Please enter the code below to verify your email address.';
            
            // Reset OTP inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => {
                input.value = '';
            });
            
            // Show modal
            verificationModal.classList.add('show');
            
            // Start countdown
            startCountdown();
            
            // Send verification email
            sendVerificationCode('email');
        });
    }
    
    // Show phone verification modal
    if (verifyPhoneBtn) {
        verifyPhoneBtn.addEventListener('click', function() {
            document.getElementById('verification-type').textContent = 'Phone';
            document.getElementById('verification-message').textContent = 'We\'ve sent a verification code to your phone. Please enter the code below to verify your phone number.';
            
            // Reset OTP inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => {
                input.value = '';
            });
            
            // Show modal
            verificationModal.classList.add('show');
            
            // Start countdown
            startCountdown();
            
            // Send verification SMS
            sendVerificationCode('phone');
        });
    }
    
    // Close modals
    closeModal.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('show');
        });
    });
    
    // Submit verification code
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const otpInputs = document.querySelectorAll('.otp-input');
            let otp = '';
            
            otpInputs.forEach(input => {
                otp += input.value;
            });
            
            if (otp.length === 6) {
                const verificationType = document.getElementById('verification-type').textContent.toLowerCase();
                verifyCode(otp, verificationType);
            } else {
                showAlert('error', 'Please enter a valid verification code.');
            }
        });
    }
    
    // Resend verification code
    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            if (this.disabled) return;
            
            const verificationType = document.getElementById('verification-type').textContent.toLowerCase();
            sendVerificationCode(verificationType);
            
            // Start countdown
            startCountdown();
        });
    }
}

// Initialize OTP input behavior
function initOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        // Focus next input when a digit is entered
        input.addEventListener('input', function() {
            if (this.value.length === 1) {
                // Move to next input
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                // Move to previous input
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.match(/\d/g);
            
            if (digits && digits.length > 0) {
                // Fill inputs with pasted digits
                for (let i = 0; i < Math.min(digits.length, otpInputs.length); i++) {
                    otpInputs[i].value = digits[i];
                }
                
                // Focus the next empty input or the last input
                for (let i = 0; i < otpInputs.length; i++) {
                    if (otpInputs[i].value === '') {
                        otpInputs[i].focus();
                        break;
                    } else if (i === otpInputs.length - 1) {
                        otpInputs[i].focus();
                    }
                }
            }
        });
    });
}

// Start countdown for resend button
function startCountdown() {
    const resendBtn = document.getElementById('resend-btn');
    const countdownElement = document.getElementById('countdown');
    const timerElement = document.getElementById('timer');
    
    // Disable resend button
    resendBtn.disabled = true;
    
    // Show timer
    timerElement.style.display = 'block';
    
    // Set countdown time
    let seconds = 60;
    countdownElement.textContent = seconds;
    
    // Start countdown
    const countdownInterval = setInterval(function() {
        seconds--;
        countdownElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            resendBtn.disabled = false;
            timerElement.style.display = 'none';
        }
    }, 1000);
}

// Send verification code
async function sendVerificationCode(type) {
    try {
        const endpoint = type === 'email' ? '/user/verify-email' : '/user/verify-phone';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            showAlert('error', error.message || `Error sending verification code to your ${type}.`);
        }
    } catch (error) {
        console.error(`Error sending ${type} verification code:`, error);
        showAlert('error', `Error sending verification code to your ${type}.`);
    }
}

// Verify code
async function verifyCode(otp, type) {
    try {
        const endpoint = type === 'email' ? '/user/verify-email-otp' : '/user/verify-phone-otp';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp })
        });
        
        if (response.ok) {
            // Close modal
            document.getElementById('verification-modal').classList.remove('show');
            
            // Show success message
            showAlert('success', `Your ${type} has been verified successfully!`);
            
            // Update verification status
            if (type === 'email') {
                document.getElementById('email-verified').style.display = 'flex';
                document.getElementById('email-unverified').style.display = 'none';
                document.getElementById('verify-email-btn').style.display = 'none';
            } else {
                document.getElementById('phone-verified').style.display = 'flex';
                document.getElementById('phone-unverified').style.display = 'none';
                document.getElementById('verify-phone-btn').style.display = 'none';
            }
            
            // Update user data in session storage
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (type === 'email') {
                userData.is_email_verified = true;
            } else {
                userData.is_phone_verified = true;
            }
            sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
            const error = await response.json();
            showAlert('error', error.message || 'Invalid verification code. Please try again.');
        }
    } catch (error) {
        console.error(`Error verifying ${type}:`, error);
        showAlert('error', 'Error verifying code. Please try again.');
    }
}

// Initialize delete account functionality
function initDeleteAccount() {
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteConfirmationInput = document.getElementById('delete-confirmation');
    const deletePasswordInput = document.getElementById('delete-password');
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            // Reset inputs
            deleteConfirmationInput.value = '';
            deletePasswordInput.value = '';
            confirmDeleteBtn.disabled = true;
            
            // Show modal
            deleteConfirmModal.classList.add('show');
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteConfirmModal.classList.remove('show');
        });
    }
    
    if (deleteConfirmationInput) {
        deleteConfirmationInput.addEventListener('input', function() {
            // Enable confirm button if input is "DELETE"
            confirmDeleteBtn.disabled = this.value !== 'DELETE' || deletePasswordInput.value === '';
        });
    }
    
    if (deletePasswordInput) {
        deletePasswordInput.addEventListener('input', function() {
            // Enable confirm button if input is "DELETE" and password is not empty
            confirmDeleteBtn.disabled = deleteConfirmationInput.value !== 'DELETE' || this.value === '';
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            if (deleteConfirmationInput.value !== 'DELETE') {
                return;
            }
            
            try {
                const response = await fetch('/user/delete-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        password: deletePasswordInput.value
                    })
                });
                
                if (response.ok) {
                    // Clear session storage
                    sessionStorage.removeItem('user');
                    
                    // Redirect to home page
                    window.location.href = '/';
                } else {
                    const error = await response.json();
                    showAlert('error', error.message || 'Error deleting account. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                showAlert('error', 'Error deleting account. Please try again.');
            }
        });
    }
}

// Initialize sidebar toggle for mobile
function initSidebarToggle() {
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            if (sidebar.classList.contains('show') && 
                !sidebar.contains(e.target) && 
                !toggleSidebarBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }
}

// Initialize profile photo upload
function initProfilePhotoUpload() {
    const profilePhotoInput = document.getElementById('profile-photo');
    const profilePreview = document.getElementById('profile-preview');
    
    if (profilePhotoInput && profilePreview) {
        profilePhotoInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Validate file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    showAlert('error', 'Image size exceeds 2MB. Please choose a smaller image.');
                    this.value = '';
                    return;
                }
                
                // Validate file type
                if (!file.type.match('image.*')) {
                    showAlert('error', 'Please select a valid image file (JPG, PNG).');
                    this.value = '';
                    return;
                }
                
                // Preview image
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.src = e.target.result;
                    
                    // Also update sidebar avatar
                    document.getElementById('user-avatar').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Initialize password strength meter
function initPasswordStrengthMeter() {
    const newPasswordInput = document.getElementById('new-password');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    
    if (newPasswordInput && strengthSegments.length > 0) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            // Reset all segments
            strengthSegments.forEach(segment => {
                segment.className = 'strength-segment';
            });
            
            // Update segments based on strength
            if (password.length > 0) {
                if (strength === 'weak') {
                    strengthSegments[0].classList.add('weak');
                } else if (strength === 'medium') {
                    strengthSegments[0].classList.add('medium');
                    strengthSegments[1].classList.add('medium');
                } else if (strength === 'strong') {
                    strengthSegments[0].classList.add('strong');
                    strengthSegments[1].classList.add('strong');
                    strengthSegments[2].classList.add('strong');
                } else if (strength === 'very-strong') {
                    strengthSegments.forEach(segment => {
                        segment.classList.add('strong');
                    });
                }
            }
        });
    }
}

// Calculate password strength
function calculatePasswordStrength(password) {
    if (password.length === 0) {
        return 'none';
    }
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) {
        score += 1;
    }
    
    // Complexity checks
    if (/[A-Z]/.test(password)) {
        score += 1;
    }
    
    if (/[a-z]/.test(password)) {
        score += 1;
    }
    
    if (/[0-9]/.test(password)) {
        score += 1;
    }
    
    if (/[^A-Za-z0-9]/.test(password)) {
        score += 1;
    }
    
    // Return strength based on score
    if (score <= 2) {
        return 'weak';
    } else if (score <= 3) {
        return 'medium';
    } else if (score <= 4) {
        return 'strong';
    } else {
        return 'very-strong';
    }
}

// Show alert message
function showAlert(type, message) {
    const successAlert = document.getElementById('success-alert');
    const errorAlert = document.getElementById('error-alert');
    
    // Hide both alerts
    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';
    
    if (type === 'success') {
        successAlert.querySelector('span').textContent = message;
        successAlert.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);
    } else {
        errorAlert.querySelector('span').textContent = message;
        errorAlert.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    }
}
