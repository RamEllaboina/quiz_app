const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Result = require('../models/Result');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Get all quizzes (can filter by subject)
router.get('/', async (req, res) => {
    try {
        const query = { isActive: true };
        if (req.query.subjectId) {
            query.subject = req.query.subjectId;
        }

        const quizzes = await Quiz.find(query)
            .populate('subject', 'name')
            .select('-createdBy'); // Exclude admin info

        res.json({ success: true, count: quizzes.length, quizzes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Get single quiz with questions (for taking the quiz)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('subject', 'name');
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        // Fetch questions for this quiz
        const questions = await Question.find({ quiz: quiz._id, isActive: true })
            .select('-createdBy -createdAt -updatedAt'); // Don't send metadata

        // If user is not admin, considering scrubbing correct answers from response?
        // Usually frontend needs to know to show immediate feedback, OR backend grades it.
        // Requirement says "Automatic scoring". Backend grading is more secure.
        // So we should REMOVE `isCorrect` from options for normal users.

        const sanitizedQuestions = questions.map(q => {
            const qObj = q.toObject();
            qObj.options = qObj.options.map(opt => ({
                _id: opt._id,
                text: opt.text
                // isCorrect removed
            }));
            return qObj;
        });

        res.json({
            success: true,
            quiz,
            questions: sanitizedQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Submit Quiz Answers
router.post('/:id/submit', authMiddleware, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { answers } = req.body; // Array of { questionId, selectedOptionId }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        const questions = await Question.find({ quiz: quizId });

        let score = 0;
        let totalQuestions = questions.length;
        let gradedAnswers = [];

        // Optimize: Create a Map for O(1) answer lookup
        const answersMap = new Map();
        if (Array.isArray(answers)) {
            answers.forEach(a => answersMap.set(a.questionId, a.selectedOptionId));
        }

        // Calculate Score
        for (let q of questions) {
            const userSelectedOptionId = answersMap.get(q._id.toString());
            let isCorrect = false;
            let selectedText = "Skipped";

            // Flexible Grading Strategy (Scalable for future types)
            switch (q.type || 'single-choice') { // Default to single-choice if type missing
                case 'single-choice':
                    if (userSelectedOptionId) {
                        const correctOption = q.options.find(opt => opt.isCorrect);
                        const selectedOption = q.options.find(opt => opt._id.toString() === userSelectedOptionId);

                        if (selectedOption) {
                            selectedText = selectedOption.text;
                            // Secure check
                            if (correctOption && correctOption._id.toString() === selectedOption._id.toString()) {
                                isCorrect = true;
                                score++;
                            }
                        }
                    }
                    break;
                case 'multiple-choice':
                    // TODO: Implement logic for multiple correct answers
                    break;
                case 'text-input':
                    // TODO: Implement logic for string matching
                    break;
            }

            gradedAnswers.push({
                question: q._id,
                selectedOption: selectedText,
                isCorrect
            });
        }

        const percentage = (score / totalQuestions) * 100;
        const isPassed = percentage >= quiz.passingScore;

        // Save Result
        const result = new Result({
            user: req.user.userId,
            quiz: quizId,
            score,
            totalQuestions,
            percentage,
            isPassed,
            answers: gradedAnswers
        });

        await result.save();

        // Update User Stats
        // We need to import User model if we want to call the method on it, 
        // or just findByIdAndUpdate. Let's assume User is available or use logic here.
        // User.findById(req.user.userId).then(u => u.updateQuizStats(score, totalQuestions));

        res.json({
            success: true,
            message: 'Quiz submitted successfully',
            result: {
                score,
                totalQuestions,
                percentage,
                isPassed
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Admin: Create Quiz
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { title, subject, description, timeLimit, passingScore, difficulty } = req.body;

        const quiz = new Quiz({
            title,
            subject,
            description,
            timeLimit,
            passingScore,
            difficulty,
            createdBy: req.user.userId
        });

        await quiz.save();
        res.json({ success: true, message: 'Quiz created', quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Admin: Import Quiz from JSON
router.post('/import', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { title, subject, description, timeLimit, passingScore, difficulty, questions } = req.body;

        if (!title || !subject || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid JSON format. Title, Subject and Questions array are required.' });
        }

        const quiz = new Quiz({
            title,
            subject,
            description,
            timeLimit: timeLimit || 30,
            passingScore: passingScore || 60,
            difficulty: difficulty || 'medium',
            createdBy: req.user.userId
        });

        await quiz.save();

        const questionPromises = questions.map(q => {
            return new Question({
                quiz: quiz._id,
                questionText: q.questionText,
                options: q.options,
                difficulty: q.difficulty || 'medium',
                explanation: q.explanation,
                createdBy: req.user.userId
            }).save();
        });

        await Promise.all(questionPromises);

        res.json({ success: true, message: 'Quiz imported successfully', quizId: quiz._id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});


// Admin: Update Quiz
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { title, subject, description, timeLimit, passingScore, difficulty } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (subject) updateData.subject = subject;
        if (description !== undefined) updateData.description = description;
        if (timeLimit !== undefined && timeLimit !== null) updateData.timeLimit = timeLimit;
        if (passingScore !== undefined && passingScore !== null) updateData.passingScore = passingScore;
        if (difficulty) updateData.difficulty = difficulty;

        const quiz = await Quiz.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        res.json({ success: true, message: 'Quiz updated successfully', quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Admin: Delete Quiz
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        await Question.deleteMany({ quiz: req.params.id });
        await Result.deleteMany({ quiz: req.params.id });
        await Quiz.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Quiz deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Admin: Get Quiz (Full Details including correct answers)
router.get('/:id/admin', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        const questions = await Question.find({ quiz: req.params.id });
        res.json({ success: true, quiz, questions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Add Question to Quiz
router.post('/:id/questions', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { questionText, options, difficulty } = req.body;
        const quizId = req.params.id;

        const question = new Question({
            quiz: quizId,
            questionText,
            options,
            difficulty,
            createdBy: req.user.userId
        });

        await question.save();
        res.json({ success: true, message: 'Question added', question });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Delete Question from Quiz
router.delete('/:id/questions/:qId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.qId);
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;