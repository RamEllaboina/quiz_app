const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    timeLimit: { // in minutes
        type: Number,
        default: 30
    },
    passingScore: { // percentage
        type: Number,
        default: 60
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

quizSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index to find quizzes by subject
quizSchema.index({ subject: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
