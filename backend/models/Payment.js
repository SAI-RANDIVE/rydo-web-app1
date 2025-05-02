const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'INR'
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    paymentMethod: {
        type: DataTypes.ENUM('card', 'upi', 'netbanking', 'wallet', 'cash'),
        allowNull: false
    },
    transactionId: {
        type: DataTypes.STRING
    },
    orderId: {
        type: DataTypes.STRING
    },
    paymentSignature: {
        type: DataTypes.STRING
    },
    paymentGatewayResponse: {
        type: DataTypes.JSON
    },
    receiptNumber: {
        type: DataTypes.STRING
        // Removed unique constraint to avoid 'Too many keys' error
    },
    cgst: {
        type: DataTypes.DECIMAL(10, 2)
    },
    sgst: {
        type: DataTypes.DECIMAL(10, 2)
    },
    totalTax: {
        type: DataTypes.DECIMAL(10, 2)
    },
    refundAmount: {
        type: DataTypes.DECIMAL(10, 2)
    },
    refundReason: {
        type: DataTypes.TEXT
    },
    refundDate: {
        type: DataTypes.DATE
    },
    notes: {
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
        }
        // Removed unnecessary indexes to avoid 'Too many keys' error
    ],
    hooks: {
        beforeCreate: async (payment) => {
            if (!payment.receiptNumber) {
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const count = await Payment.count();
                payment.receiptNumber = `RYDO-${year}${month}-${String(count + 1).padStart(6, '0')}`;
            }
        }
    }
});

module.exports = Payment;
