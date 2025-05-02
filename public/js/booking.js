document.addEventListener('DOMContentLoaded', function() {
    // Initialize map and location services
    initMap();
    
    // Initialize booking flow
    initBookingFlow();
    
    // Initialize service type selection
    initServiceTypeSelection();
    
    // Initialize service options
    initServiceOptions();
    
    // Initialize provider selection
    initProviderSelection();
    
    // Initialize payment methods
    initPaymentMethods();
    
    // Initialize booking confirmation
    initBookingConfirmation();
});

// Global variables
let map;
let directionsService;
let directionsRenderer;
let pickupMarker;
let destinationMarker;
let pickupAutocomplete;
let destinationAutocomplete;
let pickupLocation;
let destinationLocation;
let distance = 0;
let duration = 0;
let selectedService = 'driver';
let selectedOption = 'hatchback';
let selectedDuration = 2;
let selectedProvider = null;
let passengerCount = 8;
let fareDetails = {
    baseFare: 0,
    distanceCharge: 0,
    durationCharge: 0,
    serviceFee: 0,
    totalFare: 0
};

// Base rates for different services and options
const rates = {
    driver: {
        hatchback: { baseFare: 250, perKm: 12, perHour: 100 },
        sedan: { baseFare: 350, perKm: 15, perHour: 150 },
        suv: { baseFare: 450, perKm: 18, perHour: 200 },
        luxury: { baseFare: 650, perKm: 25, perHour: 300 }
    },
    caretaker: {
        general: { baseFare: 300, perHour: 300, minHours: 4 },
        elderly: { baseFare: 400, perHour: 400, minHours: 4 },
        medical: { baseFare: 500, perHour: 500, minHours: 4 },
        physio: { baseFare: 600, perHour: 600, minHours: 4 }
    },
    shuttle: {
        mini: { baseFare: 800, perKm: 25, perPassenger: 50, maxPassengers: 8 },
        standard: { baseFare: 1200, perKm: 35, perPassenger: 40, maxPassengers: 15 },
        'luxury-shuttle': { baseFare: 1800, perKm: 50, perPassenger: 70, maxPassengers: 12 }
    }
};

// Service fee percentage (7.5% as per requirements)
const serviceFeePercentage = 7.5;

// Initialize Google Map
function initMap() {
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded');
        return;
    }
    
    // Default location (Bangalore)
    const defaultLocation = { lat: 12.9716, lng: 77.5946 };
    
    // Create map
    map = new google.maps.Map(document.getElementById('map'), {
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
    
    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#5B6EF5',
            strokeWeight: 5
        }
    });
    
    // Create markers for pickup and destination
    pickupMarker = new google.maps.Marker({
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#5B6EF5',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
        }
    });
    
    destinationMarker = new google.maps.Marker({
        map: map,
        icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#6C63FF',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
        }
    });
    
    // Initialize autocomplete for pickup and destination inputs
    pickupAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('pickup-location'),
        { componentRestrictions: { country: 'in' } }
    );
    
    destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('destination-location'),
        { componentRestrictions: { country: 'in' } }
    );
    
    // Add listeners for place changes
    pickupAutocomplete.addListener('place_changed', function() {
        const place = pickupAutocomplete.getPlace();
        if (!place.geometry) return;
        
        pickupLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };
        
        // Update pickup marker
        pickupMarker.setPosition(pickupLocation);
        map.setCenter(pickupLocation);
        
        // Update pickup address display
        document.getElementById('pickup-address').textContent = place.formatted_address;
        
        // Update route if both locations are set
        if (destinationLocation) {
            calculateRoute();
        }
    });
    
    destinationAutocomplete.addListener('place_changed', function() {
        const place = destinationAutocomplete.getPlace();
        if (!place.geometry) return;
        
        destinationLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };
        
        // Update destination marker
        destinationMarker.setPosition(destinationLocation);
        
        // Update destination address display
        document.getElementById('destination-address').textContent = place.formatted_address;
        
        // Update route if both locations are set
        if (pickupLocation) {
            calculateRoute();
        }
    });
    
    // Current location button
    document.getElementById('current-location-btn').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Set pickup location to current location
                    pickupLocation = userLocation;
                    pickupMarker.setPosition(userLocation);
                    map.setCenter(userLocation);
                    
                    // Reverse geocode to get address
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: userLocation }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                            document.getElementById('pickup-location').value = results[0].formatted_address;
                            document.getElementById('pickup-address').textContent = results[0].formatted_address;
                            
                            // Update route if destination is set
                            if (destinationLocation) {
                                calculateRoute();
                            }
                        }
                    });
                },
                function() {
                    alert('Unable to get your location. Please enter it manually.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });
    
    // Try to get user's current location on load
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                map.setCenter(userLocation);
            },
            function() {
                console.log('Geolocation permission denied');
            }
        );
    }
}

// Calculate route between pickup and destination
function calculateRoute() {
    if (!pickupLocation || !destinationLocation) return;
    
    const request = {
        origin: pickupLocation,
        destination: destinationLocation,
        travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, function(result, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Get distance and duration
            const route = result.routes[0];
            distance = route.legs[0].distance.value / 1000; // Convert to kilometers
            duration = route.legs[0].duration.value / 60; // Convert to minutes
            
            // Update fare calculation
            calculateFare();
            
            // Fit map to show both markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(pickupLocation);
            bounds.extend(destinationLocation);
            map.fitBounds(bounds);
        }
    });
}

// Calculate fare based on service type, options, distance, and duration
function calculateFare() {
    const serviceRates = rates[selectedService][selectedOption];
    
    // Reset fare details
    fareDetails = {
        baseFare: 0,
        distanceCharge: 0,
        durationCharge: 0,
        serviceFee: 0,
        totalFare: 0
    };
    
    // Calculate fare based on service type
    if (selectedService === 'driver') {
        fareDetails.baseFare = serviceRates.baseFare;
        fareDetails.distanceCharge = Math.round(distance * serviceRates.perKm);
        fareDetails.durationCharge = Math.round(selectedDuration * serviceRates.perHour);
    } else if (selectedService === 'caretaker') {
        fareDetails.baseFare = serviceRates.baseFare;
        fareDetails.durationCharge = Math.round(selectedDuration * serviceRates.perHour);
    } else if (selectedService === 'shuttle') {
        fareDetails.baseFare = serviceRates.baseFare;
        fareDetails.distanceCharge = Math.round(distance * serviceRates.perKm);
        
        // Additional charge for passengers beyond base fare
        const passengerCharge = Math.min(passengerCount, serviceRates.maxPassengers) * serviceRates.perPassenger;
        fareDetails.durationCharge = passengerCharge;
    }
    
    // Calculate subtotal
    const subtotal = fareDetails.baseFare + fareDetails.distanceCharge + fareDetails.durationCharge;
    
    // Calculate service fee (7.5%)
    fareDetails.serviceFee = Math.round(subtotal * (serviceFeePercentage / 100));
    
    // Calculate total fare
    fareDetails.totalFare = subtotal + fareDetails.serviceFee;
    
    // Update fare display
    updateFareDisplay();
}

// Update fare display in the UI
function updateFareDisplay() {
    document.getElementById('base-fare').textContent = fareDetails.baseFare;
    document.getElementById('distance-charge').textContent = fareDetails.distanceCharge;
    document.getElementById('duration-charge').textContent = fareDetails.durationCharge;
    document.getElementById('service-fee').textContent = fareDetails.serviceFee;
    document.getElementById('total-fare').textContent = fareDetails.totalFare;
    
    // Update prices in option cards
    if (selectedService === 'driver') {
        document.getElementById('hatchback-price').textContent = rates.driver.hatchback.baseFare;
        document.getElementById('sedan-price').textContent = rates.driver.sedan.baseFare;
        document.getElementById('suv-price').textContent = rates.driver.suv.baseFare;
        document.getElementById('luxury-price').textContent = rates.driver.luxury.baseFare;
    } else if (selectedService === 'caretaker') {
        document.getElementById('general-price').textContent = rates.caretaker.general.perHour;
        document.getElementById('elderly-price').textContent = rates.caretaker.elderly.perHour;
        document.getElementById('medical-price').textContent = rates.caretaker.medical.perHour;
        document.getElementById('physio-price').textContent = rates.caretaker.physio.perHour;
    } else if (selectedService === 'shuttle') {
        document.getElementById('mini-price').textContent = rates.shuttle.mini.baseFare;
        document.getElementById('standard-price').textContent = rates.shuttle.standard.baseFare;
        document.getElementById('luxury-shuttle-price').textContent = rates.shuttle['luxury-shuttle'].baseFare;
    }
}

// Initialize booking flow
function initBookingFlow() {
    const locationNext = document.getElementById('location-next');
    const optionsPrev = document.getElementById('options-prev');
    const optionsNext = document.getElementById('options-next');
    const providerPrev = document.getElementById('provider-prev');
    const providerNext = document.getElementById('provider-next');
    const confirmationPrev = document.getElementById('confirmation-prev');
    
    // Step 1 to Step 2
    locationNext.addEventListener('click', function() {
        if (validateLocationStep()) {
            showStep('step-options');
            
            // Load providers based on location and service type
            loadProviders();
        }
    });
    
    // Step 2 to Step 1
    optionsPrev.addEventListener('click', function() {
        showStep('step-location');
    });
    
    // Step 2 to Step 3
    optionsNext.addEventListener('click', function() {
        showStep('step-provider');
    });
    
    // Step 3 to Step 2
    providerPrev.addEventListener('click', function() {
        showStep('step-options');
    });
    
    // Step 3 to Step 4
    providerNext.addEventListener('click', function() {
        if (validateProviderStep()) {
            showStep('step-confirmation');
            updateBookingSummary();
        }
    });
    
    // Step 4 to Step 3
    confirmationPrev.addEventListener('click', function() {
        showStep('step-provider');
    });
}

// Show specific booking step
function showStep(stepId) {
    const steps = document.querySelectorAll('.booking-step');
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    document.getElementById(stepId).classList.add('active');
}

// Validate location step
function validateLocationStep() {
    const pickupInput = document.getElementById('pickup-location');
    const destinationInput = document.getElementById('destination-location');
    const dateInput = document.getElementById('pickup-date');
    const timeInput = document.getElementById('pickup-time');
    
    if (!pickupInput.value) {
        alert('Please enter pickup location');
        pickupInput.focus();
        return false;
    }
    
    if (!destinationInput.value && selectedService !== 'caretaker') {
        alert('Please enter destination');
        destinationInput.focus();
        return false;
    }
    
    if (!dateInput.value) {
        alert('Please select date');
        dateInput.focus();
        return false;
    }
    
    if (!timeInput.value) {
        alert('Please select time');
        timeInput.focus();
        return false;
    }
    
    // Validate that selected date and time are in the future
    const selectedDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
    const now = new Date();
    
    if (selectedDateTime <= now) {
        alert('Please select a future date and time');
        return false;
    }
    
    return true;
}

// Validate provider step
function validateProviderStep() {
    if (!selectedProvider) {
        alert('Please select a service provider');
        return false;
    }
    
    return true;
}

// Initialize service type selection
function initServiceTypeSelection() {
    const serviceTabs = document.querySelectorAll('.service-tab');
    
    serviceTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            serviceTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update selected service
            selectedService = this.getAttribute('data-service');
            
            // Show corresponding options
            showServiceOptions(selectedService);
            
            // Reset selected option to first one
            const firstOption = document.querySelector(`#${selectedService}-options .option-card`);
            if (firstOption) {
                const options = document.querySelectorAll(`#${selectedService}-options .option-card`);
                options.forEach(o => o.classList.remove('active'));
                firstOption.classList.add('active');
                selectedOption = firstOption.getAttribute('data-option');
            }
            
            // Reset duration to first one
            const firstDuration = document.querySelector(`#${selectedService}-options .duration-option`);
            if (firstDuration) {
                const durations = document.querySelectorAll(`#${selectedService}-options .duration-option`);
                durations.forEach(d => d.classList.remove('active'));
                firstDuration.classList.add('active');
                selectedDuration = parseInt(firstDuration.getAttribute('data-duration'));
            }
            
            // Update fare calculation
            calculateFare();
            
            // Load providers based on service type
            loadProviders();
        });
    });
}

// Show service options based on service type
function showServiceOptions(serviceType) {
    const optionContainers = document.querySelectorAll('.service-options');
    optionContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    document.getElementById(`${serviceType}-options`).style.display = 'block';
}

// Initialize service options
function initServiceOptions() {
    // Option card selection
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            const serviceType = this.closest('.service-options').id.replace('-options', '');
            const options = document.querySelectorAll(`#${serviceType}-options .option-card`);
            
            options.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            
            selectedOption = this.getAttribute('data-option');
            calculateFare();
        });
    });
    
    // Duration selection
    const durationOptions = document.querySelectorAll('.duration-option');
    durationOptions.forEach(option => {
        option.addEventListener('click', function() {
            const serviceType = this.closest('.service-options').id.replace('-options', '');
            const options = document.querySelectorAll(`#${serviceType}-options .duration-option`);
            
            options.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            
            selectedDuration = parseInt(this.getAttribute('data-duration'));
            calculateFare();
        });
    });
    
    // Passenger count for shuttle
    const decreaseBtn = document.getElementById('decrease-passengers');
    const increaseBtn = document.getElementById('increase-passengers');
    
    if (decreaseBtn && increaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            if (passengerCount > 1) {
                passengerCount--;
                document.getElementById('passenger-count').textContent = passengerCount;
                calculateFare();
            }
        });
        
        increaseBtn.addEventListener('click', function() {
            const maxPassengers = rates.shuttle[selectedOption].maxPassengers;
            if (passengerCount < maxPassengers) {
                passengerCount++;
                document.getElementById('passenger-count').textContent = passengerCount;
                calculateFare();
            } else {
                alert(`Maximum ${maxPassengers} passengers allowed for this shuttle type`);
            }
        });
    }
}

// Load service providers based on location and service type
function loadProviders() {
    const providersContainer = document.getElementById('providers-container');
    
    // Clear existing providers
    providersContainer.innerHTML = '';
    
    // Sample providers data (in a real app, this would come from an API)
    const providers = {
        driver: [
            { id: 'd1', name: 'Rahul S.', rating: 4.9, distance: 1.2, image: '/images/driver1.jpg' },
            { id: 'd2', name: 'Vikram P.', rating: 4.7, distance: 2.5, image: '/images/driver2.jpg' },
            { id: 'd3', name: 'Suresh K.', rating: 4.8, distance: 1.8, image: '/images/driver3.jpg' },
            { id: 'd4', name: 'Arun M.', rating: 4.6, distance: 3.0, image: '/images/driver4.jpg' }
        ],
        caretaker: [
            { id: 'c1', name: 'Priya M.', rating: 4.8, distance: 2.5, image: '/images/caretaker1.jpg' },
            { id: 'c2', name: 'Anita R.', rating: 4.9, distance: 1.5, image: '/images/caretaker2.jpg' },
            { id: 'c3', name: 'Rajesh S.', rating: 4.7, distance: 2.8, image: '/images/caretaker3.jpg' },
            { id: 'c4', name: 'Meena K.', rating: 4.8, distance: 3.0, image: '/images/caretaker4.jpg' }
        ],
        shuttle: [
            { id: 's1', name: 'City Shuttle', rating: 4.7, distance: 3.0, image: '/images/shuttle1.jpg' },
            { id: 's2', name: 'Airport Express', rating: 4.8, distance: 5.0, image: '/images/shuttle2.jpg' },
            { id: 's3', name: 'Corporate Shuttle', rating: 4.6, distance: 4.2, image: '/images/shuttle3.jpg' }
        ]
    };
    
    // Get providers for selected service type
    const serviceProviders = providers[selectedService];
    
    // Sort providers by distance (closest first)
    serviceProviders.sort((a, b) => a.distance - b.distance);
    
    // Create provider cards
    serviceProviders.forEach(provider => {
        const providerCard = document.createElement('div');
        providerCard.className = 'provider-card';
        providerCard.setAttribute('data-provider-id', provider.id);
        
        providerCard.innerHTML = `
            <div class="provider-image">
                <img src="${provider.image || '/images/default-avatar.png'}" alt="${provider.name}">
            </div>
            <div class="provider-details">
                <h5>${provider.name}</h5>
                <div class="provider-rating">
                    ${provider.rating} <i class="fas fa-star"></i>
                </div>
                <div class="provider-distance">
                    ${provider.distance} km away
                </div>
            </div>
        `;
        
        // Add click event to select provider
        providerCard.addEventListener('click', function() {
            const providerCards = document.querySelectorAll('.provider-card');
            providerCards.forEach(card => card.classList.remove('active'));
            this.classList.add('active');
            
            selectedProvider = {
                id: provider.id,
                name: provider.name,
                rating: provider.rating,
                distance: provider.distance
            };
        });
        
        providersContainer.appendChild(providerCard);
    });
    
    // If no providers available
    if (serviceProviders.length === 0) {
        providersContainer.innerHTML = '<p>No providers available in your area</p>';
    }
}

// Initialize payment methods
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            paymentMethods.forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Update booking summary
function updateBookingSummary() {
    document.getElementById('summary-service-type').textContent = selectedService.charAt(0).toUpperCase() + selectedService.slice(1);
    document.getElementById('summary-service-option').textContent = selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1);
    document.getElementById('summary-provider').textContent = selectedProvider ? selectedProvider.name : 'Not selected';
    document.getElementById('summary-pickup').textContent = document.getElementById('pickup-location').value;
    document.getElementById('summary-destination').textContent = document.getElementById('destination-location').value || 'N/A';
    
    const dateInput = document.getElementById('pickup-date');
    const timeInput = document.getElementById('pickup-time');
    const dateTime = new Date(`${dateInput.value}T${timeInput.value}`);
    const formattedDateTime = dateTime.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    
    document.getElementById('summary-datetime').textContent = formattedDateTime;
    document.getElementById('summary-duration').textContent = `${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`;
}

// Initialize booking confirmation
function initBookingConfirmation() {
    const confirmBookingBtn = document.getElementById('confirm-booking');
    const bookingSuccessModal = document.getElementById('booking-success-modal');
    const viewBookingsBtn = document.getElementById('view-bookings-btn');
    const backToHomeBtn = document.getElementById('back-to-home-btn');
    
    confirmBookingBtn.addEventListener('click', function() {
        // In a real app, this would send the booking data to the server
        // For now, we'll just show the success modal
        
        // Generate a random booking ID
        const bookingId = 'RYDO' + Math.floor(100000 + Math.random() * 900000);
        document.getElementById('booking-id').textContent = bookingId;
        
        // Show success modal
        bookingSuccessModal.classList.add('active');
        
        // Prepare booking data for API
        const bookingData = {
            service_type: selectedService,
            service_option: selectedOption,
            provider_id: selectedProvider.id,
            pickup_location: document.getElementById('pickup-location').value,
            pickup_coordinates: pickupLocation,
            destination_location: document.getElementById('destination-location').value,
            destination_coordinates: destinationLocation,
            pickup_datetime: `${document.getElementById('pickup-date').value}T${document.getElementById('pickup-time').value}`,
            duration: selectedDuration,
            distance: distance,
            fare: fareDetails.totalFare,
            fare_breakdown: fareDetails,
            payment_method: document.querySelector('.payment-method.active').getAttribute('data-method')
        };
        
        console.log('Booking data:', bookingData);
        
        // In a real app, you would send this data to your API
        // fetch('/api/bookings', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(bookingData)
        // })
        // .then(response => response.json())
        // .then(data => {
        //     // Handle response
        // })
        // .catch(error => {
        //     console.error('Error:', error);
        // });
    });
    
    // View bookings button
    viewBookingsBtn.addEventListener('click', function() {
        window.location.href = '/customer-dashboard#bookings';
    });
    
    // Back to home button
    backToHomeBtn.addEventListener('click', function() {
        window.location.href = '/customer-dashboard';
    });
    
    // Close modal when clicking outside
    bookingSuccessModal.addEventListener('click', function(e) {
        if (e.target === bookingSuccessModal) {
            bookingSuccessModal.classList.remove('active');
        }
    });
}
