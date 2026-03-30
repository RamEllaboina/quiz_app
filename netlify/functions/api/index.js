const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes (we'll need to create a simplified version for Netlify)
const authRoutes = require('../routes/auth');
const subjectRoutes = require('../routes/subjectRoutes');
const quizRoutes = require('../routes/quizRoutes');
const questionRoutes = require('../routes/questionRoutes');
const resultRoutes = require('../routes/resultRoutes');
const branchRoutes = require('../routes/branchRoutes');
const adminAuthRoutes = require('../routes/adminAuth');
const adminRoutes = require('../routes/adminRoutes');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports.handler = serverless(app);
