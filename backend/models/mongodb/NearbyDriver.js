/**
 * NearbyDriver Model for MongoDB
 * Handles driver location and availability data
 */

const mongoose = require('mongoose');

const nearbyDriverSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  is_available: {
    type: Boolean,
    default: true
  },
  last_updated: {
    type: Date,
    default: Date.now
  },
  vehicle_type: {
    type: String,
    enum: ['car', 'bike', 'auto', 'shuttle'],
    required: true
  },
  vehicle_details: {
    make: String,
    model: String,
    year: Number,
    color: String,
    license_plate: String
  },
  service_area: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    radius: {
      type: Number,
      default: 5 // 5km radius
    }
  }
}, {
  timestamps: true
});

// Create a geospatial index for efficient location-based queries
nearbyDriverSchema.index({ "service_area.coordinates": "2dsphere" });

const NearbyDriver = mongoose.model('NearbyDriver', nearbyDriverSchema);

module.exports = NearbyDriver;
