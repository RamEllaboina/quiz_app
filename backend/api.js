const express = require('express');
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

// Connect to MongoDB with proper connection handling
const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000, // 10s timeout
      socketTimeoutMS: 45000, // 45s socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };

    await mongoose.connect('mongodb+srv://RamEllaboina:Sharanyaram1418@cluster0.piyusds.mongodb.net/?appName=Cluster0', options);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

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

// MongoDB Connection Check Middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database connection not ready' 
    });
  }
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  });
});

// Initialize sample data
app.post('/api/init-data', async (req, res) => {
  try {
    // Clear existing data
    await Branch.deleteMany({});
    await Subject.deleteMany({});
    
    // Create branches
    const branches = await Branch.insertMany([
      { name: 'Computer Science', description: 'Computer Science and Engineering' },
      { name: 'Electronics', description: 'Electronics and Communication Engineering' },
      { name: 'Mechanical', description: 'Mechanical Engineering' },
      { name: 'Civil', description: 'Civil Engineering' }
    ]);
    
    // Create subjects (2 per branch)
    const subjects = await Subject.insertMany([
      // Computer Science subjects
      { name: 'Data Structures', description: 'Study of data structures and algorithms', branches: [branches[0]._id] },
      { name: 'Database Systems', description: 'Database design and management', branches: [branches[0]._id] },
      
      // Electronics subjects
      { name: 'Digital Electronics', description: 'Digital circuits and systems', branches: [branches[1]._id] },
      { name: 'Microprocessors', description: 'Microprocessor architecture and programming', branches: [branches[1]._id] },
      
      // Mechanical subjects
      { name: 'Thermodynamics', description: 'Study of heat and energy transfer', branches: [branches[2]._id] },
      { name: 'Fluid Mechanics', description: 'Study of fluid behavior and forces', branches: [branches[2]._id] },
      
      // Civil subjects
      { name: 'Structural Analysis', description: 'Analysis of structures and loads', branches: [branches[3]._id] },
      { name: 'Surveying', description: 'Land surveying and measurement', branches: [branches[3]._id] }
    ]);
    
    res.json({
      success: true,
      message: 'Sample data initialized successfully',
      data: {
        branches: branches.length,
        subjects: subjects.length
      }
    });
  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing data'
    });
  }
});

// Auth Routes
app.post('/api/auth/register', checkDBConnection, async (req, res) => {
  try {
    const { username, email, password, branch } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      branch,
      role: 'user'
    });

    await user.save();

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

app.post('/api/auth/login', checkDBConnection, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

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

// Export for Vercel
module.exports = (req, res) => {
  app(req, res);
};
