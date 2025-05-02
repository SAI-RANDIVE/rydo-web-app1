/**
 * Booking Management System
 * 
 * This script handles booking-related functionality for the RYDO Web App.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize booking system
    initBookingSystem();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load user bookings if on bookings page
    if (document.querySelector('.bookings-container')) {
        loadUserBookings();
    }
    
    // Initialize booking form if on booking page
    if (document.querySelector('#booking-form')) {
        initBookingForm();
    }
});

// Sample bookings data
const bookings = [
    {
        id: 'BK12345',
        type: 'driver',
        status: 'completed',
        date: '2025-05-01',
        time: '10:30 AM',
        pickup: 'Home, Bangalore',
        dropoff: 'Airport, Bangalore',
        driver: {
            name: 'Rahul K.',
            rating: 4.8,
            phone: '+91 9876543210'
        },
        fare: 450,
        distance: '15 km',
        duration: '35 min'
    },
    {
        id: 'BK12346',
        type: 'caretaker',
        status: 'upcoming',
        date: '2025-05-04',
        time: '09:00 AM',
        location: 'Home, Bangalore',
        caretaker: {
            name: 'Priya M.',
            rating: 4.9,
            phone: '+91 9876543211'
        },
        hours: 4,
        fare: 800
    },
    {
        id: 'BK12347',
        type: 'shuttle',
        status: 'active',
        date: '2025-05-03',
        time: '08:30 AM',
        pickup: 'Home, Bangalore',
        dropoff: 'Office, Bangalore',
        driver: {
            name: 'Suresh P.',
            rating: 4.7,
            phone: '+91 9876543212'
        },
        fare: 350,
        passengers: 3,
        distance: '12 km',
        duration: '30 min'
    }
];

/**
 * Initialize booking system
 */
function initBookingSystem() {
    // Create booking modal if it doesn't exist
    if (!document.querySelector('#booking-details-modal') && document.body.classList.contains('dashboard-page')) {
        const modal = document.createElement('div');
        modal.id = 'booking-details-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Booking Details</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="booking-details-container">
                        <div class="booking-status">
                            <span class="status-label">Status:</span>
                            <span class="status-value">Pending</span>
                        </div>
                        <div class="booking-info">
                            <div class="booking-id">
                                <span>Booking ID:</span>
                                <span id="booking-id-value"></span>
                            </div>
                            <div class="booking-date">
                                <span>Date:</span>
                                <span id="booking-date-value"></span>
                            </div>
                            <div class="booking-time">
                                <span>Time:</span>
                                <span id="booking-time-value"></span>
                            </div>
                        </div>
                        <div class="service-details">
                            <h3>Service Details</h3>
                            <div class="service-type">
                                <span>Service Type:</span>
                                <span id="service-type-value"></span>
                            </div>
                            <div class="service-provider">
                                <span>Provider:</span>
                                <span id="service-provider-value"></span>
                            </div>
                        </div>
                        <div class="location-details">
                            <h3>Location</h3>
                            <div class="pickup-location">
                                <span>Pickup:</span>
                                <span id="pickup-location-value"></span>
                            </div>
                            <div class="dropoff-location">
                                <span>Dropoff:</span>
                                <span id="dropoff-location-value"></span>
                            </div>
                        </div>
                        <div class="payment-details">
                            <h3>Payment</h3>
                            <div class="payment-method">
                                <span>Method:</span>
                                <span id="payment-method-value"></span>
                            </div>
                            <div class="payment-amount">
                                <span>Amount:</span>
                                <span id="payment-amount-value"></span>
                            </div>
                            <div class="payment-status">
                                <span>Status:</span>
                                <span id="payment-status-value"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="booking-actions">
                        <button id="cancel-booking-btn" class="btn btn-danger">Cancel Booking</button>
                        <button id="track-booking-btn" class="btn btn-primary">Track</button>
                        <button id="contact-provider-btn" class="btn btn-secondary">Contact Provider</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Close modal when clicking on X or outside the modal
    document.addEventListener('click', function(e) {
        const modal = document.querySelector('#booking-details-modal');
        if (!modal) return;
        
        if (e.target.classList.contains('close-modal') || e.target === modal) {
            closeBookingModal();
        }
    });
    
    // Handle booking card clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.booking-card')) {
            const bookingCard = e.target.closest('.booking-card');
            const bookingId = bookingCard.dataset.id;
            
            if (bookingId) {
                openBookingDetails(bookingId);
            }
        }
    });
    
    // Handle booking action buttons
    document.addEventListener('click', function(e) {
        if (e.target.id === 'cancel-booking-btn') {
            const bookingId = document.querySelector('#booking-id-value').textContent;
            cancelBooking(bookingId);
        } else if (e.target.id === 'track-booking-btn') {
            const bookingId = document.querySelector('#booking-id-value').textContent;
            trackBooking(bookingId);
        } else if (e.target.id === 'contact-provider-btn') {
            const bookingId = document.querySelector('#booking-id-value').textContent;
            contactProvider(bookingId);
        }
    });
}

/**
 * Load user bookings
 */
async function loadUserBookings() {
    try {
        const bookingsContainer = document.querySelector('.bookings-container');
        if (!bookingsContainer) return;
        
        // Show loading state
        bookingsContainer.innerHTML = '<div class="loading">Loading bookings...</div>';
        
        // Fetch bookings from server
        const response = await fetch('/customer/bookings', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderBookings(data.bookings);
        } else {
            console.error('Failed to load bookings:', await response.text());
            bookingsContainer.innerHTML = '<div class="error">Failed to load bookings. Please try again.</div>';
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        const bookingsContainer = document.querySelector('.bookings-container');
        if (bookingsContainer) {
            bookingsContainer.innerHTML = '<div class="error">Failed to load bookings. Please try again.</div>';
        }
    }
}

/**
 * Render bookings in the container
 * 
 * @param {Array} bookings - Array of booking objects
 */
function renderBookings(bookings) {
    const bookingsContainer = document.querySelector('.bookings-container');
    if (!bookingsContainer) return;
    
    // Clear container
    bookingsContainer.innerHTML = '';
    
    if (bookings.length === 0) {
        bookingsContainer.innerHTML = '<div class="no-bookings">You have no bookings yet.</div>';
        return;
    }
    
    // Sort bookings by date (newest first)
    bookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
    
    // Group bookings by status
    const activeBookings = bookings.filter(booking => ['pending', 'confirmed', 'in_progress'].includes(booking.status));
    const completedBookings = bookings.filter(booking => booking.status === 'completed');
    const cancelledBookings = bookings.filter(booking => booking.status === 'cancelled');
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'booking-tabs';
    tabsContainer.innerHTML = `
        <div class="tab active" data-tab="active">Active (${activeBookings.length})</div>
        <div class="tab" data-tab="completed">Completed (${completedBookings.length})</div>
        <div class="tab" data-tab="cancelled">Cancelled (${cancelledBookings.length})</div>
    `;
    bookingsContainer.appendChild(tabsContainer);
    
    // Create booking lists container
    const bookingListsContainer = document.createElement('div');
    bookingListsContainer.className = 'booking-lists-container';
    bookingsContainer.appendChild(bookingListsContainer);
    
    // Create active bookings list
    const activeBookingsList = document.createElement('div');
    activeBookingsList.className = 'booking-list active';
    activeBookingsList.dataset.tab = 'active';
    bookingListsContainer.appendChild(activeBookingsList);
    
    // Create completed bookings list
    const completedBookingsList = document.createElement('div');
    completedBookingsList.className = 'booking-list';
    completedBookingsList.dataset.tab = 'completed';
    bookingListsContainer.appendChild(completedBookingsList);
    
    // Create cancelled bookings list
    const cancelledBookingsList = document.createElement('div');
    cancelledBookingsList.className = 'booking-list';
    cancelledBookingsList.dataset.tab = 'cancelled';
    bookingListsContainer.appendChild(cancelledBookingsList);
    
    // Render bookings in each list
    renderBookingList(activeBookingsList, activeBookings);
    renderBookingList(completedBookingsList, completedBookings);
    renderBookingList(cancelledBookingsList, cancelledBookings);
    
    // Add tab click handlers
    const tabs = document.querySelectorAll('.booking-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and lists
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.booking-list').forEach(list => list.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding list
            this.classList.add('active');
            document.querySelector(`.booking-list[data-tab="${this.dataset.tab}"]`).classList.add('active');
        });
    });
}

/**
 * Render bookings in a list
 * 
 * @param {HTMLElement} listElement - List element to render bookings in
 * @param {Array} bookings - Array of booking objects
 */
function renderBookingList(listElement, bookings) {
    if (bookings.length === 0) {
        listElement.innerHTML = '<div class="no-bookings">No bookings in this category.</div>';
        return;
    }
    
    bookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = `booking-card ${booking.status}`;
        bookingCard.dataset.id = booking.id;
        
        // Format date and time
        const bookingDate = new Date(booking.booking_date);
        const formattedDate = bookingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        const formattedTime = bookingDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Get status label
        const statusLabel = getStatusLabel(booking.status);
        
        bookingCard.innerHTML = `
            <div class="booking-card-header">
                <div class="booking-type">${booking.service_type}</div>
                <div class="booking-status ${booking.status}">${statusLabel}</div>
            </div>
            <div class="booking-card-body">
                <div class="booking-info">
                    <div class="booking-date-time">
                        <i class="fas fa-calendar"></i>
                        <span>${formattedDate} at ${formattedTime}</span>
                    </div>
                    <div class="booking-locations">
                        <div class="pickup">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${booking.pickup_location}</span>
                        </div>
                        <div class="dropoff">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${booking.dropoff_location || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="booking-provider">
                    <div class="provider-name">${booking.provider_name || 'Not assigned'}</div>
                    <div class="booking-amount">₹${booking.amount.toFixed(2)}</div>
                </div>
            </div>
            <div class="booking-card-footer">
                <button class="btn btn-sm btn-outline view-details-btn">View Details</button>
                ${booking.status === 'in_progress' ? '<button class="btn btn-sm btn-primary track-btn">Track</button>' : ''}
                ${booking.status === 'pending' ? '<button class="btn btn-sm btn-danger cancel-btn">Cancel</button>' : ''}
            </div>
        `;
        
        listElement.appendChild(bookingCard);
    });
}

/**
 * Get status label based on status code
 * 
 * @param {string} status - Status code
 * @returns {string} Status label
 */
function getStatusLabel(status) {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'confirmed':
            return 'Confirmed';
        case 'in_progress':
            return 'In Progress';
        case 'completed':
            return 'Completed';
        case 'cancelled':
            return 'Cancelled';
        default:
            return 'Unknown';
    }
}

/**
 * Open booking details modal
 * 
 * @param {string} bookingId - Booking ID
 */
async function openBookingDetails(bookingId) {
    try {
        // Show modal
        const modal = document.querySelector('#booking-details-modal');
        modal.style.display = 'block';
        
        // Show loading state
        modal.querySelector('.modal-body').innerHTML = '<div class="loading">Loading booking details...</div>';
        
        // Fetch booking details
        const response = await fetch(`/customer/booking/${bookingId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const booking = await response.json();
            populateBookingDetails(booking);
        } else {
            console.error('Failed to load booking details:', await response.text());
            modal.querySelector('.modal-body').innerHTML = '<div class="error">Failed to load booking details. Please try again.</div>';
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
        const modal = document.querySelector('#booking-details-modal');
        if (modal) {
            modal.querySelector('.modal-body').innerHTML = '<div class="error">Failed to load booking details. Please try again.</div>';
        }
    }
}

/**
 * Populate booking details in modal
 * 
 * @param {Object} booking - Booking object
 */
function populateBookingDetails(booking) {
    const modal = document.querySelector('#booking-details-modal');
    if (!modal) return;
    
    // Reset modal content
    modal.querySelector('.modal-body').innerHTML = `
        <div class="booking-details-container">
            <div class="booking-status">
                <span class="status-label">Status:</span>
                <span class="status-value ${booking.status}">${getStatusLabel(booking.status)}</span>
            </div>
            <div class="booking-info">
                <div class="booking-id">
                    <span>Booking ID:</span>
                    <span id="booking-id-value">${booking.id}</span>
                </div>
                <div class="booking-date">
                    <span>Date:</span>
                    <span id="booking-date-value">${new Date(booking.booking_date).toLocaleDateString()}</span>
                </div>
                <div class="booking-time">
                    <span>Time:</span>
                    <span id="booking-time-value">${new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            <div class="service-details">
                <h3>Service Details</h3>
                <div class="service-type">
                    <span>Service Type:</span>
                    <span id="service-type-value">${booking.service_type}</span>
                </div>
                <div class="service-provider">
                    <span>Provider:</span>
                    <span id="service-provider-value">${booking.provider_name || 'Not assigned yet'}</span>
                </div>
            </div>
            <div class="location-details">
                <h3>Location</h3>
                <div class="pickup-location">
                    <span>Pickup:</span>
                    <span id="pickup-location-value">${booking.pickup_location}</span>
                </div>
                <div class="dropoff-location">
                    <span>Dropoff:</span>
                    <span id="dropoff-location-value">${booking.dropoff_location || 'N/A'}</span>
                </div>
            </div>
            <div class="payment-details">
                <h3>Payment</h3>
                <div class="payment-method">
                    <span>Method:</span>
                    <span id="payment-method-value">${booking.payment_method || 'Not specified'}</span>
                </div>
                <div class="payment-amount">
                    <span>Amount:</span>
                    <span id="payment-amount-value">₹${booking.amount.toFixed(2)}</span>
                </div>
                <div class="payment-status">
                    <span>Status:</span>
                    <span id="payment-status-value">${booking.payment_status || 'Pending'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Update action buttons based on booking status
    const modalFooter = modal.querySelector('.modal-footer');
    modalFooter.innerHTML = '<div class="booking-actions"></div>';
    
    const actionsContainer = modalFooter.querySelector('.booking-actions');
    
    if (booking.status === 'pending') {
        actionsContainer.innerHTML += '<button id="cancel-booking-btn" class="btn btn-danger">Cancel Booking</button>';
    }
    
    if (booking.status === 'in_progress') {
        actionsContainer.innerHTML += '<button id="track-booking-btn" class="btn btn-primary">Track</button>';
    }
    
    if (booking.status !== 'cancelled') {
        actionsContainer.innerHTML += '<button id="contact-provider-btn" class="btn btn-secondary">Contact Provider</button>';
    }
    
    if (booking.status === 'completed' && !booking.is_rated) {
        actionsContainer.innerHTML += '<button id="rate-booking-btn" class="btn btn-primary">Rate Service</button>';
    }
}

/**
 * Close booking details modal
 */
function closeBookingModal() {
    const modal = document.querySelector('#booking-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Cancel a booking
 * 
 * @param {string} bookingId - Booking ID
 */
async function cancelBooking(bookingId) {
    try {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }
        
        const response = await fetch(`/customer/booking/${bookingId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancellation_reason: 'Customer requested cancellation'
            })
        });
        
        if (response.ok) {
            // Close modal
            closeBookingModal();
            
            // Show success message
            alert('Booking cancelled successfully.');
            
            // Reload bookings
            loadUserBookings();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to cancel booking. Please try again.');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking. Please try again.');
    }
}

/**
 * Track a booking
 * 
 * @param {string} bookingId - Booking ID
 */
function trackBooking(bookingId) {
    // Navigate to tracking page
    window.location.href = `/tracking?booking_id=${bookingId}`;
}

/**
 * Contact a provider
 * 
 * @param {string} bookingId - Booking ID
 */
function contactProvider(bookingId) {
    // Navigate to messages page
    window.location.href = `/messages?booking_id=${bookingId}`;
}

/**
 * Initialize booking form
 */
function initBookingForm() {
    const bookingForm = document.querySelector('#booking-form');
    if (!bookingForm) return;
    
    // Initialize date and time pickers
    initDateTimePickers();
    
    // Initialize service type selection
    initServiceTypeSelection();
    
    // Initialize location inputs
    initLocationInputs();
    
    // Handle form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Get form data
            const formData = new FormData(bookingForm);
            const bookingData = {
                service_type: formData.get('service_type'),
                booking_date: formData.get('booking_date'),
                booking_time: formData.get('booking_time'),
                pickup_location: formData.get('pickup_location'),
                dropoff_location: formData.get('dropoff_location'),
                special_instructions: formData.get('special_instructions'),
                payment_method: formData.get('payment_method')
            };
            
            // Validate form data
            if (!validateBookingForm(bookingData)) {
                return;
            }
            
            // Combine date and time
            const dateTime = new Date(`${bookingData.booking_date}T${bookingData.booking_time}`);
            bookingData.booking_date = dateTime.toISOString();
            
            // Remove separate time field
            delete bookingData.booking_time;
            
            // Send booking request
            const response = await fetch('/customer/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Show success message
                alert('Booking created successfully!');
                
                // Redirect to bookings page
                window.location.href = '/customer-dashboard?tab=bookings';
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to create booking. Please try again.');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Failed to create booking. Please try again.');
        }
    });
}

/**
 * Initialize date and time pickers
 */
function initDateTimePickers() {
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.querySelector('input[name="booking_date"]');
    if (dateInput) {
        dateInput.min = today;
    }
}

/**
 * Initialize service type selection
 */
function initServiceTypeSelection() {
    const serviceTypeInputs = document.querySelectorAll('input[name="service_type"]');
    const serviceDetails = document.querySelectorAll('.service-details');
    
    serviceTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Hide all service details
            serviceDetails.forEach(details => {
                details.style.display = 'none';
            });
            
            // Show selected service details
            const selectedService = document.querySelector(`.service-details[data-service="${this.value}"]`);
            if (selectedService) {
                selectedService.style.display = 'block';
            }
        });
    });
}

/**
 * Initialize location inputs
 */
function initLocationInputs() {
    // Initialize autocomplete for location inputs
    const locationInputs = document.querySelectorAll('input[type="text"][name*="location"]');
    
    locationInputs.forEach(input => {
        // Here you would typically initialize Google Places Autocomplete
        // This is a placeholder for that functionality
        console.log('Location input initialized:', input.name);
    });
}

/**
 * Validate booking form data
 * 
 * @param {Object} bookingData - Booking form data
 * @returns {boolean} Whether the form data is valid
 */
function validateBookingForm(bookingData) {
    // Check required fields
    if (!bookingData.service_type) {
        alert('Please select a service type.');
        return false;
    }
    
    if (!bookingData.booking_date) {
        alert('Please select a booking date.');
        return false;
    }
    
    if (!bookingData.booking_time) {
        alert('Please select a booking time.');
        return false;
    }
    
    if (!bookingData.pickup_location) {
        alert('Please enter a pickup location.');
        return false;
    }
    
    // Validate date and time
    const dateTime = new Date(`${bookingData.booking_date}T${bookingData.booking_time}`);
    const now = new Date();
    
    if (dateTime < now) {
        alert('Booking date and time must be in the future.');
        return false;
    }
    
    return true;
}

// Export functions for testing
window.bookingSystem = {
    loadUserBookings,
    openBookingDetails,
    cancelBooking,
    trackBooking,
    contactProvider
};
