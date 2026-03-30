require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const connectDB = require('../config/database');

async function createAdmin() {
    try {
        console.log('🔧 Creating default admin user...');

        // Connect to DB
        await connectDB();

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'RamEllaboina' });

        if (existingAdmin) {
            console.log('⚠️ Admin already exists. Updating credentials...');
            existingAdmin.password = 'ramu143';
            await existingAdmin.save();
            console.log('✅ Admin credentials updated!');
            console.log('👤 Username: RamEllaboina');
            console.log('🔑 Password: ramu143');
            process.exit(0);
        }

        // Create admin
        // Password will be hashed by the Admin model pre-save hook
        const admin = new Admin({
            username: 'RamEllaboina',
            password: 'ramu143',
            email: 'admin@quizapp.com',
            role: 'superadmin'
        });

        await admin.save();

        console.log('🎉 Admin created successfully!');
        console.log('══════════════════════════════════════');
        console.log('👤 Username: RamEllaboina');
        console.log('🔑 Password: ramu143');
        console.log('📧 Email: admin@quizapp.com');
        console.log('👑 Role: Super Admin');
        console.log('══════════════════════════════════════');
        console.log('💡 Note: Keep these credentials secure!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();