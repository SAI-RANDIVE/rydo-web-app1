const mongoose = require('mongoose');

const VehicleTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  pricePerKm: {
    type: Number,
    required: true
  },
  icon: {
    type: String,
    default: '/images/car-icon.png'
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

module.exports = mongoose.model('VehicleType', VehicleTypeSchema);
