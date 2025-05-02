const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bookings = sequelize.define('bookings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    serviceProviderId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    vehicleId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Vehicles',
            key: 'id'
        }
    },
    serviceType: {
        type: DataTypes.ENUM('driver', 'caretaker', 'shuttle'),
        allowNull: false
    },
    bookingType: {
        type: DataTypes.ENUM('onCall', 'monthly', 'permanent', 'shuttle'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'ongoing', 'completed', 'cancelled'),
        defaultValue: 'pending'
    },
    pickupLocation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pickupLatitude: {
        type: DataTypes.DECIMAL(10, 8)
    },
    pickupLongitude: {
        type: DataTypes.DECIMAL(11, 8)
    },
    destination: {
        type: DataTypes.STRING
    },
    destinationLatitude: {
        type: DataTypes.DECIMAL(10, 8)
    },
    destinationLongitude: {
        type: DataTypes.DECIMAL(11, 8)
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    startTime: {
        type: DataTypes.DATE
    },
    endTime: {
        type: DataTypes.DATE
    },
    duration: {
        type: DataTypes.INTEGER
    },
    distance: {
        type: DataTypes.DECIMAL(10, 2)
    },
    basePrice: {
        type: DataTypes.DECIMAL(10, 2)
    },
    totalPrice: {
        type: DataTypes.DECIMAL(10, 2)
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'completed'),
        defaultValue: 'pending'
    },
    rating: {
        type: DataTypes.INTEGER
    },
    review: {
        type: DataTypes.TEXT
    },
    cancellationReason: {
        type: DataTypes.TEXT
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'Bookings', // Explicitly set table name
    timestamps: true,
    indexes: [
        {
            fields: ['customerId']
        },
        {
            fields: ['serviceProviderId']
        },
        {
            fields: ['date']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = Bookings;
