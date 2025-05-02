/**
 * RYDO Admin Dashboard JavaScript
 * Handles all admin dashboard functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initNavigation();
    
    // Initialize charts
    initCharts();
    
    // Initialize DataTables
    initDataTables();
    
    // Initialize date and time
    updateDateTime();
    
    // Initialize event listeners
    initEventListeners();
    
    // Load initial data
    loadDashboardData();
});

/**
 * Initialize sidebar navigation
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-content');
    
    // Toggle sidebar on mobile
    const toggleSidebar = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            document.querySelector('.main-content').classList.toggle('expanded');
        });
    }
    
    // Navigation click events
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(link => link.parentElement.classList.remove('active'));
                
                // Add active class to clicked link
                this.parentElement.classList.add('active');
                
                // Hide all sections
                sections.forEach(section => section.classList.add('hidden'));
                
                // Show selected section
                const targetId = this.getAttribute('href').substring(1) + '-section';
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
            }
        });
    });
}

/**
 * Initialize charts
 */
function initCharts() {
    // Booking Statistics Chart
    const bookingsCtx = document.getElementById('bookings-chart');
    
    if (bookingsCtx) {
        const bookingsChart = new Chart(bookingsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Driver Bookings',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        borderColor: '#5B6EF5',
                        backgroundColor: 'rgba(91, 110, 245, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Caretaker Bookings',
                        data: [28, 48, 40, 19, 86, 27, 90],
                        borderColor: '#F5A623',
                        backgroundColor: 'rgba(245, 166, 35, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Shuttle Bookings',
                        data: [45, 25, 50, 30, 60, 45, 70],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Chart type filter
        const chartActions = document.querySelectorAll('.chart-action');
        
        if (chartActions) {
            chartActions.forEach(action => {
                action.addEventListener('click', function() {
                    // Remove active class from all actions
                    chartActions.forEach(a => a.classList.remove('active'));
                    
                    // Add active class to clicked action
                    this.classList.add('active');
                    
                    const type = this.dataset.type;
                    
                    // Update chart data based on type
                    if (type === 'all') {
                        bookingsChart.data.datasets[0].hidden = false;
                        bookingsChart.data.datasets[1].hidden = false;
                        bookingsChart.data.datasets[2].hidden = false;
                    } else if (type === 'driver') {
                        bookingsChart.data.datasets[0].hidden = false;
                        bookingsChart.data.datasets[1].hidden = true;
                        bookingsChart.data.datasets[2].hidden = true;
                    } else if (type === 'caretaker') {
                        bookingsChart.data.datasets[0].hidden = true;
                        bookingsChart.data.datasets[1].hidden = false;
                        bookingsChart.data.datasets[2].hidden = true;
                    } else if (type === 'shuttle') {
                        bookingsChart.data.datasets[0].hidden = true;
                        bookingsChart.data.datasets[1].hidden = true;
                        bookingsChart.data.datasets[2].hidden = false;
                    }
                    
                    bookingsChart.update();
                });
            });
        }
    }
    
    // Revenue Distribution Chart
    const revenueCtx = document.getElementById('revenue-chart');
    
    if (revenueCtx) {
        const revenueChart = new Chart(revenueCtx, {
            type: 'doughnut',
            data: {
                labels: ['Driver Service', 'Caretaker Service', 'Shuttle Service'],
                datasets: [{
                    data: [45, 30, 25],
                    backgroundColor: [
                        '#5B6EF5',
                        '#F5A623',
                        '#4CAF50'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                },
                cutout: '70%'
            }
        });
    }
}

/**
 * Initialize DataTables
 */
function initDataTables() {
    // Users table
    const usersTable = document.getElementById('users-table');
    
    if (usersTable && $.fn.DataTable) {
        $('#users-table').DataTable({
            processing: true,
            serverSide: false, // Change to true when using API
            pageLength: 10,
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'email' },
                { data: 'phone' },
                { data: 'role' },
                { data: 'status' },
                { data: 'joined_date' },
                { data: 'actions' }
            ],
            // Sample data for demonstration
            data: [
                {
                    id: 1,
                    name: 'Rahul Kumar',
                    email: 'rahul.kumar@example.com',
                    phone: '+91 9876543210',
                    role: 'Customer',
                    status: '<span class="status success">Active</span>',
                    joined_date: '2025-01-15',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 2,
                    name: 'Priya Sharma',
                    email: 'priya.sharma@example.com',
                    phone: '+91 9876543211',
                    role: 'Customer',
                    status: '<span class="status success">Active</span>',
                    joined_date: '2025-01-20',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 3,
                    name: 'Amit Patel',
                    email: 'amit.patel@example.com',
                    phone: '+91 9876543212',
                    role: 'Driver',
                    status: '<span class="status success">Active</span>',
                    joined_date: '2025-02-05',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 4,
                    name: 'Neha Singh',
                    email: 'neha.singh@example.com',
                    phone: '+91 9876543213',
                    role: 'Caretaker',
                    status: '<span class="status success">Active</span>',
                    joined_date: '2025-02-10',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 5,
                    name: 'Vikram Reddy',
                    email: 'vikram.reddy@example.com',
                    phone: '+91 9876543214',
                    role: 'Shuttle Driver',
                    status: '<span class="status pending">Pending</span>',
                    joined_date: '2025-03-01',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                }
            ]
        });
    }
    
    // Bookings table
    const bookingsTable = document.getElementById('bookings-table');
    
    if (bookingsTable && $.fn.DataTable) {
        $('#bookings-table').DataTable({
            processing: true,
            serverSide: false, // Change to true when using API
            pageLength: 10,
            columns: [
                { data: 'id' },
                { data: 'customer' },
                { data: 'provider' },
                { data: 'type' },
                { data: 'datetime' },
                { data: 'amount' },
                { data: 'status' },
                { data: 'payment' },
                { data: 'actions' }
            ],
            // Sample data for demonstration
            data: [
                {
                    id: 'BK001',
                    customer: 'Rahul Kumar',
                    provider: 'Amit Patel',
                    type: 'Driver',
                    datetime: '2025-05-01 10:30 AM',
                    amount: '₹650',
                    status: '<span class="status completed">Completed</span>',
                    payment: '<span class="status success">Paid</span>',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button>'
                },
                {
                    id: 'BK002',
                    customer: 'Priya Sharma',
                    provider: 'Neha Singh',
                    type: 'Caretaker',
                    datetime: '2025-05-01 02:00 PM',
                    amount: '₹850',
                    status: '<span class="status completed">Completed</span>',
                    payment: '<span class="status success">Paid</span>',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button>'
                },
                {
                    id: 'BK003',
                    customer: 'Amit Patel',
                    provider: 'Vikram Reddy',
                    type: 'Shuttle',
                    datetime: '2025-05-01 04:15 PM',
                    amount: '₹320',
                    status: '<span class="status pending">Pending</span>',
                    payment: '<span class="status pending">Pending</span>',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger cancel-btn"><i class="fas fa-times"></i></button>'
                },
                {
                    id: 'BK004',
                    customer: 'Neha Singh',
                    provider: 'Amit Patel',
                    type: 'Driver',
                    datetime: '2025-05-01 05:30 PM',
                    amount: '₹450',
                    status: '<span class="status cancelled">Cancelled</span>',
                    payment: '<span class="status refunded">Refunded</span>',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button>'
                },
                {
                    id: 'BK005',
                    customer: 'Vikram Reddy',
                    provider: 'Neha Singh',
                    type: 'Caretaker',
                    datetime: '2025-05-02 09:00 AM',
                    amount: '₹750',
                    status: '<span class="status confirmed">Confirmed</span>',
                    payment: '<span class="status pending">Pending</span>',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-warning edit-btn"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger cancel-btn"><i class="fas fa-times"></i></button>'
                }
            ]
        });
    }
    
    // Ratings table
    const ratingsTable = document.getElementById('ratings-table');
    
    if (ratingsTable && $.fn.DataTable) {
        $('#ratings-table').DataTable({
            processing: true,
            serverSide: false, // Change to true when using API
            pageLength: 10,
            columns: [
                { data: 'id' },
                { data: 'service' },
                { data: 'customer' },
                { data: 'provider' },
                { data: 'rating' },
                { data: 'review' },
                { data: 'date' },
                { data: 'actions' }
            ],
            // Sample data for demonstration
            data: [
                {
                    id: 'R001',
                    service: 'Driver',
                    customer: 'Rahul Kumar',
                    provider: 'Amit Patel',
                    rating: '<div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>',
                    review: 'Excellent service, very professional driver.',
                    date: '2025-05-01',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 'R002',
                    service: 'Caretaker',
                    customer: 'Priya Sharma',
                    provider: 'Neha Singh',
                    rating: '<div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>',
                    review: 'Very caring and attentive caretaker.',
                    date: '2025-05-01',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 'R003',
                    service: 'Shuttle',
                    customer: 'Amit Patel',
                    provider: 'Vikram Reddy',
                    rating: '<div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i></div>',
                    review: 'Comfortable shuttle service, but was 5 minutes late.',
                    date: '2025-04-30',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 'R004',
                    service: 'Driver',
                    customer: 'Neha Singh',
                    provider: 'Amit Patel',
                    rating: '<div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>',
                    review: 'Driver was good but car was not very clean.',
                    date: '2025-04-29',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                },
                {
                    id: 'R005',
                    service: 'Caretaker',
                    customer: 'Vikram Reddy',
                    provider: 'Neha Singh',
                    rating: '<div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>',
                    review: 'Excellent caretaker, very knowledgeable and caring.',
                    date: '2025-04-28',
                    actions: '<button class="btn btn-sm btn-primary view-btn"><i class="fas fa-eye"></i></button> <button class="btn btn-sm btn-danger delete-btn"><i class="fas fa-trash"></i></button>'
                }
            ]
        });
    }
}

/**
 * Update date and time
 */
function updateDateTime() {
    const dateElement = document.getElementById('current-date');
    
    if (dateElement) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Date range filter
    const dateRange = document.getElementById('date-range');
    
    if (dateRange) {
        dateRange.addEventListener('change', function() {
            // Update dashboard data based on selected date range
            loadDashboardData(this.value);
        });
    }
    
    // User modal events
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-btn') || e.target.parentElement.classList.contains('view-btn')) {
            const userModal = new bootstrap.Modal(document.getElementById('userModal'));
            userModal.show();
        }
    });
}

/**
 * Load dashboard data
 * @param {string} dateRange - Date range filter
 */
function loadDashboardData(dateRange = 'week') {
    // This would be replaced with actual API calls in a real implementation
    console.log(`Loading dashboard data for ${dateRange}`);
    
    // For demonstration, we'll just update the stats with some random data
    const totalUsers = document.getElementById('total-users');
    const totalBookings = document.getElementById('total-bookings');
    const totalRevenue = document.getElementById('total-revenue');
    const avgRating = document.getElementById('avg-rating');
    
    if (dateRange === 'today') {
        if (totalUsers) totalUsers.textContent = '1,245';
        if (totalBookings) totalBookings.textContent = '42';
        if (totalRevenue) totalRevenue.textContent = '₹35K';
        if (avgRating) avgRating.textContent = '4.7';
    } else if (dateRange === 'week') {
        if (totalUsers) totalUsers.textContent = '1,245';
        if (totalBookings) totalBookings.textContent = '856';
        if (totalRevenue) totalRevenue.textContent = '₹2.8L';
        if (avgRating) avgRating.textContent = '4.7';
    } else if (dateRange === 'month') {
        if (totalUsers) totalUsers.textContent = '1,245';
        if (totalBookings) totalBookings.textContent = '3,245';
        if (totalRevenue) totalRevenue.textContent = '₹12.5L';
        if (avgRating) avgRating.textContent = '4.7';
    } else if (dateRange === 'year') {
        if (totalUsers) totalUsers.textContent = '1,245';
        if (totalBookings) totalBookings.textContent = '38,560';
        if (totalRevenue) totalRevenue.textContent = '₹1.5Cr';
        if (avgRating) avgRating.textContent = '4.7';
    }
}

/**
 * Handle API errors
 * @param {Error} error - Error object
 */
function handleApiError(error) {
    console.error('API Error:', error);
    
    // Show error notification
    alert('An error occurred while fetching data. Please try again.');
}
