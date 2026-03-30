// Test script to add sample quiz history for testing chatbot analysis
// Run this in browser console when logged in

function addSampleQuizHistory() {
    const sampleHistory = [
        {
            _id: 'test1',
            subjectName: 'Java Programming',
            subject: 'Java Programming',
            quizName: 'Java Basics Quiz',
            score: 85,
            percentage: 85,
            isPassed: true,
            totalQuestions: 10,
            correctAnswers: 8,
            timeTaken: '12 minutes',
            difficulty: 'easy',
            date: '2025-03-28',
            createdAt: new Date('2025-03-28').toISOString(),
            questions: [
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: false },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: false },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: true },
                { subject: 'Java', isCorrect: false }
            ]
        },
        {
            _id: 'test2',
            subjectName: 'Data Structures',
            subject: 'Data Structures',
            quizName: 'Data Structures Fundamentals',
            score: 72,
            percentage: 72,
            isPassed: true,
            totalQuestions: 10,
            correctAnswers: 7,
            timeTaken: '18 minutes',
            difficulty: 'medium',
            date: '2025-03-29',
            createdAt: new Date('2025-03-29').toISOString(),
            questions: [
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: false },
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: false },
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: false },
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: true },
                { subject: 'Data Structures', isCorrect: false }
            ]
        },
        {
            _id: 'test3',
            subjectName: 'Web Development',
            subject: 'Web Development',
            quizName: 'Web Development Essentials',
            score: 58,
            percentage: 58,
            isPassed: false,
            totalQuestions: 10,
            correctAnswers: 5,
            timeTaken: '15 minutes',
            difficulty: 'easy',
            date: '2025-03-30',
            createdAt: new Date('2025-03-30').toISOString(),
            questions: [
                { subject: 'Web Development', isCorrect: false },
                { subject: 'Web Development', isCorrect: true },
                { subject: 'Web Development', isCorrect: false },
                { subject: 'Web Development', isCorrect: true },
                { subject: 'Web Development', isCorrect: false },
                { subject: 'Web Development', isCorrect: true },
                { subject: 'Web Development', isCorrect: false },
                { subject: 'Web Development', isCorrect: true },
                { subject: 'Web Development', isCorrect: false },
                { subject: 'Web Development', isCorrect: true }
            ]
        }
    ];

    // Store in localStorage for testing
    localStorage.setItem('quizHistory', JSON.stringify(sampleHistory));
    console.log('Sample quiz history added! You can now test the analysis feature.');
    console.log('Sample data:', sampleHistory);
    
    // Also show a notification
    if (window.quizChatbot) {
        window.quizChatbot.addMessage('📊 Sample quiz history has been added for testing! You can now click "🔍 Analyze My Quiz History" to test the feature.', 'bot');
    }
}

// Auto-add sample data if this script is run
if (typeof window !== 'undefined') {
    window.addSampleQuizHistory = addSampleQuizHistory;
    console.log('To add sample quiz history, run: addSampleQuizHistory()');
}
