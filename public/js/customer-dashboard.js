document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (checkUserSession()) {
        // Initialize dashboard
        initDashboard();
        
        // Initialize tabs if they exist
        if (typeof initTabs === 'function') {
            initTabs();
        }
        
        // Initialize location if function exists
        if (typeof initUserLocation === 'function') {
            initUserLocation();
        }
        
        // Initialize Google Maps if function exists
        if (typeof initMap === 'function') {
            initMap();
        }
        
        // Navigation functionality
        initNavigation();
        
        // Initialize logout functionality
        initLogout();
    }
});

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
    
    // Update user info in the dashboard
    updateUserInfo(user);
    return true;
}

// Initialize dashboard with dynamic data
function initDashboard() {
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName && user.first_name) {
        welcomeName.textContent = user.first_name;
    }
    
    // Update dashboard stats with mock data
    updateDashboardStats({
        totalRides: 12,
        caretakerBookings: 5,
        walletBalance: 2500,
        activeBookings: 2
    });
    
    // Update recent activity with mock data
    updateRecentActivity([
        {
            type: 'ride',
            description: 'Ride completed from City Center to Airport',
            time: 'Today, 10:30 AM',
            icon: 'fas fa-car',
            iconClass: 'blue'
        },
        {
            type: 'payment',
            description: 'Payment of ₹450 processed successfully',
            time: 'Today, 10:35 AM',
            icon: 'fas fa-money-bill',
            iconClass: 'green'
        },
        {
            type: 'booking',
            description: 'Scheduled a ride for tomorrow at 9:00 AM',
            time: 'Yesterday, 6:15 PM',
            icon: 'fas fa-calendar',
            iconClass: 'orange'
        }
    ]);
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
            document.getElementById('user-email').textContent = userData.email;
            document.getElementById('welcome-name').textContent = userData.first_name;
            
            // Update location if available
            if (userData.location) {
                document.getElementById('current-location').textContent = userData.location;
            } else {
                // Try to get location from browser
                getLocationFromBrowser();
            }
            
            // Set profile image if available
            if (userData.profile_photo) {
                document.getElementById('user-avatar').src = userData.profile_photo;
            }
            
            // Fetch additional user data
            fetchUserStats();
        }
    } catch (error) {
        console.error('Error initializing user data:', error);
        showToast('Error loading user data. Please refresh the page.', 'error');
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
