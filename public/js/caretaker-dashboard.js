/**
 * Caretaker Dashboard JavaScript
 * Handles all the interactive functionality for the caretaker dashboard
 * Includes API integration with the backend
 */

// Global variables
let caretakerData = {};
let currentLocation = { latitude: 0, longitude: 0 };
let map = null;
let earningsChart = null;

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fetch caretaker data from the server
    fetchCaretakerData();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize notifications
    initNotifications();
    
    // Get current location
    getCurrentLocation();
});

/**
 * Fetch caretaker data from the server
 */
async function fetchCaretakerData() {
    try {
        const response = await fetch('/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch caretaker data');
        }
        
        const data = await response.json();
        
        if (data.user && data.user.role === 'caretaker') {
            caretakerData = data.user;
            initCaretakerData();
            fetchAppointments();
            fetchTransactions();
            initEarningsChart();
        } else {
            console.error('Invalid user data or not a caretaker');
            window.location.href = '/auth/login'; // Redirect to login if not authenticated as caretaker
        }
    } catch (error) {
        console.error('Error fetching caretaker data:', error);
        // If data fetch fails, use demo data for development
        useDemoData();
    }
}

/**
 * Use demo data for development/testing purposes
 */
function useDemoData() {
    caretakerData = {
        id: 1,
        first_name: 'Priya',
        last_name: 'Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 9876543210',
        role: 'caretaker',
        is_available: true,
        average_rating: 4.8,
        total_ratings: 25,
        specialization: 'Physiotherapy',
        experience_years: 5,
        certification: 'Certified Physiotherapist',
        total_appointments: 18,
        active_patients: 6,
        hours_worked: 120,
        total_earnings: 12500,
        current_latitude: 19.0760,
        current_longitude: 72.8777
    };
    
    initCaretakerData();
    renderDemoAppointments();
    renderDemoTransactions();
    initEarningsChart();
}

/**
 * Initialize caretaker data in the UI
 */
function initCaretakerData() {
    // Set caretaker name and rating
    document.getElementById('caretaker-name').textContent = `${caretakerData.first_name} ${caretakerData.last_name}`;
    document.getElementById('welcome-name').textContent = caretakerData.first_name;
    document.getElementById('caretaker-rating').innerHTML = `<i class="fas fa-star"></i> ${caretakerData.average_rating || 0}`;
    document.getElementById('caretaker-rating-value').textContent = caretakerData.average_rating || 0;
    
    // Set dashboard stats
    document.getElementById('total-appointments').textContent = caretakerData.total_appointments || 0;
    document.getElementById('active-patients').textContent = caretakerData.active_patients || 0;
    document.getElementById('hours-worked').textContent = caretakerData.hours_worked || 0;
    
    // Set status toggle
    const statusToggle = document.getElementById('status-toggle');
    const statusText = document.getElementById('status-text');
    
    statusToggle.checked = caretakerData.is_available;
    statusText.textContent = caretakerData.is_available ? 'Online' : 'Offline';
    
    // Set location
    if (caretakerData.current_latitude && caretakerData.current_longitude) {
        // Reverse geocode to get location name
        reverseGeocode(caretakerData.current_latitude, caretakerData.current_longitude);
    }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Status toggle
    const statusToggle = document.getElementById('status-toggle');
    statusToggle.addEventListener('change', toggleAvailability);
    
    // Sidebar toggle for mobile
    const toggleSidebar = document.querySelector('.toggle-sidebar');
    toggleSidebar.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Notification bell
    const notificationBell = document.querySelector('.notification-bell');
    notificationBell.addEventListener('click', function() {
        document.getElementById('notification-panel').classList.toggle('active');
    });
    
    // Close notifications
    const closeNotifications = document.querySelector('.close-notifications');
    closeNotifications.addEventListener('click', function() {
        document.getElementById('notification-panel').classList.remove('active');
    });
    
    // Mark all notifications as read
    const markAllRead = document.querySelector('.mark-all-read');
    markAllRead.addEventListener('click', function() {
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => item.classList.remove('unread'));
    });
    
    // Time filter buttons for earnings chart
    const timeFilterButtons = document.querySelectorAll('.time-filter button');
    timeFilterButtons.forEach(button => {
        button.addEventListener('click', function() {
            timeFilterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateEarningsChart(this.textContent.toLowerCase());
        });
    });
}

/**
 * Initialize navigation
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-content');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(`${targetId}-section`);
            
            if (targetSection) {
                // Hide all sections
                sections.forEach(section => section.classList.add('hidden'));
                
                // Show target section
                targetSection.classList.remove('hidden');
                
                // Update active nav link
                navLinks.forEach(navLink => navLink.parentElement.classList.remove('active'));
                this.parentElement.classList.add('active');
                
                // Close sidebar on mobile
                if (window.innerWidth < 992) {
                    document.querySelector('.sidebar').classList.remove('active');
                }
            }
        });
    });
}

/**
 * Initialize notifications
 */
function initNotifications() {
    // Mark individual notifications as read
    const markReadButtons = document.querySelectorAll('.mark-read-btn');
    markReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationItem = this.closest('.notification-item');
            notificationItem.classList.remove('unread');
        });
    });
}

/**
 * Toggle caretaker availability
 */
async function toggleAvailability() {
    const statusToggle = document.getElementById('status-toggle');
    const statusText = document.getElementById('status-text');
    const isAvailable = statusToggle.checked;
    
    try {
        const response = await fetch('/user/availability', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isAvailable }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update availability');
        }
        
        statusText.textContent = isAvailable ? 'Online' : 'Offline';
        caretakerData.is_available = isAvailable;
    } catch (error) {
        console.error('Error updating availability:', error);
        // Revert toggle if update fails
        statusToggle.checked = !isAvailable;
        statusText.textContent = !isAvailable ? 'Online' : 'Offline';
    }
}

/**
 * Get current location
 */
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLocation.latitude = position.coords.latitude;
                currentLocation.longitude = position.coords.longitude;
                
                // Update location on server
                updateLocation(currentLocation.latitude, currentLocation.longitude);
                
                // Reverse geocode to get location name
                reverseGeocode(currentLocation.latitude, currentLocation.longitude);
            },
            function(error) {
                console.error('Error getting location:', error);
            }
        );
    }
}

/**
 * Update caretaker location on server
 */
async function updateLocation(latitude, longitude) {
    try {
        const response = await fetch('/user/location', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude, longitude }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update location');
        }
    } catch (error) {
        console.error('Error updating location:', error);
    }
}

/**
 * Reverse geocode coordinates to get location name
 */
function reverseGeocode(latitude, longitude) {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    
    geocoder.geocode({ location: latlng }, function(results, status) {
        if (status === 'OK') {
            if (results[0]) {
                // Extract city and country from address components
                let city = '';
                let country = '';
                
                for (let i = 0; i < results[0].address_components.length; i++) {
                    const component = results[0].address_components[i];
                    if (component.types.includes('locality')) {
                        city = component.long_name;
                    } else if (component.types.includes('country')) {
                        country = component.long_name;
                    }
                }
                
                const locationText = city ? `${city}, ${country}` : results[0].formatted_address;
                document.getElementById('current-location').textContent = locationText;
            }
        } else {
            console.error('Geocoder failed due to:', status);
        }
    });
}

/**
 * Fetch appointments from server
 */
async function fetchAppointments() {
    try {
        const response = await fetch('/caretaker/appointments', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch appointments');
        }
        
        const data = await response.json();
        renderAppointments(data.appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        renderDemoAppointments(); // Use demo data if fetch fails
    }
}

/**
 * Render appointments in the UI
 */
function renderAppointments(appointments) {
    const appointmentsList = document.getElementById('upcoming-appointments-list');
    appointmentsList.innerHTML = '';
    
    if (appointments && appointments.length > 0) {
        appointments.slice(0, 3).forEach(appointment => {
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item';
            appointmentItem.innerHTML = `
                <div class="appointment-info">
                    <span class="appointment-patient">${appointment.patient_name}</span>
                    <span class="appointment-time">${formatAppointmentTime(appointment.appointment_time)}</span>
                </div>
                <div class="appointment-actions">
                    <button data-id="${appointment.id}">View</button>
                </div>
            `;
            appointmentsList.appendChild(appointmentItem);
        });
        
        // Add event listeners to view buttons
        const viewButtons = appointmentsList.querySelectorAll('button');
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const appointmentId = this.getAttribute('data-id');
                viewAppointmentDetails(appointmentId);
            });
        });
    } else {
        appointmentsList.innerHTML = '<p class="no-data">No upcoming appointments</p>';
    }
}

/**
 * Render demo appointments for development
 */
function renderDemoAppointments() {
    const demoAppointments = [
        { id: 1, patient_name: 'Amit Kumar', appointment_time: new Date(Date.now() + 86400000).toISOString() }, // Tomorrow
        { id: 2, patient_name: 'Sonal Mehra', appointment_time: new Date(Date.now() + 86400000 * 3).toISOString() }, // 3 days later
        { id: 3, patient_name: 'Ravi Joshi', appointment_time: new Date(Date.now() + 86400000 * 5).toISOString() } // 5 days later
    ];
    
    renderAppointments(demoAppointments);
}

/**
 * Format appointment time for display
 */
function formatAppointmentTime(isoString) {
    const appointmentDate = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if appointment is today
    if (appointmentDate.toDateString() === now.toDateString()) {
        return `Today, ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if appointment is tomorrow
    if (appointmentDate.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For other days, show day of week and time
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[appointmentDate.getDay()]}, ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * View appointment details
 */
function viewAppointmentDetails(appointmentId) {
    // Navigate to appointments section
    const appointmentsLink = document.querySelector('a[href="#appointments"]');
    if (appointmentsLink) {
        appointmentsLink.click();
    }
    
    // TODO: Show appointment details in the appointments section
    console.log('Viewing appointment details for ID:', appointmentId);
}

/**
 * Fetch transactions from server
 */
async function fetchTransactions() {
    try {
        const response = await fetch('/caretaker/transactions', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        renderTransactions(data.transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        renderDemoTransactions(); // Use demo data if fetch fails
    }
}

/**
 * Render transactions in the UI
 */
function renderTransactions(transactions) {
    const transactionsList = document.getElementById('recent-transactions');
    transactionsList.innerHTML = '';
    
    if (transactions && transactions.length > 0) {
        transactions.slice(0, 3).forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            transactionItem.innerHTML = `
                <div class="transaction-icon">
                    <i class="fas fa-wallet"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.service_type || 'Appointment Payment'}</h4>
                    <p>${transaction.patient_name}</p>
                    <span class="transaction-date">${formatTransactionDate(transaction.transaction_date)}</span>
                </div>
                <div class="transaction-amount earning">
                    ₹${transaction.amount.toLocaleString()}
                </div>
            `;
            transactionsList.appendChild(transactionItem);
        });
    } else {
        transactionsList.innerHTML = '<p class="no-data">No recent transactions</p>';
    }
}

/**
 * Render demo transactions for development
 */
function renderDemoTransactions() {
    const demoTransactions = [
        { id: 1, patient_name: 'Amit Kumar', service_type: 'Post-surgery Care', amount: 1500, transaction_date: '2025-04-30T10:30:00' },
        { id: 2, patient_name: 'Sonal Mehra', service_type: 'Physiotherapy', amount: 1200, transaction_date: '2025-04-28T14:15:00' },
        { id: 3, patient_name: 'Ravi Joshi', service_type: 'Elderly Care', amount: 1000, transaction_date: '2025-04-27T09:45:00' }
    ];
    
    renderTransactions(demoTransactions);
}

/**
 * Format transaction date for display
 */
function formatTransactionDate(isoString) {
    const transactionDate = new Date(isoString);
    const day = transactionDate.getDate();
    const month = transactionDate.toLocaleString('default', { month: 'short' });
    const year = transactionDate.getFullYear();
    
    return `${day} ${month}, ${year}`;
}

/**
 * Initialize earnings chart
 */
function initEarningsChart() {
    const ctx = document.getElementById('earnings-chart').getContext('2d');
    
    // Default data (weekly)
    const weeklyData = [1800, 2200, 1700, 2000, 2300, 1500, 2000];
    
    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Earnings (₹)',
                data: weeklyData,
                borderColor: '#5B6EF5',
                backgroundColor: 'rgba(91, 110, 245, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#5B6EF5',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    grid: { color: '#e6eaf3' },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update earnings chart based on time filter
 */
function updateEarningsChart(timeFilter) {
    // Sample data for different time periods
    const data = {
        week: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [1800, 2200, 1700, 2000, 2300, 1500, 2000]
        },
        month: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            values: [8000, 9500, 7800, 10200]
        },
        year: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: [22000, 19500, 24000, 21500, 26000, 28500, 27000, 29500, 32000, 30500, 28000, 35000]
        }
    };
    
    // Update chart data
    earningsChart.data.labels = data[timeFilter].labels;
    earningsChart.data.datasets[0].data = data[timeFilter].values;
    earningsChart.update();
}

// Add route to server.js to serve the caretaker dashboard
// app.get('/caretaker-dashboard', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/caretaker-dashboard.html'));
// });

