const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ShuttleSeat model for tracking seat allocations in shuttle services
 * This allows for dynamic seat allocation and visualization
 */
const ShuttleSeat = sequelize.define('ShuttleSeat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Bookings',
      key: 'id'
    }
  },
  routeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ShuttleRoutes',
      key: 'id'
    }
  },
  seatNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pickupStopIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Index of the stop where passenger boards'
  },
  dropoffStopIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Index of the stop where passenger alights'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  tripTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('booked', 'checked-in', 'completed', 'cancelled'),
    defaultValue: 'booked'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Final price paid for this seat'
  }
}, {
  indexes: [
    {
      fields: ['bookingId']
    },
    {
      fields: ['routeId']
    },
    {
      fields: ['date', 'tripTime']
    }
  ]
});

module.exports = ShuttleSeat;
