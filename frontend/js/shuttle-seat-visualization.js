/**
 * Shuttle Seat Visualization
 * Displays interactive seat map with gender-based coloring
 * - Blue: Male passenger
 * - Pink: Female passenger
 * - Green: Available seat
 */

class ShuttleSeatVisualization {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    
    this.options = {
      rows: options.rows || 5,
      seatsPerRow: options.seatsPerRow || 4,
      seatWidth: options.seatWidth || 40,
      seatHeight: options.seatHeight || 40,
      seatSpacing: options.seatSpacing || 10,
      rowSpacing: options.rowSpacing || 20,
      aisleWidth: options.aisleWidth || 20,
      colors: {
        available: options.colors?.available || '#4CAF50', // Green
        male: options.colors?.male || '#5B6EF5',          // Blue
        female: options.colors?.female || '#FF6B9D',      // Pink
        selected: options.colors?.selected || '#FFC107',  // Amber
        disabled: options.colors?.disabled || '#9E9E9E'   // Gray
      },
      onSeatSelect: options.onSeatSelect || null
    };
    
    this.seats = [];
    this.selectedSeats = [];
    
    this.init();
  }
  
  /**
   * Initialize the seat visualization
   */
  init() {
    this.createSeatMap();
    this.renderSeatMap();
  }
  
  /**
   * Create the seat data structure
   */
  createSeatMap() {
    this.seats = [];
    
    for (let row = 0; row < this.options.rows; row++) {
      const rowSeats = [];
      
      for (let col = 0; col < this.options.seatsPerRow; col++) {
        // Add aisle in the middle (2 seats on each side)
        const seatNumber = row * this.options.seatsPerRow + col + 1;
        const seatPosition = String.fromCharCode(65 + row) + (col + 1);
        
        rowSeats.push({
          id: seatNumber,
          position: seatPosition,
          row: row,
          col: col,
          status: 'available', // available, occupied, disabled
          gender: null,        // male, female, null
          selected: false
        });
      }
      
      this.seats.push(rowSeats);
    }
  }
  
  /**
   * Render the seat map in the container
   */
  renderSeatMap() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create vehicle outline
    const vehicleContainer = document.createElement('div');
    vehicleContainer.className = 'vehicle-container';
    
    // Create vehicle header (driver area)
    const vehicleHeader = document.createElement('div');
    vehicleHeader.className = 'vehicle-header';
    
    const driverIcon = document.createElement('div');
    driverIcon.className = 'driver-icon';
    driverIcon.innerHTML = '<i class="fas fa-user-tie"></i>';
    
    const steeringWheel = document.createElement('div');
    steeringWheel.className = 'steering-wheel';
    steeringWheel.innerHTML = '<i class="fas fa-steering-wheel"></i>';
    
    vehicleHeader.appendChild(driverIcon);
    vehicleHeader.appendChild(steeringWheel);
    
    // Create seats container
    const seatsContainer = document.createElement('div');
    seatsContainer.className = 'seats-container';
    
    // Calculate dimensions
    const totalWidth = (this.options.seatWidth * this.options.seatsPerRow/2) + 
                       (this.options.seatSpacing * (this.options.seatsPerRow/2 - 1)) +
                       this.options.aisleWidth;
    
    seatsContainer.style.width = `${totalWidth * 2}px`;
    
    // Create rows
    for (let row = 0; row < this.options.rows; row++) {
      const rowElement = document.createElement('div');
      rowElement.className = 'seat-row';
      rowElement.style.marginBottom = `${this.options.rowSpacing}px`;
      
      // Add row label
      const rowLabel = document.createElement('div');
      rowLabel.className = 'row-label';
      rowLabel.textContent = String.fromCharCode(65 + row);
      
      // Create seats in this row
      for (let col = 0; col < this.options.seatsPerRow; col++) {
        const seat = this.seats[row][col];
        const seatElement = document.createElement('div');
        seatElement.className = 'seat';
        seatElement.dataset.id = seat.id;
        seatElement.dataset.position = seat.position;
        
        // Apply seat status styling
        this.applySeatStyle(seatElement, seat);
        
        // Add seat number
        const seatNumber = document.createElement('span');
        seatNumber.className = 'seat-number';
        seatNumber.textContent = seat.position;
        seatElement.appendChild(seatNumber);
        
        // Add click event
        seatElement.addEventListener('click', () => this.handleSeatClick(seat));
        
        // Add aisle in the middle (2 seats on each side)
        if (col === this.options.seatsPerRow / 2 - 1) {
          seatElement.style.marginRight = `${this.options.aisleWidth}px`;
        }
        
        rowElement.appendChild(seatElement);
      }
      
      seatsContainer.appendChild(rowElement);
    }
    
    // Create legend
    const legend = document.createElement('div');
    legend.className = 'seat-legend';
    
    const legendItems = [
      { color: this.options.colors.available, label: 'Available' },
      { color: this.options.colors.male, label: 'Male' },
      { color: this.options.colors.female, label: 'Female' },
      { color: this.options.colors.selected, label: 'Selected' },
      { color: this.options.colors.disabled, label: 'Unavailable' }
    ];
    
    legendItems.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      
      const colorBox = document.createElement('div');
      colorBox.className = 'color-box';
      colorBox.style.backgroundColor = item.color;
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legend.appendChild(legendItem);
    });
    
    // Assemble vehicle
    vehicleContainer.appendChild(vehicleHeader);
    vehicleContainer.appendChild(seatsContainer);
    
    // Add to container
    this.container.appendChild(vehicleContainer);
    this.container.appendChild(legend);
    
    // Add CSS
    this.addStyles();
  }
  
  /**
   * Apply styling to a seat based on its status
   */
  applySeatStyle(seatElement, seat) {
    // Reset classes
    seatElement.className = 'seat';
    
    // Set dimensions
    seatElement.style.width = `${this.options.seatWidth}px`;
    seatElement.style.height = `${this.options.seatHeight}px`;
    seatElement.style.margin = `0 ${this.options.seatSpacing}px 0 0`;
    
    // Apply status-based styling
    if (seat.selected) {
      seatElement.classList.add('selected');
      seatElement.style.backgroundColor = this.options.colors.selected;
    } else if (seat.status === 'disabled') {
      seatElement.classList.add('disabled');
      seatElement.style.backgroundColor = this.options.colors.disabled;
    } else if (seat.status === 'occupied') {
      seatElement.classList.add('occupied');
      
      if (seat.gender === 'male') {
        seatElement.classList.add('male');
        seatElement.style.backgroundColor = this.options.colors.male;
      } else if (seat.gender === 'female') {
        seatElement.classList.add('female');
        seatElement.style.backgroundColor = this.options.colors.female;
      }
    } else {
      seatElement.classList.add('available');
      seatElement.style.backgroundColor = this.options.colors.available;
    }
  }
  
  /**
   * Handle seat click event
   */
  handleSeatClick(seat) {
    // Cannot select disabled or occupied seats
    if (seat.status === 'disabled' || seat.status === 'occupied') {
      return;
    }
    
    // Toggle selection
    seat.selected = !seat.selected;
    
    // Update selected seats array
    if (seat.selected) {
      this.selectedSeats.push(seat);
    } else {
      this.selectedSeats = this.selectedSeats.filter(s => s.id !== seat.id);
    }
    
    // Re-render the seat map
    this.renderSeatMap();
    
    // Call the callback if provided
    if (typeof this.options.onSeatSelect === 'function') {
      this.options.onSeatSelect(this.selectedSeats, seat);
    }
  }
  
  /**
   * Update seat data with booking information
   */
  updateSeats(bookings) {
    if (!bookings || !Array.isArray(bookings)) {
      return;
    }
    
    // Reset all seats to available
    this.seats.forEach(row => {
      row.forEach(seat => {
        if (seat.status !== 'disabled') {
          seat.status = 'available';
          seat.gender = null;
        }
      });
    });
    
    // Update seats based on bookings
    bookings.forEach(booking => {
      if (booking.seat_id) {
        // Find the seat by ID
        const seatId = parseInt(booking.seat_id);
        let found = false;
        
        for (let row = 0; row < this.seats.length && !found; row++) {
          for (let col = 0; col < this.seats[row].length && !found; col++) {
            if (this.seats[row][col].id === seatId) {
              this.seats[row][col].status = 'occupied';
              this.seats[row][col].gender = booking.passenger_gender || null;
              found = true;
            }
          }
        }
      }
    });
    
    // Re-render the seat map
    this.renderSeatMap();
  }
  
  /**
   * Disable specific seats
   */
  disableSeats(seatIds) {
    if (!seatIds || !Array.isArray(seatIds)) {
      return;
    }
    
    seatIds.forEach(seatId => {
      // Find the seat by ID
      const id = parseInt(seatId);
      
      for (let row = 0; row < this.seats.length; row++) {
        for (let col = 0; col < this.seats[row].length; col++) {
          if (this.seats[row][col].id === id) {
            this.seats[row][col].status = 'disabled';
            this.seats[row][col].selected = false;
          }
        }
      }
    });
    
    // Update selected seats array
    this.selectedSeats = this.selectedSeats.filter(seat => 
      !seatIds.includes(seat.id)
    );
    
    // Re-render the seat map
    this.renderSeatMap();
  }
  
  /**
   * Get selected seats
   */
  getSelectedSeats() {
    return this.selectedSeats;
  }
  
  /**
   * Reset seat selection
   */
  resetSelection() {
    // Clear all selections
    this.seats.forEach(row => {
      row.forEach(seat => {
        seat.selected = false;
      });
    });
    
    this.selectedSeats = [];
    
    // Re-render the seat map
    this.renderSeatMap();
  }
  
  /**
   * Add required CSS styles
   */
  addStyles() {
    // Check if styles already exist
    if (document.getElementById('shuttle-seat-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'shuttle-seat-styles';
    
    styleElement.textContent = `
      .vehicle-container {
        background-color: #f5f5f5;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
      }
      
      .vehicle-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #e0e0e0;
        border-radius: 10px 10px 0 0;
        padding: 10px;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
      }
      
      .driver-icon, .steering-wheel {
        font-size: 24px;
        color: #333;
      }
      
      .seats-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .seat-row {
        display: flex;
        margin-bottom: 10px;
      }
      
      .row-label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        margin-right: 10px;
        font-weight: bold;
      }
      
      .seat {
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #333;
        border-radius: 5px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
      }
      
      .seat:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      
      .seat.disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .seat-number {
        font-size: 12px;
        font-weight: bold;
        color: #333;
      }
      
      .seat-legend {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 20px;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        margin: 0 10px 10px 0;
      }
      
      .color-box {
        width: 20px;
        height: 20px;
        border: 1px solid #333;
        border-radius: 3px;
        margin-right: 5px;
      }
    `;
    
    document.head.appendChild(styleElement);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ShuttleSeatVisualization;
} else {
  window.ShuttleSeatVisualization = ShuttleSeatVisualization;
}
