const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RideHistory = sequelize.define('RideHistory', {
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
        allowNull: false,
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
    startLocation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    startLatitude: {
        type: DataTypes.DECIMAL(10, 8)
    },
    startLongitude: {
        type: DataTypes.DECIMAL(11, 8)
    },
    endLocation: {
        type: DataTypes.STRING
    },
    endLatitude: {
        type: DataTypes.DECIMAL(10, 8)
    },
    endLongitude: {
        type: DataTypes.DECIMAL(11, 8)
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
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
    fare: {
        type: DataTypes.DECIMAL(10, 2)
    },
    status: {
        type: DataTypes.ENUM('completed', 'cancelled'),
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER
    },
    review: {
        type: DataTypes.TEXT
    },
    cancellationReason: {
        type: DataTypes.TEXT
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['bookingId']
        },
        {
            fields: ['customerId']
        },
        {
            fields: ['serviceProviderId']
        },
        {
            fields: ['startTime']
        }
    ]
});

module.exports = RideHistory;
