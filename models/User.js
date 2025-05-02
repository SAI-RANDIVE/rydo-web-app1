const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            // Use a more lenient email validation or remove it for testing
            isEmail: {
                msg: "Please provide a valid email address"
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true
        // Removed unique constraint to avoid 'Too many keys' error
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^[0-9]{10}$/
        }
    },
    role: {
        type: DataTypes.ENUM('customer', 'driver', 'caretaker', 'admin'),
        allowNull: false,
        defaultValue: 'customer'
    },
    address: {
        type: DataTypes.STRING
    },
    profilePicture: {
        type: DataTypes.STRING
    },
    serviceType: {
        type: DataTypes.ENUM('driver', 'caretaker', 'shuttle'),
        allowNull: true
    },
    licenseNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    availability: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    totalRides: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
