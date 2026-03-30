const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const PendingUser = require('../models/PendingUser');
const User = require('../models/User');
const Question = require('../models/Question');
const Admin = require('../models/Admin');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Middleware check for superadmin
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Access denied: Super Admin only' });
    }
    next();
};

// Create Sub-Admin
router.post('/create-subadmin', requireSuperAdmin, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        let admin = await Admin.findOne({ $or: [{ email }, { username }] });
        if (admin) return res.status(400).json({ success: false, message: 'Admin with this email/username already exists' });

        admin = new Admin({
            username,
            email,
            password,
            role: 'admin' // Force role to be sub-admin
        });

        await admin.save();
        res.json({ success: true, message: 'Sub-Admin created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Get All Admins
router.get('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select('-password');
        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const Subject = require('../models/Subject');
        const Quiz = require('../models/Quiz');

        const [
            totalQuestions,
            totalSubjects,
            totalQuizzes,
            easyQuestions,
            mediumQuestions,
            hardQuestions,
            totalUsers,
            pendingUsers,
            activeAdmins
        ] = await Promise.all([
            Question.countDocuments({ isActive: true }),
            Subject.countDocuments({ isActive: true }),
            Quiz.countDocuments({ isActive: true }),
            Question.countDocuments({ difficulty: 'easy', isActive: true }),
            Question.countDocuments({ difficulty: 'medium', isActive: true }),
            Question.countDocuments({ difficulty: 'hard', isActive: true }),
            User.countDocuments({ status: 'active' }),
            PendingUser.countDocuments({ status: 'pending' }),
            Admin.countDocuments({})
        ]);

        res.json({
            success: true,
            stats: {
                totalQuestions,
                totalSubjects,
                totalQuizzes,
                easyQuestions,
                mediumQuestions,
                hardQuestions,
                totalUsers,
                pendingUsers,
                activeAdmins
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics'
        });
    }
});

// Get all pending users
router.get('/pending-users', async (req, res) => {
    try {
        const pendingUsers = await PendingUser.find({ status: 'pending' })
            .sort({ submittedAt: -1 });

        res.json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending users'
        });
    }
});

// Approve user
router.post('/approve-user/:id', async (req, res) => {
    try {
        const pendingUser = await PendingUser.findById(req.params.id);

        if (!pendingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (pendingUser.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'User already processed'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: pendingUser.email },
                { username: pendingUser.username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists in system'
            });
        }

        // Create new user
        const { expiresAt } = req.body;

        const newUser = new User({
            username: pendingUser.username,
            email: pendingUser.email,
            password: pendingUser.password,
            fullName: pendingUser.fullName,
            branch: pendingUser.branch,
            approvedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null
        });

        await newUser.save();

        // Update pending user
        pendingUser.status = 'approved';
        pendingUser.reviewedAt = new Date();
        pendingUser.reviewedBy = req.user.userId;
        await pendingUser.save();

        res.json({
            success: true,
            message: 'User approved successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to approve user'
        });
    }
});

// Reject user
router.post('/reject-user/:id', async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        const pendingUser = await PendingUser.findById(req.params.id);

        if (!pendingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (pendingUser.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'User already processed'
            });
        }

        // Update pending user
        pendingUser.status = 'rejected';
        pendingUser.rejectionReason = rejectionReason || 'No reason provided';
        pendingUser.reviewedAt = new Date();
        pendingUser.reviewedBy = req.user.userId;
        await pendingUser.save();

        res.json({
            success: true,
            message: 'User rejected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject user'
        });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { status, search } = req.query;

        let users = [];
        let pendingUsers = [];

        // Helper to build search query
        const buildSearchQuery = (baseQuery = {}) => {
            if (!search) return baseQuery;
            return {
                ...baseQuery,
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { fullName: { $regex: search, $options: 'i' } }
                ]
            };
        };

        // 1. Fetch from PendingUser if needed
        if (status === 'pending' || status === 'all' || !status) {
            const pendingQuery = buildSearchQuery({ status: 'pending' });
            pendingUsers = await PendingUser.find(pendingQuery)
                .sort({ submittedAt: -1 });
        }

        // 2. Fetch from User if needed
        if (status !== 'pending') {
            let userQuery = {};
            if (status && status !== 'all') {
                userQuery.status = status;
            }
            userQuery = buildSearchQuery(userQuery);

            users = await User.find(userQuery)
                .sort({ createdAt: -1 });
        }

        // 3. Merge results
        // If 'all', we combine them. Usually seeing pending first is useful.
        const allUsers = [...pendingUsers, ...users];

        // If we want a unified sort by date, we can do it here, but strict 'pending first' is often better for admins.
        // Let's keep pending users at the top for visibility.

        res.json({
            success: true,
            count: allUsers.length,
            users: allUsers
        });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Update user expiration
router.put('/users/:id/expiry', async (req, res) => {
    try {
        const { expiresAt } = req.body;

        let updateData = {};
        if (expiresAt === null || expiresAt === '') {
            updateData.expiresAt = null; // Remove expiration
        } else {
            updateData.expiresAt = new Date(expiresAt);
        }
        updateData.updatedAt = Date.now();

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User expiration updated', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user expiration' });
    }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: `User status updated to ${status}`,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// Get question statistics
router.get('/questions/stats', async (req, res) => {
    try {
        const stats = await Question.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        category: "$category",
                        difficulty: "$difficulty"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.category",
                    difficulties: {
                        $push: {
                            difficulty: "$_id.difficulty",
                            count: "$count"
                        }
                    },
                    total: { $sum: "$count" }
                }
            }
        ]);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get question statistics'
        });
    }
});

module.exports = router;