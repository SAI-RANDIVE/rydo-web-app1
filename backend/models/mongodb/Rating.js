/**
 * Rating Model for MongoDB
 * Represents a rating in the RYDO Web App
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RatingSchema = new Schema({
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerType: {
    type: String,
    enum: ['driver', 'caretaker', 'shuttle'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  review: {
    type: String
  },
  tags: [{
    type: String
  }],
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

const Rating = mongoose.model('Rating', RatingSchema);

module.exports = Rating;
