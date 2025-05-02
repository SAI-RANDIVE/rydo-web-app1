const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VehicleType = sequelize.define('VehicleType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
        // Removed unique constraint to avoid 'Too many keys' error
    },
    description: {
        type: DataTypes.TEXT
    },
    basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    pricePerKm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = VehicleType;
