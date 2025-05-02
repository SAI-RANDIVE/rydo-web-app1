/**
 * Booking Service
 * 
 * This script handles the booking service functionality for the RYDO Web App.
 * It includes dynamic fare calculation, location services, and booking form submission.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize booking form
    initBookingForm();
    
    // Initialize service type selection
    initServiceTypeSelection();
    
    // Initialize location services
    initLocationServices();
    
    // Initialize date and time pickers
    initDateTimePickers();
    
    // Initialize fare calculation
    initFareCalculation();
});

// Initialize booking form
function initBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;
    
    // Check if user is logged in
    checkUserSession();
    
    // Handle form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Show loading state
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Get form data
            const formData = new FormData(bookingForm);
            const bookingData = {
                service_type: formData.get('service_type'),
                pickup_location: formData.get('pickup_location'),
                dropoff_location: formData.get('dropoff_location'),
                pickup_latitude: formData.get('pickup_latitude'),
                pickup_longitude: formData.get('pickup_longitude'),
                dropoff_latitude: formData.get('dropoff_latitude'),
                dropoff_longitude: formData.get('dropoff_longitude'),
                booking_date: formData.get('booking_date'),
                booking_time: formData.get('booking_time'),
                number_of_passengers: formData.get('number_of_passengers'),
                luggage_items: formData.get('luggage_items'),
                special_requirements: formData.get('special_requirements'),
                estimated_fare: formData.get('estimated_fare'),
                payment_method: formData.get('payment_method') || 'cash'
            };
            
            // Validate form data
            if (!validateBookingForm(bookingData)) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
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
                showBookingConfirmation(data.booking);
            } else {
                const error = await response.json();
                showAlert('error', error.message || 'Failed to create booking. Please try again.');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            showAlert('error', 'Failed to create booking. Please try again.');
            
            // Reset button
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Now';
        }
    });
}

// Check if user is logged in
async function checkUserSession() {
    try {
        const response = await fetch('/auth/check-session', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Redirect to login if not authenticated
            window.location.href = '/?redirect=' + encodeURIComponent(window.location.pathname);
        }
    } catch (error) {
        console.error('Error checking session:', error);
        // Redirect to login on error
        window.location.href = '/';
    }
}

// Initialize service type selection
function initServiceTypeSelection() {
    const serviceCards = document.querySelectorAll('.service-card');
    const serviceTypeInput = document.getElementById('service-type');
    const bookingForms = document.querySelectorAll('.service-booking-form');
    
    if (!serviceCards.length || !serviceTypeInput) return;
    
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Get service type
            const serviceType = this.getAttribute('data-service');
            
            // Update hidden input
            serviceTypeInput.value = serviceType;
            
            // Remove active class from all cards
            serviceCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            this.classList.add('active');
            
            // Hide all booking forms
            bookingForms.forEach(form => form.style.display = 'none');
            
            // Show the corresponding booking form
            const bookingForm = document.querySelector(`.service-booking-form[data-service="${serviceType}"]`);
            if (bookingForm) {
                bookingForm.style.display = 'block';
                
                // Scroll to booking form
                bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Reset fare calculation
            resetFareCalculation();
        });
    });
    
    // Check if service type is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceType = urlParams.get('service');
    
    if (serviceType) {
        const serviceCard = document.querySelector(`.service-card[data-service="${serviceType}"]`);
        if (serviceCard) {
            serviceCard.click();
        }
    }
}

// Initialize location services
function initLocationServices() {
    const pickupInput = document.getElementById('pickup-location');
    const dropoffInput = document.getElementById('dropoff-location');
    
    if (!pickupInput || !dropoffInput) return;
    
    // Initialize Google Places Autocomplete for pickup
    const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, {
        types: ['geocode']
    });
    
    pickupAutocomplete.addListener('place_changed', function() {
        const place = pickupAutocomplete.getPlace();
        if (!place.geometry) return;
        
        // Set hidden inputs for coordinates
        document.getElementById('pickup-latitude').value = place.geometry.location.lat();
        document.getElementById('pickup-longitude').value = place.geometry.location.lng();
        
        // Calculate fare if both locations are set
        calculateFare();
    });
    
    // Initialize Google Places Autocomplete for dropoff
    const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, {
        types: ['geocode']
    });
    
    dropoffAutocomplete.addListener('place_changed', function() {
        const place = dropoffAutocomplete.getPlace();
        if (!place.geometry) return;
        
        // Set hidden inputs for coordinates
        document.getElementById('dropoff-latitude').value = place.geometry.location.lat();
        document.getElementById('dropoff-longitude').value = place.geometry.location.lng();
        
        // Calculate fare if both locations are set
        calculateFare();
    });
    
    // Get user's current location for pickup
    const currentLocationBtn = document.getElementById('current-location-btn');
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                // Show loading spinner
                currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                navigator.geolocation.getCurrentPosition(async function(position) {
                    const { latitude, longitude } = position.coords;
                    
                    try {
                        // Get address from coordinates using reverse geocoding
                        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`);
                        const data = await response.json();
                        
                        if (data.results && data.results.length > 0) {
                            const address = data.results[0].formatted_address;
                            
                            // Set pickup input value
                            pickupInput.value = address;
                            
                            // Set hidden inputs for coordinates
                            document.getElementById('pickup-latitude').value = latitude;
                            document.getElementById('pickup-longitude').value = longitude;
                            
                            // Calculate fare if both locations are set
                            calculateFare();
                        }
                    } catch (error) {
                        console.error('Error getting address from coordinates:', error);
                    } finally {
                        // Reset button
                        currentLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                    }
                }, function(error) {
                    console.error('Error getting user location:', error);
                    showAlert('error', 'Failed to get your location. Please enter it manually.');
                    
                    // Reset button
                    currentLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                });
            } else {
                showAlert('error', 'Geolocation is not supported by this browser.');
            }
        });
    }
    
    // Load user's saved location if available
    const savedLocation = JSON.parse(sessionStorage.getItem('userLocation') || '{}');
    if (savedLocation && savedLocation.address) {
        pickupInput.value = savedLocation.address;
        
        // Set hidden inputs for coordinates
        document.getElementById('pickup-latitude').value = savedLocation.latitude;
        document.getElementById('pickup-longitude').value = savedLocation.longitude;
    }
}

// Initialize date and time pickers
function initDateTimePickers() {
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    
    if (!dateInput || !timeInput) return;
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    
    // Set min time based on current time if date is today
    updateMinTime();
    
    // Update min time when date changes
    dateInput.addEventListener('change', updateMinTime);
    
    // Add event listeners for fare calculation
    dateInput.addEventListener('change', calculateFare);
    timeInput.addEventListener('change', calculateFare);
}

// Update minimum time based on selected date
function updateMinTime() {
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    
    if (!dateInput || !timeInput) return;
    
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    
    // Reset time input
    timeInput.value = '';
    
    // If selected date is today, set min time to current time + 1 hour
    if (selectedDate.toDateString() === today.toDateString()) {
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();
        
        // Format time as HH:MM
        const minHour = currentHour + 1;
        const minTime = `${minHour.toString().padStart(2, '0')}:00`;
        
        timeInput.min = minTime;
    } else {
        // For future dates, allow any time
        timeInput.min = '';
    }
}

// Initialize fare calculation
function initFareCalculation() {
    // Add event listeners for inputs that affect fare
    const inputs = [
        'service-type',
        'pickup-location',
        'dropoff-location',
        'booking-date',
        'booking-time',
        'number-of-passengers',
        'luggage-items'
    ];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', calculateFare);
        }
    });
}

// Calculate fare based on inputs
async function calculateFare() {
    const serviceType = document.getElementById('service-type').value;
    const pickupLat = document.getElementById('pickup-latitude').value;
    const pickupLng = document.getElementById('pickup-longitude').value;
    const dropoffLat = document.getElementById('dropoff-latitude').value;
    const dropoffLng = document.getElementById('dropoff-longitude').value;
    const bookingDate = document.getElementById('booking-date').value;
    const bookingTime = document.getElementById('booking-time').value;
    const passengers = document.getElementById('number-of-passengers')?.value || 1;
    const luggageItems = document.getElementById('luggage-items')?.value || 0;
    
    // Check if we have all required inputs
    if (!serviceType || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !bookingDate || !bookingTime) {
        resetFareCalculation();
        return;
    }
    
    try {
        // Show loading state
        const fareContainer = document.querySelector('.fare-container');
        if (fareContainer) {
            fareContainer.innerHTML = '<div class="loading-fare">Calculating fare...</div>';
            fareContainer.style.display = 'block';
        }
        
        // Calculate distance using Google Maps Distance Matrix API
        const distanceResponse = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${dropoffLat},${dropoffLng}&mode=driving&key=YOUR_GOOGLE_MAPS_API_KEY`);
        const distanceData = await distanceResponse.json();
        
        if (distanceData.rows && distanceData.rows[0] && distanceData.rows[0].elements && distanceData.rows[0].elements[0] && distanceData.rows[0].elements[0].status === 'OK') {
            const distance = distanceData.rows[0].elements[0].distance.value / 1000; // Convert meters to kilometers
            const duration = distanceData.rows[0].elements[0].duration.value / 60; // Convert seconds to minutes
            
            // Calculate fare based on service type, distance, and other factors
            let baseFare = 0;
            let perKmRate = 0;
            let additionalCharges = 0;
            
            switch (serviceType) {
                case 'driver':
                    baseFare = 100;
                    perKmRate = 12;
                    break;
                case 'caretaker':
                    baseFare = 300;
                    perKmRate = 8;
                    break;
                case 'shuttle':
                    baseFare = 150;
                    perKmRate = 10;
                    // Additional charge for extra passengers
                    if (passengers > 2) {
                        additionalCharges += (passengers - 2) * 50;
                    }
                    // Additional charge for luggage
                    if (luggageItems > 1) {
                        additionalCharges += (luggageItems - 1) * 30;
                    }
                    break;
            }
            
            // Calculate fare
            let fare = baseFare + (distance * perKmRate) + additionalCharges;
            
            // Apply peak hour surcharge (7-10 AM and 5-8 PM)
            const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
            const hour = bookingDateTime.getHours();
            if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
                fare *= 1.2; // 20% surcharge during peak hours
            }
            
            // Apply weekend surcharge
            const day = bookingDateTime.getDay();
            if (day === 0 || day === 6) { // 0 is Sunday, 6 is Saturday
                fare *= 1.1; // 10% surcharge on weekends
            }
            
            // Round fare to nearest 10
            fare = Math.ceil(fare / 10) * 10;
            
            // Update fare in hidden input
            document.getElementById('estimated-fare').value = fare;
            
            // Update fare display
            if (fareContainer) {
                fareContainer.innerHTML = `
                    <div class="fare-details">
                        <div class="fare-header">
                            <h3>Estimated Fare</h3>
                            <span class="fare-amount">₹${fare.toFixed(2)}</span>
                        </div>
                        <div class="fare-breakdown">
                            <div class="fare-item">
                                <span>Base Fare</span>
                                <span>₹${baseFare.toFixed(2)}</span>
                            </div>
                            <div class="fare-item">
                                <span>Distance (${distance.toFixed(1)} km)</span>
                                <span>₹${(distance * perKmRate).toFixed(2)}</span>
                            </div>
                            ${additionalCharges > 0 ? `
                                <div class="fare-item">
                                    <span>Additional Charges</span>
                                    <span>₹${additionalCharges.toFixed(2)}</span>
                                </div>
                            ` : ''}
                            ${(hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20) ? `
                                <div class="fare-item">
                                    <span>Peak Hour Surcharge (20%)</span>
                                    <span>₹${(fare - (baseFare + (distance * perKmRate) + additionalCharges)).toFixed(2)}</span>
                                </div>
                            ` : ''}
                            ${(day === 0 || day === 6) ? `
                                <div class="fare-item">
                                    <span>Weekend Surcharge (10%)</span>
                                    <span>₹${(fare - (baseFare + (distance * perKmRate) + additionalCharges)).toFixed(2)}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="fare-notes">
                            <p>Estimated travel time: ${Math.ceil(duration)} minutes</p>
                            <p>Final fare may vary based on actual distance and time.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to calculate distance');
        }
    } catch (error) {
        console.error('Error calculating fare:', error);
        
        // Show error message
        const fareContainer = document.querySelector('.fare-container');
        if (fareContainer) {
            fareContainer.innerHTML = '<div class="fare-error">Failed to calculate fare. Please try again.</div>';
        }
    }
}

// Reset fare calculation
function resetFareCalculation() {
    // Reset estimated fare input
    document.getElementById('estimated-fare').value = '';
    
    // Hide fare container
    const fareContainer = document.querySelector('.fare-container');
    if (fareContainer) {
        fareContainer.style.display = 'none';
    }
}

// Validate booking form
function validateBookingForm(bookingData) {
    // Check required fields
    if (!bookingData.service_type) {
        showAlert('error', 'Please select a service type.');
        return false;
    }
    
    if (!bookingData.pickup_location) {
        showAlert('error', 'Please enter a pickup location.');
        return false;
    }
    
    if (!bookingData.dropoff_location) {
        showAlert('error', 'Please enter a dropoff location.');
        return false;
    }
    
    if (!bookingData.booking_date) {
        showAlert('error', 'Please select a booking date.');
        return false;
    }
    
    if (!bookingData.booking_time) {
        showAlert('error', 'Please select a booking time.');
        return false;
    }
    
    // Validate coordinates
    if (!bookingData.pickup_latitude || !bookingData.pickup_longitude) {
        showAlert('error', 'Invalid pickup location. Please select from the suggestions.');
        return false;
    }
    
    if (!bookingData.dropoff_latitude || !bookingData.dropoff_longitude) {
        showAlert('error', 'Invalid dropoff location. Please select from the suggestions.');
        return false;
    }
    
    // Validate date and time
    const dateTime = new Date(`${bookingData.booking_date}T${bookingData.booking_time}`);
    const now = new Date();
    
    if (dateTime < now) {
        showAlert('error', 'Booking date and time must be in the future.');
        return false;
    }
    
    // Validate fare
    if (!bookingData.estimated_fare) {
        showAlert('error', 'Failed to calculate fare. Please try again.');
        return false;
    }
    
    return true;
}

// Show booking confirmation
function showBookingConfirmation(booking) {
    // Create confirmation modal if it doesn't exist
    if (!document.getElementById('booking-confirmation-modal')) {
        const modal = document.createElement('div');
        modal.id = 'booking-confirmation-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Booking Confirmed!</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="confirmation-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="booking-details">
                        <div class="booking-reference">
                            <span>Booking Reference:</span>
                            <span id="booking-reference"></span>
                        </div>
                        <div class="booking-service">
                            <span>Service:</span>
                            <span id="booking-service"></span>
                        </div>
                        <div class="booking-datetime">
                            <span>Date & Time:</span>
                            <span id="booking-datetime"></span>
                        </div>
                        <div class="booking-pickup">
                            <span>Pickup:</span>
                            <span id="booking-pickup"></span>
                        </div>
                        <div class="booking-dropoff">
                            <span>Dropoff:</span>
                            <span id="booking-dropoff"></span>
                        </div>
                        <div class="booking-fare">
                            <span>Fare:</span>
                            <span id="booking-fare"></span>
                        </div>
                    </div>
                    <div class="confirmation-message">
                        <p>Your booking has been confirmed. You will receive a notification when a service provider accepts your booking.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary view-bookings-btn">View My Bookings</button>
                    <button class="btn btn-primary new-booking-btn">Book Another</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
            // Redirect to dashboard
            window.location.href = '/customer-dashboard?tab=bookings';
        });
        
        modal.querySelector('.view-bookings-btn').addEventListener('click', () => {
            // Redirect to bookings tab in dashboard
            window.location.href = '/customer-dashboard?tab=bookings';
        });
        
        modal.querySelector('.new-booking-btn').addEventListener('click', () => {
            modal.style.display = 'none';
            // Reset form
            document.getElementById('booking-form').reset();
            resetFareCalculation();
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                // Redirect to dashboard
                window.location.href = '/customer-dashboard?tab=bookings';
            }
        });
    }
    
    // Update booking details in modal
    document.getElementById('booking-reference').textContent = booking.booking_reference;
    document.getElementById('booking-service').textContent = booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1);
    document.getElementById('booking-datetime').textContent = `${new Date(booking.booking_date).toLocaleDateString()} at ${new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('booking-pickup').textContent = booking.pickup_location;
    document.getElementById('booking-dropoff').textContent = booking.dropoff_location;
    document.getElementById('booking-fare').textContent = `₹${parseFloat(booking.amount).toFixed(2)}`;
    
    // Show modal
    document.getElementById('booking-confirmation-modal').style.display = 'block';
}

// Show alert message
function showAlert(type, message) {
    // Create alert container if it doesn't exist
    if (!document.querySelector('.alert-container')) {
        const container = document.createElement('div');
        container.className = 'alert-container';
        document.body.appendChild(container);
    }
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `
        <div class="alert-icon">
            <i class="fas ${type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
        </div>
        <div class="alert-message">${message}</div>
        <div class="alert-close">&times;</div>
    `;
    
    // Add to container
    document.querySelector('.alert-container').appendChild(alert);
    
    // Show alert
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
    
    // Close button
    alert.querySelector('.alert-close').addEventListener('click', function() {
        alert.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
}
