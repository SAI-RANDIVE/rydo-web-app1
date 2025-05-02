/**
 * Shuttle Booking System
 * Handles shuttle route selection, seat booking, and OTP verification
 */

class ShuttleBookingSystem {
  constructor() {
    this.routes = [];
    this.schedules = [];
    this.selectedRoute = null;
    this.selectedSchedule = null;
    this.seatVisualization = null;
    this.bookingData = {
      route_id: null,
      schedule_id: null,
      pickup_point: '',
      dropoff_point: '',
      passenger_count: 1,
      selected_seats: [],
      passenger_gender: 'male',
      special_requirements: '',
      payment_method: 'wallet'
    };
    
    // Initialize the booking system
    this.init();
  }
  
  /**
   * Initialize the booking system
   */
  init() {
    // Load routes when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.loadRoutes();
    });
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Route selection
    const routeSelect = document.getElementById('shuttle-route');
    if (routeSelect) {
      routeSelect.addEventListener('change', (e) => this.handleRouteChange(e.target.value));
    }
    
    // Schedule selection
    const scheduleSelect = document.getElementById('shuttle-schedule');
    if (scheduleSelect) {
      scheduleSelect.addEventListener('change', (e) => this.handleScheduleChange(e.target.value));
    }
    
    // Passenger count
    const passengerCount = document.getElementById('passenger-count');
    if (passengerCount) {
      passengerCount.addEventListener('change', (e) => {
        this.bookingData.passenger_count = parseInt(e.target.value);
      });
    }
    
    // Passenger gender
    const genderSelect = document.getElementById('passenger-gender');
    if (genderSelect) {
      genderSelect.addEventListener('change', (e) => {
        this.bookingData.passenger_gender = e.target.value;
      });
    }
    
    // Pickup and dropoff points
    const pickupPoint = document.getElementById('pickup-point');
    if (pickupPoint) {
      pickupPoint.addEventListener('change', (e) => {
        this.bookingData.pickup_point = e.target.value;
      });
    }
    
    const dropoffPoint = document.getElementById('dropoff-point');
    if (dropoffPoint) {
      dropoffPoint.addEventListener('change', (e) => {
        this.bookingData.dropoff_point = e.target.value;
      });
    }
    
    // Special requirements
    const specialRequirements = document.getElementById('special-requirements');
    if (specialRequirements) {
      specialRequirements.addEventListener('input', (e) => {
        this.bookingData.special_requirements = e.target.value;
      });
    }
    
    // Payment method
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
      paymentMethod.addEventListener('change', (e) => {
        this.bookingData.payment_method = e.target.value;
      });
    }
    
    // Booking form submission
    const bookingForm = document.getElementById('shuttle-booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.processBooking();
      });
    }
    
    // OTP verification form
    const otpForm = document.getElementById('otp-verification-form');
    if (otpForm) {
      otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.verifyOTP();
      });
    }
    
    // Resend OTP button
    const resendOtpBtn = document.getElementById('resend-otp');
    if (resendOtpBtn) {
      resendOtpBtn.addEventListener('click', () => this.resendOTP());
    }
  }
  
  /**
   * Load available shuttle routes
   */
  async loadRoutes() {
    try {
      const response = await fetch('/customer/shuttle-routes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load routes');
      }
      
      const data = await response.json();
      this.routes = data.shuttleRoutes || [];
      
      // Populate route select dropdown
      this.populateRouteSelect();
      
      // If routes are available, select the first one by default
      if (this.routes.length > 0) {
        const routeSelect = document.getElementById('shuttle-route');
        if (routeSelect && routeSelect.options.length > 0) {
          routeSelect.selectedIndex = 0;
          this.handleRouteChange(routeSelect.value);
        }
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      this.showError('Failed to load shuttle routes. Please try again later.');
    }
  }
  
  /**
   * Populate route select dropdown
   */
  populateRouteSelect() {
    const routeSelect = document.getElementById('shuttle-route');
    if (!routeSelect) return;
    
    // Clear existing options
    routeSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a route';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    routeSelect.appendChild(defaultOption);
    
    // Add route options
    this.routes.forEach(route => {
      const option = document.createElement('option');
      option.value = route.id;
      option.textContent = `${route.name} (${route.start_point} to ${route.end_point})`;
      routeSelect.appendChild(option);
    });
  }
  
  /**
   * Handle route selection change
   */
  async handleRouteChange(routeId) {
    if (!routeId) return;
    
    // Find the selected route
    this.selectedRoute = this.routes.find(route => route.id == routeId);
    this.bookingData.route_id = routeId;
    
    if (!this.selectedRoute) return;
    
    // Update route details
    this.updateRouteDetails();
    
    // Load schedules for this route
    await this.loadSchedules(routeId);
    
    // Update pickup and dropoff points
    this.updateStopPoints();
  }
  
  /**
   * Update route details display
   */
  updateRouteDetails() {
    if (!this.selectedRoute) return;
    
    const routeDetails = document.getElementById('route-details');
    if (!routeDetails) return;
    
    routeDetails.innerHTML = `
      <div class="route-info">
        <h4>${this.selectedRoute.name}</h4>
        <p><strong>From:</strong> ${this.selectedRoute.start_point}</p>
        <p><strong>To:</strong> ${this.selectedRoute.end_point}</p>
        <p><strong>Distance:</strong> ${this.selectedRoute.distance} km</p>
        <p><strong>Duration:</strong> ${this.selectedRoute.estimated_duration}</p>
        <p><strong>Base Fare:</strong> ₹${this.selectedRoute.base_fare}</p>
      </div>
    `;
    
    // Show route details
    routeDetails.style.display = 'block';
  }
  
  /**
   * Load schedules for the selected route
   */
  async loadSchedules(routeId) {
    try {
      const response = await fetch(`/customer/shuttle-schedules?route_id=${routeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }
      
      const data = await response.json();
      this.schedules = data.schedules || [];
      
      // Populate schedule select dropdown
      this.populateScheduleSelect();
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.showError('Failed to load schedules. Please try again later.');
    }
  }
  
  /**
   * Populate schedule select dropdown
   */
  populateScheduleSelect() {
    const scheduleSelect = document.getElementById('shuttle-schedule');
    if (!scheduleSelect) return;
    
    // Clear existing options
    scheduleSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a schedule';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    scheduleSelect.appendChild(defaultOption);
    
    // Add schedule options
    this.schedules.forEach(schedule => {
      const departureTime = new Date(schedule.departure_time);
      const arrivalTime = new Date(schedule.arrival_time);
      
      const option = document.createElement('option');
      option.value = schedule.id;
      option.textContent = `${this.formatTime(departureTime)} - ${this.formatTime(arrivalTime)} (₹${schedule.fare})`;
      
      // Disable if fully booked
      if (schedule.current_passengers >= schedule.max_passengers) {
        option.disabled = true;
        option.textContent += ' (Fully Booked)';
      }
      
      scheduleSelect.appendChild(option);
    });
  }
  
  /**
   * Format time for display
   */
  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  /**
   * Handle schedule selection change
   */
  handleScheduleChange(scheduleId) {
    if (!scheduleId) return;
    
    // Find the selected schedule
    this.selectedSchedule = this.schedules.find(schedule => schedule.id == scheduleId);
    this.bookingData.schedule_id = scheduleId;
    
    if (!this.selectedSchedule) return;
    
    // Update schedule details
    this.updateScheduleDetails();
    
    // Initialize seat visualization
    this.initSeatVisualization();
  }
  
  /**
   * Update schedule details display
   */
  updateScheduleDetails() {
    if (!this.selectedSchedule) return;
    
    const scheduleDetails = document.getElementById('schedule-details');
    if (!scheduleDetails) return;
    
    const departureTime = new Date(this.selectedSchedule.departure_time);
    const arrivalTime = new Date(this.selectedSchedule.arrival_time);
    
    scheduleDetails.innerHTML = `
      <div class="schedule-info">
        <p><strong>Departure:</strong> ${departureTime.toLocaleString()}</p>
        <p><strong>Arrival:</strong> ${arrivalTime.toLocaleString()}</p>
        <p><strong>Fare:</strong> ₹${this.selectedSchedule.fare}</p>
        <p><strong>Available Seats:</strong> ${this.selectedSchedule.max_passengers - this.selectedSchedule.current_passengers}/${this.selectedSchedule.max_passengers}</p>
      </div>
    `;
    
    // Show schedule details
    scheduleDetails.style.display = 'block';
  }
  
  /**
   * Update pickup and dropoff point options
   */
  updateStopPoints() {
    if (!this.selectedRoute || !this.selectedRoute.stops) return;
    
    const pickupSelect = document.getElementById('pickup-point');
    const dropoffSelect = document.getElementById('dropoff-point');
    
    if (!pickupSelect || !dropoffSelect) return;
    
    // Clear existing options
    pickupSelect.innerHTML = '';
    dropoffSelect.innerHTML = '';
    
    // Add default options
    const pickupDefault = document.createElement('option');
    pickupDefault.value = '';
    pickupDefault.textContent = 'Select pickup point';
    pickupDefault.disabled = true;
    pickupDefault.selected = true;
    pickupSelect.appendChild(pickupDefault);
    
    const dropoffDefault = document.createElement('option');
    dropoffDefault.value = '';
    dropoffDefault.textContent = 'Select dropoff point';
    dropoffDefault.disabled = true;
    dropoffDefault.selected = true;
    dropoffSelect.appendChild(dropoffDefault);
    
    // Add stop points as options
    this.selectedRoute.stops.forEach(stop => {
      // Pickup option
      const pickupOption = document.createElement('option');
      pickupOption.value = stop.name;
      pickupOption.textContent = `${stop.name}, ${stop.city}`;
      pickupSelect.appendChild(pickupOption);
      
      // Dropoff option
      const dropoffOption = document.createElement('option');
      dropoffOption.value = stop.name;
      dropoffOption.textContent = `${stop.name}, ${stop.city}`;
      dropoffSelect.appendChild(dropoffOption);
    });
  }
  
  /**
   * Initialize seat visualization
   */
  initSeatVisualization() {
    const seatMapContainer = document.getElementById('seat-map-container');
    if (!seatMapContainer) return;
    
    // Clear container
    seatMapContainer.innerHTML = '';
    
    // Create seat visualization
    this.seatVisualization = new ShuttleSeatVisualization('seat-map-container', {
      rows: 5,
      seatsPerRow: 4,
      onSeatSelect: (selectedSeats, seat) => {
        this.bookingData.selected_seats = selectedSeats.map(s => s.id);
        this.updateSelectedSeatsDisplay();
      }
    });
    
    // Load existing bookings for this schedule
    this.loadExistingBookings();
    
    // Show seat map container
    seatMapContainer.style.display = 'block';
  }
  
  /**
   * Load existing bookings for the selected schedule
   */
  async loadExistingBookings() {
    if (!this.selectedSchedule) return;
    
    try {
      const response = await fetch(`/customer/shuttle-bookings?schedule_id=${this.selectedSchedule.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load bookings');
      }
      
      const data = await response.json();
      const bookings = data.bookings || [];
      
      // Update seat visualization with bookings
      if (this.seatVisualization) {
        this.seatVisualization.updateSeats(bookings);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  }
  
  /**
   * Update selected seats display
   */
  updateSelectedSeatsDisplay() {
    const selectedSeatsDisplay = document.getElementById('selected-seats');
    if (!selectedSeatsDisplay) return;
    
    if (this.bookingData.selected_seats.length > 0) {
      const selectedSeats = this.seatVisualization.getSelectedSeats();
      const seatPositions = selectedSeats.map(seat => seat.position).join(', ');
      
      selectedSeatsDisplay.innerHTML = `
        <p><strong>Selected Seats:</strong> ${seatPositions}</p>
        <p><strong>Total Fare:</strong> ₹${this.calculateTotalFare()}</p>
      `;
      
      // Show selected seats display
      selectedSeatsDisplay.style.display = 'block';
    } else {
      selectedSeatsDisplay.style.display = 'none';
    }
  }
  
  /**
   * Calculate total fare based on selected seats and schedule
   */
  calculateTotalFare() {
    if (!this.selectedSchedule) return 0;
    
    const seatCount = this.bookingData.selected_seats.length || this.bookingData.passenger_count;
    return this.selectedSchedule.fare * seatCount;
  }
  
  /**
   * Process booking
   */
  async processBooking() {
    // Validate booking data
    if (!this.validateBookingData()) {
      return;
    }
    
    try {
      const response = await fetch('/customer/book-shuttle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route_id: this.bookingData.route_id,
          schedule_id: this.bookingData.schedule_id,
          pickup_point: this.bookingData.pickup_point,
          dropoff_point: this.bookingData.dropoff_point,
          passenger_count: this.bookingData.passenger_count,
          selected_seats: this.bookingData.selected_seats,
          passenger_gender: this.bookingData.passenger_gender,
          special_requirements: this.bookingData.special_requirements,
          payment_method: this.bookingData.payment_method
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process booking');
      }
      
      const data = await response.json();
      
      // Store booking ID for OTP verification
      this.bookingData.booking_id = data.bookingId;
      
      // Show OTP verification form
      this.showOTPVerification();
      
      // Send OTP for verification
      this.sendOTP();
    } catch (error) {
      console.error('Error processing booking:', error);
      this.showError(error.message || 'Failed to process booking. Please try again later.');
    }
  }
  
  /**
   * Validate booking data
   */
  validateBookingData() {
    // Check if route is selected
    if (!this.bookingData.route_id) {
      this.showError('Please select a route');
      return false;
    }
    
    // Check if schedule is selected
    if (!this.bookingData.schedule_id) {
      this.showError('Please select a schedule');
      return false;
    }
    
    // Check if pickup point is selected
    if (!this.bookingData.pickup_point) {
      this.showError('Please select a pickup point');
      return false;
    }
    
    // Check if dropoff point is selected
    if (!this.bookingData.dropoff_point) {
      this.showError('Please select a dropoff point');
      return false;
    }
    
    // Check if pickup and dropoff points are different
    if (this.bookingData.pickup_point === this.bookingData.dropoff_point) {
      this.showError('Pickup and dropoff points cannot be the same');
      return false;
    }
    
    // Check if seats are selected (if seat visualization is enabled)
    if (this.seatVisualization && this.bookingData.selected_seats.length === 0) {
      this.showError('Please select at least one seat');
      return false;
    }
    
    return true;
  }
  
  /**
   * Show OTP verification form
   */
  showOTPVerification() {
    const bookingForm = document.getElementById('shuttle-booking-form');
    const otpForm = document.getElementById('otp-verification-form');
    
    if (bookingForm) {
      bookingForm.style.display = 'none';
    }
    
    if (otpForm) {
      otpForm.style.display = 'block';
    }
  }
  
  /**
   * Send OTP for verification
   */
  async sendOTP() {
    try {
      const response = await fetch('/verification/shuttle/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: this.bookingData.booking_id,
          contact_type: 'phone' // or 'email'
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }
      
      const data = await response.json();
      
      // Show success message
      this.showSuccess(`OTP sent to ${data.phone || data.email}. Please check and enter the OTP to confirm your booking.`);
      
      // Start OTP timer
      this.startOTPTimer();
    } catch (error) {
      console.error('Error sending OTP:', error);
      this.showError(error.message || 'Failed to send OTP. Please try again.');
    }
  }
  
  /**
   * Start OTP timer (2 minutes)
   */
  startOTPTimer() {
    const timerDisplay = document.getElementById('otp-timer');
    const resendButton = document.getElementById('resend-otp');
    
    if (!timerDisplay || !resendButton) return;
    
    // Disable resend button
    resendButton.disabled = true;
    
    // Set timer duration (2 minutes)
    let timeLeft = 120;
    
    // Update timer display
    timerDisplay.textContent = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    timerDisplay.style.display = 'block';
    
    // Start timer
    const timerInterval = setInterval(() => {
      timeLeft--;
      
      // Update timer display
      timerDisplay.textContent = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
      
      // Check if timer has expired
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerDisplay.style.display = 'none';
        resendButton.disabled = false;
      }
    }, 1000);
    
    // Store timer interval for cleanup
    this.otpTimerInterval = timerInterval;
  }
  
  /**
   * Resend OTP
   */
  async resendOTP() {
    // Clear existing timer
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
    
    // Send OTP again
    await this.sendOTP();
  }
  
  /**
   * Verify OTP
   */
  async verifyOTP() {
    const otpInput = document.getElementById('otp-input');
    if (!otpInput) return;
    
    const otp = otpInput.value.trim();
    
    if (!otp) {
      this.showError('Please enter the OTP');
      return;
    }
    
    try {
      const response = await fetch('/verification/shuttle/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: this.bookingData.booking_id,
          contact_type: 'phone', // or 'email'
          otp: otp
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid OTP');
      }
      
      // Show booking confirmation
      this.showBookingConfirmation();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      this.showError(error.message || 'Failed to verify OTP. Please try again.');
    }
  }
  
  /**
   * Show booking confirmation
   */
  showBookingConfirmation() {
    const otpForm = document.getElementById('otp-verification-form');
    const confirmationDiv = document.getElementById('booking-confirmation');
    
    if (otpForm) {
      otpForm.style.display = 'none';
    }
    
    if (confirmationDiv) {
      // Calculate total fare
      const totalFare = this.calculateTotalFare();
      
      // Format departure and arrival times
      const departureTime = new Date(this.selectedSchedule.departure_time);
      const arrivalTime = new Date(this.selectedSchedule.arrival_time);
      
      confirmationDiv.innerHTML = `
        <div class="confirmation-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Booking Confirmed!</h3>
        <div class="booking-details">
          <p><strong>Booking ID:</strong> ${this.bookingData.booking_id}</p>
          <p><strong>Route:</strong> ${this.selectedRoute.name}</p>
          <p><strong>From:</strong> ${this.bookingData.pickup_point}</p>
          <p><strong>To:</strong> ${this.bookingData.dropoff_point}</p>
          <p><strong>Departure:</strong> ${departureTime.toLocaleString()}</p>
          <p><strong>Arrival:</strong> ${arrivalTime.toLocaleString()}</p>
          <p><strong>Passengers:</strong> ${this.bookingData.passenger_count}</p>
          <p><strong>Total Fare:</strong> ₹${totalFare}</p>
        </div>
        <p class="confirmation-message">You will receive a confirmation email and SMS with your booking details.</p>
        <button id="back-to-dashboard" class="primary-btn">Back to Dashboard</button>
      `;
      
      confirmationDiv.style.display = 'block';
      
      // Add event listener to back button
      const backButton = document.getElementById('back-to-dashboard');
      if (backButton) {
        backButton.addEventListener('click', () => {
          window.location.href = '/customer-dashboard';
        });
      }
    }
  }
  
  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (!errorDiv) return;
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
  
  /**
   * Show success message
   */
  showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (!successDiv) return;
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 5000);
  }
}

// Initialize the booking system
const shuttleBooking = new ShuttleBookingSystem();
