const User = require('./User');
const Vehicle = require('./Vehicle');
const VehicleType = require('./VehicleType');
const Booking = require('./Booking');
const Payment = require('./Payment');
const RideHistory = require('./RideHistory');
const Feedback = require('./Feedback');
const ShuttleRoute = require('./ShuttleRoute');
const ShuttleSeat = require('./ShuttleSeat');

// Vehicle Associations
Vehicle.belongsTo(VehicleType);
Vehicle.belongsTo(User, { as: 'driver', foreignKey: 'driverId' });
Vehicle.hasMany(Booking, { foreignKey: 'vehicleId' });

// User Associations
User.hasMany(Vehicle, { foreignKey: 'driverId' });
User.hasMany(Booking, { foreignKey: 'customerId', as: 'customerBookings' });
User.hasMany(Booking, { foreignKey: 'serviceProviderId', as: 'providerBookings' });
User.hasMany(Payment, { foreignKey: 'customerId', as: 'customerPayments' });
User.hasMany(Payment, { foreignKey: 'serviceProviderId', as: 'providerPayments' });
User.hasMany(RideHistory, { foreignKey: 'customerId', as: 'customerRides' });
User.hasMany(RideHistory, { foreignKey: 'serviceProviderId', as: 'providerRides' });

// Booking Associations
Booking.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
Booking.belongsTo(User, { as: 'serviceProvider', foreignKey: 'serviceProviderId' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Booking.hasOne(Payment, { foreignKey: 'bookingId' });
Booking.hasOne(RideHistory, { foreignKey: 'bookingId' });

// Payment Associations
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });
Payment.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
Payment.belongsTo(User, { as: 'serviceProvider', foreignKey: 'serviceProviderId' });

// RideHistory Associations
RideHistory.belongsTo(Booking, { foreignKey: 'bookingId' });
RideHistory.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
RideHistory.belongsTo(User, { as: 'serviceProvider', foreignKey: 'serviceProviderId' });
RideHistory.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

// Feedback Associations
Feedback.belongsTo(Booking, { foreignKey: 'bookingId' });
Feedback.belongsTo(User, { as: 'customer', foreignKey: 'customerId' });
Feedback.belongsTo(User, { as: 'serviceProvider', foreignKey: 'serviceProviderId' });
Booking.hasOne(Feedback, { foreignKey: 'bookingId' });
User.hasMany(Feedback, { foreignKey: 'serviceProviderId', as: 'receivedFeedback' });
User.hasMany(Feedback, { foreignKey: 'customerId', as: 'givenFeedback' });

// ShuttleSeat Associations
ShuttleSeat.belongsTo(Booking, { foreignKey: 'bookingId' });
ShuttleSeat.belongsTo(ShuttleRoute, { foreignKey: 'routeId' });
Booking.hasMany(ShuttleSeat, { foreignKey: 'bookingId' });
ShuttleRoute.hasMany(ShuttleSeat, { foreignKey: 'routeId' });

module.exports = {
    User,
    Vehicle,
    VehicleType,
    Booking,
    Payment,
    RideHistory,
    Feedback,
    ShuttleRoute,
    ShuttleSeat
};
