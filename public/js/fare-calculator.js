/**
 * Fare Calculator Module
 * Handles fare calculation for different services
 */

// Base fare constants
const FARE_CONSTANTS = {
    BASE_FARE: {
        driver: 50,
        caretaker: 150,
        shuttle: 80
    },
    PER_KM_RATE: {
        driver: 12,
        caretaker: 0, // Caretaker is charged per hour
        shuttle: 10
    },
    PER_MINUTE_RATE: {
        driver: 1.5,
        caretaker: 0, // Caretaker is charged per hour
        shuttle: 1.2
    },
    PER_HOUR_RATE: {
        caretaker: 200
    },
    SURGE_MULTIPLIER: {
        low: 1.0,
        medium: 1.2,
        high: 1.5,
        very_high: 2.0
    },
    BOOKING_FEE: 20,
    CANCELLATION_FEE: {
        before_driver_assigned: 0,
        after_driver_assigned: 30,
        after_driver_arrived: 50
    },
    WAITING_CHARGE_PER_MINUTE: 2,
    GST_RATE: 0.05 // 5% GST
};

/**
 * Calculate fare for driver service
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {string} demandLevel - Demand level (low, medium, high, very_high)
 * @returns {Object} - Fare details
 */
function calculateDriverFare(distance, duration, demandLevel = 'low') {
    const baseFare = FARE_CONSTANTS.BASE_FARE.driver;
    const distanceCharge = distance * FARE_CONSTANTS.PER_KM_RATE.driver;
    const timeCharge = duration * FARE_CONSTANTS.PER_MINUTE_RATE.driver;
    const bookingFee = FARE_CONSTANTS.BOOKING_FEE;
    
    let subtotal = baseFare + distanceCharge + timeCharge + bookingFee;
    
    // Apply surge pricing if applicable
    const surgeMultiplier = FARE_CONSTANTS.SURGE_MULTIPLIER[demandLevel] || 1.0;
    const surgeFare = subtotal * surgeMultiplier;
    
    // Calculate GST
    const gst = surgeFare * FARE_CONSTANTS.GST_RATE;
    
    // Calculate total fare
    const totalFare = surgeFare + gst;
    
    return {
        baseFare,
        distanceCharge,
        timeCharge,
        bookingFee,
        subtotal,
        surgeMultiplier,
        surgeFare,
        gst,
        totalFare: Math.round(totalFare) // Round to nearest integer
    };
}

/**
 * Calculate fare for caretaker service
 * @param {number} hours - Number of hours
 * @param {string} demandLevel - Demand level (low, medium, high, very_high)
 * @returns {Object} - Fare details
 */
function calculateCaretakerFare(hours, demandLevel = 'low') {
    const baseFare = FARE_CONSTANTS.BASE_FARE.caretaker;
    const hourlyCharge = hours * FARE_CONSTANTS.PER_HOUR_RATE.caretaker;
    const bookingFee = FARE_CONSTANTS.BOOKING_FEE;
    
    let subtotal = baseFare + hourlyCharge + bookingFee;
    
    // Apply surge pricing if applicable
    const surgeMultiplier = FARE_CONSTANTS.SURGE_MULTIPLIER[demandLevel] || 1.0;
    const surgeFare = subtotal * surgeMultiplier;
    
    // Calculate GST
    const gst = surgeFare * FARE_CONSTANTS.GST_RATE;
    
    // Calculate total fare
    const totalFare = surgeFare + gst;
    
    return {
        baseFare,
        hourlyCharge,
        bookingFee,
        subtotal,
        surgeMultiplier,
        surgeFare,
        gst,
        totalFare: Math.round(totalFare) // Round to nearest integer
    };
}

/**
 * Calculate fare for shuttle service
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {number} passengers - Number of passengers
 * @param {string} demandLevel - Demand level (low, medium, high, very_high)
 * @returns {Object} - Fare details
 */
function calculateShuttleFare(distance, duration, passengers = 1, demandLevel = 'low') {
    const baseFare = FARE_CONSTANTS.BASE_FARE.shuttle;
    const distanceCharge = distance * FARE_CONSTANTS.PER_KM_RATE.shuttle;
    const timeCharge = duration * FARE_CONSTANTS.PER_MINUTE_RATE.shuttle;
    const bookingFee = FARE_CONSTANTS.BOOKING_FEE;
    
    // Additional charge for more passengers
    const passengerCharge = Math.max(0, passengers - 1) * 15; // ₹15 per additional passenger
    
    let subtotal = baseFare + distanceCharge + timeCharge + bookingFee + passengerCharge;
    
    // Apply surge pricing if applicable
    const surgeMultiplier = FARE_CONSTANTS.SURGE_MULTIPLIER[demandLevel] || 1.0;
    const surgeFare = subtotal * surgeMultiplier;
    
    // Calculate GST
    const gst = surgeFare * FARE_CONSTANTS.GST_RATE;
    
    // Calculate total fare
    const totalFare = surgeFare + gst;
    
    return {
        baseFare,
        distanceCharge,
        timeCharge,
        passengerCharge,
        bookingFee,
        subtotal,
        surgeMultiplier,
        surgeFare,
        gst,
        totalFare: Math.round(totalFare) // Round to nearest integer
    };
}

/**
 * Calculate cancellation fee
 * @param {string} stage - Cancellation stage (before_driver_assigned, after_driver_assigned, after_driver_arrived)
 * @returns {number} - Cancellation fee
 */
function calculateCancellationFee(stage) {
    return FARE_CONSTANTS.CANCELLATION_FEE[stage] || 0;
}

/**
 * Calculate waiting charge
 * @param {number} waitingMinutes - Waiting time in minutes
 * @returns {number} - Waiting charge
 */
function calculateWaitingCharge(waitingMinutes) {
    return waitingMinutes * FARE_CONSTANTS.WAITING_CHARGE_PER_MINUTE;
}

/**
 * Generate a fare estimate for display
 * @param {string} serviceType - Type of service (driver, caretaker, shuttle)
 * @param {Object} params - Parameters for fare calculation
 * @returns {Object} - Fare estimate
 */
function generateFareEstimate(serviceType, params) {
    let fareDetails;
    
    switch (serviceType) {
        case 'driver':
            fareDetails = calculateDriverFare(
                params.distance || 0,
                params.duration || 0,
                params.demandLevel || 'low'
            );
            break;
        case 'caretaker':
            fareDetails = calculateCaretakerFare(
                params.hours || 1,
                params.demandLevel || 'low'
            );
            break;
        case 'shuttle':
            fareDetails = calculateShuttleFare(
                params.distance || 0,
                params.duration || 0,
                params.passengers || 1,
                params.demandLevel || 'low'
            );
            break;
        default:
            throw new Error('Invalid service type');
    }
    
    return {
        ...fareDetails,
        serviceType,
        estimatedAt: new Date().toISOString()
    };
}

/**
 * Generate a receipt for a completed ride
 * @param {string} bookingId - Booking ID
 * @param {Object} fareDetails - Fare details
 * @param {Object} rideDetails - Ride details
 * @returns {string} - HTML receipt
 */
function generateReceipt(bookingId, fareDetails, rideDetails) {
    const date = new Date(rideDetails.completedAt || new Date()).toLocaleDateString();
    const time = new Date(rideDetails.completedAt || new Date()).toLocaleTimeString();
    
    return `
        <div class="receipt">
            <div class="receipt-header">
                <h2>RYDO Receipt</h2>
                <p>Booking ID: ${bookingId}</p>
                <p>Date: ${date}</p>
                <p>Time: ${time}</p>
            </div>
            <div class="receipt-details">
                <div class="receipt-row">
                    <span>Service Type:</span>
                    <span>${rideDetails.serviceType || 'Driver'}</span>
                </div>
                <div class="receipt-row">
                    <span>From:</span>
                    <span>${rideDetails.pickup || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                    <span>To:</span>
                    <span>${rideDetails.dropoff || 'N/A'}</span>
                </div>
                <div class="receipt-row">
                    <span>Distance:</span>
                    <span>${rideDetails.distance || '0'} km</span>
                </div>
                <div class="receipt-row">
                    <span>Duration:</span>
                    <span>${rideDetails.duration || '0'} min</span>
                </div>
            </div>
            <div class="receipt-fare">
                <h3>Fare Breakdown</h3>
                <div class="receipt-row">
                    <span>Base Fare:</span>
                    <span>₹${fareDetails.baseFare || 0}</span>
                </div>
                ${fareDetails.distanceCharge ? `
                <div class="receipt-row">
                    <span>Distance Charge:</span>
                    <span>₹${fareDetails.distanceCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                ${fareDetails.timeCharge ? `
                <div class="receipt-row">
                    <span>Time Charge:</span>
                    <span>₹${fareDetails.timeCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                ${fareDetails.hourlyCharge ? `
                <div class="receipt-row">
                    <span>Hourly Charge:</span>
                    <span>₹${fareDetails.hourlyCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                ${fareDetails.passengerCharge ? `
                <div class="receipt-row">
                    <span>Additional Passenger Charge:</span>
                    <span>₹${fareDetails.passengerCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="receipt-row">
                    <span>Booking Fee:</span>
                    <span>₹${fareDetails.bookingFee || 0}</span>
                </div>
                ${fareDetails.waitingCharge ? `
                <div class="receipt-row">
                    <span>Waiting Charge:</span>
                    <span>₹${fareDetails.waitingCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="receipt-row subtotal">
                    <span>Subtotal:</span>
                    <span>₹${fareDetails.subtotal.toFixed(2)}</span>
                </div>
                ${fareDetails.surgeMultiplier > 1 ? `
                <div class="receipt-row">
                    <span>Surge (${fareDetails.surgeMultiplier}x):</span>
                    <span>₹${(fareDetails.surgeFare - fareDetails.subtotal).toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="receipt-row">
                    <span>GST (5%):</span>
                    <span>₹${fareDetails.gst.toFixed(2)}</span>
                </div>
                <div class="receipt-row total">
                    <span>Total:</span>
                    <span>₹${fareDetails.totalFare}</span>
                </div>
            </div>
            <div class="receipt-footer">
                <p>Thank you for riding with RYDO!</p>
                <p>For any queries, please contact our support at support@rydo.com</p>
            </div>
        </div>
    `;
}

// Export functions for use in other modules
window.FareCalculator = {
    calculateDriverFare,
    calculateCaretakerFare,
    calculateShuttleFare,
    calculateCancellationFee,
    calculateWaitingCharge,
    generateFareEstimate,
    generateReceipt
};
