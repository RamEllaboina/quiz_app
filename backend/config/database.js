const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully');

        // Create default admin if not exists
        const Admin = require('../models/Admin');
        const bcrypt = require('bcryptjs'); // Import bcrypt
        const adminCount = await Admin.countDocuments();

        if (adminCount === 0) {
            // Hash password before saving
            const hashedPassword = await bcrypt.hash('ramu143', 10);
            
            const defaultAdmin = new Admin({
                username: 'RamEllaboina',
                password: hashedPassword, // Store hashed password
                email: 'admin@quizapp.com',
                role: 'superadmin'
            });

            await defaultAdmin.save();
            console.log('✅ Default admin created: RamEllaboina / ramu143');
        }

    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('📊 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose disconnected');
});

module.exports = connectDB;