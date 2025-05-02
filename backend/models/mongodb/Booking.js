const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  reference_id: {
    type: String,
    required: true,
    unique: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service_type: {
    type: String,
    enum: ['driver', 'caretaker', 'shuttle'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  expiration_time: {
    type: Date,
    required: true
  },
  pickup_location: {
    type: String,
    required: true
  },
  dropoff_location: {
    type: String,
    required: false
  },
  pickup_coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  dropoff_coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
  booking_date: {
    type: Date,
    required: false
  },
  booking_time: {
    type: String,
    required: false
  },
  fare_amount: {
    type: Number,
    required: false
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  notes: {
    type: String,
    required: false
  },
  start_time: {
    type: Date
  },
  end_time: {
    type: Date
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  payment_id: {
    type: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  feedback: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes for common queries
BookingSchema.index({ customer_id: 1 });
BookingSchema.index({ provider_id: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ pickup_coordinates: '2dsphere' });
BookingSchema.index({ dropoff_coordinates: '2dsphere' });
BookingSchema.index({ reference_id: 1 }, { unique: true });
BookingSchema.index({ expiration_time: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
