const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const BranchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  createdAt: { type: Date, default: Date.now }
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeLimit: { type: Number, required: true },
  passingScore: { type: Number, required: true },
  questions: [{
    questionText: { type: String, required: true },
    options: [{
      text: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }],
    correctAnswer: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Branch = mongoose.model('Branch', BranchSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, branch } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      branch,
      role: 'user'
    });

    await user.save();

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Branch Routes
app.get('/api/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    res.json({ success: true, branches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Subject Routes
app.get('/api/subjects', async (req, res) => {
  try {
    const { branch } = req.query;
    let query = {};
    
    if (branch) {
      query.branches = branch;
    }

    const subjects = await Subject.find(query)
      .populate('branches', 'name')
      .sort({ name: 1 });
    
    res.json({ success: true, subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const { name, description, branches } = req.body;
    
    const subject = new Subject({
      name,
      description,
      branches
    });

    await subject.save();
    res.status(201).json({ success: true, subject });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Quiz Routes
app.get('/api/quizzes', async (req, res) => {
  try {
    const { subject } = req.query;
    let query = {};
    
    if (subject) {
      query.subject = subject;
    }

    const quizzes = await Quiz.find(query)
      .populate('subject', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, quizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/quizzes', authenticateToken, async (req, res) => {
  try {
    const { title, subject, difficulty, timeLimit, passingScore } = req.body;
    
    const quiz = new Quiz({
      title,
      subject,
      difficulty,
      timeLimit,
      passingScore,
      questions: []
    });

    await quiz.save();
    res.status(201).json({ success: true, quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports.handler = serverless(app);
