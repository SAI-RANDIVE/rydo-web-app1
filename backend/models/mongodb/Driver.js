/**
 * Driver Model for MongoDB
 * Represents a driver in the RYDO Web App
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DriverSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  vehicleType: {
    type: Schema.Types.ObjectId,
    ref: 'VehicleType'
  },
  vehicleDetails: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    color: { type: String },
    licensePlate: { type: String }
  },
  drivingLicense: {
    number: { type: String },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false }
  },
  aadharCard: {
    number: { type: String },
    verified: { type: Boolean, default: false }
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isOnTrip: {
    type: Boolean,
    default: false
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  upiId: {
    type: String
  },
  languages: [{
    type: String
  }],
  skills: [{
    type: String
  }],
  education: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for geospatial queries
DriverSchema.index({ currentLocation: '2dsphere' });

const Driver = mongoose.model('Driver', DriverSchema);

module.exports = Driver;
