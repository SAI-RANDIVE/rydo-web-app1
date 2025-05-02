/**
 * Shuttle Model for MongoDB
 * Represents a shuttle service in the RYDO Web App
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShuttleSchema = new Schema({
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
  vehicleDetails: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    color: { type: String },
    licensePlate: { type: String },
    registrationNumber: { type: String },
    registrationExpiry: { type: Date }
  },
  passengerCapacity: {
    type: Number,
    required: true
  },
  amenities: [{
    type: String
  }],
  insuranceDetails: {
    provider: { type: String },
    policyNumber: { type: String },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false }
  },
  drivingLicense: {
    number: { type: String },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false }
  },
  permitDetails: {
    number: { type: String },
    type: { type: String },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false }
  },
  serviceAreas: [{
    name: { type: String },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  }],
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
  farePerKm: {
    type: Number,
    default: 0
  },
  baseFare: {
    type: Number,
    default: 0
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
ShuttleSchema.index({ currentLocation: '2dsphere' });
ShuttleSchema.index({ 'serviceAreas.coordinates': '2dsphere' });

const Shuttle = mongoose.model('Shuttle', ShuttleSchema);

module.exports = Shuttle;
