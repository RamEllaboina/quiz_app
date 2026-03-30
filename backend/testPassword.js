const mongoose = require('mongoose');
const PendingUser = require('./models/PendingUser');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp')
    .then(async () => {
        console.log('Connected to DB');

        // 1. Create Pending User
        const password = 'TestPassword123';
        const pending = new PendingUser({
            username: 'test_integrity_user',
            email: 'test_integrity@example.com',
            password: password,
            fullName: 'Test Integrity'
        });

        await pending.save();

        // Fetch it back
        const savedPending = await PendingUser.findById(pending._id);
        console.log(`Step 1: Pending Password: '${savedPending.password}' (Expected: '${password}')`);

        if (savedPending.password !== password) {
            console.error('ERROR: Pending password changed!');
        } else {
            console.log('SUCCESS: Pending password matches.');
        }

        // 2. Simulate Approval (Moving to User)
        const newUser = new User({
            username: savedPending.username,
            email: savedPending.email,
            password: savedPending.password,
            fullName: savedPending.fullName,
            approvedAt: new Date()
        });

        await newUser.save();

        // Fetch User back
        const savedUser = await User.findById(newUser._id);
        console.log(`Step 2: User Password: '${savedUser.password}' (Expected: '${password}')`);

        if (savedUser.password !== password) {
            console.error('ERROR: User password changed!');
        } else {
            console.log('SUCCESS: User password matches.');
        }

        // Cleanup
        await PendingUser.deleteMany({ email: 'test_integrity@example.com' });
        await User.deleteMany({ email: 'test_integrity@example.com' });

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
