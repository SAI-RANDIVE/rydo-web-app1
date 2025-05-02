const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    sparse: true
  },
  phone: {
    type: String,
    sparse: true
  },
  otp: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Document will be automatically deleted when expiresAt is reached
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for common queries
OTPSchema.index({ email: 1 });
OTPSchema.index({ phone: 1 });
OTPSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('OTP', OTPSchema);
