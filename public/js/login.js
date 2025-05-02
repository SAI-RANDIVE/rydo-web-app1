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
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            try {
                const response = await fetch('/.netlify/functions/api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, remember })
                });
                
                const data = await response.json();
                
                if (response.ok) {
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
                            window.location.href = '/';
                    }
                } else {
                    // Show error message
                    alert(data.message || 'Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }
});
