/**
 * Customer Dashboard JavaScript
 * Handles all customer dashboard functionality including bookings, profile management, and ride history
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Customer dashboard initializing...');
    // Check if user is logged in
    if (checkUserSession()) {
        console.log('User session valid, initializing dashboard...');
        // Initialize user data
        initUserData();
        
        // Initialize navigation
        initNavigation();
        
        // Initialize notification panel
        initNotifications();
        
        // Initialize booking form
        initBookingForm();
        
        // Initialize map if available
        if (typeof initMap === 'function') {
            initMap();
        }
        
        // Initialize recent activity
        loadRecentActivity();
        
        // Initialize booking history if function exists
        if (typeof loadBookingHistory === 'function') {
            loadBookingHistory();
        } else {
            // Fallback implementation
            loadBookingHistoryFallback();
        }
        
        // Initialize logout functionality
        initLogout();
        
        // Check if there's a hash in the URL and navigate to that section
        handleHashNavigation();
    }
});

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(toast);
    
    // Add event listener to close button
    toast.querySelector('.toast-close').addEventListener('click', function() {
        document.body.removeChild(toast);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 5000);
}

// Global variables
let userData = {};
let currentBooking = null;
let map = null;
let userMarker = null;
let nearbyProviders = [];

/**
 * Handle hash-based navigation
 */
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        // Remove the # symbol
        const targetSection = hash.substring(1);
        console.log('Navigating to section:', targetSection);
        
        // Find the corresponding nav link and click it
        const navLink = document.querySelector(`.sidebar-nav a[href="#${targetSection}"]`);
        if (navLink) {
            navLink.click();
        } else {
            console.log('Nav link not found for:', targetSection);
        }
    }
}

// Listen for hash changes
window.addEventListener('hashchange', handleHashNavigation);

// Check if user is logged in
function checkUserSession() {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        // Redirect to login if not authenticated
        window.location.href = '/login.html';
        return false;
    }
    
    // Verify token with server
    verifyToken(token)
        .then(isValid => {
            if (!isValid) {
                // Token is invalid, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                return false;
            }
        })
        .catch(error => {
            console.error('Error verifying token:', error);
            // On error, keep the user logged in but log the error
        });
    
    // Update user info in the dashboard
    updateUserInfo(user);
    return true;
}

// Verify token with server
function verifyToken(token) {
    return fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        return data.success;
    })
    .catch(error => {
        console.error('Error verifying token:', error);
        return false;
    });
}

// Initialize dashboard with dynamic data
async function initDashboard() {
    try {
        // Get user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        // Update welcome message
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName && user.first_name) {
            welcomeName.textContent = user.first_name;
        }
        
        // Fetch dashboard stats from server
        const statsResponse = await fetch('/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!statsResponse.ok) {
            throw new Error(`HTTP error! Status: ${statsResponse.status}`);
        }
        
        const statsData = await statsResponse.json();
        
        // Update dashboard with real data
        const dashboardStats = {
            totalRides: statsData.stats?.totalRides || 0,
            caretakerBookings: statsData.stats?.caretakerBookings || 0,
            walletBalance: statsData.stats?.walletBalance || 0,
            activeBookings: statsData.stats?.activeBookings || 0,
            rating: statsData.stats?.rating || 0.0
        };
        
        // Update dashboard stats with real data
        updateDashboardStats(dashboardStats);
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        
        // Show error message for stats
        const statCards = document.querySelectorAll('.stat-card h3');
        statCards.forEach(el => {
            el.textContent = '0';
        });
        
        // Show error message for recent activity
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Could not load recent activity.</div>';
        }
        
        // Show error toast
        showToast('Failed to load dashboard data. Please try refreshing the page.', 'error');
    }
}

// Fallback implementation for loading booking history
function loadBookingHistoryFallback() {
    console.log('Loading booking history (fallback implementation)...');
    const bookingHistoryContainer = document.getElementById('booking-history-container');
    
    if (!bookingHistoryContainer) {
        console.error('Booking history container not found');
        return;
    }
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No authentication token found');
        return;
    }
    
    // Show loading state
    bookingHistoryContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    // Fetch booking history from server
    fetch('/api/customer/booking-history', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.bookings && data.bookings.length > 0) {
            // Render booking history
            renderBookingHistory(data.bookings);
        } else {
            // No bookings found
            bookingHistoryContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Bookings Found</h3>
                    <p>You haven't made any bookings yet. Start by booking a ride!</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading bookings:', error);
        bookingHistoryContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to Load Bookings</h3>
                <p>We couldn't load your booking history. Please try again later.</p>
                <button class="btn btn-primary retry-btn">Retry</button>
            </div>
        `;
        
        // Add retry button functionality
        const retryBtn = bookingHistoryContainer.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadBookingHistoryFallback);
        }
    });
}

// Render booking history
function renderBookingHistory(bookings) {
    const bookingHistoryContainer = document.getElementById('booking-history-container');
    
    if (!bookingHistoryContainer) {
        console.error('Booking history container not found');
        return;
    }
    
    // Clear container
    bookingHistoryContainer.innerHTML = '';
    
    // Create booking history table
    const table = document.createElement('table');
    table.className = 'table booking-history-table';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Service</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add bookings to table
    bookings.forEach(booking => {
        const tr = document.createElement('tr');
        
        // Format date
        const bookingDate = new Date(booking.created_at);
        const formattedDate = bookingDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Format time
        const formattedTime = bookingDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format service type
        const serviceType = booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1);
        
        // Format status
        let statusClass = '';
        let statusText = '';
        
        switch (booking.status) {
            case 'completed':
                statusClass = 'completed';
                statusText = 'Completed';
                break;
            case 'cancelled':
                statusClass = 'cancelled';
                statusText = 'Cancelled';
                break;
            case 'pending':
                statusClass = 'pending';
                statusText = 'Pending';
                break;
            case 'in_progress':
                statusClass = 'in-progress';
                statusText = 'In Progress';
                break;
            default:
                statusClass = 'pending';
                statusText = 'Pending';
        }
        
        // Create table row
        tr.innerHTML = `
            <td>
                <div class="booking-date">${formattedDate}</div>
                <div class="booking-time">${formattedTime}</div>
            </td>
            <td>${booking.pickup_location}</td>
            <td>${booking.dropoff_location}</td>
            <td>${serviceType}</td>
            <td>₹${booking.fare_amount}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="booking-actions">
                    <button class="btn btn-sm btn-outline-primary view-booking-btn" data-booking-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${booking.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-booking-id="${booking.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${booking.status === 'completed' && !booking.rated ? `
                        <button class="btn btn-sm btn-outline-warning rate-booking-btn" data-booking-id="${booking.id}">
                            <i class="fas fa-star"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Append header and body to table
    table.appendChild(thead);
    table.appendChild(tbody);
    
    // Append table to container
    bookingHistoryContainer.appendChild(table);
    
    // Add event listeners to action buttons
    addBookingActionListeners();
}

// Initialize navigation functionality
function initNavigation() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.sidebar-nav a, .mobile-nav a');
    
    // Add click event listeners to each link
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // If link has data-toggle="tab", don't prevent default behavior
            if (this.getAttribute('data-toggle') === 'tab') {
                return;
            }
            
            // If link is for logout, don't prevent default
            if (this.classList.contains('logout-link')) {
                return;
            }
            
            // Prevent default link behavior
            e.preventDefault();
            
            // Get the target page from href attribute
            const targetPage = this.getAttribute('href');
            
            // Navigate to the target page
            if (targetPage && !targetPage.startsWith('#')) {
                window.location.href = targetPage;
            }
        });
    });
    
    // Highlight active navigation item
    highlightActiveNavItem();
}

// Highlight the active navigation item based on current page
function highlightActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav a, .mobile-nav a');
    
    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Get the href attribute
        const href = link.getAttribute('href');
        
        // If href matches current path, add active class
        if (href === currentPath || 
            (currentPath.includes(href) && href !== '/' && href !== '#')) {
            link.classList.add('active');
            
            // If link is in a submenu, expand the parent menu
            const parentMenu = link.closest('.submenu');
            if (parentMenu) {
                parentMenu.classList.add('show');
                const parentLink = parentMenu.previousElementSibling;
                if (parentLink) {
                    parentLink.classList.add('active');
                }
            }
        }
    });
}

// Update user information in the dashboard
function updateUserInfo(user) {
    // Update user name in sidebar
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = `Welcome, ${user.first_name || user.name || 'User'}`;
    }
    
    // Update user email in sidebar
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = user.email || 'user@example.com';
    }
    
    // Update user avatar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        if (user.profile_image) {
            userAvatar.src = user.profile_image;
        } else {
            // Use first letter of name as avatar
            const firstLetter = (user.first_name || user.name || 'U').charAt(0).toUpperCase();
            userAvatar.style.backgroundImage = 'none';
            userAvatar.style.backgroundColor = '#3F51B5';
            userAvatar.style.color = 'white';
            userAvatar.style.display = 'flex';
            userAvatar.style.alignItems = 'center';
            userAvatar.style.justifyContent = 'center';
            userAvatar.style.fontWeight = 'bold';
            userAvatar.style.fontSize = '24px';
            userAvatar.textContent = firstLetter;
        }
    }
}

// Update dashboard stats
function updateDashboardStats(stats) {
    const statElements = {
        totalRides: document.querySelector('.stat-card:nth-child(1) h3'),
        caretakerBookings: document.querySelector('.stat-card:nth-child(2) h3'),
        walletBalance: document.querySelector('.stat-card:nth-child(3) h3'),
        activeBookings: document.querySelector('.stat-card:nth-child(4) h3')
    };
    
    if (statElements.totalRides) {
        statElements.totalRides.textContent = stats.totalRides;
    }
    
    if (statElements.caretakerBookings) {
        statElements.caretakerBookings.textContent = stats.caretakerBookings;
    }
    
    if (statElements.walletBalance) {
        statElements.walletBalance.textContent = `₹${stats.walletBalance}`;
    }
    
    if (statElements.activeBookings) {
        statElements.activeBookings.textContent = stats.activeBookings;
    }
}

// Load dashboard data from API
async function loadDashboardData() {
    try {
        // Fetch dashboard stats
        const statsResponse = await fetch('/dashboard/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!statsResponse.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }
        
        const dashboardStats = await statsResponse.json();
        
        // Update dashboard stats with real data
        updateDashboardStats(dashboardStats);
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        
        // Show error message for stats
        const statCards = document.querySelectorAll('.stat-card h3');
        statCards.forEach(el => {
            el.textContent = '0';
        });
        
        // Show error message for recent activity
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Could not load recent activity.</div>';
        }
        
        if (typeof showNotification === 'function') {
            showNotification('Failed to load dashboard data. Please try refreshing the page.', 'error');
        }
    }
}

// Initialize booking form functionality
function initBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;
    
    // Get form elements
    const pickupInput = document.getElementById('pickup-location');
    const dropoffInput = document.getElementById('dropoff-location');
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    const serviceTypeInputs = document.querySelectorAll('input[name="service-type"]');
    const fareEstimateElement = document.getElementById('fare-estimate');
    const bookNowBtn = document.getElementById('book-now-btn');
    
    // Set default date and time (today + 1 hour)
    if (dateInput && timeInput) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate());
        
        // Format date as YYYY-MM-DD
        const formattedDate = tomorrow.toISOString().split('T')[0];
        dateInput.value = formattedDate;
        dateInput.min = formattedDate;
        
        // Set time to current time + 1 hour
        now.setHours(now.getHours() + 1);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
    
    // Add event listeners to form inputs for fare estimation
    if (pickupInput && dropoffInput) {
        [pickupInput, dropoffInput].forEach(input => {
            input.addEventListener('change', updateFareEstimate);
            input.addEventListener('blur', updateFareEstimate);
        });
    }
    
    // Add event listeners to service type inputs for fare estimation
    serviceTypeInputs.forEach(input => {
        input.addEventListener('change', updateFareEstimate);
    });
    
    // Handle form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createBooking();
    });
    
    // Book Now button click handler
    if (bookNowBtn) {
        bookNowBtn.addEventListener('click', function() {
            createBooking();
        });
    }
    
    // Function to update fare estimate
    function updateFareEstimate() {
        if (!pickupInput.value || !dropoffInput.value) return;
        
        // Show loading state
        if (fareEstimateElement) {
            fareEstimateElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating fare...';
        }
        
        // Get selected service type
        const serviceType = document.querySelector('input[name="service-type"]:checked')?.value || 'standard';
        
        // Calculate distance and fare (in a real app, this would be an API call)
        calculateFare(pickupInput.value, dropoffInput.value, serviceType)
            .then(result => {
                // Update fare estimate
                if (fareEstimateElement) {
                    fareEstimateElement.innerHTML = `
                        <div class="fare-details">
                            <div class="fare-item">
                                <span class="fare-label">Distance:</span>
                                <span class="fare-value">${result.distance} km</span>
                            </div>
                            <div class="fare-item">
                                <span class="fare-label">Duration:</span>
                                <span class="fare-value">${Math.floor(result.duration / 60)} mins</span>
                            </div>
                            <div class="fare-item fare-total">
                                <span class="fare-label">Estimated Fare:</span>
                                <span class="fare-value">₹${result.fare}</span>
                            </div>
                        </div>
                    `;
                }
                
                // Store fare details for booking
                bookingForm.dataset.distance = result.distance;
                bookingForm.dataset.duration = result.duration;
                bookingForm.dataset.fare = result.fare;
            })
            .catch(error => {
                console.error('Error calculating fare:', error);
                if (fareEstimateElement) {
                    fareEstimateElement.innerHTML = '<div class="error-message">Could not calculate fare. Please try again.</div>';
                }
            });
    }
    
    // Function to calculate fare
    function calculateFare(pickup, dropoff, serviceType) {
        return new Promise((resolve, reject) => {
            // In a real app, this would be an API call to a fare calculation service
            // For demo purposes, we'll generate random values
            setTimeout(() => {
                try {
                    // Generate random distance between 2 and 20 km
                    const distance = Math.floor(Math.random() * 18) + 2;
                    
                    // Calculate duration (approx. 2 mins per km)
                    const duration = distance * 120; // in seconds
                    
                    // Calculate fare based on service type and distance
                    let baseFare = 0;
                    let perKmRate = 0;
                    
                    switch (serviceType) {
                        case 'premium':
                            baseFare = 80;
                            perKmRate = 18;
                            break;
                        case 'shuttle':
                            baseFare = 30;
                            perKmRate = 8;
                            break;
                        default: // standard
                            baseFare = 50;
                            perKmRate = 12;
                            break;
                    }
                    
                    const fare = Math.floor(baseFare + (distance * perKmRate));
                    
                    resolve({
                        distance,
                        duration,
                        fare
                    });
                } catch (error) {
                    reject(error);
                }
            }, 1000);
        });
    }
    
    // Function to create a booking
    function createBooking() {
        // Validate form
        if (!pickupInput.value) {
            showToast('Please enter a pickup location', 'error');
            pickupInput.focus();
            return;
        }
        
        if (!dropoffInput.value) {
            showToast('Please enter a dropoff location', 'error');
            dropoffInput.focus();
            return;
        }
        
        if (!dateInput.value) {
            showToast('Please select a date', 'error');
            dateInput.focus();
            return;
        }
        
        if (!timeInput.value) {
            showToast('Please select a time', 'error');
            timeInput.focus();
            return;
        }
        
        // Get selected service type
        const serviceType = document.querySelector('input[name="service-type"]:checked')?.value || 'standard';
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            showToast('You must be logged in to book a ride', 'error');
            return;
        }
        
        // Show loading state
        const bookBtn = document.getElementById('book-now-btn');
        const originalBtnText = bookBtn.innerHTML;
        bookBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        bookBtn.disabled = true;
        
        // Get fare details from form dataset
        const distance = parseFloat(bookingForm.dataset.distance || '0');
        const duration = parseInt(bookingForm.dataset.duration || '0');
        const fare = parseInt(bookingForm.dataset.fare || '0');
        
        // Prepare booking data
        const bookingData = {
            service_type: serviceType,
            pickup_location: pickupInput.value,
            dropoff_location: dropoffInput.value,
            booking_date: dateInput.value,
            booking_time: timeInput.value,
            distance: distance,
            duration: duration,
            fare_amount: fare,
            payment_method: 'wallet' // Default payment method
        };
        
        // Send booking request to server
        fetch('/api/customer/create-booking', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Show success message
                showToast('Booking created successfully!', 'success');
                
                // Reset form
                bookingForm.reset();
                
                // Set default date and time again
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate());
                
                // Format date as YYYY-MM-DD
                const formattedDate = tomorrow.toISOString().split('T')[0];
                dateInput.value = formattedDate;
                
                // Set time to current time + 1 hour
                now.setHours(now.getHours() + 1);
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeInput.value = `${hours}:${minutes}`;
                
                // Clear fare estimate
                if (fareEstimateElement) {
                    fareEstimateElement.innerHTML = '';
                }
                
                // Show booking confirmation modal
                showBookingConfirmation(data.booking);
                
                // Refresh recent activity and booking history
                setTimeout(() => {
                    loadRecentActivity();
                    if (typeof loadBookingHistory === 'function') {
                        loadBookingHistory();
                    } else if (typeof loadBookingHistoryFallback === 'function') {
                        loadBookingHistoryFallback();
                    }
                }, 1000);
            } else {
                showToast(data.message || 'Failed to create booking', 'error');
            }
        })
        .catch(error => {
            console.error('Error creating booking:', error);
            showToast('Failed to create booking. Please try again.', 'error');
        })
        .finally(() => {
            // Reset button state
            bookBtn.innerHTML = originalBtnText;
            bookBtn.disabled = false;
        });
    }
    
    // Function to show booking confirmation
    function showBookingConfirmation(booking) {
        // Create modal container if it doesn't exist
        let modalContainer = document.getElementById('booking-confirmation-modal-container');
        
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'booking-confirmation-modal-container';
            document.body.appendChild(modalContainer);
        }
        
        // Format booking date and time
        const bookingDate = new Date(`${booking.booking_date}T${booking.booking_time}`);
        const formattedDate = bookingDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const formattedTime = bookingDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Set modal content
        modalContainer.innerHTML = `
            <div class="booking-confirmation-modal">
                <div class="booking-confirmation-header">
                    <h3>Booking Confirmed!</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="booking-confirmation-body">
                    <div class="booking-reference">
                        <span>Booking Reference:</span>
                        <strong>${booking.reference}</strong>
                    </div>
                    <div class="booking-details">
                        <div class="booking-detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${formattedTime}</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-car"></i>
                            <span>${booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1)}</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${booking.pickup_location}</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${booking.dropoff_location}</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-route"></i>
                            <span>${booking.distance} km</span>
                        </div>
                        <div class="booking-detail-item">
                            <i class="fas fa-money-bill"></i>
                            <span>₹${booking.fare_amount}</span>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <button class="btn btn-primary view-bookings-btn">View My Bookings</button>
                        <button class="btn btn-outline-primary close-modal">Close</button>
                    </div>
                </div>
            </div>
            <div class="modal-overlay"></div>
        `;
        
        // Show modal
        modalContainer.classList.add('active');
        
        // Add event listener to close button
        const closeButtons = modalContainer.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                modalContainer.classList.remove('active');
            });
        });
        
        // Add event listener to view bookings button
        const viewBookingsBtn = modalContainer.querySelector('.view-bookings-btn');
        if (viewBookingsBtn) {
            viewBookingsBtn.addEventListener('click', function() {
                // Close modal
                modalContainer.classList.remove('active');
                
                // Navigate to bookings tab
                const bookingsTab = document.querySelector('a[href="#bookings"]');
                if (bookingsTab) {
                    bookingsTab.click();
                } else {
                    window.location.hash = 'bookings';
                }
            });
        }
        
        // Close modal when clicking outside
        const overlay = modalContainer.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function() {
                modalContainer.classList.remove('active');
            });
        }
    }
}

// Initialize logout functionality
function initLogout() {
    const logoutLinks = document.querySelectorAll('.logout-link, .logout-button, a[href="/logout"]');
    
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

// Handle logout process
function handleLogout() {
    // Clear user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login.html';
}

// Update dashboard stats with real data
function updateDashboardStats(stats) {
    // Get all stat cards
    const totalRidesEl = document.querySelector('.stat-card:nth-child(1) h3');
    const caretakerBookingsEl = document.querySelector('.stat-card:nth-child(2) h3');
    const walletBalanceEl = document.querySelector('.stat-card:nth-child(3) h3');
    const avgRatingEl = document.querySelector('.stat-card:nth-child(4) h3');
    
    // For new users, initialize with zeros
    const totalRides = stats.total_rides || 0;
    const caretakerBookings = stats.caretaker_bookings || 0;
    const walletBalance = stats.wallet_balance || 0;
    const avgRating = stats.average_rating || 0;
    
    // Update the stats with animations
    if (totalRidesEl) animateCounter(totalRidesEl, totalRides);
    if (caretakerBookingsEl) animateCounter(caretakerBookingsEl, caretakerBookings);
    if (walletBalanceEl) animateCounter(walletBalanceEl, walletBalance, '₹');
    if (avgRatingEl) animateCounter(avgRatingEl, avgRating, '', 1); // 1 decimal place for rating
}

// Animate counter for statistics
function animateCounter(element, targetValue, prefix = '', decimals = 0) {
    if (!element) return;
    
    const duration = 1000; // 1 second animation
    const startTime = performance.now();
    const startValue = 0;
    
    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        
        if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            const currentValue = startValue + (targetValue - startValue) * progress;
            
            if (decimals > 0) {
                element.textContent = `${prefix}${currentValue.toFixed(decimals)}`;
            } else {
                element.textContent = `${prefix}${Math.floor(currentValue).toLocaleString()}`;
            }
            
            requestAnimationFrame(updateCounter);
        } else {
            if (decimals > 0) {
                element.textContent = `${prefix}${targetValue.toFixed(decimals)}`;
            } else {
                element.textContent = `${prefix}${Math.floor(targetValue).toLocaleString()}`;
            }
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Load recent activity
async function loadRecentActivity() {
    try {
        // Fetch recent bookings
        const response = await fetch('/booking?limit=3&sort=recent', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch recent activity');
        }
        
        const data = await response.json();
        const bookings = data.bookings || [];
        
        // Get activity list container
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;
        
        // Clear loading indicator
        activityList.innerHTML = '';
        
        // If no bookings, show empty state
        if (bookings.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-day"></i>
                    <p>No recent bookings found.</p>
                    <a href="#book-service" class="btn-primary">Book Your First Service</a>
                </div>
            `;
            return;
        }
        
        // Create activity items for each booking
        bookings.forEach(booking => {
            const date = new Date(booking.booking_date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric' 
            });
            
            const formattedTime = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
            
            const statusClass = getStatusClass(booking.status);
            const serviceIcon = getServiceIcon(booking.service_type);
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon ${booking.service_type}">
                    <i class="fas ${serviceIcon}"></i>
                </div>
                <div class="activity-details">
                    <h4>${capitalizeFirstLetter(booking.service_type)} Booking</h4>
                    <p>Booked ${booking.provider_first_name ? booking.provider_first_name : 'a service'} ${booking.service_type === 'driver' ? 'for' : booking.service_type === 'caretaker' ? 'for' : 'to'} ${booking.pickup_location}</p>
                    <div class="activity-meta">
                        <span class="activity-date">${formattedDate}, ${formattedTime}</span>
                        <span class="activity-status ${statusClass}">${capitalizeFirstLetter(booking.status)}</span>
                    </div>
                </div>
                <div class="activity-amount">
                    <h4>₹${parseFloat(booking.amount).toFixed(2)}</h4>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        
        // Show error message
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Could not load recent activity.</div>';
        }
    }
}

// Helper function to get status class
function getStatusClass(status) {
    switch (status) {
        case 'completed': return 'completed';
        case 'cancelled': return 'cancelled';
        case 'pending': return 'pending';
        case 'in_progress': return 'in-progress';
        default: return '';
    }
}

// Helper function to get service icon
function getServiceIcon(serviceType) {
    switch (serviceType) {
        case 'driver': return 'fa-car';
        case 'caretaker': return 'fa-user-nurse';
        case 'shuttle': return 'fa-shuttle-van';
        default: return 'fa-calendar-check';
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize tabs
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Check if there's a tab parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show the corresponding tab content
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Update URL with the tab parameter without refreshing the page
                const url = new URL(window.location);
                url.searchParams.set('tab', tabId.replace('-tab', ''));
                window.history.pushState({}, '', url);
                
                // Load tab-specific content if needed
                loadTabContent(tabId);
            }
        });
    });
    
    // Activate tab from URL parameter if it exists
    if (tabParam) {
        const tabButton = document.querySelector(`.tab-button[data-tab="${tabParam}-tab"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
}

// Load content specific to each tab
function loadTabContent(tabId) {
    switch(tabId) {
        case 'bookings-tab':
            // Bookings tab is handled by booking-management.js
            break;
        case 'wallet-tab':
            loadWalletData();
            break;
        case 'profile-tab':
            loadProfileData();
            break;
        case 'history-tab':
            loadRideHistory();
            break;
    }
}

// Load wallet data
async function loadWalletData() {
    try {
        const walletContainer = document.querySelector('#wallet-tab .wallet-container');
        if (!walletContainer) return;
        
        walletContainer.innerHTML = '<div class="loading">Loading wallet data...</div>';
        
        const response = await fetch('/customer/wallet', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch wallet data');
        }
        
        const walletData = await response.json();
        
        // Update wallet UI
        walletContainer.innerHTML = `
            <div class="wallet-card">
                <div class="wallet-balance">
                    <h3>Wallet Balance</h3>
                    <div class="balance-amount">₹${walletData.balance.toFixed(2)}</div>
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-primary add-money-btn">Add Money</button>
                </div>
            </div>
            <div class="transaction-history">
                <h3>Transaction History</h3>
                <div class="transactions-list">
                    ${walletData.transactions.length > 0 ? 
                        walletData.transactions.map(transaction => `
                            <div class="transaction-item ${transaction.type}">
                                <div class="transaction-icon">
                                    <i class="fas ${transaction.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                </div>
                                <div class="transaction-details">
                                    <div class="transaction-title">${transaction.description}</div>
                                    <div class="transaction-date">${new Date(transaction.created_at).toLocaleDateString()} ${new Date(transaction.created_at).toLocaleTimeString()}</div>
                                </div>
                                <div class="transaction-amount ${transaction.type}">
                                    ${transaction.type === 'credit' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
                                </div>
                            </div>
                        `).join('') : 
                        '<div class="no-transactions">No transactions yet</div>'
                    }
                </div>
            </div>
        `;
        
        // Add event listener for add money button
        const addMoneyBtn = walletContainer.querySelector('.add-money-btn');
        if (addMoneyBtn) {
            addMoneyBtn.addEventListener('click', showAddMoneyModal);
        }
        
    } catch (error) {
        console.error('Error loading wallet data:', error);
        const walletContainer = document.querySelector('#wallet-tab .wallet-container');
        if (walletContainer) {
            walletContainer.innerHTML = '<div class="error">Failed to load wallet data. Please try again.</div>';
        }
    }
}

// Show add money modal
function showAddMoneyModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('add-money-modal')) {
        const modal = document.createElement('div');
        modal.id = 'add-money-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Money to Wallet</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="add-money-form">
                        <div class="form-group">
                            <label for="amount">Amount (₹)</label>
                            <input type="number" id="amount" name="amount" min="100" step="100" required>
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <div class="payment-options">
                                <div class="payment-option">
                                    <input type="radio" id="payment-upi" name="payment_method" value="upi" checked>
                                    <label for="payment-upi"><i class="fas fa-mobile-alt"></i> UPI</label>
                                </div>
                                <div class="payment-option">
                                    <input type="radio" id="payment-card" name="payment_method" value="card">
                                    <label for="payment-card"><i class="fas fa-credit-card"></i> Card</label>
                                </div>
                                <div class="payment-option">
                                    <input type="radio" id="payment-netbanking" name="payment_method" value="netbanking">
                                    <label for="payment-netbanking"><i class="fas fa-university"></i> Net Banking</label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-primary proceed-btn">Proceed to Payment</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.querySelector('.proceed-btn').addEventListener('click', () => {
            const amount = document.getElementById('amount').value;
            const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
            
            if (amount < 100) {
                alert('Minimum amount is ₹100');
                return;
            }
            
            // Process payment
            processPayment(amount, paymentMethod);
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Show modal
    document.getElementById('add-money-modal').style.display = 'block';
}

// Process payment
async function processPayment(amount, paymentMethod) {
    try {
        // Show payment processing UI
        const modalBody = document.querySelector('#add-money-modal .modal-body');
        modalBody.innerHTML = `
            <div class="payment-processing">
                <div class="spinner"></div>
                <h3>Processing Payment</h3>
                <p>Please do not close this window...</p>
            </div>
        `;
        
        // Simulate payment processing
        setTimeout(async () => {
            try {
                // Send request to add money to wallet
                const response = await fetch('/customer/wallet/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        payment_method: paymentMethod
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Payment failed');
                }
                
                const result = await response.json();
                
                // Show success message
                modalBody.innerHTML = `
                    <div class="payment-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Payment Successful!</h3>
                        <p>₹${amount} has been added to your wallet.</p>
                        <p>Transaction ID: ${result.transaction_id}</p>
                    </div>
                `;
                
                // Update buttons
                document.querySelector('#add-money-modal .modal-footer').innerHTML = `
                    <button class="btn btn-primary done-btn">Done</button>
                `;
                
                document.querySelector('.done-btn').addEventListener('click', () => {
                    document.getElementById('add-money-modal').style.display = 'none';
                    // Reload wallet data
                    loadWalletData();
                });
                
            } catch (error) {
                console.error('Payment error:', error);
                
                // Show error message
                modalBody.innerHTML = `
                    <div class="payment-error">
                        <i class="fas fa-times-circle"></i>
                        <h3>Payment Failed</h3>
                        <p>${error.message || 'Something went wrong. Please try again.'}</p>
                    </div>
                `;
                
                // Update buttons
                document.querySelector('#add-money-modal .modal-footer').innerHTML = `
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-primary retry-btn">Retry</button>
                `;
                
                document.querySelector('.cancel-btn').addEventListener('click', () => {
                    document.getElementById('add-money-modal').style.display = 'none';
                });
                
                document.querySelector('.retry-btn').addEventListener('click', () => {
                    showAddMoneyModal();
                });
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Payment processing failed. Please try again.');
    }
}

// Load profile data
function loadProfileData() {
    // Profile data is loaded from session storage
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    const profileContainer = document.querySelector('#profile-tab .profile-container');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">
                <img src="${userData.profile_photo || '../public/images/default-avatar.png'}" alt="Profile Photo">
                <a href="/edit-profile" class="edit-avatar-btn"><i class="fas fa-camera"></i></a>
            </div>
            <div class="profile-info">
                <h2>${userData.first_name || ''} ${userData.last_name || ''}</h2>
                <p>${userData.email || ''}</p>
                <p>${userData.phone || ''}</p>
                <div class="verification-badges">
                    ${userData.is_email_verified ? '<span class="verified"><i class="fas fa-check-circle"></i> Email Verified</span>' : '<span class="unverified"><i class="fas fa-times-circle"></i> Email Not Verified</span>'}
                    ${userData.is_phone_verified ? '<span class="verified"><i class="fas fa-check-circle"></i> Phone Verified</span>' : '<span class="unverified"><i class="fas fa-times-circle"></i> Phone Not Verified</span>'}
                </div>
            </div>
        </div>
        <div class="profile-actions">
            <a href="/edit-profile" class="btn btn-primary"><i class="fas fa-edit"></i> Edit Profile</a>
        </div>
        <div class="profile-details">
            <div class="detail-item">
                <span class="detail-label">Member Since</span>
                <span class="detail-value">${new Date(userData.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">${userData.address || 'Not provided'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Emergency Contact</span>
                <span class="detail-value">${userData.emergency_contact_name ? userData.emergency_contact_name + ' - ' + userData.emergency_contact_phone : 'Not provided'}</span>
            </div>
        </div>
    `;
}

// Load ride history
async function loadRideHistory() {
    try {
        const historyContainer = document.querySelector('#history-tab .history-container');
        if (!historyContainer) return;
        
        historyContainer.innerHTML = '<div class="loading">Loading ride history...</div>';
        
        const response = await fetch('/customer/ride-history', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch ride history');
        }
        
        const historyData = await response.json();
        
        if (historyData.rides.length === 0) {
            historyContainer.innerHTML = '<div class="no-history">You have no ride history yet.</div>';
            return;
        }
        
        // Render ride history
        historyContainer.innerHTML = `
            <div class="history-list">
                ${historyData.rides.map(ride => `
                    <div class="history-item">
                        <div class="ride-date">
                            <div class="date">${new Date(ride.booking_date).toLocaleDateString()}</div>
                            <div class="time">${new Date(ride.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div class="ride-details">
                            <div class="ride-type">${ride.service_type}</div>
                            <div class="ride-route">
                                <div class="pickup">
                                    <i class="fas fa-map-marker-alt pickup-icon"></i>
                                    <span>${ride.pickup_location}</span>
                                </div>
                                <div class="route-line"></div>
                                <div class="dropoff">
                                    <i class="fas fa-map-marker-alt dropoff-icon"></i>
                                    <span>${ride.dropoff_location || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="ride-info">
                            <div class="ride-status ${ride.status}">${ride.status}</div>
                            <div class="ride-amount">₹${ride.amount.toFixed(2)}</div>
                            <button class="btn btn-sm btn-outline view-details-btn" data-id="${ride.id}">View Details</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners to view details buttons
        historyContainer.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', () => {
                const rideId = button.getAttribute('data-id');
                openBookingDetails(rideId);
            });
        });
        
    } catch (error) {
        console.error('Error loading ride history:', error);
        const historyContainer = document.querySelector('#history-tab .history-container');
        if (historyContainer) {
            historyContainer.innerHTML = '<div class="error">Failed to load ride history. Please try again.</div>';
        }
    }
}

// Initialize user location
function initUserLocation() {
    // Get location button
    const locationBtn = document.querySelector('.location-btn');
    if (!locationBtn) return;
    
    // Try to get location from browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                // Get address from coordinates using reverse geocoding
                const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    const address = data.results[0].formatted_address;
                    const city = data.results[0].address_components.find(component => 
                        component.types.includes('locality')
                    )?.long_name || '';
                    
                    // Update location button text
                    locationBtn.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${city}`;
                    
                    // Store location in session storage
                    sessionStorage.setItem('userLocation', JSON.stringify({
                        latitude,
                        longitude,
                        address,
                        city
                    }));
                }
            } catch (error) {
                console.error('Error getting address from coordinates:', error);
            }
        }, (error) => {
            console.error('Error getting user location:', error);
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}

// Initialize user data
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
        
        // If we have user data, update the UI
        if (userData) {
            // Update user profile in sidebar
            document.getElementById('user-name').textContent = `${userData.first_name} ${userData.last_name}`;
            
            // Update profile information in the UI
            updateProfileInfo(userData);
            
            // Fetch additional user data
            fetchUserStats();
        }
    } catch (error) {
        console.error('Error initializing user data:', error);
        showToast('Error loading user data. Please refresh the page.', 'error');
    }
}

// Update profile information in the UI
function updateProfileInfo(user) {
    // Update profile name
    const profileNameElements = document.querySelectorAll('.profile-name');
    profileNameElements.forEach(element => {
        if (element) element.textContent = `${user.first_name || ''} ${user.last_name || ''}`;
    });
    
    // Update profile email
    const profileEmailElements = document.querySelectorAll('.profile-email');
    profileEmailElements.forEach(element => {
        if (element) element.textContent = user.email || '';
    });
    
    // Update profile phone
    const profilePhoneElements = document.querySelectorAll('.profile-phone');
    profilePhoneElements.forEach(element => {
        if (element) element.textContent = user.phone || '';
    });
    
    // Update welcome name
    const welcomeNameElement = document.getElementById('welcome-name');
    if (welcomeNameElement) welcomeNameElement.textContent = user.first_name || 'User';
    
    // Update profile image
    const profileImageElements = document.querySelectorAll('.profile-image');
    profileImageElements.forEach(element => {
        if (element) {
            if (user.profile_image) {
                element.src = user.profile_image;
            } else {
                element.src = '/images/default-profile.png';
            }
        }
    });
}

// Initialize edit profile functionality
function initEditProfile() {
    // Get edit profile form
    const editProfileForm = document.getElementById('edit-profile-form');
    if (!editProfileForm) return;
    
    // Get edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // Show edit profile modal
            const profileModal = document.getElementById('edit-profile-modal');
            if (profileModal) {
                // Populate form with current user data
                const firstNameInput = document.getElementById('profile-first-name');
                const lastNameInput = document.getElementById('profile-last-name');
                const emailInput = document.getElementById('profile-email');
                const phoneInput = document.getElementById('profile-phone');
                
                if (firstNameInput) firstNameInput.value = userData.first_name || '';
                if (lastNameInput) lastNameInput.value = userData.last_name || '';
                if (emailInput) emailInput.value = userData.email || '';
                if (phoneInput) phoneInput.value = userData.phone || '';
                
                // Show modal
                profileModal.classList.add('show');
            }
        });
    }
    
    // Handle form submission
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(editProfileForm);
            const updatedProfile = {
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };
            
            // Get token from localStorage
            const token = localStorage.getItem('token');
            
            if (!token) {
                showToast('You must be logged in to update your profile', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = editProfileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;
            
            // Send update request to server
            fetch('/api/user/update-profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedProfile)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update user data in localStorage
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const updatedUser = { ...currentUser, ...updatedProfile };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    
                    // Update userData variable
                    userData = { ...userData, ...updatedProfile };
                    
                    // Update profile info in UI
                    updateProfileInfo(userData);
                    
                    // Show success message
                    showToast('Profile updated successfully', 'success');
                    
                    // Close modal
                    const profileModal = document.getElementById('edit-profile-modal');
                    if (profileModal) {
                        profileModal.classList.remove('show');
                    }
                } else {
                    showToast(data.message || 'Failed to update profile', 'error');
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showToast('Failed to update profile. Please try again.', 'error');
            })
            .finally(() => {
                // Reset button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
        });
    }
    
    // Close modal when clicking close button or outside the modal
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// Get user location from browser
function getLocationFromBrowser() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            error => {
                // If user denies permission, use a default location (Bangalore)
                if (error.code === error.PERMISSION_DENIED) {
                    resolve({
                        latitude: 12.9716,
                        longitude: 77.5946,
                        accuracy: 1000,
                        isDefault: true
                    });
                } else {
                    reject(error);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
}

// Update user location
function updateUserLocation(location) {
    // Update user data
    userData.location = location;

    // If map is initialized, update marker
    if (map && userMarker) {
        userMarker.setPosition({
            lat: location.latitude,
            lng: location.longitude
        });

        // Center map on user location
        map.setCenter({
            lat: location.latitude,
            lng: location.longitude
        });
    }

    // If this is a default location, show a message
    if (location.isDefault) {
        showToast('Using default location. Enable location services for better accuracy.', 'warning');
    }
}

// Initialize Google Maps
function initMap() {
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded');
        return;
    }

    
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    
    // Default location (Bangalore)
    const defaultLocation = { lat: 12.9716, lng: 77.5946 };
    
    // Create map
    const map = new google.maps.Map(mapContainer, {
        center: defaultLocation,
        zoom: 13,
        styles: [
            {
                "featureType": "administrative",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#444444"}]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [{"color": "#f2f2f2"}]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [{"saturation": -100}, {"lightness": 45}]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [{"visibility": "simplified"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [{"color": "#5B6EF5"}, {"visibility": "on"}]
            }
        ]
    });
    
    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                map.setCenter(userLocation);
                
                // Add marker for user location
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#5B6EF5',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    },
                    title: 'Your Location'
                });
                
                // Add nearby service providers (sample data)
                addNearbyProviders(map, userLocation);
            },
            () => {
                console.log('Error: The Geolocation service failed.');
                // Use default location
                addNearbyProviders(map, defaultLocation);
            }
        );
    } else {
        console.log('Error: Your browser doesn\'t support geolocation.');
        // Use default location
        addNearbyProviders(map, defaultLocation);
    }
}

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-content');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Prevent default for internal links
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(link => link.parentElement.classList.remove('active'));
                
                // Add active class to clicked link
                this.parentElement.classList.add('active');
                
                // Hide all sections
                sections.forEach(section => section.classList.add('hidden'));
                
                // Show corresponding section
                const targetId = this.getAttribute('href').substring(1) + '-section';
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
            }
        });
    });
    
    // Toggle sidebar on mobile
    const toggleSidebar = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

// Initialize notifications panel
function initNotifications() {
    const notificationBell = document.querySelector('.notification-bell');
    const notificationPanel = document.getElementById('notification-panel');
    const closeNotifications = document.querySelector('.close-notifications');
    const markAllRead = document.querySelector('.mark-all-read');
    const markReadButtons = document.querySelectorAll('.mark-read-btn');
    
    if (notificationBell && notificationPanel) {
        // Toggle notification panel
        notificationBell.addEventListener('click', function() {
            notificationPanel.classList.toggle('active');
        });
        
        // Close notification panel
        if (closeNotifications) {
            closeNotifications.addEventListener('click', function() {
                notificationPanel.classList.remove('active');
            });
        }
        
        // Mark all notifications as read
        if (markAllRead) {
            markAllRead.addEventListener('click', function() {
                const unreadItems = document.querySelectorAll('.notification-item.unread');
                unreadItems.forEach(item => item.classList.remove('unread'));
                document.querySelector('.notification-count').textContent = '0';
            });
        }
        
        // Mark individual notification as read
        markReadButtons.forEach(button => {
            button.addEventListener('click', function() {
                const notificationItem = this.closest('.notification-item');
                if (notificationItem.classList.contains('unread')) {
                    notificationItem.classList.remove('unread');
                    
                    // Update notification count
                    const countElement = document.querySelector('.notification-count');
                    const currentCount = parseInt(countElement.textContent);
                    countElement.textContent = Math.max(0, currentCount - 1);
                }
            });
        });
    }
}

// Initialize quick action buttons
function initQuickActions() {
    const quickActionButtons = document.querySelectorAll('.action-btn');
    
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Navigate to book service section
            const navLinks = document.querySelectorAll('.sidebar-nav a');
            navLinks.forEach(link => link.parentElement.classList.remove('active'));
            
            const bookServiceLink = document.querySelector('.sidebar-nav a[href="#book-service"]');
            if (bookServiceLink) {
                bookServiceLink.parentElement.classList.add('active');
            }
            
            // Hide all sections
            const sections = document.querySelectorAll('.dashboard-content');
            sections.forEach(section => section.classList.add('hidden'));
            
            // Show book service section
            const bookServiceSection = document.getElementById('book-service-section');
            if (bookServiceSection) {
                bookServiceSection.classList.remove('hidden');
            }
            
            // Select appropriate service based on button clicked
            if (this.classList.contains('driver-btn')) {
                selectService('driver');
            } else if (this.classList.contains('caretaker-btn')) {
                selectService('caretaker');
            } else if (this.classList.contains('shuttle-btn')) {
                selectService('shuttle');
            }
        });
    });
}

// Initialize service selection
function initServiceSelection() {
    const serviceCards = document.querySelectorAll('.service-card');
    const selectButtons = document.querySelectorAll('.select-service-btn');
    
    // Handle service card selection
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            const serviceType = this.getAttribute('data-service');
            selectService(serviceType);
        });
    });
    
    // Handle select button clicks
    selectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering the card click event
            
            const serviceCard = this.closest('.service-card');
            const serviceType = serviceCard.getAttribute('data-service');
            selectService(serviceType);
        });
    });
    
    // Handle book now buttons in nearby list
    const bookNowButtons = document.querySelectorAll('.book-now-btn');
    bookNowButtons.forEach(button => {
        button.addEventListener('click', function() {
            const nearbyItem = this.closest('.nearby-item');
            const providerName = nearbyItem.querySelector('h4').textContent;
            const providerType = nearbyItem.querySelector('p').textContent.split('•')[0].trim().toLowerCase();
            
            // Navigate to book service section
            const navLinks = document.querySelectorAll('.sidebar-nav a');
            navLinks.forEach(link => link.parentElement.classList.remove('active'));
            
            const bookServiceLink = document.querySelector('.sidebar-nav a[href="#book-service"]');
            if (bookServiceLink) {
                bookServiceLink.parentElement.classList.add('active');
            }
            
            // Hide all sections
            const sections = document.querySelectorAll('.dashboard-content');
            sections.forEach(section => section.classList.add('hidden'));
            
            // Show book service section
            const bookServiceSection = document.getElementById('book-service-section');
            if (bookServiceSection) {
                bookServiceSection.classList.remove('hidden');
            }
            
            // Select appropriate service
            if (providerType.includes('driver')) {
                selectService('driver', providerName);
            } else if (providerType.includes('caretaker')) {
                selectService('caretaker', providerName);
            } else if (providerType.includes('shuttle')) {
                selectService('shuttle', providerName);
            }
        });
    });
}

// Select a service and show booking form
function selectService(serviceType, providerName = null) {
    // Highlight selected service card
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        if (card.getAttribute('data-service') === serviceType) {
            card.style.borderColor = '#5B6EF5';
            card.style.boxShadow = '0 8px 16px rgba(91, 110, 245, 0.2)';
        } else {
            card.style.borderColor = '';
            card.style.boxShadow = '';
        }
    });
    
    // Show booking form
    const bookingFormContainer = document.getElementById('booking-form');
    if (bookingFormContainer) {
        bookingFormContainer.classList.remove('hidden');
        
        // Create booking form based on service type
        let formHtml = '';
        
        switch(serviceType) {
            case 'driver':
                formHtml = createDriverBookingForm(providerName);
                break;
            case 'caretaker':
                formHtml = createCaretakerBookingForm(providerName);
                break;
            case 'shuttle':
                formHtml = createShuttleBookingForm(providerName);
                break;
            default:
                formHtml = '<p>Service not available</p>';
        }
        
        bookingFormContainer.innerHTML = formHtml;
        
        // Initialize form functionality
        initBookingForm(serviceType);
    }
}

// Create driver booking form
function createDriverBookingForm(providerName) {
    return `
        <h3>Book a Driver</h3>
        <p class="form-subtitle">Fill in the details to book a personal driver</p>
        
        <form id="driver-booking-form" class="booking-form">
            <div class="form-group">
                <label for="pickup-location">Pickup Location</label>
                <input type="text" id="pickup-location" placeholder="Enter pickup location" required>
            </div>
            
            <div class="form-group">
                <label for="destination">Destination</label>
                <input type="text" id="destination" placeholder="Enter destination" required>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label for="pickup-date">Pickup Date</label>
                    <input type="date" id="pickup-date" required>
                </div>
                
                <div class="form-group half">
                    <label for="pickup-time">Pickup Time</label>
                    <input type="time" id="pickup-time" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="duration">Duration (hours)</label>
                <select id="duration" required>
                    <option value="">Select duration</option>
                    <option value="2">2 hours</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="12">12 hours</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="driver-preference">Driver Preference</label>
                <select id="driver-preference">
                    <option value="">No preference</option>
                    <option value="${providerName || ''}" ${providerName ? 'selected' : ''}>${providerName || 'Select a driver'}</option>
                    <option value="Rahul S.">Rahul S.</option>
                    <option value="Vikram P.">Vikram P.</option>
                    <option value="Suresh K.">Suresh K.</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="vehicle-type">Vehicle Type</label>
                <select id="vehicle-type" required>
                    <option value="">Select vehicle type</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="luxury">Luxury</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="special-instructions">Special Instructions</label>
                <textarea id="special-instructions" rows="3" placeholder="Any special instructions for the driver"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="submit-btn">Book Now</button>
            </div>
        </form>
    `;
}

// Create caretaker booking form
function createCaretakerBookingForm(providerName) {
    return `
        <h3>Book a Caretaker</h3>
        <p class="form-subtitle">Fill in the details to book a medical caretaker</p>
        
        <form id="caretaker-booking-form" class="booking-form">
            <div class="form-group">
                <label for="service-location">Service Location</label>
                <input type="text" id="service-location" placeholder="Enter service location" required>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label for="service-date">Service Date</label>
                    <input type="date" id="service-date" required>
                </div>
                
                <div class="form-group half">
                    <label for="service-time">Service Time</label>
                    <input type="time" id="service-time" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="service-duration">Duration (hours)</label>
                <select id="service-duration" required>
                    <option value="">Select duration</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="caretaker-preference">Caretaker Preference</label>
                <select id="caretaker-preference">
                    <option value="">No preference</option>
                    <option value="${providerName || ''}" ${providerName ? 'selected' : ''}>${providerName || 'Select a caretaker'}</option>
                    <option value="Priya M.">Priya M.</option>
                    <option value="Anita R.">Anita R.</option>
                    <option value="Rajesh S.">Rajesh S.</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="service-type">Service Type</label>
                <select id="service-type" required>
                    <option value="">Select service type</option>
                    <option value="elderly">Elderly Care</option>
                    <option value="patient">Patient Care</option>
                    <option value="child">Child Care</option>
                    <option value="physiotherapy">Physiotherapy</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="medical-conditions">Medical Conditions</label>
                <textarea id="medical-conditions" rows="3" placeholder="Describe any medical conditions or requirements"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="submit-btn">Book Now</button>
            </div>
        </form>
    `;
}

// Create shuttle booking form
function createShuttleBookingForm(providerName) {
    return `
        <h3>Book a Shuttle</h3>
        <p class="form-subtitle">Fill in the details to book a shuttle service</p>
        
        <form id="shuttle-booking-form" class="booking-form">
            <div class="form-group">
                <label for="shuttle-pickup">Pickup Location</label>
                <input type="text" id="shuttle-pickup" placeholder="Enter pickup location" required>
            </div>
            
            <div class="form-group">
                <label for="shuttle-destination">Destination</label>
                <input type="text" id="shuttle-destination" placeholder="Enter destination" required>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label for="shuttle-date">Travel Date</label>
                    <input type="date" id="shuttle-date" required>
                </div>
                
                <div class="form-group half">
                    <label for="shuttle-time">Travel Time</label>
                    <input type="time" id="shuttle-time" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label for="passenger-count">Number of Passengers</label>
                    <select id="passenger-count" required>
                        <option value="">Select</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6+">6+</option>
                    </select>
                </div>
                
                <div class="form-group half">
                    <label for="luggage-count">Luggage Items</label>
                    <select id="luggage-count">
                        <option value="">Select</option>
                        <option value="0">None</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4+">4+</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="shuttle-service">Shuttle Service</label>
                <select id="shuttle-service" required>
                    <option value="">Select shuttle service</option>
                    <option value="${providerName || ''}" ${providerName ? 'selected' : ''}>${providerName || 'Select a shuttle'}</option>
                    <option value="City Shuttle">City Shuttle</option>
                    <option value="Airport Express">Airport Express</option>
                    <option value="Corporate Shuttle">Corporate Shuttle</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="shuttle-notes">Special Requirements</label>
                <textarea id="shuttle-notes" rows="3" placeholder="Any special requirements for your journey"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="submit-btn">Book Now</button>
            </div>
        </form>
    `;
}

// Initialize booking form functionality
function initBookingForm(serviceType) {
    const bookingForm = document.querySelector(`#${serviceType}-booking-form`);
    
    if (bookingForm) {
        // Initialize Google Places Autocomplete for location inputs
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined' && typeof google.maps.places !== 'undefined') {
            const locationInputs = bookingForm.querySelectorAll('input[type="text"]');
            
            locationInputs.forEach(input => {
                if (input.id.includes('location') || input.id.includes('pickup') || input.id.includes('destination')) {
                    const autocomplete = new google.maps.places.Autocomplete(input, {
                        componentRestrictions: { country: 'in' }
                    });
                }
            });
        }
        
        // Form submission
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show confirmation message
            const bookingFormContainer = document.getElementById('booking-form');
            
            if (bookingFormContainer) {
                bookingFormContainer.innerHTML = `
                    <div class="booking-confirmation">
                        <div class="confirmation-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Booking Confirmed!</h3>
                        <p>Your ${serviceType} booking has been confirmed. You will receive a confirmation email shortly.</p>
                        <button class="back-to-dashboard">Back to Dashboard</button>
                    </div>
                `;
                
                // Back to dashboard button
                const backButton = document.querySelector('.back-to-dashboard');
                if (backButton) {
                    backButton.addEventListener('click', function() {
                        // Navigate to dashboard
                        const navLinks = document.querySelectorAll('.sidebar-nav a');
                        navLinks.forEach(link => link.parentElement.classList.remove('active'));
                        
                        const dashboardLink = document.querySelector('.sidebar-nav a[href="#dashboard"]');
                        if (dashboardLink) {
                            dashboardLink.parentElement.classList.add('active');
                        }
                        
                        // Hide all sections
                        const sections = document.querySelectorAll('.dashboard-content');
                        sections.forEach(section => section.classList.add('hidden'));
                        
                        // Show dashboard section
                        const dashboardSection = document.getElementById('dashboard-section');
                        if (dashboardSection) {
                            dashboardSection.classList.remove('hidden');
                        }
                    });
                }
            }
        });
    }
}

// Initialize ratings functionality
function initRatings() {
    // Add rating section to completed bookings
    const completedBookings = document.querySelectorAll('.booking-item.completed');
    
    if (completedBookings.length > 0) {
        completedBookings.forEach(booking => {
            // Check if booking has already been rated
            const isRated = booking.querySelector('.rating-stars') !== null;
            
            if (!isRated) {
                const bookingId = booking.dataset.bookingId || '1'; // Fallback to 1 for demo
                const bookingType = booking.dataset.bookingType || 'driver'; // Fallback to driver for demo
                
                // Add rating button
                const actionsContainer = booking.querySelector('.booking-actions');
                
                if (actionsContainer) {
                    const rateButton = document.createElement('button');
                    rateButton.className = 'rate-booking-btn';
                    rateButton.innerHTML = '<i class="fas fa-star"></i> Rate';
                    
                    rateButton.addEventListener('click', function() {
                        showRatingModal(bookingId, bookingType);
                    });
                    
                    actionsContainer.appendChild(rateButton);
                }
            }
        });
    }
    
    // Add event listener for notification rating requests
    const ratingNotifications = document.querySelectorAll('.notification-item .notification-content p');
    
    if (ratingNotifications.length > 0) {
        ratingNotifications.forEach(notification => {
            if (notification.textContent.includes('rate your experience')) {
                const notificationItem = notification.closest('.notification-item');
                
                if (notificationItem) {
                    notificationItem.addEventListener('click', function() {
                        // Extract booking info from notification (in a real app, this would be more structured)
                        const bookingId = '1'; // Demo ID
                        const bookingType = 'driver'; // Demo type
                        
                        showRatingModal(bookingId, bookingType);
                    });
                }
            }
        });
    }
}

// Add nearby service providers to the map
function addNearbyProviders(map, userLocation) {
    // Clear existing markers
    if (nearbyProviders && nearbyProviders.length > 0) {
        nearbyProviders.forEach(marker => marker.setMap(null));
    }
    nearbyProviders = [];
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No authentication token found');
        return;
    }
    
    // Get selected service type
    const serviceType = document.querySelector('input[name="service-type"]:checked')?.value || 'standard';
    
    // Fetch nearby providers from server
    fetch('/api/drivers/nearby', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            service_type: serviceType,
            radius: 3 // 3km radius
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.drivers && data.drivers.length > 0) {
            // Add markers for each provider
            data.drivers.forEach(driver => {
                // Create marker
                const marker = new google.maps.Marker({
                    position: {
                        lat: driver.latitude,
                        lng: driver.longitude
                    },
                    map: map,
                    icon: {
                        url: `/images/car-marker.png`,
                        scaledSize: new google.maps.Size(30, 30)
                    },
                    title: `${driver.first_name} ${driver.last_name || ''}`
                });
                
                // Create info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div class="provider-info">
                            <h4>${driver.first_name} ${driver.last_name || ''}</h4>
                            <div class="provider-rating">
                                <i class="fas fa-star"></i>
                                <span>${driver.average_rating || '4.5'}</span>
                            </div>
                            <div class="provider-vehicle">
                                <i class="fas fa-car"></i>
                                <span>${driver.vehicle_make || ''} ${driver.vehicle_model || ''}</span>
                            </div>
                            <div class="provider-distance">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${driver.distance ? (driver.distance).toFixed(1) + ' km away' : 'Nearby'}</span>
                            </div>
                        </div>
                    `
                });
                
                // Add click event listener to marker
                marker.addListener('click', () => {
                    // Close all other info windows
                    nearbyProviders.forEach(m => {
                        if (m.infoWindow) {
                            m.infoWindow.close();
                        }
                    });
                    
                    // Open this info window
                    infoWindow.open(map, marker);
                    
                    // Store reference to info window
                    marker.infoWindow = infoWindow;
                });
                
                // Add marker to array
                marker.infoWindow = infoWindow;
                nearbyProviders.push(marker);
            });
            
            // Update provider count in UI
            const providerCountElement = document.getElementById('provider-count');
            if (providerCountElement) {
                providerCountElement.textContent = data.drivers.length;
            }
            
            // Show success message if showToast function exists
            if (typeof showToast === 'function') {
                showToast(`Found ${data.drivers.length} service providers nearby`, 'success');
            }
        } else {
            // No providers found
            console.log('No service providers found nearby');
            
            // Update provider count in UI
            const providerCountElement = document.getElementById('provider-count');
            if (providerCountElement) {
                providerCountElement.textContent = '0';
            }
            
            // Show message if showToast function exists
            if (typeof showToast === 'function') {
                showToast('No service providers found nearby. Try a different service type or location.', 'info');
            }
        }
    })
    .catch(error => {
        console.error('Error fetching nearby providers:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to fetch nearby service providers. Please try again.', 'error');
        }
    });
}

// Show rating modal
function showRatingModal(bookingId, bookingType) {
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('rating-modal-container');
    
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'rating-modal-container';
        document.body.appendChild(modalContainer);
    }
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="rating-modal">
            <div class="rating-modal-header">
                <h3>Rate Your Experience</h3>
                <button class="close-rating-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="rating-modal-body">
                <div id="rating-component-container"></div>
            </div>
        </div>
        <div class="rating-modal-overlay"></div>
    `;
    
    // Show modal
    modalContainer.classList.add('active');
    
    // Initialize rating component
    const ratingComponent = new RatingComponent({
        containerId: 'rating-component-container',
        bookingId: bookingId,
        bookingType: bookingType,
        onRatingSubmit: function(rating, review) {
            // Close modal after a short delay
            setTimeout(() => {
                closeRatingModal();
                
                // Show success notification
                showNotification('Thank you for your rating!', 'success');
                
                // Update UI to show the booking has been rated
                const booking = document.querySelector(`.booking-item[data-booking-id="${bookingId}"]`);
                
                if (booking) {
                    const rateButton = booking.querySelector('.rate-booking-btn');
                    
                    if (rateButton) {
                        rateButton.innerHTML = '<i class="fas fa-star"></i> Rated';
                        rateButton.disabled = true;
                        rateButton.classList.add('rated');
                    }
                }
            }, 2000);
        }
    });
    
    // Close button event
    const closeButton = document.querySelector('.close-rating-modal');
    const overlay = document.querySelector('.rating-modal-overlay');
    
    if (closeButton) {
        closeButton.addEventListener('click', closeRatingModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeRatingModal);
    }
}

// Close rating modal
function closeRatingModal() {
    const modalContainer = document.getElementById('rating-modal-container');
    
    if (modalContainer) {
        modalContainer.classList.remove('active');
    }
}

// Load recent activity from server
async function loadRecentActivity() {
    const activityContainer = document.querySelector('.activity-list');
    
    if (!activityContainer) {
        console.error('Activity container not found');
        return;
    }
    
    // Show loading state
    activityContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No authentication token found');
        activityContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Authentication error. Please log in again.</div>';
        return;
    }
    
    try {
        // Fetch recent activity from server
        const response = await fetch('/api/customer/recent-activity', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.activities && data.activities.length > 0) {
            // Update recent activity with real data
            updateRecentActivity(data.activities);
        } else {
            // No activities found
            activityContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Recent Activity</h3>
                    <p>Your recent activities will appear here.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span>Could not load recent activity. Please try again later.</span>
            </div>
        `;
    }
}

// Update recent activity in the UI
function updateRecentActivity(activities) {
    const activityContainer = document.querySelector('.activity-list');
    
    if (!activityContainer) {
        console.error('Activity container not found');
        return;
    }
    
    // Clear container
    activityContainer.innerHTML = '';
    
    // Add activities to container
    activities.forEach(activity => {
        // Format timestamp
        const timestamp = new Date(activity.timestamp);
        const now = new Date();
        
        // Format relative time
        let timeString = '';
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) {
            timeString = 'Just now';
        } else if (diffMins < 60) {
            timeString = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffHours < 24) {
            timeString = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffDays < 7) {
            timeString = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        } else {
            timeString = timestamp.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        
        // Create activity item
        const activityItem = document.createElement('div');
        activityItem.className = `activity-item ${activity.status || 'info'}`;
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${timeString}</div>
            </div>
        `;
        
        activityContainer.appendChild(activityItem);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = `toast-notification ${type}`;
    notificationContainer.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
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
