/**
 * Shuttle Service Dashboard JavaScript
 * Handles all the interactive functionality for the shuttle service dashboard
 * Includes API integration with the backend
 */

// Global variables
let shuttleData = {};
let currentLocation = { latitude: 0, longitude: 0 };
let map = null;
let routeMap = null;
let directionsService = null;
let directionsRenderer = null;

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fetch shuttle driver data from the server
    fetchShuttleData();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize notifications
    initNotifications();
    
    // Get current location
    getCurrentLocation();
    
    // Initialize Google Maps
    initMap();
});

/**
 * Fetch shuttle driver data from the server
 */
async function fetchShuttleData() {
    try {
        const response = await fetch('/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch shuttle driver data');
        }
        
        const data = await response.json();
        
        if (data.user && data.user.role === 'shuttle_driver') {
            shuttleData = data.user;
            initShuttleData();
            fetchSchedule();
            fetchPassengers();
            fetchRoutes();
        } else {
            console.error('Invalid user data or not a shuttle driver');
            window.location.href = '/auth/login'; // Redirect to login if not authenticated as shuttle driver
        }
    } catch (error) {
        console.error('Error fetching shuttle driver data:', error);
        // If data fetch fails, use demo data for development
        useDemoData();
    }
}

/**
 * Use demo data for development/testing purposes
 */
function useDemoData() {
    shuttleData = {
        id: 1,
        first_name: 'Vikram',
        last_name: 'Singh',
        email: 'vikram.singh@example.com',
        phone: '+91 9876543210',
        role: 'shuttle_driver',
        is_available: true,
        average_rating: 4.7,
        total_ratings: 32,
        vehicle_type: 'Mini Bus',
        passenger_capacity: 20,
        route_name: 'Delhi City Tour',
        total_routes: 28,
        total_passengers: 156,
        total_earnings: 18500,
        current_latitude: 28.6139,
        current_longitude: 77.2090
    };
    
    initShuttleData();
    renderDemoSchedule();
    renderDemoPassengers();
    renderDemoRoutes();
}

/**
 * Initialize shuttle driver data in the UI
 */
function initShuttleData() {
    // Set shuttle driver name and rating
    document.getElementById('shuttle-name').textContent = `${shuttleData.first_name} ${shuttleData.last_name}`;
    document.getElementById('welcome-name').textContent = shuttleData.first_name;
    document.getElementById('shuttle-rating').innerHTML = `<i class="fas fa-star"></i> ${shuttleData.average_rating || 0}`;
    document.getElementById('shuttle-rating-value').textContent = shuttleData.average_rating || 0;
    
    // Set dashboard stats
    document.getElementById('total-routes').textContent = shuttleData.total_routes || 0;
    document.getElementById('total-passengers').textContent = shuttleData.total_passengers || 0;
    document.getElementById('total-earnings').textContent = '₹' + (shuttleData.total_earnings || 0).toLocaleString();
    
    // Set status toggle
    const statusToggle = document.getElementById('status-toggle');
    const statusText = document.getElementById('status-text');
    
    statusToggle.checked = shuttleData.is_available;
    statusText.textContent = shuttleData.is_available ? 'Online' : 'Offline';
    
    // Set location
    if (shuttleData.current_latitude && shuttleData.current_longitude) {
        // Reverse geocode to get location name
        reverseGeocode(shuttleData.current_latitude, shuttleData.current_longitude);
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
    
    // Route buttons
    const routeButtons = document.querySelectorAll('.route-actions button');
    routeButtons.forEach(button => {
        button.addEventListener('click', function() {
            routeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateRouteMap(this.textContent);
        });
    });
    
    // Start route button
    const startRouteBtn = document.querySelector('.primary-btn');
    startRouteBtn.addEventListener('click', function() {
        const activeRoute = document.querySelector('.route-actions button.active').textContent;
        startRoute(activeRoute);
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
 * Toggle shuttle driver availability
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
        shuttleData.is_available = isAvailable;
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
                
                // Update map with current location
                if (map) {
                    const currentPos = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
                    map.setCenter(currentPos);
                    
                    // Add marker for current position
                    new google.maps.Marker({
                        position: currentPos,
                        map: map,
                        title: 'Current Location',
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#5B6EF5',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2
                        }
                    });
                }
            },
            function(error) {
                console.error('Error getting location:', error);
            }
        );
    }
}

/**
 * Update shuttle driver location on server
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
 * Initialize Google Maps
 */
function initMap() {
    // Create a map centered at Delhi, India (default)
    const mapOptions = {
        center: { lat: 28.6139, lng: 77.2090 },
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    };
    
    routeMap = new google.maps.Map(document.getElementById('route-map'), mapOptions);
    
    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: routeMap,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#5B6EF5',
            strokeWeight: 5
        }
    });
    
    // If we have current location, center the map there
    if (currentLocation.latitude && currentLocation.longitude) {
        routeMap.setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
    }
    
    // Load the default route
    updateRouteMap('Route A');
}

/**
 * Update the route map based on selected route
 */
function updateRouteMap(routeName) {
    // Demo routes
    const routes = {
        'Route A': {
            origin: { lat: 28.6139, lng: 77.2090 }, // Delhi
            destination: { lat: 28.7041, lng: 77.1025 }, // Delhi Airport
            waypoints: [
                { location: { lat: 28.6304, lng: 77.2177 } }, // Connaught Place
                { location: { lat: 28.5535, lng: 77.2588 } }  // Nehru Place
            ]
        },
        'Route B': {
            origin: { lat: 28.6139, lng: 77.2090 }, // Delhi
            destination: { lat: 28.4595, lng: 77.0266 }, // Gurugram
            waypoints: [
                { location: { lat: 28.5535, lng: 77.2588 } }, // Nehru Place
                { location: { lat: 28.5183, lng: 77.1828 } }  // Saket
            ]
        },
        'Route C': {
            origin: { lat: 28.6139, lng: 77.2090 }, // Delhi
            destination: { lat: 28.9845, lng: 77.7064 }, // Meerut
            waypoints: [
                { location: { lat: 28.6692, lng: 77.4538 } }, // Ghaziabad
                { location: { lat: 28.7519, lng: 77.5021 } }  // Modinagar
            ]
        }
    };
    
    const selectedRoute = routes[routeName];
    
    if (selectedRoute) {
        const request = {
            origin: selectedRoute.origin,
            destination: selectedRoute.destination,
            waypoints: selectedRoute.waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        };
        
        directionsService.route(request, function(result, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
                
                // Add markers for origin, destination, and waypoints
                addRouteMarkers(selectedRoute);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }
}

/**
 * Add markers for route points
 */
function addRouteMarkers(route) {
    // Clear existing markers
    if (window.routeMarkers) {
        window.routeMarkers.forEach(marker => marker.setMap(null));
    }
    
    window.routeMarkers = [];
    
    // Add origin marker
    const originMarker = new google.maps.Marker({
        position: route.origin,
        map: routeMap,
        title: 'Start',
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
    });
    window.routeMarkers.push(originMarker);
    
    // Add waypoint markers
    route.waypoints.forEach((waypoint, index) => {
        const waypointMarker = new google.maps.Marker({
            position: waypoint.location,
            map: routeMap,
            title: `Stop ${index + 1}`,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });
        window.routeMarkers.push(waypointMarker);
    });
    
    // Add destination marker
    const destinationMarker = new google.maps.Marker({
        position: route.destination,
        map: routeMap,
        title: 'End',
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
    });
    window.routeMarkers.push(destinationMarker);
}

/**
 * Start a route
 */
async function startRoute(routeName) {
    try {
        const response = await fetch('/shuttle/start-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ routeName }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to start route');
        }
        
        alert(`Route ${routeName} started successfully!`);
    } catch (error) {
        console.error('Error starting route:', error);
        alert('Could not start route. Please try again.');
    }
}

/**
 * Fetch schedule from server
 */
async function fetchSchedule() {
    try {
        const response = await fetch('/shuttle/schedule', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch schedule');
        }
        
        const data = await response.json();
        renderSchedule(data.schedule);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        renderDemoSchedule(); // Use demo data if fetch fails
    }
}

/**
 * Render schedule in the UI
 */
function renderSchedule(schedule) {
    const scheduleList = document.getElementById('upcoming-schedule');
    scheduleList.innerHTML = '';
    
    if (schedule && schedule.length > 0) {
        schedule.slice(0, 3).forEach(item => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            scheduleItem.innerHTML = `
                <div class="schedule-info">
                    <span class="schedule-route">${item.route_name}</span>
                    <span class="schedule-time">${formatScheduleTime(item.departure_time)}</span>
                </div>
                <div class="schedule-actions">
                    <button data-id="${item.id}">View</button>
                </div>
            `;
            scheduleList.appendChild(scheduleItem);
        });
        
        // Add event listeners to view buttons
        const viewButtons = scheduleList.querySelectorAll('button');
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const scheduleId = this.getAttribute('data-id');
                viewScheduleDetails(scheduleId);
            });
        });
    } else {
        scheduleList.innerHTML = '<p class="no-data">No upcoming schedule</p>';
    }
}

/**
 * Render demo schedule for development
 */
function renderDemoSchedule() {
    const demoSchedule = [
        { id: 1, route_name: 'Route A: Delhi City Tour', departure_time: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
        { id: 2, route_name: 'Route B: Delhi to Gurugram', departure_time: new Date(Date.now() + 3600000 * 4).toISOString() }, // 4 hours later
        { id: 3, route_name: 'Route C: Delhi to Meerut', departure_time: new Date(Date.now() + 3600000 * 8).toISOString() } // 8 hours later
    ];
    
    renderSchedule(demoSchedule);
}

/**
 * Format schedule time for display
 */
function formatScheduleTime(isoString) {
    const scheduleDate = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if schedule is today
    if (scheduleDate.toDateString() === now.toDateString()) {
        return `Today, ${scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if schedule is tomorrow
    if (scheduleDate.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For other days, show day of week and time
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[scheduleDate.getDay()]}, ${scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * View schedule details
 */
function viewScheduleDetails(scheduleId) {
    // Navigate to schedule section
    const scheduleLink = document.querySelector('a[href="#schedule"]');
    if (scheduleLink) {
        scheduleLink.click();
    }
    
    // TODO: Show schedule details in the schedule section
    console.log('Viewing schedule details for ID:', scheduleId);
}

/**
 * Fetch passengers from server
 */
async function fetchPassengers() {
    try {
        const response = await fetch('/shuttle/passengers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch passengers');
        }
        
        const data = await response.json();
        renderPassengers(data.passengers);
    } catch (error) {
        console.error('Error fetching passengers:', error);
        renderDemoPassengers(); // Use demo data if fetch fails
    }
}

/**
 * Render passengers in the UI
 */
function renderPassengers(passengers) {
    const passengersList = document.getElementById('today-passengers');
    passengersList.innerHTML = '';
    
    if (passengers && passengers.length > 0) {
        passengers.slice(0, 5).forEach(passenger => {
            const passengerItem = document.createElement('div');
            passengerItem.className = 'passenger-item';
            passengerItem.innerHTML = `
                <div class="passenger-info">
                    <span class="passenger-name">${passenger.name}</span>
                    <span class="passenger-details">${passenger.pickup_point} → ${passenger.dropoff_point}</span>
                </div>
                <div class="passenger-actions">
                    <button data-id="${passenger.id}">Details</button>
                </div>
            `;
            passengersList.appendChild(passengerItem);
        });
        
        // Add event listeners to details buttons
        const detailButtons = passengersList.querySelectorAll('button');
        detailButtons.forEach(button => {
            button.addEventListener('click', function() {
                const passengerId = this.getAttribute('data-id');
                viewPassengerDetails(passengerId);
            });
        });
    } else {
        passengersList.innerHTML = '<p class="no-data">No passengers for today</p>';
    }
}

/**
 * Render demo passengers for development
 */
function renderDemoPassengers() {
    const demoPassengers = [
        { id: 1, name: 'Rahul Sharma', pickup_point: 'Connaught Place', dropoff_point: 'Delhi Airport' },
        { id: 2, name: 'Priya Patel', pickup_point: 'Nehru Place', dropoff_point: 'Gurugram' },
        { id: 3, name: 'Amit Kumar', pickup_point: 'Saket', dropoff_point: 'Noida' },
        { id: 4, name: 'Sonal Gupta', pickup_point: 'Lajpat Nagar', dropoff_point: 'Delhi Airport' },
        { id: 5, name: 'Rajesh Singh', pickup_point: 'Karol Bagh', dropoff_point: 'Ghaziabad' }
    ];
    
    renderPassengers(demoPassengers);
}

/**
 * View passenger details
 */
function viewPassengerDetails(passengerId) {
    // Navigate to passengers section
    const passengersLink = document.querySelector('a[href="#passengers"]');
    if (passengersLink) {
        passengersLink.click();
    }
    
    // TODO: Show passenger details in the passengers section
    console.log('Viewing passenger details for ID:', passengerId);
}

/**
 * Fetch routes from server
 */
async function fetchRoutes() {
    try {
        const response = await fetch('/shuttle/routes', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch routes');
        }
        
        const data = await response.json();
        renderRoutes(data.routes);
    } catch (error) {
        console.error('Error fetching routes:', error);
        renderDemoRoutes(); // Use demo data if fetch fails
    }
}

/**
 * Render routes in the UI
 */
function renderRoutes(routes) {
    const routeActions = document.querySelector('.route-actions');
    routeActions.innerHTML = '';
    
    if (routes && routes.length > 0) {
        routes.forEach((route, index) => {
            const button = document.createElement('button');
            button.textContent = route.name;
            if (index === 0) button.classList.add('active');
            routeActions.appendChild(button);
        });
        
        // Add event listeners to route buttons
        const routeButtons = routeActions.querySelectorAll('button');
        routeButtons.forEach(button => {
            button.addEventListener('click', function() {
                routeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                updateRouteMap(this.textContent);
            });
        });
        
        // Update map with first route
        updateRouteMap(routes[0].name);
    } else {
        // Add default routes if no routes are available
        const defaultRoutes = ['Route A', 'Route B', 'Route C'];
        defaultRoutes.forEach((route, index) => {
            const button = document.createElement('button');
            button.textContent = route;
            if (index === 0) button.classList.add('active');
            routeActions.appendChild(button);
        });
        
        // Add event listeners to route buttons
        const routeButtons = routeActions.querySelectorAll('button');
        routeButtons.forEach(button => {
            button.addEventListener('click', function() {
                routeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                updateRouteMap(this.textContent);
            });
        });
        
        // Update map with first route
        updateRouteMap('Route A');
    }
}

/**
 * Render demo routes for development
 */
function renderDemoRoutes() {
    const demoRoutes = [
        { id: 1, name: 'Route A', description: 'Delhi City Tour' },
        { id: 2, name: 'Route B', description: 'Delhi to Gurugram' },
        { id: 3, name: 'Route C', description: 'Delhi to Meerut' }
    ];
    
    renderRoutes(demoRoutes);
}
