const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  service_provider_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  service_type: { 
    type: String, 
    required: true, 
    enum: ['driver', 'caretaker', 'shuttle'] 
  },
  booking_type: { 
    type: String, 
    required: true, 
    enum: ['onCall', 'monthly', 'permanent', 'shuttle'] 
  },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'] 
  },
  pickup_location: { 
    type: String 
  },
  pickup_coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  dropoff_location: { 
    type: String 
  },
  dropoff_coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  service_location: { 
    type: String 
  },
  service_coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  booking_date: { 
    type: Date, 
    required: true 
  },
  booking_time: { 
    type: String, 
    required: true 
  },
  start_time: { 
    type: Date 
  },
  end_time: { 
    type: Date 
  },
  duration_hours: { 
    type: Number 
  },
  distance: { 
    type: Number 
  },
  vehicle_type: { 
    type: String 
  },
  passengers: { 
    type: Number 
  },
  special_instructions: { 
    type: String 
  },
  medical_conditions: { 
    type: String 
  },
  care_type: { 
    type: String, 
    enum: ['elderly', 'child', 'medical', 'specialized'] 
  },
  shuttle_type: { 
    type: String 
  },
  base_fare: { 
    type: Number 
  },
  fare: { 
    type: Number, 
    required: true 
  },
  payment_status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'completed', 'failed', 'refunded'] 
  },
  payment_method: { 
    type: String, 
    enum: ['cash', 'card', 'wallet'] 
  },
  transaction_id: { 
    type: String 
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5 
  },
  review: { 
    type: String 
  },
  cancellation_reason: { 
    type: String 
  },
  cancelled_by: { 
    type: String, 
    enum: ['user', 'service_provider', 'admin', 'system'] 
  },
  cancelled_at: { 
    type: Date 
  },
  notes: { 
    type: String 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Create indexes for frequently queried fields
bookingSchema.index({ user_id: 1, created_at: -1 });
bookingSchema.index({ service_provider_id: 1, created_at: -1 });
bookingSchema.index({ booking_date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ pickup_coordinates: '2dsphere' });
bookingSchema.index({ dropoff_coordinates: '2dsphere' });
bookingSchema.index({ service_coordinates: '2dsphere' });

// Pre-save middleware to update the updated_at field
bookingSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
