/**
 * Driver Visibility Module
 * Handles displaying nearby drivers on map and driver selection
 */

// Initialize map and driver visibility
let map;
let userMarker;
let driverMarkers = [];
let selectedDriver = null;
let userLocation = { lat: 12.9716, lng: 77.5946 }; // Default to Bangalore

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map if map container exists
    const mapContainer = document.getElementById('booking-map');
    if (mapContainer) {
        initializeMap();
    }

    // Setup booking form handlers
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Setup driver filter handlers
    const languageFilter = document.getElementById('language-filter');
    if (languageFilter) {
        languageFilter.addEventListener('change', filterDriversByLanguage);
    }

    // Setup vehicle type filter
    const vehicleTypeFilter = document.getElementById('vehicle-type-filter');
    if (vehicleTypeFilter) {
        vehicleTypeFilter.addEventListener('change', filterDriversByVehicleType);
    }
});

/**
 * Initialize Google Maps
 */
function initializeMap() {
    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Initialize map with user's location
                createMap();
                
                // Load nearby drivers
                loadNearbyDrivers();
            },
            (error) => {
                console.error('Error getting user location:', error);
                // Use default location
                createMap();
                loadNearbyDrivers();
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
        // Use default location
        createMap();
        loadNearbyDrivers();
    }
}

/**
 * Create the map centered on user's location
 */
function createMap() {
    // Create map centered on user location
    map = new google.maps.Map(document.getElementById('booking-map'), {
        center: userLocation,
        zoom: 14,
        styles: [
            {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{ "visibility": "off" }]
            }
        ]
    });
    
    // Add user marker
    userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        icon: {
            url: '/images/user-marker.png',
            scaledSize: new google.maps.Size(40, 40)
        },
        title: 'Your Location'
    });
    
    // Add a circle to show the search radius
    const radiusCircle = new google.maps.Circle({
        strokeColor: '#3F51B5',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#3F51B5',
        fillOpacity: 0.1,
        map: map,
        center: userLocation,
        radius: 3000 // 3km radius
    });
}

/**
 * Load nearby drivers from API
 */
async function loadNearbyDrivers() {
    try {
        // Show loading indicator
        showLoadingIndicator();
        
        // Get driver type filter if exists
        const serviceType = document.getElementById('service-type')?.value || 'driver';
        
        // Make API request to get nearby drivers
        const response = await fetch('/api/drivers/nearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                radius: 3, // 3km radius
                service_type: serviceType
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch nearby drivers');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        if (data.success && data.drivers && data.drivers.length > 0) {
            // Display drivers on map
            displayDriversOnMap(data.drivers);
            
            // Display drivers list
            displayDriversList(data.drivers);
            
            // Update driver count
            updateDriverCount(data.drivers.length);
        } else {
            // No drivers found
            showNoDriversMessage();
        }
    } catch (error) {
        console.error('Error loading nearby drivers:', error);
        hideLoadingIndicator();
        showErrorMessage('Failed to load nearby drivers. Please try again.');
    }
}

/**
 * Display drivers on the map
 * @param {Array} drivers - Array of driver objects
 */
function displayDriversOnMap(drivers) {
    // Clear existing markers
    clearDriverMarkers();
    
    // Add markers for each driver
    drivers.forEach(driver => {
        const driverLocation = {
            lat: driver.latitude,
            lng: driver.longitude
        };
        
        // Create driver marker
        const marker = new google.maps.Marker({
            position: driverLocation,
            map: map,
            icon: {
                url: '/images/car-marker.png',
                scaledSize: new google.maps.Size(30, 30)
            },
            title: driver.name
        });
        
        // Add click event to marker
        marker.addListener('click', () => {
            selectDriver(driver, marker);
        });
        
        // Store marker reference
        driverMarkers.push({
            id: driver.id,
            marker: marker,
            driver: driver
        });
    });
}

/**
 * Clear all driver markers from the map
 */
function clearDriverMarkers() {
    driverMarkers.forEach(item => {
        item.marker.setMap(null);
    });
    driverMarkers = [];
}

/**
 * Display drivers in a list view
 * @param {Array} drivers - Array of driver objects
 */
function displayDriversList(drivers) {
    const driversListContainer = document.getElementById('drivers-list');
    if (!driversListContainer) return;
    
    // Clear existing list
    driversListContainer.innerHTML = '';
    
    // Add each driver to the list
    drivers.forEach(driver => {
        const driverItem = document.createElement('div');
        driverItem.className = 'driver-item';
        driverItem.dataset.driverId = driver.id;
        
        // Create driver card
        driverItem.innerHTML = `
            <div class="driver-avatar">
                ${driver.profile_image ? 
                    `<img src="${driver.profile_image}" alt="${driver.name}">` : 
                    `<div class="avatar-placeholder">${driver.name.charAt(0)}</div>`
                }
            </div>
            <div class="driver-info">
                <h4>${driver.name}</h4>
                <div class="driver-rating">
                    <i class="fas fa-star"></i>
                    <span>${driver.rating}</span>
                    <span class="rides-count">(${driver.total_rides} rides)</span>
                </div>
                <div class="driver-vehicle">
                    <i class="fas fa-car"></i>
                    <span>${driver.vehicle.make} ${driver.vehicle.model} - ${driver.vehicle.color}</span>
                </div>
                <div class="driver-languages">
                    <i class="fas fa-language"></i>
                    <span>${driver.languages.join(', ')}</span>
                </div>
            </div>
            <div class="driver-eta">
                <div class="eta-time">${driver.estimated_arrival_time} min</div>
                <div class="distance">${driver.distance} km</div>
            </div>
            <button class="select-driver-btn" data-driver-id="${driver.id}">Select</button>
        `;
        
        // Add click event to select driver
        driverItem.querySelector('.select-driver-btn').addEventListener('click', () => {
            // Find the marker for this driver
            const markerItem = driverMarkers.find(item => item.id === driver.id);
            if (markerItem) {
                selectDriver(driver, markerItem.marker);
            }
        });
        
        driversListContainer.appendChild(driverItem);
    });
}

/**
 * Select a driver
 * @param {Object} driver - Driver object
 * @param {Object} marker - Google Maps marker object
 */
function selectDriver(driver, marker) {
    // Deselect previously selected driver
    if (selectedDriver) {
        const prevDriverItem = document.querySelector(`.driver-item[data-driver-id="${selectedDriver.id}"]`);
        if (prevDriverItem) {
            prevDriverItem.classList.remove('selected');
        }
    }
    
    // Set selected driver
    selectedDriver = driver;
    
    // Highlight selected driver in the list
    const driverItem = document.querySelector(`.driver-item[data-driver-id="${driver.id}"]`);
    if (driverItem) {
        driverItem.classList.add('selected');
    }
    
    // Show driver details in booking panel
    showDriverDetails(driver);
    
    // Show route to driver
    showRouteToDriver(driver);
    
    // Enable book button
    enableBookButton();
}

/**
 * Show driver details in the booking panel
 * @param {Object} driver - Driver object
 */
function showDriverDetails(driver) {
    const driverDetailsContainer = document.getElementById('selected-driver-details');
    if (!driverDetailsContainer) return;
    
    driverDetailsContainer.innerHTML = `
        <div class="selected-driver-header">
            <h3>Selected Driver</h3>
        </div>
        <div class="selected-driver-info">
            <div class="driver-avatar">
                ${driver.profile_image ? 
                    `<img src="${driver.profile_image}" alt="${driver.name}">` : 
                    `<div class="avatar-placeholder">${driver.name.charAt(0)}</div>`
                }
            </div>
            <div class="driver-details">
                <h4>${driver.name}</h4>
                <div class="driver-rating">
                    <i class="fas fa-star"></i>
                    <span>${driver.rating}</span>
                    <span class="rides-count">(${driver.total_rides} rides)</span>
                </div>
                <div class="driver-vehicle">
                    <i class="fas fa-car"></i>
                    <span>${driver.vehicle.make} ${driver.vehicle.model}</span>
                </div>
                <div class="driver-vehicle-details">
                    <span>${driver.vehicle.color} | ${driver.vehicle.license_plate}</span>
                </div>
                <div class="driver-languages">
                    <i class="fas fa-language"></i>
                    <span>${driver.languages.join(', ')}</span>
                </div>
                <div class="driver-eta">
                    <i class="fas fa-clock"></i>
                    <span>Arrives in ${driver.estimated_arrival_time} minutes</span>
                </div>
            </div>
        </div>
    `;
    
    // Show the container
    driverDetailsContainer.style.display = 'block';
}

/**
 * Show route from user to driver
 * @param {Object} driver - Driver object
 */
function showRouteToDriver(driver) {
    if (!map) return;
    
    // Create DirectionsService object
    const directionsService = new google.maps.DirectionsService();
    
    // Create DirectionsRenderer object
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#3F51B5',
            strokeWeight: 5,
            strokeOpacity: 0.7
        }
    });
    
    // Set route
    directionsService.route({
        origin: { lat: driver.latitude, lng: driver.longitude },
        destination: userLocation,
        travelMode: google.maps.TravelMode.DRIVING
    }, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            
            // Get route details
            const route = response.routes[0];
            const leg = route.legs[0];
            
            // Update ETA with actual route duration
            updateETA(leg.duration.text);
        } else {
            console.error('Directions request failed due to ' + status);
        }
    });
}

/**
 * Update ETA display
 * @param {string} duration - Duration text
 */
function updateETA(duration) {
    const etaElement = document.getElementById('driver-eta');
    if (etaElement) {
        etaElement.textContent = duration;
    }
}

/**
 * Enable book button
 */
function enableBookButton() {
    const bookButton = document.getElementById('book-button');
    if (bookButton) {
        bookButton.disabled = false;
    }
}

/**
 * Filter drivers by language
 */
function filterDriversByLanguage() {
    const languageFilter = document.getElementById('language-filter');
    if (!languageFilter) return;
    
    const selectedLanguage = languageFilter.value;
    
    // If 'all' is selected, show all drivers
    if (selectedLanguage === 'all') {
        driverMarkers.forEach(item => {
            item.marker.setMap(map);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'flex';
            }
        });
        
        return;
    }
    
    // Filter drivers by selected language
    driverMarkers.forEach(item => {
        const driver = item.driver;
        
        if (driver.languages.includes(selectedLanguage)) {
            // Show driver
            item.marker.setMap(map);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'flex';
            }
        } else {
            // Hide driver
            item.marker.setMap(null);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'none';
            }
        }
    });
    
    // Update visible driver count
    const visibleDrivers = driverMarkers.filter(item => item.marker.getMap() !== null);
    updateDriverCount(visibleDrivers.length);
}

/**
 * Filter drivers by vehicle type
 */
function filterDriversByVehicleType() {
    const vehicleTypeFilter = document.getElementById('vehicle-type-filter');
    if (!vehicleTypeFilter) return;
    
    const selectedVehicleType = vehicleTypeFilter.value;
    
    // If 'all' is selected, show all drivers
    if (selectedVehicleType === 'all') {
        driverMarkers.forEach(item => {
            item.marker.setMap(map);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'flex';
            }
        });
        
        return;
    }
    
    // Filter drivers by selected vehicle type
    driverMarkers.forEach(item => {
        const driver = item.driver;
        
        if (driver.vehicle.type === selectedVehicleType) {
            // Show driver
            item.marker.setMap(map);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'flex';
            }
        } else {
            // Hide driver
            item.marker.setMap(null);
            
            const driverItem = document.querySelector(`.driver-item[data-driver-id="${item.id}"]`);
            if (driverItem) {
                driverItem.style.display = 'none';
            }
        }
    });
    
    // Update visible driver count
    const visibleDrivers = driverMarkers.filter(item => item.marker.getMap() !== null);
    updateDriverCount(visibleDrivers.length);
}

/**
 * Update driver count display
 * @param {number} count - Number of drivers
 */
function updateDriverCount(count) {
    const driverCountElement = document.getElementById('driver-count');
    if (driverCountElement) {
        driverCountElement.textContent = count;
    }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Show no drivers message
 */
function showNoDriversMessage() {
    const driversListContainer = document.getElementById('drivers-list');
    if (!driversListContainer) return;
    
    driversListContainer.innerHTML = `
        <div class="no-drivers-message">
            <i class="fas fa-car-side"></i>
            <p>No drivers available in your area</p>
            <button id="retry-button" class="btn-primary">Retry</button>
        </div>
    `;
    
    // Add click event to retry button
    document.getElementById('retry-button').addEventListener('click', loadNearbyDrivers);
    
    // Update driver count
    updateDriverCount(0);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide error message after 5 seconds
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

/**
 * Handle booking form submission
 * @param {Event} e - Form submission event
 */
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    if (!selectedDriver) {
        showErrorMessage('Please select a driver first');
        return;
    }
    
    // Get form values
    const pickupLocation = document.getElementById('pickup-location').value;
    const dropoffLocation = document.getElementById('dropoff-location').value;
    const serviceType = document.getElementById('service-type')?.value || 'driver';
    const paymentMethod = document.getElementById('payment-method')?.value || 'wallet';
    const specialRequirements = document.getElementById('special-requirements')?.value || '';
    
    // Validate form
    if (!pickupLocation) {
        showErrorMessage('Please enter pickup location');
        return;
    }
    
    if (serviceType === 'driver' && !dropoffLocation) {
        showErrorMessage('Please enter dropoff location');
        return;
    }
    
    try {
        // Show loading indicator
        showLoadingIndicator();
        
        // Make API request to create booking
        const response = await fetch('/api/booking/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_type: serviceType,
                driver_id: selectedDriver.id,
                pickup_location: pickupLocation,
                dropoff_location: dropoffLocation,
                pickup_latitude: userLocation.lat,
                pickup_longitude: userLocation.lng,
                payment_method: paymentMethod,
                preferred_language: selectedDriver.languages[0],
                special_requirements: specialRequirements
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create booking');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        if (data.success) {
            // Show booking confirmation
            showBookingConfirmation(data.booking);
        } else {
            showErrorMessage(data.message || 'Failed to create booking');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        hideLoadingIndicator();
        showErrorMessage('Failed to create booking. Please try again.');
    }
}

/**
 * Show booking confirmation
 * @param {Object} booking - Booking object
 */
function showBookingConfirmation(booking) {
    // Hide booking form
    const bookingForm = document.getElementById('booking-form-container');
    if (bookingForm) {
        bookingForm.style.display = 'none';
    }
    
    // Show confirmation
    const confirmationContainer = document.getElementById('booking-confirmation');
    if (!confirmationContainer) return;
    
    confirmationContainer.innerHTML = `
        <div class="confirmation-header">
            <i class="fas fa-check-circle"></i>
            <h2>Booking Confirmed</h2>
        </div>
        <div class="confirmation-details">
            <p>Your booking has been confirmed. Your driver will arrive shortly.</p>
            <div class="booking-id">
                <span>Booking ID:</span>
                <span>${booking.id}</span>
            </div>
            <div class="booking-status">
                <span>Status:</span>
                <span>${booking.status}</span>
            </div>
            <div class="driver-details">
                <h3>Driver Details</h3>
                <p>${selectedDriver.name}</p>
                <p>${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model} - ${selectedDriver.vehicle.color}</p>
                <p>${selectedDriver.vehicle.license_plate}</p>
            </div>
            <div class="pickup-details">
                <h3>Pickup Details</h3>
                <p>${booking.pickup_location}</p>
            </div>
            ${booking.dropoff_location ? `
                <div class="dropoff-details">
                    <h3>Dropoff Details</h3>
                    <p>${booking.dropoff_location}</p>
                </div>
            ` : ''}
            <div class="fare-details">
                <h3>Fare Details</h3>
                <p>₹${booking.fare_amount}</p>
                <p>Payment Method: ${booking.payment_method}</p>
            </div>
        </div>
        <div class="confirmation-actions">
            <button id="track-ride-btn" class="btn-primary">Track Ride</button>
            <button id="cancel-booking-btn" class="btn-secondary">Cancel Booking</button>
        </div>
    `;
    
    // Show confirmation container
    confirmationContainer.style.display = 'block';
    
    // Add event listeners to buttons
    document.getElementById('track-ride-btn').addEventListener('click', () => {
        window.location.href = `/track-ride.html?booking_id=${booking.id}`;
    });
    
    document.getElementById('cancel-booking-btn').addEventListener('click', () => {
        cancelBooking(booking.id);
    });
}

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 */
async function cancelBooking(bookingId) {
    try {
        // Show loading indicator
        showLoadingIndicator();
        
        // Make API request to cancel booking
        const response = await fetch(`/api/booking/${bookingId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: 'User cancelled'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        if (data.success) {
            // Show cancellation confirmation
            showCancellationConfirmation(data.booking);
        } else {
            showErrorMessage(data.message || 'Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        hideLoadingIndicator();
        showErrorMessage('Failed to cancel booking. Please try again.');
    }
}

/**
 * Show cancellation confirmation
 * @param {Object} booking - Booking object
 */
function showCancellationConfirmation(booking) {
    const confirmationContainer = document.getElementById('booking-confirmation');
    if (!confirmationContainer) return;
    
    confirmationContainer.innerHTML = `
        <div class="cancellation-header">
            <i class="fas fa-times-circle"></i>
            <h2>Booking Cancelled</h2>
        </div>
        <div class="cancellation-details">
            <p>Your booking has been cancelled.</p>
            <div class="booking-id">
                <span>Booking ID:</span>
                <span>${booking.id}</span>
            </div>
            <div class="cancellation-reason">
                <span>Reason:</span>
                <span>${booking.cancellation_reason}</span>
            </div>
            ${booking.cancellation_fee > 0 ? `
                <div class="cancellation-fee">
                    <span>Cancellation Fee:</span>
                    <span>₹${booking.cancellation_fee}</span>
                </div>
            ` : ''}
            <div class="cancellation-time">
                <span>Cancelled At:</span>
                <span>${new Date(booking.cancelled_at).toLocaleString()}</span>
            </div>
        </div>
        <div class="cancellation-actions">
            <button id="new-booking-btn" class="btn-primary">Book New Ride</button>
            <button id="go-to-dashboard-btn" class="btn-secondary">Go to Dashboard</button>
        </div>
    `;
    
    // Add event listeners to buttons
    document.getElementById('new-booking-btn').addEventListener('click', () => {
        window.location.reload();
    });
    
    document.getElementById('go-to-dashboard-btn').addEventListener('click', () => {
        window.location.href = '/customer-dashboard';
    });
}
