const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'driver', 'caretaker', 'shuttle_driver', 'admin', 'verifier'], 
    default: 'customer' 
  },
  phone: { type: String },
  profile_image: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zipcode: { type: String },
  date_of_birth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  verification_status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  documents: {
    id_proof: { type: String },
    address_proof: { type: String },
    license: { type: String },
    insurance: { type: String },
    vehicle_registration: { type: String },
    medical_certificate: { type: String }
  },
  service_details: {
    vehicle_type: { type: String },
    vehicle_model: { type: String },
    vehicle_year: { type: Number },
    vehicle_color: { type: String },
    vehicle_plate: { type: String },
    service_areas: [{ type: String }],
    specializations: [{ type: String }],
    years_of_experience: { type: Number },
    shuttle_capacity: { type: Number },
    care_type: { type: String, enum: ['elderly', 'child', 'medical', 'specialized'] }
  },
  rating: { type: Number, default: 0 },
  total_rides: { type: Number, default: 0 },
  total_earnings: { type: Number, default: 0 },
  wallet_balance: { type: Number, default: 0 },
  is_online: { type: Boolean, default: false },
  current_location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  rejection_reason: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Create index for geospatial queries
userSchema.index({ current_location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
