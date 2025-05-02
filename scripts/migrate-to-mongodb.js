/**
 * RYDO Web App - MySQL to MongoDB Migration Script
 * This script migrates data from MySQL to MongoDB
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import MongoDB models
const connectMongoDB = require('../backend/config/mongodb');
const { 
  User, 
  Booking, 
  Payment, 
  Profile, 
  VehicleType,
  OTP
} = require('../backend/models/mongodb');

// MySQL connection config
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rydo_db',
  port: process.env.DB_PORT || 3306
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Main migration function
async function migrateData() {
  log('\n========================================', colors.blue);
  log('  RYDO WEB APP - MySQL to MongoDB Migration', colors.blue);
  log('========================================\n', colors.blue);

  let mysqlConnection;
  
  try {
    // Connect to MongoDB
    log('Connecting to MongoDB...', colors.yellow);
    await connectMongoDB();
    log('MongoDB connected successfully!', colors.green);

    // Connect to MySQL
    log('Connecting to MySQL...', colors.yellow);
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    log('MySQL connected successfully!', colors.green);

    // Create a backup directory
    const backupDir = path.join(__dirname, '../database/backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Migrate users
    log('\nMigrating Users...', colors.yellow);
    const [users] = await mysqlConnection.execute('SELECT * FROM users');
    
    // Save backup of users
    fs.writeFileSync(
      path.join(backupDir, 'users.json'), 
      JSON.stringify(users, null, 2)
    );
    
    let userCount = 0;
    for (const user of users) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email: user.email });
      if (!existingUser) {
        // Create new user in MongoDB
        const newUser = new User({
          email: user.email,
          phone: user.phone,
          password: user.password, // Password is already hashed in MySQL
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          profileImage: user.profile_image,
          isVerified: user.is_verified === 1,
          isActive: user.is_active === 1,
          walletBalance: user.wallet_balance || 0,
          rating: user.rating || 0,
          location: {
            coordinates: [
              user.longitude || 0,
              user.latitude || 0
            ]
          },
          createdAt: user.created_at,
          updatedAt: user.updated_at
        });
        
        await newUser.save();
        userCount++;
      }
    }
    log(`Migrated ${userCount} users`, colors.green);
    
    // Migrate profiles
    log('\nMigrating Profiles...', colors.yellow);
    const [profiles] = await mysqlConnection.execute('SELECT * FROM profiles');
    
    // Save backup of profiles
    fs.writeFileSync(
      path.join(backupDir, 'profiles.json'), 
      JSON.stringify(profiles, null, 2)
    );
    
    let profileCount = 0;
    for (const profile of profiles) {
      // Find corresponding user in MongoDB
      const user = await User.findOne({ email: profile.user_email });
      if (user) {
        // Create profile in MongoDB
        const newProfile = new Profile({
          userId: user._id,
          userType: user.userType,
          gender: profile.gender,
          dateOfBirth: profile.date_of_birth,
          address: {
            street: profile.street,
            city: profile.city,
            state: profile.state,
            zipCode: profile.zip_code,
            country: profile.country
          },
          documents: {
            drivingLicense: {
              number: profile.driving_license,
              verified: profile.license_verified === 1,
              documentUrl: profile.license_document_url
            },
            aadharCard: {
              number: profile.aadhar_card,
              verified: profile.aadhar_verified === 1,
              documentUrl: profile.aadhar_document_url
            }
          },
          professionalDetails: {
            education: profile.education,
            languages: profile.languages ? profile.languages.split(',') : [],
            skills: profile.skills ? profile.skills.split(',') : [],
            experience: profile.experience
          },
          paymentInfo: {
            upiId: profile.upi_id
          },
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        });
        
        await newProfile.save();
        profileCount++;
      }
    }
    log(`Migrated ${profileCount} profiles`, colors.green);
    
    // Migrate vehicle types
    log('\nMigrating Vehicle Types...', colors.yellow);
    const [vehicleTypes] = await mysqlConnection.execute('SELECT * FROM vehicle_types');
    
    // Save backup of vehicle types
    fs.writeFileSync(
      path.join(backupDir, 'vehicle_types.json'), 
      JSON.stringify(vehicleTypes, null, 2)
    );
    
    let vehicleTypeCount = 0;
    for (const vType of vehicleTypes) {
      // Check if vehicle type already exists
      const existingType = await VehicleType.findOne({ name: vType.name });
      if (!existingType) {
        // Create new vehicle type
        const newVehicleType = new VehicleType({
          name: vType.name,
          description: vType.description,
          basePrice: vType.base_price,
          pricePerKm: vType.price_per_km,
          icon: vType.icon,
          createdAt: vType.created_at,
          updatedAt: vType.updated_at
        });
        
        await newVehicleType.save();
        vehicleTypeCount++;
      }
    }
    log(`Migrated ${vehicleTypeCount} vehicle types`, colors.green);
    
    // Migrate bookings
    log('\nMigrating Bookings...', colors.yellow);
    const [bookings] = await mysqlConnection.execute('SELECT * FROM bookings');
    
    // Save backup of bookings
    fs.writeFileSync(
      path.join(backupDir, 'bookings.json'), 
      JSON.stringify(bookings, null, 2)
    );
    
    let bookingCount = 0;
    for (const booking of bookings) {
      // Find corresponding users in MongoDB
      const customer = await User.findOne({ email: booking.customer_email });
      const provider = await User.findOne({ email: booking.provider_email });
      
      if (customer && provider) {
        // Create booking in MongoDB
        const newBooking = new Booking({
          bookingId: booking.booking_id,
          customerId: customer._id,
          providerId: provider._id,
          serviceType: booking.service_type,
          status: booking.status,
          pickupLocation: {
            coordinates: [
              booking.pickup_longitude || 0,
              booking.pickup_latitude || 0
            ],
            address: booking.pickup_address
          },
          dropLocation: {
            coordinates: [
              booking.drop_longitude || 0,
              booking.drop_latitude || 0
            ],
            address: booking.drop_address
          },
          distance: booking.distance,
          fare: booking.fare,
          startTime: booking.start_time,
          endTime: booking.end_time,
          paymentStatus: booking.payment_status,
          paymentId: booking.payment_id,
          rating: booking.rating,
          feedback: booking.feedback,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at
        });
        
        await newBooking.save();
        bookingCount++;
      }
    }
    log(`Migrated ${bookingCount} bookings`, colors.green);
    
    // Migrate payments
    log('\nMigrating Payments...', colors.yellow);
    const [payments] = await mysqlConnection.execute('SELECT * FROM payments');
    
    // Save backup of payments
    fs.writeFileSync(
      path.join(backupDir, 'payments.json'), 
      JSON.stringify(payments, null, 2)
    );
    
    let paymentCount = 0;
    for (const payment of payments) {
      // Find corresponding booking and users
      const booking = await Booking.findOne({ bookingId: payment.booking_id });
      
      if (booking) {
        // Create payment in MongoDB
        const newPayment = new Payment({
          paymentId: payment.payment_id,
          bookingId: booking._id,
          customerId: booking.customerId,
          providerId: booking.providerId,
          amount: payment.amount,
          commissionAmount: payment.commission_amount,
          commissionPercentage: payment.commission_percentage,
          providerAmount: payment.provider_amount,
          paymentMethod: payment.payment_method,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpaySignature: payment.razorpay_signature,
          status: payment.status,
          transactionDate: payment.transaction_date,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at
        });
        
        await newPayment.save();
        paymentCount++;
      }
    }
    log(`Migrated ${paymentCount} payments`, colors.green);
    
    log('\nMigration completed successfully!', colors.green);
    log('All data has been migrated from MySQL to MongoDB.', colors.green);
    log('Backups of all tables have been saved to the database/backup directory.', colors.green);
    
  } catch (error) {
    log(`Migration failed: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Close connections
    if (mysqlConnection) {
      await mysqlConnection.end();
      log('MySQL connection closed', colors.yellow);
    }
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      log('MongoDB connection closed', colors.yellow);
    }
  }
}

// Run the migration
migrateData().catch(error => {
  log(`Migration script error: ${error.message}`, colors.red);
  process.exit(1);
});
