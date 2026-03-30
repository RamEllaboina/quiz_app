const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const Question = require('../models/Question');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all questions with filters
router.get('/', async (req, res) => {
    try {
        const { category, difficulty, search, page = 1, limit = 20 } = req.query;
        
        let query = {};
        
        if (category && category !== 'all') {
            query.category = category.toLowerCase();
        }
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (search) {
            query.questionText = { $regex: search, $options: 'i' };
        }
        
        const skip = (page - 1) * limit;
        
        const [questions, total] = await Promise.all([
            Question.find(query)
                .populate('createdBy', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Question.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            questions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch questions'
        });
    }
});

// Get single question
router.get('/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('createdBy', 'username');
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        res.json({
            success: true,
            question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch question'
        });
    }
});

// Create new question
router.post('/', async (req, res) => {
    try {
        const { category, difficulty, questionText, options } = req.body;
        
        // Validation
        if (!category || !difficulty || !questionText || !options) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid difficulty level'
            });
        }
        
        if (!Array.isArray(options) || options.length !== 4) {
            return res.status(400).json({
                success: false,
                message: 'Exactly 4 options are required'
            });
        }
        
        const validOptions = options.every(opt => 
            opt.text && typeof opt.text === 'string' && opt.text.trim() !== ''
        );
        
        if (!validOptions) {
            return res.status(400).json({
                success: false,
                message: 'All options must have non-empty text'
            });
        }
        
        const correctOptions = options.filter(opt => opt.isCorrect);
        if (correctOptions.length !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Exactly one correct option is required'
            });
        }
        
        // Create question
        const question = new Question({
            category: category.toLowerCase(),
            difficulty,
            questionText,
            options,
            createdBy: req.user.userId
        });
        
        await question.save();
        
        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            question
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create question',
            error: error.message
        });
    }
});

// Update question
router.put('/:id', async (req, res) => {
    try {
        const { category, difficulty, questionText, options, isActive } = req.body;
        
        const updateData = {};
        
        if (category) updateData.category = category.toLowerCase();
        if (difficulty) updateData.difficulty = difficulty;
        if (questionText) updateData.questionText = questionText;
        if (options) updateData.options = options;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        
        updateData.updatedAt = Date.now();
        
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Question updated successfully',
            question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update question'
        });
    }
});

// Delete question
router.delete('/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete question'
        });
    }
});

// Toggle question active status
router.patch('/:id/toggle', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        
        question.isActive = !question.isActive;
        question.updatedAt = Date.now();
        await question.save();
        
        res.json({
            success: true,
            message: `Question ${question.isActive ? 'activated' : 'deactivated'}`,
            question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to toggle question status'
        });
    }
});

// Bulk import questions
router.post('/bulk-import', async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Questions array is required'
            });
        }
        
        // Validate all questions
        const validatedQuestions = questions.map((q, index) => {
            if (!q.category || !q.difficulty || !q.questionText || !q.options) {
                throw new Error(`Question ${index + 1}: All fields are required`);
            }
            
            if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
                throw new Error(`Question ${index + 1}: Invalid difficulty level`);
            }
            
            if (!Array.isArray(q.options) || q.options.length !== 4) {
                throw new Error(`Question ${index + 1}: Exactly 4 options are required`);
            }
            
            const validOptions = q.options.every(opt => 
                opt.text && typeof opt.text === 'string' && opt.text.trim() !== ''
            );
            
            if (!validOptions) {
                throw new Error(`Question ${index + 1}: All options must have non-empty text`);
            }
            
            const correctOptions = q.options.filter(opt => opt.isCorrect);
            if (correctOptions.length !== 1) {
                throw new Error(`Question ${index + 1}: Exactly one correct option is required`);
            }
            
            return {
                category: q.category.toLowerCase(),
                difficulty: q.difficulty,
                questionText: q.questionText,
                options: q.options,
                createdBy: req.user.userId
            };
        });
        
        // Insert all questions
        const insertedQuestions = await Question.insertMany(validatedQuestions);
        
        res.json({
            success: true,
            message: `${insertedQuestions.length} questions imported successfully`,
            count: insertedQuestions.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;