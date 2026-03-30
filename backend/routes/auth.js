const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, fullName, branch } = req.body;

        // Validation
        if (!username || !email || !password || !fullName || !branch) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required, including branch'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Username must be at least 3 characters'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 4 characters'
            });
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one letter and one number'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Check if pending registration exists
        const existingPending = await PendingUser.findOne({
            $or: [{ email }, { username }]
        });

        if (existingPending) {
            if (existingPending.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Registration request already submitted and pending approval'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Registration request already exists'
            });
        }

        // Create pending user
        const pendingUser = new PendingUser({
            username,
            email,
            password,
            fullName,
            branch,
            status: 'pending'
        });

        await pendingUser.save();

        res.status(201).json({
            success: true,
            message: 'Registration submitted for admin approval. You will be notified via email once approved.',
            data: {
                id: pendingUser._id,
                username,
                email,
                fullName,
                submittedAt: pendingUser.submittedAt
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { email: username },
                { username: username }
            ],
            status: 'active'
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or account not active'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await user.updateLastLogin();

        // Create token
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                role: 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                totalQuizzes: user.totalQuizzes,
                highScore: user.highScore
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Check registration status
router.get('/check-status/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            return res.json({
                success: true,
                status: 'not_found'
            });
        }

        res.json({
            success: true,
            status: pendingUser.status,
            rejectionReason: pendingUser.rejectionReason,
            submittedAt: pendingUser.submittedAt,
            reviewedAt: pendingUser.reviewedAt
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check status'
        });
    }
});

// Verify token
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Get user info
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Forgot password (placeholder)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // In a real application, you would:
        // 1. Generate a password reset token
        // 2. Send email with reset link
        // 3. Store token in database with expiry

        res.json({
            success: true,
            message: 'Password reset instructions sent to your email'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process request'
        });
    }
});

module.exports = router;