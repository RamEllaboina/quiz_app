const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 4
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['user', 'premium'],
        default: 'user'
    },
    profilePicture: {
        type: String,
        default: ''
    },
    totalQuizzes: {
        type: Number,
        default: 0
    },
    totalScore: {
        type: Number,
        default: 0
    },
    highScore: {
        type: Number,
        default: 0
    },
    approvedAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    expiresAt: {
        type: Date
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

// Hash password check removed as per user request (PLAIN TEXT STORAGE)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        this.updatedAt = Date.now();
        return next();
    }
    this.updatedAt = Date.now();
    next();
});

// Compare password method (PLAIN TEXT)
userSchema.methods.comparePassword = async function (candidatePassword) {
    return candidatePassword === this.password;
};

// Update last login
userSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};

// Update stats after quiz
userSchema.methods.updateQuizStats = async function (score, totalQuestions) {
    this.totalQuizzes += 1;
    this.totalScore += score;
    this.highScore = Math.max(this.highScore, score);
    this.updatedAt = Date.now();
    await this.save();
};

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);