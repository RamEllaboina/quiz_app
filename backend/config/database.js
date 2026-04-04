const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://RamEllaboina:Sharanyaram1418@cluster0.piyusds.mongodb.net/?appName=Cluster0';

const connectDB = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s
            maxPoolSize: 10, // Maintain up to 10 socket connections
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
        };

        await mongoose.connect(MONGODB_URI, options);
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
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
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