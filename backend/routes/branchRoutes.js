const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Get all branches (Public for Registration)
router.get('/public', async (req, res) => {
    try {
        const branches = await Branch.find({ isActive: true }).select('name _id');
        res.json({ success: true, branches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch branches' });
    }
});

// Admin Routes below
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all branches (Admin)
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.json({ success: true, branches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch branches' });
    }
});

// Create Branch
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

        const existing = await Branch.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) return res.status(400).json({ success: false, message: 'Branch already exists' });

        const branch = new Branch({
            name,
            description,
            createdBy: req.user.userId
        });
        await branch.save();
        res.json({ success: true, message: 'Branch created', branch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete Branch
router.delete('/:id', async (req, res) => {
    try {
        await Branch.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Branch deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
