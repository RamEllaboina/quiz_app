require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Branch = require('../models/Branch');

async function seedUsers() {
    try {
        console.log('👥 Starting user seeding...');

        // Connect to DB
        await connectDB();

        // Get branches
        const branches = await Branch.find();
        if (branches.length === 0) {
            console.log('❌ No branches found. Please run seedData.js first.');
            process.exit(1);
        }

        // Clear existing users
        await User.deleteMany({});
        console.log('🧹 Cleared existing users');

        // Create sample users
        const users = [
            {
                username: 'johnstudent',
                email: 'john@example.com',
                password: 'user123',
                fullName: 'John Student',
                branch: branches[0]._id, // Computer Science
                status: 'active',
                role: 'user'
            },
            {
                username: 'janeuser',
                email: 'jane@example.com',
                password: 'user123',
                fullName: 'Jane User',
                branch: branches[1]._id, // Information Technology
                status: 'active',
                role: 'user'
            },
            {
                username: 'mikelearner',
                email: 'mike@example.com',
                password: 'user123',
                fullName: 'Mike Learner',
                branch: branches[0]._id, // Computer Science
                status: 'active',
                role: 'premium'
            },
            {
                username: 'sarahdev',
                email: 'sarah@example.com',
                password: 'user123',
                fullName: 'Sarah Developer',
                branch: branches[2]._id, // Electronics
                status: 'active',
                role: 'user'
            },
            {
                username: 'alexeng',
                email: 'alex@example.com',
                password: 'user123',
                fullName: 'Alex Engineer',
                branch: branches[3]._id, // Mechanical
                status: 'active',
                role: 'user'
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log(`👤 Created ${createdUsers.length} users`);

        console.log('\n🎉 User seeding completed successfully!');
        console.log('══════════════════════════════════════');
        console.log('📋 Sample User Accounts:');
        createdUsers.forEach((user, index) => {
            const branchName = branches.find(b => b._id.toString() === user.branch.toString())?.name || 'Unknown';
            console.log(`${index + 1}. Username: ${user.username} | Password: user123 | Branch: ${branchName}`);
        });
        console.log('══════════════════════════════════════');
        console.log('💡 All users can login with password: user123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
