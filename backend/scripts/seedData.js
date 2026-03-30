require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Admin = require('../models/Admin');

async function seedData() {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to DB
        await connectDB();

        // Clear existing data
        await Branch.deleteMany({});
        await Subject.deleteMany({});
        await Quiz.deleteMany({});
        await Question.deleteMany({});
        console.log('🧹 Cleared existing data');

        // Get or create admin for createdBy field
        let admin = await Admin.findOne({ username: 'RamEllaboina' });
        if (!admin) {
            admin = await Admin.findOne({ username: 'testadmin' });
        }
        if (!admin) {
            // Create a default admin if none exists
            admin = new Admin({
                username: 'system',
                email: 'system@quizapp.com',
                password: 'temp123',
                role: 'superadmin'
            });
            await admin.save();
            console.log('👤 Created system admin for seeding');
        }

        // Create Branches
        const branches = [
            { name: 'Computer Science', description: 'Computer Science and Engineering', createdBy: admin._id },
            { name: 'Information Technology', description: 'Information Technology Department', createdBy: admin._id },
            { name: 'Electronics', description: 'Electronics and Communication', createdBy: admin._id },
            { name: 'Mechanical', description: 'Mechanical Engineering', createdBy: admin._id }
        ];

        const createdBranches = await Branch.insertMany(branches);
        console.log(`📚 Created ${createdBranches.length} branches`);

        // Create Subjects
        const subjects = [
            {
                name: 'Java Programming',
                description: 'Core Java concepts and programming',
                branches: [createdBranches[0]._id, createdBranches[1]._id], // CS, IT
                createdBy: admin._id
            },
            {
                name: 'Data Structures',
                description: 'Data structures and algorithms',
                branches: [createdBranches[0]._id, createdBranches[1]._id], // CS, IT
                createdBy: admin._id
            },
            {
                name: 'Web Development',
                description: 'HTML, CSS, JavaScript and modern frameworks',
                branches: [createdBranches[0]._id, createdBranches[1]._id], // CS, IT
                createdBy: admin._id
            },
            {
                name: 'Database Management',
                description: 'Database concepts and SQL',
                branches: [createdBranches[0]._id, createdBranches[1]._id], // CS, IT
                createdBy: admin._id
            },
            {
                name: 'Digital Electronics',
                description: 'Digital logic and circuits',
                branches: [createdBranches[2]._id], // Electronics
                createdBy: admin._id
            }
        ];

        const createdSubjects = await Subject.insertMany(subjects);
        console.log(`📖 Created ${createdSubjects.length} subjects`);

        // Create Quizzes first (since Questions require quiz reference)
        const quizzes = [
            {
                title: 'Java Basics Quiz',
                subject: createdSubjects[0]._id,
                difficulty: 'easy',
                timeLimit: 10, // 10 minutes
                passingScore: 70,
                branches: [createdBranches[0]._id, createdBranches[1]._id],
                createdBy: admin._id
            },
            {
                title: 'Data Structures Fundamentals',
                subject: createdSubjects[1]._id,
                difficulty: 'medium',
                timeLimit: 15,
                passingScore: 60,
                branches: [createdBranches[0]._id, createdBranches[1]._id],
                createdBy: admin._id
            },
            {
                title: 'Web Development Essentials',
                subject: createdSubjects[2]._id,
                difficulty: 'easy',
                timeLimit: 12,
                passingScore: 75,
                branches: [createdBranches[0]._id, createdBranches[1]._id],
                createdBy: admin._id
            }
        ];

        const createdQuizzes = await Quiz.insertMany(quizzes);
        console.log(`📝 Created ${createdQuizzes.length} quizzes`);

        // Create Sample Questions
        const questions = [
            // Java Questions
            {
                quiz: createdQuizzes[0]._id,
                questionText: 'What is Java primarily used for?',
                options: [
                    { text: 'Web Browsing', isCorrect: false },
                    { text: 'Mobile App Development', isCorrect: false },
                    { text: 'Game Development', isCorrect: false },
                    { text: 'All of the above', isCorrect: true }
                ],
                explanation: 'Java is a versatile language used for web applications, mobile apps (Android), games, and enterprise systems.',
                difficulty: 'easy',
                createdBy: admin._id
            },
            {
                quiz: createdQuizzes[0]._id,
                questionText: 'Which company originally developed Java?',
                options: [
                    { text: 'Microsoft', isCorrect: false },
                    { text: 'Sun Microsystems', isCorrect: true },
                    { text: 'Google', isCorrect: false },
                    { text: 'Oracle', isCorrect: false }
                ],
                explanation: 'Java was originally developed by James Gosling at Sun Microsystems in 1995.',
                difficulty: 'easy',
                createdBy: admin._id
            },
            {
                quiz: createdQuizzes[0]._id,
                questionText: 'What does JVM stand for?',
                options: [
                    { text: 'Java Virtual Machine', isCorrect: true },
                    { text: 'Java Visual Machine', isCorrect: false },
                    { text: 'Java Verified Machine', isCorrect: false },
                    { text: 'Java Variable Machine', isCorrect: false }
                ],
                explanation: 'JVM (Java Virtual Machine) is an abstract machine that provides a runtime environment to execute Java bytecode.',
                difficulty: 'easy',
                createdBy: admin._id
            },
            // Data Structures Questions
            {
                quiz: createdQuizzes[1]._id,
                questionText: 'What is the time complexity of binary search?',
                options: [
                    { text: 'O(n)', isCorrect: false },
                    { text: 'O(log n)', isCorrect: true },
                    { text: 'O(n²)', isCorrect: false },
                    { text: 'O(1)', isCorrect: false }
                ],
                explanation: 'Binary search divides the search space in half each time, resulting in O(log n) time complexity.',
                difficulty: 'medium',
                createdBy: admin._id
            },
            {
                quiz: createdQuizzes[1]._id,
                questionText: 'Which data structure uses LIFO principle?',
                options: [
                    { text: 'Queue', isCorrect: false },
                    { text: 'Stack', isCorrect: true },
                    { text: 'Array', isCorrect: false },
                    { text: 'Linked List', isCorrect: false }
                ],
                explanation: 'Stack follows Last In First Out (LIFO) principle where the last element inserted is the first one to be removed.',
                difficulty: 'easy',
                createdBy: admin._id
            },
            // Web Development Questions
            {
                quiz: createdQuizzes[2]._id,
                questionText: 'What does CSS stand for?',
                options: [
                    { text: 'Computer Style Sheets', isCorrect: false },
                    { text: 'Creative Style Sheets', isCorrect: false },
                    { text: 'Cascading Style Sheets', isCorrect: true },
                    { text: 'Colorful Style Sheets', isCorrect: false }
                ],
                explanation: 'CSS stands for Cascading Style Sheets and is used to style and layout web pages.',
                difficulty: 'easy',
                createdBy: admin._id
            },
            {
                quiz: createdQuizzes[2]._id,
                questionText: 'Which JavaScript method is used to select an element by ID?',
                options: [
                    { text: 'getElementByClass()', isCorrect: false },
                    { text: 'getElementById()', isCorrect: true },
                    { text: 'querySelector()', isCorrect: false },
                    { text: 'selectElement()', isCorrect: false }
                ],
                explanation: 'document.getElementById() is the standard method to select an HTML element by its ID attribute.',
                difficulty: 'easy',
                createdBy: admin._id
            }
        ];

        const createdQuestions = await Question.insertMany(questions);
        console.log(`❓ Created ${createdQuestions.length} questions`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('══════════════════════════════════════');
        console.log(`📚 Branches: ${createdBranches.length}`);
        console.log(`📖 Subjects: ${createdSubjects.length}`);
        console.log(`📝 Quizzes: ${createdQuizzes.length}`);
        console.log(`❓ Questions: ${createdQuestions.length}`);
        console.log('══════════════════════════════════════');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
