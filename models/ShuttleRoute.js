const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ShuttleRoute model for storing shuttle route information
 * Updated with seat capacity and pricing details for 2025 market rates
 */
const User = require('./User');
const Vehicle = require('./Vehicle');

const ShuttleRoute = sequelize.define('ShuttleRoute', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startPoint: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false
  },
  departureTime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  arrivalTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  frequency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Daily'
  },
  driverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  vehicleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Vehicles',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  startLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  startLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  destinationLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  destinationLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  stops: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  vehicleType: {
    type: DataTypes.STRING
  },
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 150.00 // Base price in INR for 2025
  },
  pricePerKm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 18.50 // Price per km in INR for 2025
  },
  discountPercentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
});

// Define associations
ShuttleRoute.belongsTo(User, { as: 'driver', foreignKey: 'driverId' });
ShuttleRoute.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

module.exports = ShuttleRoute;
