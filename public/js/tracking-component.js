/**
 * Real-time Tracking Component
 * Provides real-time location tracking for drivers and customers
 */

class TrackingComponent {
  constructor(options = {}) {
    this.mapContainerId = options.mapContainerId || 'tracking-map';
    this.sessionId = options.sessionId || null;
    this.role = options.role || null; // 'driver', 'customer', 'shuttle'
    this.userId = options.userId || null;
    this.onLocationUpdate = options.onLocationUpdate || null;
    this.onStatusUpdate = options.onStatusUpdate || null;
    this.onETAUpdate = options.onETAUpdate || null;
    this.onConnectionChange = options.onConnectionChange || null;
    
    this.map = null;
    this.driverMarker = null;
    this.originMarker = null;
    this.destinationMarker = null;
    this.routePath = null;
    this.socket = null;
    this.watchId = null;
    this.connected = false;
    this.lastLocation = null;
    this.routeData = null;
    
    // Initialize if sessionId is provided
    if (this.sessionId && this.role && this.userId) {
      this.init();
    }
  }
  
  /**
   * Initialize tracking component
   */
  async init() {
    try {
      // Load Google Maps API if not already loaded
      await this.loadGoogleMapsAPI();
      
      // Initialize map
      this.initMap();
      
      // Connect to WebSocket server
      await this.connectWebSocket();
      
      // Start tracking if driver or shuttle
      if (this.role === 'driver' || this.role === 'shuttle') {
        this.startTracking();
      }
    } catch (error) {
      console.error('Error initializing tracking component:', error);
    }
  }
  
  /**
   * Load Google Maps API
   */
  loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCeQRIk26TAxjwxFU0-YFV19lJf7Oe8sjc&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Initialize map
   */
  initMap() {
    const mapContainer = document.getElementById(this.mapContainerId);
    
    if (!mapContainer) {
      console.error(`Map container with ID '${this.mapContainerId}' not found`);
      return;
    }
    
    // Create map
    this.map = new google.maps.Map(mapContainer, {
      center: { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });
    
    // Create driver marker
    this.driverMarker = new google.maps.Marker({
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#5B6EF5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      },
      title: this.role === 'driver' || this.role === 'shuttle' ? 'You' : 'Driver'
    });
  }
  
  /**
   * Connect to WebSocket server
   */
  async connectWebSocket() {
    try {
      // Get WebSocket URL
      const response = await fetch(`/tracking/connect/${this.sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get WebSocket URL');
      }
      
      const data = await response.json();
      const url = data.url;
      
      // Connect to WebSocket server
      this.socket = new WebSocket(url);
      
      // Handle WebSocket events
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      
      // Retry connection after 5 seconds
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  handleSocketOpen() {
    console.log('WebSocket connection established');
    this.connected = true;
    
    // Notify connection change
    if (this.onConnectionChange) {
      this.onConnectionChange(true);
    }
  }
  
  /**
   * Handle WebSocket message event
   */
  handleSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle location update
      if (message.type === 'location_update') {
        this.handleLocationUpdate(message.data);
      }
      
      // Handle route data
      if (message.type === 'route_data') {
        this.handleRouteData(message.data);
      }
      
      // Handle ETA update
      if (message.type === 'eta_update') {
        this.handleETAUpdate(message.data);
      }
      
      // Handle status update
      if (message.type === 'status_update') {
        this.handleStatusUpdate(message.data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  handleSocketClose() {
    console.log('WebSocket connection closed');
    this.connected = false;
    
    // Notify connection change
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      this.connectWebSocket();
    }, 5000);
  }
  
  /**
   * Handle WebSocket error event
   */
  handleSocketError(error) {
    console.error('WebSocket error:', error);
    this.connected = false;
    
    // Notify connection change
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
  }
  
  /**
   * Handle location update
   */
  handleLocationUpdate(locationData) {
    // Update last location
    this.lastLocation = locationData;
    
    // Update driver marker
    const position = {
      lat: parseFloat(locationData.latitude),
      lng: parseFloat(locationData.longitude)
    };
    
    this.driverMarker.setPosition(position);
    
    // Center map on driver if no route is displayed
    if (!this.routePath) {
      this.map.setCenter(position);
    }
    
    // Update heading
    if (locationData.heading) {
      const heading = parseFloat(locationData.heading);
      
      // Update driver marker icon
      this.driverMarker.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#5B6EF5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: heading
      });
    }
    
    // Calculate and update ETA if driver or shuttle
    if ((this.role === 'driver' || this.role === 'shuttle') && this.routeData) {
      this.calculateETA(position);
    }
    
    // Notify location update
    if (this.onLocationUpdate) {
      this.onLocationUpdate(locationData);
    }
  }
  
  /**
   * Handle route data
   */
  handleRouteData(routeData) {
    this.routeData = routeData;
    
    // Create origin and destination markers
    const origin = {
      lat: parseFloat(routeData.origin.latitude),
      lng: parseFloat(routeData.origin.longitude)
    };
    
    const destination = {
      lat: parseFloat(routeData.destination.latitude),
      lng: parseFloat(routeData.destination.longitude)
    };
    
    // Create origin marker
    if (!this.originMarker) {
      this.originMarker = new google.maps.Marker({
        position: origin,
        map: this.map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        },
        title: 'Pickup Location'
      });
    } else {
      this.originMarker.setPosition(origin);
    }
    
    // Create destination marker
    if (!this.destinationMarker) {
      this.destinationMarker = new google.maps.Marker({
        position: destination,
        map: this.map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        },
        title: 'Destination'
      });
    } else {
      this.destinationMarker.setPosition(destination);
    }
    
    // Calculate and display route
    this.calculateRoute(origin, destination, routeData.waypoints);
  }
  
  /**
   * Handle ETA update
   */
  handleETAUpdate(etaData) {
    // Notify ETA update
    if (this.onETAUpdate) {
      this.onETAUpdate(etaData.eta);
    }
  }
  
  /**
   * Handle status update
   */
  handleStatusUpdate(statusData) {
    // Notify status update
    if (this.onStatusUpdate) {
      this.onStatusUpdate(statusData.status, statusData.updatedBy);
    }
  }
  
  /**
   * Calculate and display route
   */
  calculateRoute(origin, destination, waypoints = []) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#5B6EF5',
        strokeWeight: 5,
        strokeOpacity: 0.7
      }
    });
    
    directionsRenderer.setMap(this.map);
    
    // Format waypoints
    const formattedWaypoints = waypoints.map(waypoint => ({
      location: new google.maps.LatLng(
        parseFloat(waypoint.latitude),
        parseFloat(waypoint.longitude)
      ),
      stopover: true
    }));
    
    // Calculate route
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        waypoints: formattedWaypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      },
      (response, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(response);
          this.routePath = response.routes[0].overview_path;
          
          // Fit map to route bounds
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          
          waypoints.forEach(waypoint => {
            bounds.extend({
              lat: parseFloat(waypoint.latitude),
              lng: parseFloat(waypoint.longitude)
            });
          });
          
          this.map.fitBounds(bounds);
          
          // Calculate ETA if driver or shuttle and we have a location
          if ((this.role === 'driver' || this.role === 'shuttle') && this.lastLocation) {
            const position = {
              lat: parseFloat(this.lastLocation.latitude),
              lng: parseFloat(this.lastLocation.longitude)
            };
            
            this.calculateETA(position);
          }
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }
  
  /**
   * Calculate ETA
   */
  calculateETA(currentPosition) {
    if (!this.routeData || !this.routePath) {
      return;
    }
    
    const directionsService = new google.maps.DirectionsService();
    
    const destination = {
      lat: parseFloat(this.routeData.destination.latitude),
      lng: parseFloat(this.routeData.destination.longitude)
    };
    
    directionsService.route(
      {
        origin: currentPosition,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (response, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const route = response.routes[0];
          const leg = route.legs[0];
          const duration = leg.duration.value; // Duration in seconds
          
          // Calculate ETA
          const now = new Date();
          const eta = new Date(now.getTime() + duration * 1000);
          
          // Send ETA update
          if (this.connected) {
            this.socket.send(JSON.stringify({
              type: 'eta_update',
              data: {
                eta: eta.toISOString()
              }
            }));
          }
          
          // Notify ETA update
          if (this.onETAUpdate) {
            this.onETAUpdate(eta.toISOString());
          }
        } else {
          console.error('ETA calculation failed:', status);
        }
      }
    );
  }
  
  /**
   * Start tracking
   */
  startTracking() {
    if (navigator.geolocation) {
      // Get current position
      navigator.geolocation.getCurrentPosition(
        this.handlePositionSuccess.bind(this),
        this.handlePositionError.bind(this),
        {
          enableHighAccuracy: true
        }
      );
      
      // Watch position
      this.watchId = navigator.geolocation.watchPosition(
        this.handlePositionSuccess.bind(this),
        this.handlePositionError.bind(this),
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
    }
  }
  
  /**
   * Stop tracking
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  
  /**
   * Handle position success
   */
  handlePositionSuccess(position) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    
    // Update last location
    this.lastLocation = {
      latitude,
      longitude,
      accuracy,
      heading,
      speed
    };
    
    // Update driver marker
    const pos = {
      lat: latitude,
      lng: longitude
    };
    
    this.driverMarker.setPosition(pos);
    
    // Center map on driver if no route is displayed
    if (!this.routePath) {
      this.map.setCenter(pos);
    }
    
    // Update heading
    if (heading) {
      // Update driver marker icon
      this.driverMarker.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#5B6EF5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: heading
      });
    }
    
    // Send location update
    if (this.connected) {
      this.socket.send(JSON.stringify({
        type: 'location_update',
        data: {
          latitude,
          longitude,
          accuracy,
          heading,
          speed
        }
      }));
    }
    
    // Calculate and update ETA if we have route data
    if (this.routeData) {
      this.calculateETA(pos);
    }
    
    // Notify location update
    if (this.onLocationUpdate) {
      this.onLocationUpdate({
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Handle position error
   */
  handlePositionError(error) {
    console.error('Error getting location:', error);
  }
  
  /**
   * Update status
   */
  updateStatus(status) {
    if (this.connected) {
      this.socket.send(JSON.stringify({
        type: 'status_update',
        data: {
          status
        }
      }));
    }
  }
  
  /**
   * Set session
   */
  setSession(sessionId, role, userId) {
    this.sessionId = sessionId;
    this.role = role;
    this.userId = userId;
    
    // Initialize tracking
    this.init();
  }
  
  /**
   * Disconnect
   */
  disconnect() {
    // Stop tracking
    this.stopTracking();
    
    // Close WebSocket connection
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear map
    if (this.map) {
      if (this.driverMarker) {
        this.driverMarker.setMap(null);
        this.driverMarker = null;
      }
      
      if (this.originMarker) {
        this.originMarker.setMap(null);
        this.originMarker = null;
      }
      
      if (this.destinationMarker) {
        this.destinationMarker.setMap(null);
        this.destinationMarker = null;
      }
      
      if (this.routePath) {
        this.routePath = null;
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrackingComponent;
} else {
  window.TrackingComponent = TrackingComponent;
}
