/**
 * RYDO Booking Service JavaScript
 * Handles service selection, form validation, fare calculation, and booking submission
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize booking page
    initBookingPage();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set today as minimum date for all date inputs
    setMinDates();
    
    // Load user data (profile and wallet balance)
    loadUserData();
    
    // Initialize location services
    initLocationServices();
});

/**
 * Initialize the booking page
 */
function initBookingPage() {
    // Check if URL has service parameter
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    
    if (serviceParam) {
        // Select the service based on URL parameter
        const serviceOptions = document.querySelectorAll('.service-option');
        serviceOptions.forEach(option => {
            if (option.getAttribute('data-service') === serviceParam) {
                selectService(option);
            }
        });
    } else {
        // Default to first service (driver)
        const defaultService = document.querySelector('.service-option');
        selectService(defaultService);
    }
}

/**
 * Set up event listeners for the booking page
 */
function setupEventListeners() {
    // Service type selection
    const serviceOptions = document.querySelectorAll('.service-option');
    serviceOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectService(this);
        });
    });
    
    // Current location buttons
    const locationButtons = document.querySelectorAll('.use-current-location');
    locationButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetInput = this.getAttribute('data-target');
            useCurrentLocation(targetInput);
        });
    });
    
    // Form input change events for fare calculation
    const driverInputs = document.querySelectorAll('#driver-booking-form input, #driver-booking-form select');
    driverInputs.forEach(input => {
        input.addEventListener('change', function() {
            calculateDriverFare();
        });
    });
    
    const caretakerInputs = document.querySelectorAll('#caretaker-booking-form input, #caretaker-booking-form select');
    caretakerInputs.forEach(input => {
        input.addEventListener('change', function() {
            calculateCaretakerFare();
        });
    });
    
    const shuttleInputs = document.querySelectorAll('#shuttle-booking-form input, #shuttle-booking-form select');
    shuttleInputs.forEach(input => {
        input.addEventListener('change', function() {
            calculateShuttleFare();
        });
    });
    
    // Form submissions
    const driverForm = document.getElementById('driver-booking-form');
    driverForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateDriverForm()) {
            submitBooking('driver');
        }
    });
    
    const caretakerForm = document.getElementById('caretaker-booking-form');
    caretakerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateCaretakerForm()) {
            submitBooking('caretaker');
        }
    });
    
    const shuttleForm = document.getElementById('shuttle-booking-form');
    shuttleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateShuttleForm()) {
            submitBooking('shuttle');
        }
    });
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeModal(this.closest('.modal').id);
        });
    });
    
    // Book another button
    const bookAnotherButton = document.getElementById('book-another');
    bookAnotherButton.addEventListener('click', function() {
        closeModal('booking-confirmation-modal');
    });
}

/**
 * Set minimum date for all date inputs to today
 */
function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    
    dateInputs.forEach(input => {
        input.min = today;
        input.value = today;
    });
}

/**
 * Load user data (profile and wallet balance)
 */
function loadUserData() {
    // Fetch user profile
    fetch('/api/user/profile')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update user name and avatar
                document.getElementById('user-name').textContent = `${data.user.first_name} ${data.user.last_name}`;
                
                if (data.user.profile_image) {
                    document.getElementById('user-avatar').src = data.user.profile_image;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
        });
    
    // Fetch wallet balance
    fetch('/api/wallet/balance')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update wallet balance in all payment options
                const walletBalances = document.querySelectorAll('.wallet-balance');
                walletBalances.forEach(balance => {
                    balance.textContent = `₹${data.balance.toFixed(2)}`;
                });
            }
        })
        .catch(error => {
            console.error('Error fetching wallet balance:', error);
        });
}

/**
 * Initialize location services
 */
function initLocationServices() {
    // Get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Convert coordinates to address using reverse geocoding
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Use Google Maps Geocoding API
                const geocoder = new google.maps.Geocoder();
                const latlng = { lat: lat, lng: lng };
                
                geocoder.geocode({ location: latlng }, function(results, status) {
                    if (status === 'OK') {
                        if (results[0]) {
                            // Update current location display
                            document.getElementById('current-location').textContent = results[0].formatted_address;
                        }
                    } else {
                        console.error('Geocoder failed due to: ' + status);
                        document.getElementById('current-location').textContent = 'Location unavailable';
                    }
                });
            },
            function(error) {
                console.error('Error getting location:', error);
                document.getElementById('current-location').textContent = 'Location unavailable';
            }
        );
    } else {
        document.getElementById('current-location').textContent = 'Geolocation not supported';
    }
    
    // Initialize Google Places Autocomplete for location inputs
    const locationInputs = document.querySelectorAll('input[name="pickup_location"], input[name="dropoff_location"], input[name="location"]');
    
    locationInputs.forEach(input => {
        const autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            
            // Trigger change event to recalculate fare
            const event = new Event('change');
            input.dispatchEvent(event);
        });
    });
}

/**
 * Use current location for a specific input field
 * @param {string} inputId - The ID of the input field
 */
function useCurrentLocation(inputId) {
    const input = document.getElementById(inputId);
    
    if (navigator.geolocation) {
        // Show loading indicator
        input.placeholder = 'Getting your location...';
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Convert coordinates to address using reverse geocoding
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Use Google Maps Geocoding API
                const geocoder = new google.maps.Geocoder();
                const latlng = { lat: lat, lng: lng };
                
                geocoder.geocode({ location: latlng }, function(results, status) {
                    if (status === 'OK') {
                        if (results[0]) {
                            // Set input value to formatted address
                            input.value = results[0].formatted_address;
                            
                            // Trigger change event to recalculate fare
                            const event = new Event('change');
                            input.dispatchEvent(event);
                        } else {
                            input.placeholder = 'Enter location';
                            alert('No address found for your location.');
                        }
                    } else {
                        input.placeholder = 'Enter location';
                        alert('Geocoder failed due to: ' + status);
                    }
                });
            },
            function(error) {
                input.placeholder = 'Enter location';
                alert('Error getting your location: ' + error.message);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

/**
 * Select a service type
 * @param {Element} selectedOption - The selected service option element
 */
function selectService(selectedOption) {
    // Remove active class from all options
    const serviceOptions = document.querySelectorAll('.service-option');
    serviceOptions.forEach(option => {
        option.classList.remove('active');
    });
    
    // Add active class to selected option
    selectedOption.classList.add('active');
    
    // Hide all forms
    const bookingForms = document.querySelectorAll('.booking-form');
    bookingForms.forEach(form => {
        form.classList.remove('active');
    });
    
    // Show selected form
    const serviceType = selectedOption.getAttribute('data-service');
    document.getElementById(`${serviceType}-form`).classList.add('active');
    
    // Calculate initial fare
    if (serviceType === 'driver') {
        calculateDriverFare();
    } else if (serviceType === 'caretaker') {
        calculateCaretakerFare();
    } else if (serviceType === 'shuttle') {
        calculateShuttleFare();
    }
}

/**
 * Calculate fare for driver service
 */
function calculateDriverFare() {
    // Get input values
    const vehicleType = document.getElementById('driver-vehicle-type').value;
    const hours = parseInt(document.getElementById('driver-hours').value) || 0;
    
    // Get pickup and dropoff locations
    const pickupLocation = document.getElementById('driver-pickup-location').value;
    const dropoffLocation = document.getElementById('driver-dropoff-location').value;
    
    // Base fare based on vehicle type
    let baseFare = 200; // Default
    
    if (vehicleType === 'suv') {
        baseFare = 250;
    } else if (vehicleType === 'luxury') {
        baseFare = 400;
    } else if (vehicleType === 'hatchback') {
        baseFare = 180;
    }
    
    // Duration charge
    const hourlyRate = vehicleType === 'luxury' ? 200 : 150;
    const durationCharge = hours * hourlyRate;
    
    // Distance charge (simplified calculation)
    let distanceCharge = 0;
    
    if (pickupLocation && dropoffLocation) {
        // In a real app, use Google Maps Distance Matrix API to calculate actual distance
        // For demo purposes, using a simplified calculation
        distanceCharge = 150;
    }
    
    // Update fare display
    document.getElementById('driver-base-fare').textContent = `₹${baseFare}`;
    document.getElementById('driver-duration-charge').textContent = `₹${durationCharge}`;
    document.getElementById('driver-distance-charge').textContent = `₹${distanceCharge}`;
    
    // Calculate total
    const total = baseFare + durationCharge + distanceCharge;
    document.getElementById('driver-total-fare').textContent = `₹${total}`;
}

/**
 * Calculate fare for caretaker service
 */
function calculateCaretakerFare() {
    // Get input values
    const caretakerType = document.getElementById('caretaker-type').value;
    const hours = parseInt(document.getElementById('caretaker-hours').value) || 0;
    
    // Base fare based on caretaker type
    let baseFare = 300; // Default
    
    if (caretakerType === 'elderly') {
        baseFare = 350;
    } else if (caretakerType === 'pediatric') {
        baseFare = 400;
    } else if (caretakerType === 'physiotherapy') {
        baseFare = 450;
    } else if (caretakerType === 'nursing') {
        baseFare = 500;
    }
    
    // Duration charge
    const hourlyRate = caretakerType === 'general' ? 200 : 250;
    const durationCharge = hours * hourlyRate;
    
    // Specialization charge
    let specializationCharge = 0;
    
    if (caretakerType === 'physiotherapy') {
        specializationCharge = 300;
    } else if (caretakerType === 'nursing') {
        specializationCharge = 400;
    } else if (caretakerType === 'pediatric') {
        specializationCharge = 250;
    } else if (caretakerType === 'elderly') {
        specializationCharge = 200;
    } else {
        specializationCharge = 100;
    }
    
    // Update fare display
    document.getElementById('caretaker-base-fare').textContent = `₹${baseFare}`;
    document.getElementById('caretaker-duration-charge').textContent = `₹${durationCharge}`;
    document.getElementById('caretaker-specialization-charge').textContent = `₹${specializationCharge}`;
    
    // Calculate total
    const total = baseFare + durationCharge + specializationCharge;
    document.getElementById('caretaker-total-fare').textContent = `₹${total}`;
}

/**
 * Calculate fare for shuttle service
 */
function calculateShuttleFare() {
    // Get input values
    const vehicleType = document.getElementById('shuttle-vehicle-type').value;
    const passengers = parseInt(document.getElementById('shuttle-passengers').value) || 0;
    
    // Get pickup and dropoff locations
    const pickupLocation = document.getElementById('shuttle-pickup-location').value;
    const dropoffLocation = document.getElementById('shuttle-dropoff-location').value;
    
    // Base fare based on vehicle type
    let baseFare = 500; // Default
    
    if (vehicleType === 'minibus') {
        baseFare = 800;
    } else if (vehicleType === 'bus') {
        baseFare = 1200;
    } else if (vehicleType === 'tempo') {
        baseFare = 600;
    }
    
    // Vehicle charge based on type and passengers
    let vehicleCharge = 0;
    
    if (vehicleType === 'van') {
        vehicleCharge = 100 + (passengers * 30);
    } else if (vehicleType === 'minibus') {
        vehicleCharge = 200 + (passengers * 25);
    } else if (vehicleType === 'bus') {
        vehicleCharge = 300 + (passengers * 20);
    } else if (vehicleType === 'tempo') {
        vehicleCharge = 150 + (passengers * 25);
    }
    
    // Distance charge (simplified calculation)
    let distanceCharge = 0;
    
    if (pickupLocation && dropoffLocation) {
        // In a real app, use Google Maps Distance Matrix API to calculate actual distance
        // For demo purposes, using a simplified calculation
        distanceCharge = 350;
    }
    
    // Update fare display
    document.getElementById('shuttle-base-fare').textContent = `₹${baseFare}`;
    document.getElementById('shuttle-vehicle-charge').textContent = `₹${vehicleCharge}`;
    document.getElementById('shuttle-distance-charge').textContent = `₹${distanceCharge}`;
    
    // Calculate total
    const total = baseFare + vehicleCharge + distanceCharge;
    document.getElementById('shuttle-total-fare').textContent = `₹${total}`;
}

/**
 * Validate driver booking form
 * @returns {boolean} - Whether the form is valid
 */
function validateDriverForm() {
    let isValid = true;
    
    // Get form values
    const pickupLocation = document.getElementById('driver-pickup-location').value.trim();
    const dropoffLocation = document.getElementById('driver-dropoff-location').value.trim();
    const date = document.getElementById('driver-date').value;
    const time = document.getElementById('driver-time').value;
    const vehicleType = document.getElementById('driver-vehicle-type').value;
    const hours = document.getElementById('driver-hours').value;
    
    // Validate required fields
    if (!pickupLocation) {
        alert('Please enter pickup location');
        isValid = false;
    }
    
    if (!dropoffLocation) {
        alert('Please enter dropoff location');
        isValid = false;
    }
    
    if (!date) {
        alert('Please select a date');
        isValid = false;
    }
    
    if (!time) {
        alert('Please select a time');
        isValid = false;
    }
    
    if (!vehicleType) {
        alert('Please select a vehicle type');
        isValid = false;
    }
    
    if (!hours || hours < 1) {
        alert('Please enter a valid duration (minimum 1 hour)');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate caretaker booking form
 * @returns {boolean} - Whether the form is valid
 */
function validateCaretakerForm() {
    let isValid = true;
    
    // Get form values
    const location = document.getElementById('caretaker-location').value.trim();
    const date = document.getElementById('caretaker-date').value;
    const time = document.getElementById('caretaker-time').value;
    const caretakerType = document.getElementById('caretaker-type').value;
    const hours = document.getElementById('caretaker-hours').value;
    const patientDetails = document.getElementById('caretaker-patient-details').value.trim();
    
    // Validate required fields
    if (!location) {
        alert('Please enter service location');
        isValid = false;
    }
    
    if (!date) {
        alert('Please select a date');
        isValid = false;
    }
    
    if (!time) {
        alert('Please select a time');
        isValid = false;
    }
    
    if (!caretakerType) {
        alert('Please select a caretaker type');
        isValid = false;
    }
    
    if (!hours || hours < 1) {
        alert('Please enter a valid duration (minimum 1 hour)');
        isValid = false;
    }
    
    if (!patientDetails) {
        alert('Please enter patient details');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate shuttle booking form
 * @returns {boolean} - Whether the form is valid
 */
function validateShuttleForm() {
    let isValid = true;
    
    // Get form values
    const pickupLocation = document.getElementById('shuttle-pickup-location').value.trim();
    const dropoffLocation = document.getElementById('shuttle-dropoff-location').value.trim();
    const date = document.getElementById('shuttle-date').value;
    const time = document.getElementById('shuttle-time').value;
    const vehicleType = document.getElementById('shuttle-vehicle-type').value;
    const passengers = document.getElementById('shuttle-passengers').value;
    
    // Validate required fields
    if (!pickupLocation) {
        alert('Please enter pickup location');
        isValid = false;
    }
    
    if (!dropoffLocation) {
        alert('Please enter dropoff location');
        isValid = false;
    }
    
    if (!date) {
        alert('Please select a date');
        isValid = false;
    }
    
    if (!time) {
        alert('Please select a time');
        isValid = false;
    }
    
    if (!vehicleType) {
        alert('Please select a vehicle type');
        isValid = false;
    }
    
    if (!passengers || passengers < 1) {
        alert('Please enter a valid number of passengers');
        isValid = false;
    }
    
    // Validate passenger count based on vehicle type
    if (vehicleType === 'van' && passengers > 8) {
        alert('Van can accommodate up to 8 passengers only');
        isValid = false;
    } else if (vehicleType === 'minibus' && passengers > 15) {
        alert('Minibus can accommodate up to 15 passengers only');
        isValid = false;
    } else if (vehicleType === 'bus' && passengers > 30) {
        alert('Bus can accommodate up to 30 passengers only');
        isValid = false;
    } else if (vehicleType === 'tempo' && passengers > 12) {
        alert('Tempo Traveller can accommodate up to 12 passengers only');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Submit booking to server
 * @param {string} serviceType - The type of service (driver, caretaker, shuttle)
 */
function submitBooking(serviceType) {
    // Show loading modal
    openModal('loading-modal');
    
    // Get form data
    const form = document.getElementById(`${serviceType}-booking-form`);
    const formData = new FormData(form);
    
    // Add service type
    formData.append('service_type', serviceType);
    
    // Get total fare
    const totalFare = document.getElementById(`${serviceType}-total-fare`).textContent.replace('₹', '');
    formData.append('total_fare', totalFare);
    
    // Convert FormData to JSON
    const jsonData = {};
    formData.forEach((value, key) => {
        jsonData[key] = value;
    });
    
    // Send booking request
    fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
    .then(response => response.json())
    .then(data => {
        // Close loading modal
        closeModal('loading-modal');
        
        if (data.success) {
            // Update booking confirmation details
            document.getElementById('booking-reference').textContent = data.booking.reference_id;
            
            let serviceTypeText = 'Personal Driver';
            if (serviceType === 'caretaker') {
                serviceTypeText = 'Medical Caretaker';
            } else if (serviceType === 'shuttle') {
                serviceTypeText = 'Shuttle Service';
            }
            document.getElementById('booking-service-type').textContent = serviceTypeText;
            
            // Format date and time
            const bookingDate = new Date(`${data.booking.date}T${data.booking.time}`);
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            document.getElementById('booking-datetime').textContent = bookingDate.toLocaleDateString('en-US', options);
            
            // Set amount
            document.getElementById('booking-amount').textContent = `₹${data.booking.total_fare}`;
            
            // Show confirmation modal
            openModal('booking-confirmation-modal');
            
            // Reset form
            form.reset();
            
            // Set today as minimum date
            setMinDates();
            
            // Recalculate fare
            if (serviceType === 'driver') {
                calculateDriverFare();
            } else if (serviceType === 'caretaker') {
                calculateCaretakerFare();
            } else if (serviceType === 'shuttle') {
                calculateShuttleFare();
            }
        } else {
            // Show error message
            alert(data.message || 'Failed to create booking. Please try again.');
        }
    })
    .catch(error => {
        // Close loading modal
        closeModal('loading-modal');
        
        console.error('Error creating booking:', error);
        alert('An error occurred. Please try again later.');
    });
}

/**
 * Open a modal
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
}

/**
 * Close a modal
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}
