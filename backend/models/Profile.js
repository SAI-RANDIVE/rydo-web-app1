const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['driver', 'caretaker'],
    required: true
  },
  // Common fields for both roles
  profilePhoto: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  aadharCard: {
    number: String,
    frontImage: String,
    backImage: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  // Driver specific fields
  drivingLicense: {
    number: String,
    frontImage: String,
    backImage: String,
    expiryDate: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  vehicleInfo: {
    type: {
      type: String,
      enum: ['2-wheeler', '3-wheeler', '4-wheeler', 'commercial']
    },
    make: String,
    model: String,
    year: Number,
    registrationNumber: String,
    insuranceNumber: String,
    insuranceExpiryDate: Date
  },
  // Caretaker specific fields
  experience: {
    years: Number,
    specializations: [String],
    certifications: [{
      name: String,
      issuedBy: String,
      issueDate: Date,
      expiryDate: Date,
      certificateImage: String
    }]
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  languages: [{
    type: String
  }],
  // Common fields for analytics
  ratings: [{
    rating: Number,
    review: String,
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  earnings: {
    total: {
      type: Number,
      default: 0
    },
    history: [{
      amount: Number,
      date: Date,
      booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
      }
    }]
  },
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      slots: [{
        startTime: String,
        endTime: String
      }]
    }]
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'in-review', 'verified', 'rejected'],
    default: 'pending'
  },
  documents: [{
    type: {
      type: String,
      required: true
    },
    name: String,
    url: String,
    verified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
profileSchema.index({ user: 1 });
profileSchema.index({ role: 1 });
profileSchema.index({ 'ratings.rating': 1 });
profileSchema.index({ verificationStatus: 1 });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
