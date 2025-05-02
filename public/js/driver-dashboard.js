document.addEventListener('DOMContentLoaded', function() {
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
});

// Global variables
let driverData = {
    name: 'Rahul Singh',
    email: 'rahul.singh@example.com',
    phone: '+91 9876543210',
    rating: 4.9,
    totalEarnings: 8450,
    totalRides: 32,
    hoursOnline: 124,
    location: 'Bangalore, India',
    status: 'online',
    vehicle: {
        type: 'Sedan',
        model: 'Honda City',
        year: '2022',
        color: 'White',
        registrationNumber: 'KA 01 AB 1234'
    },
    bankDetails: {
        accountNumber: 'XXXX XXXX 1234',
        ifscCode: 'AXIS0001234',
        accountName: 'Rahul Singh'
    },
    upiId: 'rahul@okaxis'
};

// Earnings data for charts
const earningsData = {
    weekly: [320, 450, 280, 390, 420, 380, 450],
    monthly: [1200, 1450, 1320, 1500, 1380, 1600, 1450, 1320, 1500, 1380, 1600, 1450],
    yearly: [8500, 9200, 8700, 9500, 10200, 9800, 10500, 11200, 10800, 11500, 12200, 11800]
};

// Initialize driver data
function initDriverData() {
    // Update driver name and rating
    document.getElementById('driver-name').textContent = driverData.name;
    document.getElementById('driver-rating').innerHTML = `<i class="fas fa-star"></i> ${driverData.rating}`;
    document.getElementById('welcome-name').textContent = driverData.name.split(' ')[0];
    
    // Update current location
    document.getElementById('current-location').textContent = driverData.location;
    
    // Update stats
    document.querySelector('.stat-card:nth-child(1) .stat-details h3').textContent = `₹${driverData.totalEarnings}`;
    document.querySelector('.stat-card:nth-child(2) .stat-details h3').textContent = driverData.totalRides;
    document.querySelector('.stat-card:nth-child(3) .stat-details h3').textContent = driverData.rating;
    document.querySelector('.stat-card:nth-child(4) .stat-details h3').textContent = driverData.hoursOnline;
    
    // Update earnings section
    document.querySelector('.summary-card:nth-child(1) h2').textContent = `₹${driverData.totalEarnings}`;
    document.querySelector('.summary-card:nth-child(2) h2').textContent = driverData.totalRides;
    document.querySelector('.summary-card:nth-child(3) h2').textContent = driverData.hoursOnline;
    document.querySelector('.summary-card:nth-child(4) h2').textContent = `₹${Math.round(driverData.totalEarnings / driverData.hoursOnline)}`;
    
    // Update withdraw section
    document.querySelector('.withdraw-balance h2').textContent = `₹${driverData.totalEarnings}`;
    document.getElementById('withdraw-amount').setAttribute('max', driverData.totalEarnings);
    document.getElementById('upi-id').value = driverData.upiId;
}

// Initialize navigation
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

// Initialize status toggle
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
            } else {
                driverData.status = 'offline';
                statusText.textContent = 'Offline';
                statusText.style.color = '#FF5252';
            }
            
            // In a real app, this would update the driver's status on the server
            console.log('Driver status updated:', driverData.status);
        });
    }
}

// Initialize notification panel
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

// Initialize earnings charts
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

// Initialize ride actions
function initRideActions() {
    const acceptBtns = document.querySelectorAll('.accept-btn');
    const declineBtns = document.querySelectorAll('.decline-btn');
    
    acceptBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const rideItem = this.closest('.ride-item');
            
            // In a real app, this would send an accept request to the server
            alert('Ride accepted successfully!');
            
            // Update UI
            this.textContent = 'Accepted';
            this.disabled = true;
            this.style.backgroundColor = '#e0e0e0';
            this.style.color = '#333';
            
            const declineBtn = rideItem.querySelector('.decline-btn');
            if (declineBtn) {
                declineBtn.style.display = 'none';
            }
        });
    });
    
    declineBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const rideItem = this.closest('.ride-item');
            
            // In a real app, this would send a decline request to the server
            if (confirm('Are you sure you want to decline this ride?')) {
                alert('Ride declined');
                
                // Update UI
                rideItem.style.opacity = '0.5';
                
                const acceptBtn = rideItem.querySelector('.accept-btn');
                if (acceptBtn) {
                    acceptBtn.disabled = true;
                }
                
                this.disabled = true;
            }
        });
    });
}
