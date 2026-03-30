const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'admin'
    },
    lastLogin: {
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

// Hash password check removed (PLAIN TEXT)
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        this.updatedAt = Date.now();
        return next();
    }
    this.updatedAt = Date.now();
    next();
});

// Compare password method (PLAIN TEXT)
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return candidatePassword === this.password;
};

// Update last login
adminSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};

module.exports = mongoose.model('Admin', adminSchema);