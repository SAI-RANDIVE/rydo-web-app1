/**
 * Driver Dashboard JavaScript
 * Handles all driver dashboard functionality including ride requests, status toggling, and earnings
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (checkUserSession()) {
        // Initialize driver data
        initDriverData();
        
        // Initialize navigation
        initNavigation();
        
        // Initialize status toggle
        initStatusToggle();
        
        // Initialize notification panel
        initNotifications();
        
        // Initialize earnings charts
        initEarningsCharts();
        
        // Initialize withdraw functionality
        initWithdraw();
        
        // Initialize ride actions
        initRideActions();
        
        // Initialize real-time ride requests
        initRealTimeRequests();
        
        // Initialize map if available
        if (typeof initDriverMap === 'function') {
            initDriverMap();
        }
        
        // Initialize ride history
        loadRideHistory();
        
        // Initialize logout functionality
        initLogout();
    }
});

// Global variables
let driverData = {};
let currentRide = null;
let rideRequestTimer = null;

// Earnings data for charts
const earningsData = {
    weekly: [320, 450, 280, 390, 420, 380, 450],
    monthly: [1200, 1450, 1320, 1500, 1380, 1600, 1450, 1320, 1500, 1380, 1600, 1450],
    yearly: [8500, 9200, 8700, 9500, 10200, 9800, 10500, 11200, 10800, 11500, 12200, 11800]
};

/**
 * Check if user is logged in
 * @returns {boolean} - Whether user is logged in and is a driver
 */
function checkUserSession() {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'driver') {
        // Redirect to login if not authenticated or not a driver
        window.location.href = '/login.html';
        return false;
    }
    
    // Update user info in the dashboard
    updateDriverInfo(user);
    return true;
}

/**
 * Initialize logout functionality
 */
function initLogout() {
    const logoutLinks = document.querySelectorAll('.logout a, .logout-button');
    
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

/**
 * Handle logout process
 */
function handleLogout() {
    // Clear user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login.html';
}

/**
 * Update driver information in the dashboard
 * @param {Object} user - User data from localStorage
 */
function updateDriverInfo(user) {
    // Set global driver data
    driverData = {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Driver',
        email: user.email || 'driver@example.com',
        phone: user.phone || '+91 9876543210',
        rating: user.rating || 4.9,
        totalEarnings: user.total_earnings || 8450,
        totalRides: user.total_rides || 32,
        hoursOnline: user.hours_online || 124,
        location: user.location || 'Bangalore, India',
        status: user.status || 'online',
        vehicle: user.vehicle || {
            type: 'Sedan',
            model: 'Honda City',
            year: '2022',
            color: 'White',
            registrationNumber: 'KA 01 AB 1234'
        },
        bankDetails: user.bank_details || {
            accountNumber: 'XXXX XXXX 1234',
            ifscCode: 'AXIS0001234',
            accountName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Driver'
        },
        upiId: user.upi_id || 'driver@okaxis'
    };
}

/**
 * Initialize driver data
 */
function initDriverData() {
    // Update driver name and rating
    const driverName = document.getElementById('driver-name');
    if (driverName) {
        driverName.textContent = driverData.name;
    }
    
    const driverRating = document.getElementById('driver-rating');
    if (driverRating) {
        driverRating.innerHTML = `<i class="fas fa-star"></i> ${driverData.rating}`;
    }
    
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = driverData.name.split(' ')[0];
    }
    
    // Update current location
    const currentLocation = document.getElementById('current-location');
    if (currentLocation) {
        currentLocation.textContent = driverData.location;
    }
    
    // Update stats
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        const earningsElement = statCards[0].querySelector('.stat-details h3');
        if (earningsElement) {
            earningsElement.textContent = `₹${driverData.totalEarnings}`;
        }
        
        const ridesElement = statCards[1].querySelector('.stat-details h3');
        if (ridesElement) {
            ridesElement.textContent = driverData.totalRides;
        }
        
        const ratingElement = statCards[2].querySelector('.stat-details h3');
        if (ratingElement) {
            ratingElement.textContent = driverData.rating;
        }
        
        const hoursElement = statCards[3].querySelector('.stat-details h3');
        if (hoursElement) {
            hoursElement.textContent = driverData.hoursOnline;
        }
    }
    
    // Update earnings section
    const summaryCards = document.querySelectorAll('.summary-card');
    if (summaryCards.length >= 4) {
        const earningsSummary = summaryCards[0].querySelector('h2');
        if (earningsSummary) {
            earningsSummary.textContent = `₹${driverData.totalEarnings}`;
        }
        
        const ridesSummary = summaryCards[1].querySelector('h2');
        if (ridesSummary) {
            ridesSummary.textContent = driverData.totalRides;
        }
        
        const hoursSummary = summaryCards[2].querySelector('h2');
        if (hoursSummary) {
            hoursSummary.textContent = driverData.hoursOnline;
        }
        
        const rateSummary = summaryCards[3].querySelector('h2');
        if (rateSummary) {
            rateSummary.textContent = `₹${Math.round(driverData.totalEarnings / driverData.hoursOnline)}`;
        }
    }
    
    // Update withdraw section
    const withdrawBalance = document.querySelector('.withdraw-balance h2');
    if (withdrawBalance) {
        withdrawBalance.textContent = `₹${driverData.totalEarnings}`;
    }
    
    const withdrawAmount = document.getElementById('withdraw-amount');
    if (withdrawAmount) {
        withdrawAmount.setAttribute('max', driverData.totalEarnings);
    }
    
    const upiId = document.getElementById('upi-id');
    if (upiId) {
        upiId.value = driverData.upiId;
    }
}

/**
 * Initialize navigation
 */
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
    
    // Quick action buttons
    const withdrawBtn = document.querySelector('.withdraw-btn');
    const supportBtn = document.querySelector('.support-btn');
    
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            // Navigate to earnings section
            navLinks.forEach(link => link.parentElement.classList.remove('active'));
            
            const earningsLink = document.querySelector('.sidebar-nav a[href="#earnings"]');
            if (earningsLink) {
                earningsLink.parentElement.classList.add('active');
            }
            
            // Hide all sections
            sections.forEach(section => section.classList.add('hidden'));
            
            // Show earnings section
            const earningsSection = document.getElementById('earnings-section');
            if (earningsSection) {
                earningsSection.classList.remove('hidden');
                
                // Scroll to withdraw section
                const withdrawSection = document.querySelector('.withdraw-section');
                if (withdrawSection) {
                    withdrawSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }
    
    if (supportBtn) {
        supportBtn.addEventListener('click', function() {
            // Navigate to support section
            navLinks.forEach(link => link.parentElement.classList.remove('active'));
            
            const supportLink = document.querySelector('.sidebar-nav a[href="#support"]');
            if (supportLink) {
                supportLink.parentElement.classList.add('active');
            }
            
            // Hide all sections
            sections.forEach(section => section.classList.add('hidden'));
            
            // Show support section
            const supportSection = document.getElementById('support-section');
            if (supportSection) {
                supportSection.classList.remove('hidden');
            }
        });
    }
}

/**
 * Initialize status toggle
 */
function initStatusToggle() {
    const statusToggle = document.getElementById('status-toggle');
    const statusText = document.getElementById('status-text');
    
    if (statusToggle && statusText) {
        // Set initial state
        statusToggle.checked = driverData.status === 'online';
        statusText.textContent = driverData.status === 'online' ? 'Online' : 'Offline';
        statusText.style.color = driverData.status === 'online' ? '#4CAF50' : '#FF5252';
        
        // Add change event listener
        statusToggle.addEventListener('change', function() {
            if (this.checked) {
                driverData.status = 'online';
                statusText.textContent = 'Online';
                statusText.style.color = '#4CAF50';
                
                // Start checking for ride requests when online
                initRealTimeRequests();
            } else {
                driverData.status = 'offline';
                statusText.textContent = 'Offline';
                statusText.style.color = '#FF5252';
                
                // Stop checking for ride requests when offline
                if (rideRequestTimer) {
                    clearInterval(rideRequestTimer);
                    rideRequestTimer = null;
                }
            }
            
            // In a real app, this would update the driver's status on the server
            fetch('/api/driver/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    status: driverData.status
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Driver status updated:', data);
            })
            .catch(error => {
                console.error('Error updating status:', error);
            });
        });
    }
}

/**
 * Initialize notification panel
 */
function initNotifications() {
    const notificationToggle = document.querySelector('.notification-toggle');
    const notificationPanel = document.querySelector('.notification-panel');
    const notificationCount = document.querySelector('.notification-count');
    const notificationList = document.querySelector('.notification-list');
    
    if (notificationToggle && notificationPanel) {
        notificationToggle.addEventListener('click', function() {
            notificationPanel.classList.toggle('active');
            
            // Mark all as read when panel is opened
            if (notificationPanel.classList.contains('active')) {
                notificationCount.textContent = '0';
                notificationCount.classList.add('hidden');
                
                // Mark all notifications as read
                const unreadNotifications = notificationList.querySelectorAll('.notification.unread');
                unreadNotifications.forEach(notification => {
                    notification.classList.remove('unread');
                });
            }
        });
        
        // Close panel when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationToggle.contains(e.target) && !notificationPanel.contains(e.target)) {
                notificationPanel.classList.remove('active');
            }
        });
        
        // Add welcome notification
        addNotification('System', 'Welcome to RYDO Driver Dashboard', 'info');
    }
}

/**
 * Add a notification to the notification panel
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, warning, error)
 */
function addNotification(title, message, type = 'info') {
    const notificationList = document.querySelector('.notification-list');
    const notificationCount = document.querySelector('.notification-count');
    
    if (notificationList && notificationCount) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification unread ${type}`;
        
        // Get current time
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Set notification content
        notification.innerHTML = `
            <div class="notification-header">
                <h4>${title}</h4>
                <span class="notification-time">${time}</span>
            </div>
            <p>${message}</p>
        `;
        
        // Add to notification list
        notificationList.prepend(notification);
        
        // Update notification count
        const count = parseInt(notificationCount.textContent || '0') + 1;
        notificationCount.textContent = count;
        notificationCount.classList.remove('hidden');
    }
}

/**
 * Show a notification toast
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, warning, error)
 */
function showNotification(title, message, type = 'info') {
    // Add to notification panel
    addNotification(title, message, type);
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <h4>${title}</h4>
            <button class="close-toast"><i class="fas fa-times"></i></button>
        </div>
        <div class="toast-body">
            <p>${message}</p>
        </div>
    `;
    
    // Add to toast container
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        container.appendChild(toast);
    } else {
        toastContainer.appendChild(toast);
    }
    
    // Add close button event listener
    const closeButton = toast.querySelector('.close-toast');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Initialize real-time ride requests
 * Polls the server for new ride requests and displays them to the driver
 */
function initRealTimeRequests() {
    // Clear any existing timer
    if (rideRequestTimer) {
        clearInterval(rideRequestTimer);
    }
    
    // Only start polling if driver is online
    if (driverData.status !== 'online') {
        return;
    }
    
    // Get the ride requests container
    const rideRequestsContainer = document.querySelector('.ride-requests-container');
    if (!rideRequestsContainer) {
        console.error('Ride requests container not found');
        return;
    }
    
    // Function to fetch new ride requests
    const fetchRideRequests = () => {
        // Get driver's current location (in a real app, this would use the Geolocation API)
        const driverLocation = {
            latitude: 12.9716 + (Math.random() * 0.02 - 0.01),  // Random location near Bangalore
            longitude: 77.5946 + (Math.random() * 0.02 - 0.01)
        };
        
        // Fetch new ride requests from the server
        fetch('/api/driver/ride-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                location: driverLocation,
                radius: 5,  // 5 km radius
                status: driverData.status
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.requests && data.requests.length > 0) {
                // Process new ride requests
                processRideRequests(data.requests, rideRequestsContainer);
            }
        })
        .catch(error => {
            console.error('Error fetching ride requests:', error);
        });
    };
    
    // Initial fetch
    fetchRideRequests();
    
    // Set up polling every 15 seconds
    rideRequestTimer = setInterval(fetchRideRequests, 15000);
}

/**
 * Process ride requests and update the UI
 * @param {Array} requests - Array of ride request objects
 * @param {HTMLElement} container - Container element for ride requests
 */
function processRideRequests(requests, container) {
    // Check if we're already handling a ride
    if (currentRide) {
        // If we have a current ride, don't show new requests
        return;
    }
    
    // Process each request
    requests.forEach(request => {
        // Check if this request is already displayed
        const existingRequest = container.querySelector(`.ride-item[data-ride-id="${request.id}"]`);
        if (existingRequest) {
            // Update existing request if needed
            return;
        }
        
        // Create new ride request element
        const rideItem = document.createElement('div');
        rideItem.className = 'ride-item new';
        rideItem.dataset.rideId = request.id;
        
        // Calculate estimated earnings
        const estimatedEarnings = calculateFare(request.distance, request.duration, request.service_type);
        
        // Format the request time
        const requestTime = new Date(request.created_at);
        const formattedTime = requestTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Set ride item content
        rideItem.innerHTML = `
            <div class="ride-header">
                <div class="ride-type ${request.service_type}">
                    <i class="fas ${request.service_type === 'standard' ? 'fa-car' : request.service_type === 'premium' ? 'fa-car-alt' : 'fa-shuttle-van'}"></i>
                </div>
                <div class="ride-info">
                    <h4>${request.service_type.charAt(0).toUpperCase() + request.service_type.slice(1)} Ride</h4>
                    <span class="ride-time">${formattedTime}</span>
                    <span class="status-badge pending">Pending</span>
                </div>
                <div class="ride-fare">
                    <h4>₹${estimatedEarnings}</h4>
                    <span>${request.distance.toFixed(1)} km</span>
                </div>
            </div>
            <div class="ride-details">
                <div class="location-details">
                    <div class="pickup">
                        <i class="fas fa-map-marker-alt"></i>
                        <p>${request.pickup_location}</p>
                    </div>
                    <div class="dropoff">
                        <i class="fas fa-flag-checkered"></i>
                        <p>${request.dropoff_location}</p>
                    </div>
                </div>
                <div class="customer-details">
                    <div class="customer-info">
                        <div class="customer-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="customer-name">
                            <h5>${request.customer_name}</h5>
                            <span>${request.customer_rating} <i class="fas fa-star"></i></span>
                        </div>
                    </div>
                    <div class="ride-duration">
                        <i class="fas fa-clock"></i>
                        <span>${Math.round(request.duration / 60)} mins</span>
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="accept-ride-btn btn btn-success" data-ride-id="${request.id}">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="reject-ride-btn btn btn-danger" data-ride-id="${request.id}">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        `;
        
        // Add to container
        container.prepend(rideItem);
        
        // Show notification for new ride request
        showNotification(
            'New Ride Request', 
            `${request.service_type.charAt(0).toUpperCase() + request.service_type.slice(1)} ride from ${request.pickup_location}`,
            'warning'
        );
        
        // Add sound alert
        playSound('notification');
        
        // Add animation
        setTimeout(() => {
            rideItem.classList.remove('new');
        }, 300);
    });
}

/**
 * Calculate fare based on distance, duration and service type
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in seconds
 * @param {string} serviceType - Type of service (standard, premium, shuttle)
 * @returns {number} - Calculated fare
 */
function calculateFare(distance, duration, serviceType) {
    // Base fare by service type
    const baseFare = {
        standard: 50,
        premium: 80,
        shuttle: 30
    }[serviceType] || 50;
    
    // Per km rate by service type
    const perKmRate = {
        standard: 12,
        premium: 18,
        shuttle: 8
    }[serviceType] || 12;
    
    // Per minute rate by service type
    const perMinuteRate = {
        standard: 2,
        premium: 3,
        shuttle: 1
    }[serviceType] || 2;
    
    // Calculate fare components
    const distanceFare = distance * perKmRate;
    const durationFare = (duration / 60) * perMinuteRate;
    
    // Calculate total fare
    let totalFare = baseFare + distanceFare + durationFare;
    
    // Apply surge pricing if applicable (random for demo)
    const surgeMultiplier = Math.random() < 0.3 ? 1.2 : 1;
    totalFare *= surgeMultiplier;
    
    // Round to nearest 5
    return Math.round(totalFare / 5) * 5;
}

/**
 * Play a sound alert
 * @param {string} type - Type of sound to play
 */
function playSound(type) {
    const sounds = {
        notification: '/sounds/notification.mp3',
        rideAccepted: '/sounds/ride-accepted.mp3',
        rideCompleted: '/sounds/ride-completed.mp3'
    };
    
    const sound = new Audio(sounds[type] || sounds.notification);
    sound.play().catch(error => {
        console.error('Error playing sound:', error);
    });
}

/**
 * Load ride history for the driver
 */
function loadRideHistory() {
    const historyContainer = document.querySelector('.ride-history-container');
    if (!historyContainer) {
        return;
    }
    
    // Show loading state
    historyContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading ride history...</div>';
    
    // Fetch ride history from the server
    fetch('/api/driver/ride-history', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.rides) {
            // Clear loading state
            historyContainer.innerHTML = '';
            
            if (data.rides.length === 0) {
                historyContainer.innerHTML = '<div class="no-rides">No ride history available</div>';
                return;
            }
            
            // Process each ride
            data.rides.forEach(ride => {
                // Create ride history item
                const rideItem = document.createElement('div');
                rideItem.className = `ride-item ${ride.status}`;
                rideItem.dataset.rideId = ride.id;
                
                // Format the ride date and time
                const rideDate = new Date(ride.created_at);
                const formattedDate = rideDate.toLocaleDateString();
                const formattedTime = rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Set ride item content
                rideItem.innerHTML = `
                    <div class="ride-header">
                        <div class="ride-type ${ride.service_type}">
                            <i class="fas ${ride.service_type === 'standard' ? 'fa-car' : ride.service_type === 'premium' ? 'fa-car-alt' : 'fa-shuttle-van'}"></i>
                        </div>
                        <div class="ride-info">
                            <h4>${ride.service_type.charAt(0).toUpperCase() + ride.service_type.slice(1)} Ride</h4>
                            <span class="ride-time">${formattedDate}, ${formattedTime}</span>
                            <span class="status-badge ${ride.status}">${ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}</span>
                        </div>
                        <div class="ride-fare">
                            <h4>₹${ride.fare_amount}</h4>
                            <span>${ride.distance.toFixed(1)} km</span>
                        </div>
                    </div>
                    <div class="ride-details">
                        <div class="location-details">
                            <div class="pickup">
                                <i class="fas fa-map-marker-alt"></i>
                                <p>${ride.pickup_location}</p>
                            </div>
                            <div class="dropoff">
                                <i class="fas fa-flag-checkered"></i>
                                <p>${ride.dropoff_location}</p>
                            </div>
                        </div>
                        <div class="customer-details">
                            <div class="customer-info">
                                <div class="customer-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="customer-name">
                                    <h5>${ride.customer_name}</h5>
                                    <span>${ride.customer_rating} <i class="fas fa-star"></i></span>
                                </div>
                            </div>
                            <div class="ride-duration">
                                <i class="fas fa-clock"></i>
                                <span>${Math.round(ride.duration / 60)} mins</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add to container
                historyContainer.appendChild(rideItem);
            });
        } else {
            historyContainer.innerHTML = '<div class="error">Failed to load ride history</div>';
        }
    })
    .catch(error => {
        console.error('Error loading ride history:', error);
        historyContainer.innerHTML = '<div class="error">Failed to load ride history</div>';
    });
}

/**
 * Initialize earnings charts
 */
function initEarningsCharts() {
    // Dashboard earnings chart
    const earningsChartCtx = document.getElementById('earnings-chart');
    if (earningsChartCtx) {
        const earningsChart = new Chart(earningsChartCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Earnings (₹)',
                    data: earningsData.weekly,
                    backgroundColor: 'rgba(91, 110, 245, 0.2)',
                    borderColor: '#5B6EF5',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `₹${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
        
        // Chart filter buttons
        const chartFilterBtns = document.querySelectorAll('.chart-filters .filter-btn');
        chartFilterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                chartFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                let labels, data;
                
                switch(filter) {
                    case 'week':
                        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        data = earningsData.weekly;
                        break;
                    case 'month':
                        labels = Array.from({length: 30}, (_, i) => i + 1);
                        data = Array.from({length: 30}, () => Math.floor(Math.random() * 500) + 200);
                        break;
                    case 'year':
                        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        data = earningsData.yearly;
                        break;
                }
                
                earningsChart.data.labels = labels;
                earningsChart.data.datasets[0].data = data;
                earningsChart.update();
            });
        });
    }
    
    // Full earnings chart
    const earningsChartFullCtx = document.getElementById('earnings-chart-full');
    if (earningsChartFullCtx) {
        const earningsChartFull = new Chart(earningsChartFullCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Earnings (₹)',
                    data: earningsData.weekly,
                    backgroundColor: '#5B6EF5',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `₹${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
        
        // Earnings filter buttons
        const earningsFilterBtns = document.querySelectorAll('.earnings-filters .filter-btn');
        earningsFilterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                earningsFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                let labels, data;
                
                switch(filter) {
                    case 'week':
                        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        data = earningsData.weekly;
                        break;
                    case 'month':
                        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                        data = [1450, 1680, 1520, 1800];
                        break;
                    case 'year':
                        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        data = earningsData.yearly;
                        break;
                    case 'custom':
                        // Show date picker (not implemented in this demo)
                        alert('Date picker would be shown here in a real app');
                        return;
                }
                
                earningsChartFull.data.labels = labels;
                earningsChartFull.data.datasets[0].data = data;
                earningsChartFull.update();
                
                // Update summary cards based on selected period
                let totalEarnings, totalRides, hoursOnline, earningsPerHour;
                
                switch(filter) {
                    case 'week':
                        totalEarnings = earningsData.weekly.reduce((a, b) => a + b, 0);
                        totalRides = 32;
                        hoursOnline = 40;
                        break;
                    case 'month':
                        totalEarnings = 6450;
                        totalRides = 124;
                        hoursOnline = 160;
                        break;
                    case 'year':
                        totalEarnings = earningsData.yearly.reduce((a, b) => a + b, 0);
                        totalRides = 1450;
                        hoursOnline = 1920;
                        break;
                }
                
                earningsPerHour = Math.round(totalEarnings / hoursOnline);
                
                document.querySelector('.summary-card:nth-child(1) h2').textContent = `₹${totalEarnings}`;
                document.querySelector('.summary-card:nth-child(2) h2').textContent = totalRides;
                document.querySelector('.summary-card:nth-child(3) h2').textContent = hoursOnline;
                document.querySelector('.summary-card:nth-child(4) h2').textContent = `₹${earningsPerHour}`;
            });
        });
    }
    
    // Earnings breakdown chart
    const breakdownChartCtx = document.getElementById('earnings-breakdown-chart');
    if (breakdownChartCtx) {
        new Chart(breakdownChartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Base Fare', 'Distance Bonus', 'Time Bonus', 'Tips'],
                datasets: [{
                    data: [61.5, 21.9, 11.2, 5.3],
                    backgroundColor: ['#5B6EF5', '#6C63FF', '#4CAF50', '#FFC107'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// Initialize withdraw functionality
function initWithdraw() {
    const withdrawMethod = document.getElementById('withdraw-method');
    const upiForm = document.getElementById('upi-form');
    const bankForm = document.getElementById('bank-form');
    const withdrawBtn = document.querySelector('.withdraw-btn');
    
    if (withdrawMethod) {
        withdrawMethod.addEventListener('change', function() {
            if (this.value === 'upi') {
                upiForm.classList.remove('hidden');
                bankForm.classList.add('hidden');
            } else {
                upiForm.classList.add('hidden');
                bankForm.classList.remove('hidden');
            }
        });
    }
    
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            const amount = document.getElementById('withdraw-amount').value;
            const method = document.getElementById('withdraw-method').value;
            
            if (!amount) {
                alert('Please enter an amount to withdraw');
                return;
            }
            
            if (parseInt(amount) < 100) {
                alert('Minimum withdrawal amount is ₹100');
                return;
            }
            
            if (parseInt(amount) > driverData.totalEarnings) {
                alert('Withdrawal amount cannot exceed your available balance');
                return;
            }
            
            // In a real app, this would send a withdrawal request to the server
            alert(`Withdrawal request for ₹${amount} via ${method} has been submitted successfully. It will be processed within 24 hours.`);
            
            // Reset form
            document.getElementById('withdraw-amount').value = '';
        });
    }
}

/**
 * Initialize ride actions
 */
function initRideActions() {
    // Add event delegation for ride action buttons
    document.addEventListener('click', function(e) {
        // Accept ride button
        if (e.target.classList.contains('accept-ride-btn') || e.target.closest('.accept-ride-btn')) {
            const button = e.target.classList.contains('accept-ride-btn') ? e.target : e.target.closest('.accept-ride-btn');
            const rideId = button.dataset.rideId;
            acceptRide(rideId);
        }
        
        // Reject ride button
        if (e.target.classList.contains('reject-ride-btn') || e.target.closest('.reject-ride-btn')) {
            const button = e.target.classList.contains('reject-ride-btn') ? e.target : e.target.closest('.reject-ride-btn');
            const rideId = button.dataset.rideId;
            rejectRide(rideId);
        }
        
        // Complete ride button
        if (e.target.classList.contains('complete-ride-btn') || e.target.closest('.complete-ride-btn')) {
            const button = e.target.classList.contains('complete-ride-btn') ? e.target : e.target.closest('.complete-ride-btn');
            const rideId = button.dataset.rideId;
            completeRide(rideId);
        }
        
        // Arrived button
        if (e.target.classList.contains('arrived-btn') || e.target.closest('.arrived-btn')) {
            const button = e.target.classList.contains('arrived-btn') ? e.target : e.target.closest('.arrived-btn');
            const rideId = button.dataset.rideId;
            markAsArrived(rideId);
        }
        
        // Start ride button
        if (e.target.classList.contains('start-ride-btn') || e.target.closest('.start-ride-btn')) {
            const button = e.target.classList.contains('start-ride-btn') ? e.target : e.target.closest('.start-ride-btn');
            const rideId = button.dataset.rideId;
            startRide(rideId);
        }
    });
}

/**
 * Accept a ride request
 * @param {string} rideId - ID of the ride to accept
 */
function acceptRide(rideId) {
    // In a real app, this would send an accept request to the server
    fetch(`/api/driver/rides/${rideId}/accept`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI
            const rideItem = document.querySelector(`.ride-item[data-ride-id="${rideId}"]`);
            if (rideItem) {
                // Update ride status
                const statusBadge = rideItem.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = 'Accepted';
                    statusBadge.className = 'status-badge accepted';
                }
                
                // Update buttons
                const actionButtons = rideItem.querySelector('.action-buttons');
                if (actionButtons) {
                    actionButtons.innerHTML = `
                        <button class="arrived-btn btn btn-primary" data-ride-id="${rideId}">
                            <i class="fas fa-check-circle"></i> Arrived at Pickup
                        </button>
                    `;
                }
                
                // Set as current ride
                currentRide = {
                    id: rideId,
                    status: 'accepted',
                    customer: data.customer,
                    pickup: data.pickup_location,
                    dropoff: data.dropoff_location,
                    fare: data.fare_amount
                };
                
                // Show notification
                showNotification('Ride Accepted', `You have accepted the ride to ${data.dropoff_location}`);
            }
        } else {
            alert('Failed to accept ride: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error accepting ride:', error);
        alert('Failed to accept ride. Please try again.');
    });
}

/**
 * Reject a ride request
 * @param {string} rideId - ID of the ride to reject
 */
function rejectRide(rideId) {
    if (confirm('Are you sure you want to reject this ride?')) {
        // In a real app, this would send a reject request to the server
        fetch(`/api/driver/rides/${rideId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                const rideItem = document.querySelector(`.ride-item[data-ride-id="${rideId}"]`);
                if (rideItem) {
                    // Update ride status
                    const statusBadge = rideItem.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.textContent = 'Rejected';
                        statusBadge.className = 'status-badge rejected';
                    }
                    
                    // Disable buttons
                    const actionButtons = rideItem.querySelectorAll('button');
                    actionButtons.forEach(button => {
                        button.disabled = true;
                    });
                    
                    // Fade the item
                    rideItem.style.opacity = '0.5';
                }
            } else {
                alert('Failed to reject ride: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error rejecting ride:', error);
            alert('Failed to reject ride. Please try again.');
        });
    }
}

/**
 * Mark driver as arrived at pickup location
 * @param {string} rideId - ID of the ride
 */
function markAsArrived(rideId) {
    // In a real app, this would send an arrived request to the server
    fetch(`/api/driver/rides/${rideId}/arrived`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI
            const rideItem = document.querySelector(`.ride-item[data-ride-id="${rideId}"]`);
            if (rideItem) {
                // Update ride status
                const statusBadge = rideItem.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = 'Arrived';
                    statusBadge.className = 'status-badge arrived';
                }
                
                // Update buttons
                const actionButtons = rideItem.querySelector('.action-buttons');
                if (actionButtons) {
                    actionButtons.innerHTML = `
                        <button class="start-ride-btn btn btn-success" data-ride-id="${rideId}">
                            <i class="fas fa-play-circle"></i> Start Ride
                        </button>
                    `;
                }
                
                // Update current ride
                if (currentRide && currentRide.id === rideId) {
                    currentRide.status = 'arrived';
                }
                
                // Show notification
                showNotification('Arrived at Pickup', 'You have arrived at the pickup location. Please wait for the customer.');
            }
        } else {
            alert('Failed to update arrival status: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating arrival status:', error);
        alert('Failed to update arrival status. Please try again.');
    });
}

/**
 * Start the ride
 * @param {string} rideId - ID of the ride to start
 */
function startRide(rideId) {
    // In a real app, this would send a start ride request to the server
    fetch(`/api/driver/rides/${rideId}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI
            const rideItem = document.querySelector(`.ride-item[data-ride-id="${rideId}"]`);
            if (rideItem) {
                // Update ride status
                const statusBadge = rideItem.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = 'In Progress';
                    statusBadge.className = 'status-badge in-progress';
                }
                
                // Update buttons
                const actionButtons = rideItem.querySelector('.action-buttons');
                if (actionButtons) {
                    actionButtons.innerHTML = `
                        <button class="complete-ride-btn btn btn-danger" data-ride-id="${rideId}">
                            <i class="fas fa-flag-checkered"></i> Complete Ride
                        </button>
                    `;
                }
                
                // Update current ride
                if (currentRide && currentRide.id === rideId) {
                    currentRide.status = 'in_progress';
                }
                
                // Show notification
                showNotification('Ride Started', 'You have started the ride. Drive safely!');
            }
        } else {
            alert('Failed to start ride: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error starting ride:', error);
        alert('Failed to start ride. Please try again.');
    });
}

/**
 * Complete the ride
 * @param {string} rideId - ID of the ride to complete
 */
function completeRide(rideId) {
    // In a real app, this would send a complete ride request to the server
    fetch(`/api/driver/rides/${rideId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI
            const rideItem = document.querySelector(`.ride-item[data-ride-id="${rideId}"]`);
            if (rideItem) {
                // Update ride status
                const statusBadge = rideItem.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = 'Completed';
                    statusBadge.className = 'status-badge completed';
                }
                
                // Update buttons
                const actionButtons = rideItem.querySelector('.action-buttons');
                if (actionButtons) {
                    actionButtons.innerHTML = `
                        <div class="completed-message">
                            <i class="fas fa-check-circle"></i> Ride completed successfully
                        </div>
                    `;
                }
                
                // Clear current ride
                if (currentRide && currentRide.id === rideId) {
                    currentRide = null;
                }
                
                // Update earnings
                driverData.totalEarnings += parseFloat(data.fare_amount);
                driverData.totalRides += 1;
                
                // Update stats in UI
                updateDriverData();
                
                // Show notification
                showNotification('Ride Completed', `Ride completed successfully! You earned ₹${data.fare_amount}`);
            }
        } else {
            alert('Failed to complete ride: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error completing ride:', error);
        alert('Failed to complete ride. Please try again.');
    });
}
