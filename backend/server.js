require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose'); // Added missing import
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/adminRoutes');
const quizRoutes = require('./routes/quizRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const resultRoutes = require('./routes/resultRoutes');
const questionRoutes = require('./routes/questionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins (Change to specific domains in production if needed)
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (served from frontend directory)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/branches', require('./routes/branchRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Quiz App API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// Serve frontend for any unknown route (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// --- CRON JOBS ---
const User = require('./models/User');

const checkExpiredUsers = async () => {
    try {
        const now = new Date();
        const result = await User.deleteMany({
            expiresAt: { $exists: true, $ne: null, $lt: now }
        });
        if (result.deletedCount > 0) {
            console.log(`[Auto-Clean] Deleted ${result.deletedCount} expired users at ${now.toISOString()}`);
        }
    } catch (error) {
        console.error('[Auto-Clean] Error deleting expired users:', error);
    }
};

// Check every hour
setInterval(checkExpiredUsers, 3600000);
// Run once on startup
setTimeout(checkExpiredUsers, 5000);

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 Quiz App Server Started');
    console.log('══════════════════════════════════════');
    console.log(`📡 Server URL: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('══════════════════════════════════════');
    console.log(`📁 Frontend: http://localhost:${PORT}`);
    console.log(`📁 Backend API: http://localhost:${PORT}/api`);
    console.log('══════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        mongoose.connection.close(false, () => {
            console.log('✅ MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 Unhandled Promise Rejection:', err);
});