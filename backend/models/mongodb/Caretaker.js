/**
 * Caretaker Model for MongoDB
 * Represents a medical caretaker in the RYDO Web App
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaretakerSchema = new Schema({
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
  specialization: {
    type: String
  },
  certifications: [{
    name: { type: String },
    issuer: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false }
  }],
  medicalLicense: {
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
  isOnDuty: {
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
  totalServices: {
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
  servicesOffered: [{
    type: String
  }],
  education: {
    type: String
  },
  experience: {
    years: { type: Number },
    details: { type: String }
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
CaretakerSchema.index({ currentLocation: '2dsphere' });

const Caretaker = mongoose.model('Caretaker', CaretakerSchema);

module.exports = Caretaker;
