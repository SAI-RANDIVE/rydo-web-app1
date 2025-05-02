document.addEventListener('DOMContentLoaded', function() {
    // Add error message container if it doesn't exist
    if (!document.getElementById('error-message')) {
        const errorContainer = document.createElement('div');
        errorContainer.id = 'error-message';
        errorContainer.className = 'error-message';
        errorContainer.style.display = 'none';
        errorContainer.style.color = 'red';
        errorContainer.style.marginBottom = '15px';
        const formContainer = document.querySelector('.form-container');
        formContainer.insertBefore(errorContainer, document.getElementById('signup-form'));
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
            // If the option is for login redirect
            if (this.dataset.target === 'login-redirect') {
                window.location.href = '/';
                return;
            }
            
            // Otherwise, handle the signup form display
            loginOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Password strength meter
    const passwordInput = document.getElementById('password');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Length check
            if (password.length >= 8) strength++;
            
            // Contains lowercase
            if (/[a-z]/.test(password)) strength++;
            
            // Contains uppercase
            if (/[A-Z]/.test(password)) strength++;
            
            // Contains number
            if (/[0-9]/.test(password)) strength++;
            
            // Contains special character
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Update strength meter
            strengthSegments.forEach((segment, index) => {
                segment.classList.remove('weak', 'medium', 'strong');
                
                if (index < strength) {
                    if (strength <= 2) {
                        segment.classList.add('weak');
                    } else if (strength <= 4) {
                        segment.classList.add('medium');
                    } else {
                        segment.classList.add('strong');
                    }
                }
            });
        });
    }

    // Password confirmation validation
    const confirmPasswordInput = document.getElementById('confirm_password');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Form submission
    const signupForm = document.getElementById('signup-form');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous error messages
            const errorContainer = document.getElementById('error-message');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
            }
            
            const role = document.getElementById('role').value;
            const firstName = document.getElementById('first_name').value;
            const lastName = document.getElementById('last_name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            const terms = document.getElementById('terms').checked;
            
            // Basic validation
            if (!terms) {
                alert('Please agree to the Terms of Service and Privacy Policy');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            // Submit form data directly (no OTP verification)
            try {
                console.log('Submitting form with data:', {
                    role,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone,
                    password: '********' // Don't log actual password
                });
                
                // Use our simplified API endpoint instead of Netlify functions
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role,
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        phone,
                        password
                    })
                });
                
                let data;
                try {
                    data = await response.json();
                } catch (error) {
                    console.error('Error parsing response:', error);
                    throw new Error('Invalid server response');
                }
                
                console.log('Server response:', response.status, data);
                
                if (response.ok) {
                    // Set session
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    }
                    
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Redirect based on user role
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
                            default:
                                window.location.href = '/dashboard';
                        }
                    } else {
                        // If no specific role, just go to dashboard
                        window.location.href = '/dashboard';
                    }
                } else {
                    // Handle error
                    const errorContainer = document.getElementById('error-message');
                    if (errorContainer) {
                        errorContainer.textContent = data.message || 'An error occurred during signup';
                        errorContainer.style.display = 'block';
                    }
                    console.error('Signup error:', data.message || 'Unknown error');
                }
            } catch (error) {
                console.error('Signup error:', error);
                const errorContainer = document.getElementById('error-message');
                if (errorContainer) {
                    errorContainer.textContent = error.message || 'An error occurred during signup. Please try again.';
                    errorContainer.style.display = 'block';
                }
            }
        });
    }
});
