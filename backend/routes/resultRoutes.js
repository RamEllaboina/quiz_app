const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// User History
router.get('/my-history', authMiddleware, async (req, res) => {
    try {
        const results = await Result.find({ user: req.user.userId })
            .populate('quiz', 'title')
            .sort({ completedAt: -1 });

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Get specific result details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await Result.findOne({ _id: req.params.id, user: req.user.userId })
            .populate('quiz', 'title')
            .populate({
                path: 'answers.question',
                select: 'questionText options explanation difficulty'
            });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Clear specific history
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await Result.findOneAndDelete({ _id: req.params.id, user: req.user.userId });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Result not found or not authorized' });
        }

        res.json({ success: true, message: 'Result deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Clear User History
router.delete('/my-history', authMiddleware, async (req, res) => {
    try {
        await Result.deleteMany({ user: req.user.userId });
        res.json({ success: true, message: 'History cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Admin: All User Results
router.get('/all', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const results = await Result.find()
            .populate('user', 'username email')
            .populate('quiz', 'title')
            .sort({ completedAt: -1 });

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
