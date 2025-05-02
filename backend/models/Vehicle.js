const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registrationNumber: {
        type: DataTypes.STRING,
        allowNull: false
        // Removed unique constraint to avoid 'Too many keys' error
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false
    },
    insuranceNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    insuranceExpiry: {
        type: DataTypes.DATE,
        allowNull: false
    },
    lastService: {
        type: DataTypes.DATE
    },
    nextService: {
        type: DataTypes.DATE
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = Vehicle;
