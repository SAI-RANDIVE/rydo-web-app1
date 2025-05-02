/**
 * Nearby Drivers System
 * 
 * This script handles finding nearby drivers within a 3km radius and
 * manages booking timeouts (15 minutes) with retry functionality.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize nearby drivers system
    initNearbyDriversSystem();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize booking timeout system
    initBookingTimeoutSystem();
});

// Global variables
let userLocation = null;
let nearbyDrivers = [];
let currentBooking = null;
let bookingTimeoutInterval = null;

/**
 * Initialize nearby drivers system
 */
function initNearbyDriversSystem() {
    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Find nearby drivers once we have the user's location
                findNearbyDrivers();
            },
            function(error) {
                console.error('Error getting location:', error);
                showNotification('Unable to get your location. Please enable location services.', 'error');
            }
        );
    } else {
        showNotification('Geolocation is not supported by your browser.', 'error');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Listen for book now button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('book-driver-btn')) {
            const driverId = e.target.getAttribute('data-driver-id');
            if (driverId) {
                bookDriver(driverId);
            }
        }
        
        // Listen for retry booking button clicks
        if (e.target.classList.contains('retry-booking-btn')) {
            const bookingId = e.target.getAttribute('data-booking-id');
            if (bookingId) {
                retryBooking(bookingId);
            }
        }
    });
}

/**
 * Initialize booking timeout system
 */
function initBookingTimeoutSystem() {
    // Check if there's an active booking in localStorage
    const savedBooking = localStorage.getItem('currentBooking');
    if (savedBooking) {
        try {
            currentBooking = JSON.parse(savedBooking);
            
            // Check booking status
            checkBookingStatus(currentBooking.id);
            
            // Start countdown timer
            startBookingCountdown(new Date(currentBooking.expiration_time));
        } catch (error) {
            console.error('Error parsing saved booking:', error);
            localStorage.removeItem('currentBooking');
        }
    }
}

/**
 * Find nearby drivers within 3km radius
 */
async function findNearbyDrivers() {
    if (!userLocation) {
        showNotification('Location not available. Please enable location services.', 'error');
        return;
    }
    
    try {
        // Show loading state
        const driversContainer = document.querySelector('.nearby-drivers-container');
        if (driversContainer) {
            driversContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Finding drivers near you...</div>';
        }
        
        // Fetch nearby drivers from server
        const response = await fetch('/nearby-drivers/find', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                radius: 3 // 3km radius
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to find nearby drivers');
        }
        
        const data = await response.json();
        
        if (data.success) {
            nearbyDrivers = data.drivers;
            
            // Render nearby drivers
            renderNearbyDrivers(nearbyDrivers);
        } else {
            throw new Error(data.message || 'Failed to find nearby drivers');
        }
    } catch (error) {
        console.error('Error finding nearby drivers:', error);
        
        // Show error message
        const driversContainer = document.querySelector('.nearby-drivers-container');
        if (driversContainer) {
            driversContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Could not find drivers near you. Please try again later.</div>';
        }
        
        showNotification('Failed to find nearby drivers. Please try again later.', 'error');
    }
}

/**
 * Render nearby drivers in the container
 * 
 * @param {Array} drivers - Array of driver objects
 */
function renderNearbyDrivers(drivers) {
    const driversContainer = document.querySelector('.nearby-drivers-container');
    
    if (!driversContainer) {
        return;
    }
    
    if (!drivers.length) {
        driversContainer.innerHTML = '<div class="no-drivers-message"><i class="fas fa-car-side"></i> No drivers available in your area right now. Please try again later.</div>';
        return;
    }
    
    // Create drivers list
    let html = '<div class="drivers-list">';
    
    drivers.forEach(driver => {
        html += `
            <div class="driver-card">
                <div class="driver-profile">
                    <div class="driver-image">
                        <img src="${driver.profile_image || '/images/default-avatar.png'}" alt="${driver.name}">
                    </div>
                    <div class="driver-info">
                        <h3>${driver.name}</h3>
                        <div class="driver-rating">
                            <i class="fas fa-star"></i>
                            <span>${driver.rating.toFixed(1)}</span>
                            <span class="total-rides">(${driver.total_rides} rides)</span>
                        </div>
                        <div class="driver-distance">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${driver.distance} km away</span>
                        </div>
                    </div>
                </div>
                <div class="driver-vehicle">
                    <div class="vehicle-info">
                        <i class="fas fa-car"></i>
                        <span>${driver.vehicle.make} ${driver.vehicle.model}</span>
                    </div>
                    <div class="vehicle-type">
                        <span>${driver.vehicle.type}</span>
                    </div>
                </div>
                <button class="book-driver-btn" data-driver-id="${driver.id}">Book Now</button>
            </div>
        `;
    });
    
    html += '</div>';
    
    driversContainer.innerHTML = html;
}

/**
 * Book a driver
 * 
 * @param {string} driverId - Driver ID
 */
async function bookDriver(driverId) {
    try {
        // Check if there's already an active booking
        if (currentBooking) {
            showNotification('You already have an active booking. Please cancel it first.', 'warning');
            return;
        }
        
        // Get booking details from form
        const bookingForm = document.getElementById('booking-form');
        if (!bookingForm) {
            showNotification('Booking form not found.', 'error');
            return;
        }
        
        const formData = new FormData(bookingForm);
        const bookingData = {
            service_type: formData.get('service_type') || 'driver',
            provider_id: driverId,
            pickup_location: formData.get('pickup_location'),
            dropoff_location: formData.get('dropoff_location'),
            pickup_latitude: userLocation.latitude,
            pickup_longitude: userLocation.longitude,
            booking_date: formData.get('booking_date'),
            booking_time: formData.get('booking_time'),
            payment_method: formData.get('payment_method') || 'wallet',
            fare_amount: formData.get('fare_amount'),
            notes: formData.get('notes')
        };
        
        // Validate booking data
        if (!bookingData.pickup_location) {
            showNotification('Please enter pickup location.', 'warning');
            return;
        }
        
        if (!bookingData.booking_date || !bookingData.booking_time) {
            showNotification('Please select booking date and time.', 'warning');
            return;
        }
        
        // Show loading state
        const bookingContainer = document.querySelector('.booking-container');
        if (bookingContainer) {
            bookingContainer.classList.add('loading');
            bookingContainer.innerHTML += '<div class="loading-overlay"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Processing your booking...</div></div>';
        }
        
        // Create booking with timeout
        const response = await fetch('/nearby-drivers/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        // Remove loading state
        if (bookingContainer) {
            bookingContainer.classList.remove('loading');
            const loadingOverlay = bookingContainer.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create booking');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Save current booking
            currentBooking = data.booking;
            localStorage.setItem('currentBooking', JSON.stringify(currentBooking));
            
            // Show booking confirmation
            showBookingConfirmation(currentBooking);
            
            // Start countdown timer
            startBookingCountdown(new Date(currentBooking.expiration_time));
            
            // Show success notification
            showNotification('Booking created successfully! Driver has 15 minutes to accept.', 'success');
        } else {
            throw new Error(data.message || 'Failed to create booking');
        }
    } catch (error) {
        console.error('Error booking driver:', error);
        showNotification(error.message || 'Failed to book driver. Please try again.', 'error');
    }
}

/**
 * Show booking confirmation
 * 
 * @param {Object} booking - Booking object
 */
function showBookingConfirmation(booking) {
    // Create booking confirmation container if it doesn't exist
    let confirmationContainer = document.querySelector('.booking-confirmation-container');
    
    if (!confirmationContainer) {
        confirmationContainer = document.createElement('div');
        confirmationContainer.className = 'booking-confirmation-container';
        
        // Find the appropriate container to append to
        const bookingContainer = document.querySelector('.booking-container');
        if (bookingContainer) {
            bookingContainer.appendChild(confirmationContainer);
        } else {
            document.body.appendChild(confirmationContainer);
        }
    }
    
    // Set confirmation content
    confirmationContainer.innerHTML = `
        <div class="booking-confirmation">
            <div class="confirmation-header">
                <h2>Booking Confirmation</h2>
                <div class="booking-status pending">
                    <span>Waiting for driver to accept</span>
                </div>
            </div>
            <div class="confirmation-details">
                <div class="booking-reference">
                    <span>Booking Reference:</span>
                    <span>${booking.reference_id}</span>
                </div>
                <div class="booking-service">
                    <span>Service Type:</span>
                    <span>${booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1)}</span>
                </div>
                <div class="booking-expiration">
                    <span>Expires in:</span>
                    <span id="booking-countdown">15:00</span>
                </div>
            </div>
            <div class="confirmation-actions">
                <button class="cancel-booking-btn" data-booking-id="${booking.id}">Cancel Booking</button>
                <button class="view-details-btn" data-booking-id="${booking.id}">View Details</button>
            </div>
        </div>
    `;
    
    // Show confirmation
    confirmationContainer.style.display = 'block';
}

/**
 * Start booking countdown timer
 * 
 * @param {Date} expirationTime - Booking expiration time
 */
function startBookingCountdown(expirationTime) {
    // Clear any existing interval
    if (bookingTimeoutInterval) {
        clearInterval(bookingTimeoutInterval);
    }
    
    // Update countdown every second
    bookingTimeoutInterval = setInterval(function() {
        const now = new Date();
        const timeLeft = expirationTime - now;
        
        // If countdown is finished
        if (timeLeft <= 0) {
            clearInterval(bookingTimeoutInterval);
            
            // Check booking status
            if (currentBooking) {
                checkBookingStatus(currentBooking.id);
            }
            
            return;
        }
        
        // Calculate minutes and seconds
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        // Update countdown display
        const countdownElement = document.getElementById('booking-countdown');
        if (countdownElement) {
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

/**
 * Check booking status
 * 
 * @param {string} bookingId - Booking ID
 */
async function checkBookingStatus(bookingId) {
    try {
        const response = await fetch(`/nearby-drivers/check-status/${bookingId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check booking status');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update current booking
            currentBooking = data.booking;
            localStorage.setItem('currentBooking', JSON.stringify(currentBooking));
            
            // Update booking status display
            updateBookingStatusDisplay(currentBooking);
            
            // If booking is expired, show retry option
            if (currentBooking.status === 'expired') {
                showBookingExpired(currentBooking);
            }
            
            // If booking is accepted, show driver details
            if (currentBooking.status === 'accepted') {
                // Fetch booking details to get driver info
                getBookingDetails(currentBooking.id);
            }
        } else {
            throw new Error(data.message || 'Failed to check booking status');
        }
    } catch (error) {
        console.error('Error checking booking status:', error);
    }
}

/**
 * Update booking status display
 * 
 * @param {Object} booking - Booking object
 */
function updateBookingStatusDisplay(booking) {
    const statusElement = document.querySelector('.booking-status');
    
    if (!statusElement) {
        return;
    }
    
    // Remove all status classes
    statusElement.classList.remove('pending', 'accepted', 'expired', 'cancelled', 'completed');
    
    // Add appropriate status class and text
    statusElement.classList.add(booking.status);
    
    let statusText = '';
    
    switch (booking.status) {
        case 'pending':
            statusText = 'Waiting for driver to accept';
            break;
        case 'accepted':
            statusText = 'Driver accepted';
            break;
        case 'expired':
            statusText = 'Booking expired';
            break;
        case 'cancelled':
            statusText = 'Booking cancelled';
            break;
        case 'completed':
            statusText = 'Booking completed';
            break;
        default:
            statusText = booking.status;
    }
    
    statusElement.innerHTML = `<span>${statusText}</span>`;
}

/**
 * Show booking expired message with retry option
 * 
 * @param {Object} booking - Booking object
 */
function showBookingExpired(booking) {
    // Clear countdown interval
    if (bookingTimeoutInterval) {
        clearInterval(bookingTimeoutInterval);
    }
    
    // Update countdown display
    const countdownElement = document.getElementById('booking-countdown');
    if (countdownElement) {
        countdownElement.textContent = '00:00';
    }
    
    // Update confirmation actions
    const actionsContainer = document.querySelector('.confirmation-actions');
    
    if (!actionsContainer) {
        return;
    }
    
    actionsContainer.innerHTML = `
        <button class="retry-booking-btn" data-booking-id="${booking.id}">Retry Booking</button>
        <button class="new-booking-btn">New Booking</button>
    `;
    
    // Show notification
    showNotification('Your booking has expired. Driver did not accept within 15 minutes.', 'warning');
}

/**
 * Retry an expired booking
 * 
 * @param {string} bookingId - Booking ID
 */
async function retryBooking(bookingId) {
    try {
        // Show loading state
        const retryButton = document.querySelector('.retry-booking-btn');
        if (retryButton) {
            retryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Retrying...';
            retryButton.disabled = true;
        }
        
        // Retry booking
        const response = await fetch(`/nearby-drivers/retry/${bookingId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Reset button state
        if (retryButton) {
            retryButton.innerHTML = 'Retry Booking';
            retryButton.disabled = false;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to retry booking');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update current booking
            currentBooking = data.booking;
            localStorage.setItem('currentBooking', JSON.stringify(currentBooking));
            
            // Update booking status display
            updateBookingStatusDisplay(currentBooking);
            
            // Start countdown timer
            startBookingCountdown(new Date(currentBooking.expiration_time));
            
            // Update confirmation actions
            const actionsContainer = document.querySelector('.confirmation-actions');
            
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <button class="cancel-booking-btn" data-booking-id="${currentBooking.id}">Cancel Booking</button>
                    <button class="view-details-btn" data-booking-id="${currentBooking.id}">View Details</button>
                `;
            }
            
            // Show success notification
            showNotification('Booking retried successfully! Driver has 15 minutes to accept.', 'success');
        } else {
            throw new Error(data.message || 'Failed to retry booking');
        }
    } catch (error) {
        console.error('Error retrying booking:', error);
        showNotification(error.message || 'Failed to retry booking. Please try again.', 'error');
    }
}

/**
 * Get booking details including driver information
 * 
 * @param {string} bookingId - Booking ID
 */
async function getBookingDetails(bookingId) {
    try {
        const response = await fetch(`/nearby-drivers/booking/${bookingId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get booking details');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Show driver details
            showDriverDetails(data.booking);
        } else {
            throw new Error(data.message || 'Failed to get booking details');
        }
    } catch (error) {
        console.error('Error getting booking details:', error);
    }
}

/**
 * Show driver details for accepted booking
 * 
 * @param {Object} booking - Booking object with provider details
 */
function showDriverDetails(booking) {
    // Create driver details container if it doesn't exist
    let driverDetailsContainer = document.querySelector('.driver-details-container');
    
    if (!driverDetailsContainer) {
        driverDetailsContainer = document.createElement('div');
        driverDetailsContainer.className = 'driver-details-container';
        
        // Find the appropriate container to append to
        const confirmationContainer = document.querySelector('.booking-confirmation-container');
        if (confirmationContainer) {
            confirmationContainer.appendChild(driverDetailsContainer);
        }
    }
    
    // Set driver details content
    driverDetailsContainer.innerHTML = `
        <div class="driver-details">
            <h3>Your Driver</h3>
            <div class="driver-profile">
                <div class="driver-image">
                    <img src="${booking.provider.profile_image || '/images/default-avatar.png'}" alt="${booking.provider.name}">
                </div>
                <div class="driver-info">
                    <h4>${booking.provider.name}</h4>
                    <div class="driver-rating">
                        <i class="fas fa-star"></i>
                        <span>${booking.provider.rating.toFixed(1)}</span>
                    </div>
                    <div class="driver-contact">
                        <a href="tel:${booking.provider.phone}" class="call-driver-btn">
                            <i class="fas fa-phone"></i> Call Driver
                        </a>
                    </div>
                </div>
            </div>
            <div class="vehicle-details">
                <h4>Vehicle Details</h4>
                <div class="vehicle-info">
                    <div class="vehicle-model">
                        <span>Vehicle:</span>
                        <span>${booking.provider.vehicle.make} ${booking.provider.vehicle.model}</span>
                    </div>
                    <div class="vehicle-type">
                        <span>Type:</span>
                        <span>${booking.provider.vehicle.type}</span>
                    </div>
                    <div class="license-plate">
                        <span>License Plate:</span>
                        <span>${booking.provider.vehicle.license_plate}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show driver details
    driverDetailsContainer.style.display = 'block';
    
    // Show notification
    showNotification('Driver has accepted your booking!', 'success');
}

/**
 * Show notification
 * 
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Export functions for testing
window.nearbyDriversSystem = {
    findNearbyDrivers,
    bookDriver,
    checkBookingStatus,
    retryBooking
};
