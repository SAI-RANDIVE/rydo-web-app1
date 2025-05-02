/**
 * RYDO Main JavaScript
 * Common functionality used across the application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dropdown menus
    initDropdowns();
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Set up logout functionality
    setupLogout();
    
    // Check authentication status
    checkAuthStatus();
});

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== dropdown) {
                    menu.classList.remove('show');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('show');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    });
}

/**
 * Initialize mobile menu
 */
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            const headerActions = document.querySelector('.header-actions');
            headerActions.classList.toggle('show');
        });
    }
}

/**
 * Set up logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Send logout request
            fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to login page
                    window.location.href = '/';
                } else {
                    console.error('Logout failed:', data.message);
                }
            })
            .catch(error => {
                console.error('Error during logout:', error);
            });
        });
    }
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    // Check if user is authenticated
    fetch('/auth/check-auth')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                // Redirect to login page if not authenticated
                window.location.href = '/';
            } else {
                // Update user info if authenticated
                if (data.user) {
                    updateUserInfo(data.user);
                }
            }
        })
        .catch(error => {
            console.error('Error checking authentication status:', error);
        });
}

/**
 * Update user info in the header
 * @param {Object} user - User data
 */
function updateUserInfo(user) {
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar');
    
    if (userNameElement && user.first_name && user.last_name) {
        userNameElement.textContent = `${user.first_name} ${user.last_name}`;
    }
    
    if (userAvatarElement && user.profile_image) {
        userAvatarElement.src = user.profile_image;
    }
}

/**
 * Format date to readable string
 * @param {string} dateString - Date string in ISO format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Format date and time to readable string
 * @param {string} dateString - Date string in ISO format
 * @param {string} timeString - Time string in HH:MM format
 * @returns {string} - Formatted date and time string
 */
function formatDateTime(dateString, timeString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const dateTime = new Date(`${dateString}T${timeString}`);
    return dateTime.toLocaleDateString('en-US', options);
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount with currency symbol
 */
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

/**
 * Show loading spinner
 * @param {Element} container - Container element to show spinner in
 * @param {string} size - Size of spinner (small, medium, large)
 */
function showSpinner(container, size = 'medium') {
    // Clear container
    container.innerHTML = '';
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = `spinner ${size}`;
    spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Append spinner to container
    container.appendChild(spinner);
}

/**
 * Hide loading spinner
 * @param {Element} container - Container element with spinner
 */
function hideSpinner(container) {
    const spinner = container.querySelector('.spinner');
    
    if (spinner) {
        spinner.remove();
    }
}

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (0 for no auto-hide)
 */
function showAlert(message, type = 'info', duration = 3000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.querySelector('.alert-container');
    
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-message">${message}</div>
        <button class="alert-close">&times;</button>
    `;
    
    // Add alert to container
    alertContainer.appendChild(alert);
    
    // Add close functionality
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.addEventListener('click', function() {
        alert.remove();
    });
    
    // Auto-hide alert after duration
    if (duration > 0) {
        setTimeout(() => {
            alert.remove();
        }, duration);
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with strength score and feedback
 */
function validatePassword(password) {
    let strength = 0;
    let feedback = [];
    
    // Check length
    if (password.length < 8) {
        feedback.push('Password should be at least 8 characters long');
    } else {
        strength += 1;
    }
    
    // Check for lowercase letters
    if (!password.match(/[a-z]+/)) {
        feedback.push('Add lowercase letters');
    } else {
        strength += 1;
    }
    
    // Check for uppercase letters
    if (!password.match(/[A-Z]+/)) {
        feedback.push('Add uppercase letters');
    } else {
        strength += 1;
    }
    
    // Check for numbers
    if (!password.match(/[0-9]+/)) {
        feedback.push('Add numbers');
    } else {
        strength += 1;
    }
    
    // Check for special characters
    if (!password.match(/[^a-zA-Z0-9]+/)) {
        feedback.push('Add special characters');
    } else {
        strength += 1;
    }
    
    // Determine strength level
    let strengthLevel = 'very-weak';
    
    if (strength === 5) {
        strengthLevel = 'very-strong';
    } else if (strength === 4) {
        strengthLevel = 'strong';
    } else if (strength === 3) {
        strengthLevel = 'medium';
    } else if (strength === 2) {
        strengthLevel = 'weak';
    }
    
    return {
        score: strength,
        level: strengthLevel,
        feedback: feedback
    };
}

/**
 * Get distance between two coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
}

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
function deg2rad(deg) {
    return deg * (Math.PI/180);
}
