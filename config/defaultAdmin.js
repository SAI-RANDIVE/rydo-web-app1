const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            const admin = new User({
                name: 'Admin',
                email: 'admin@rydo.com',
                password: hashedPassword,
                role: 'admin'
            });

            await admin.save();
            console.log('Default admin user created');
            console.log('Email: admin@rydo.com');
            console.log('Password: admin123');
        }
    } catch (err) {
        console.error('Error creating default admin:', err);
    }
};

module.exports = createDefaultAdmin;
