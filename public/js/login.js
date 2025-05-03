/**
 * Login JavaScript
 * Handles user authentication with proper validation and database connection
 */

document.addEventListener('DOMContentLoaded', function() {
    // Clear any stored credentials and session data for security
    document.getElementById('login-form')?.reset();
    
    // Clear any sensitive session storage data
    if (window.location.pathname.includes('login')) {
        sessionStorage.removeItem('user_data');
        localStorage.removeItem('temp_credentials');
        
        // Force clear password field
        setTimeout(() => {
            const passwordField = document.getElementById('password');
            if (passwordField) passwordField.value = '';
        }, 100);
        
        // Check for redirected error messages
        const urlParams = new URLSearchParams(window.location.search);
        const errorMessage = urlParams.get('error');
        if (errorMessage) {
            showNotification(decodeURIComponent(errorMessage), 'error');
        }
    }
    
    // Toggle password visibility
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Login/Signup tab switching
    const loginOptions = document.querySelectorAll('.login-option');
    loginOptions.forEach(option => {
        option.addEventListener('click', function() {
            // If the option is for signup redirect
            if (this.dataset.target === 'signup-redirect') {
                window.location.href = '/signup';
                return;
            }
            
            // Otherwise, handle the login form display
            loginOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Validate email and password
            if (!email) {
                showNotification('Email is required', 'error');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            if (!password) {
                showNotification('Password is required', 'error');
                return;
            }
            
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, remember })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store the token and user data
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    }
                    
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                    
                    // Show success message
                    showNotification('Login successful! Redirecting...', 'success');
                    
                    // Redirect based on user role after a short delay
                    setTimeout(() => {
                        if (data.user && data.user.role) {
                            switch(data.user.role) {
                                case 'customer':
                                    window.location.href = '/customer-dashboard';
                                    break;
                                case 'driver':
                                    window.location.href = '/driver-dashboard';
                                    break;
                                case 'caretaker':
                                    window.location.href = '/caretaker-dashboard';
                                    break;
                                case 'shuttle_driver':
                                    window.location.href = '/shuttle-dashboard';
                                    break;
                                case 'admin':
                                    window.location.href = '/admin-dashboard';
                                    break;
                                default:
                                    window.location.href = '/dashboard';
                            }
                        } else {
                            // Fallback to customer dashboard if role is not specified
                            window.location.href = '/dashboard';
                        }
                    }, 1000);
                } else {
                    // Show error message
                    showNotification(data.message || 'Login failed. Please check your credentials.', 'error');
                    
                    // Reset button state
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            } catch (error) {
                console.error('Login error:', error);
                showNotification('An error occurred during login. Please try again.', 'error');
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});

/**
 * Show notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 */
function showNotification(message, type = 'info') {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = `toast-notification ${type}`;
    notificationContainer.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    document.body.appendChild(notificationContainer);
    
    // Show notification
    setTimeout(() => {
        notificationContainer.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notificationContainer.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            document.body.removeChild(notificationContainer);
        }, 300);
    }, 3000);
}
