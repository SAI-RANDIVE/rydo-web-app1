const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  userType: {
    type: String,
    enum: ['customer', 'driver', 'caretaker', 'shuttle', 'admin'],
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Driver/Caretaker/Shuttle specific fields
  documents: {
    drivingLicense: {
      number: String,
      expiryDate: Date,
      verified: {
        type: Boolean,
        default: false
      },
      documentUrl: String
    },
    aadharCard: {
      number: String,
      verified: {
        type: Boolean,
        default: false
      },
      documentUrl: String
    },
    medicalCertification: {
      number: String,
      expiryDate: Date,
      verified: {
        type: Boolean,
        default: false
      },
      documentUrl: String
    }
  },
  professionalDetails: {
    education: String,
    languages: [String],
    skills: [String],
    experience: Number
  },
  vehicleDetails: {
    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleType'
    },
    model: String,
    registrationNumber: String,
    insuranceNumber: String,
    insuranceExpiryDate: Date,
    passengerCapacity: Number,
    amenities: [String]
  },
  paymentInfo: {
    upiId: String
  },
  serviceAreas: [{
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    radius: {
      type: Number,
      default: 3 // in kilometers
    }
  }],
  availability: {
    isAvailable: {
      type: Boolean,
      default: false
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String
    }]
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

// Create indexes for common queries
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ userType: 1 });
ProfileSchema.index({ 'serviceAreas.coordinates': '2dsphere' });

module.exports = mongoose.model('Profile', ProfileSchema);
