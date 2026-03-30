const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const User = require('../models/User'); // Import User to check branch
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Get subjects (Filtered by User Branch)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = { isActive: true };

        // If user is basic user (not admin), filter by their branch
        if (req.user.role === 'user') {
            const user = await User.findById(req.user.userId);
            if (user && user.branch) {
                // Match if subject.branches contains the user's branch
                query.branches = { $in: [user.branch] };
            } else {
                query.branches = []; // No match
            }
        }
        // Admins see all by default, or can filter via query param if implemented
        // But for admin panel list, usually we want all.
        // However, the USER facing "Choose Subject" page calls this.
        // If an Admin logs in as User to play, they might see all.

        // If specific branch requested in query (e.g. by admin panel filter)
        if (req.query.branch) {
            query.branches = { $in: [req.query.branch] };
        }

        const subjects = await Subject.find(query)
            .select('name description _id branches')
            .populate('branches', 'name');

        res.json({ success: true, subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Create Subject (Admin/SubAdmin) - SUPPORTS MULTIPLE BRANCHES
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { name, description, branches } = req.body;

        if (!branches || !Array.isArray(branches) || branches.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one branch is required' });
        }

        // Check if subject exists (Global Unique Name)
        let subject = await Subject.findOne({ name });

        if (subject) {
            // MERGE MODE: Add new branches to existing subject
            // Convert ObjectIds to strings for comparison
            const existingBranches = subject.branches.map(b => b.toString());
            const newBranches = branches.filter(b => !existingBranches.includes(b));

            if (newBranches.length > 0) {
                subject.branches.push(...newBranches);
                await subject.save();
                return res.json({ success: true, message: 'Subject exists. Added to new link branches.', subject });
            } else {
                return res.json({ success: true, message: 'Subject already exists and is linked to these branches.', subject });
            }
        }

        // CREATE MODE
        const newSubject = new Subject({
            name,
            description,
            branches,
            createdBy: req.user.userId
        });

        await newSubject.save();
        res.json({ success: true, message: 'Subject created', subject: newSubject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Update Subject
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { name, description, isActive, branches } = req.body;
        let subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        if (name) subject.name = name;
        if (description) subject.description = description;
        if (typeof isActive !== 'undefined') subject.isActive = isActive;
        if (branches && Array.isArray(branches)) subject.branches = branches;

        await subject.save();
        res.json({ success: true, message: 'Subject updated', subject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Delete Subject
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        await subject.deleteOne();
        res.json({ success: true, message: 'Subject deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
