// const API_BASE = 'http://localhost:3000/api'; // Defined in user-auth.js

// Quiz Variables
let timeLeft = 0;
let timer;
let questions = [];
let currentQuestion = 0;
let score = 0;
let currentQuizId = null;
let currentSubjectId = null;
let userAnswers = [];

// DOM Elements
const subjectBox = document.getElementById("subjectBox");
const quizListBox = document.getElementById("quizListBox");
const historyBox = document.getElementById("historyBox");

const quizContent = document.getElementById("quizContent");
const resultBox = document.getElementById("resultBox");

const questionText = document.getElementById("questionText");
const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreDisplay") || document.getElementById("scoreText");
const choicesBox = document.getElementById("choicesBox");
const timerText = document.getElementById("timerText");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const subjectButtons = document.getElementById("subjectButtons");
const quizListButtons = document.getElementById("quizListButtons");
const historyList = document.getElementById("historyList");


// Auth Headers
function getAuthHeaders() {
    const token = localStorage.getItem('userToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Initialize
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🎯 Quiz App Initialized (New Architecture)");

    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!token || !userData.username) {
        showLoginPrompt();
        return;
    }

    // Show user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.classList.remove('hidden');

    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) usernameDisplay.textContent = `Welcome, ${userData.username}!`;

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) historyBtn.classList.remove('hidden');

    await loadSubjects();

    // Event Listeners
    if (prevBtn) prevBtn.addEventListener("click", previousQuestion);
    if (nextBtn) nextBtn.addEventListener("click", nextQuestion);

    // Check if Admin Logged In
    if (sessionStorage.getItem('adminToken')) {
        const adminBtn = document.querySelector('button[onclick*="admin-login.html"]');
        if (adminBtn) {
            adminBtn.innerHTML = '<i class="fas fa-tools"></i> Admin Panel';
            adminBtn.style.background = 'rgba(6, 182, 212, 0.2)';
            adminBtn.style.color = '#06b6d4';
        }
    }
});

function showLoginPrompt() {
    subjectBox.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-lock" style="font-size: 64px; color: #667eea; margin-bottom: 20px;"></i>
            <h3>Login Required</h3>
            <p>Please login to start the quiz</p>
            <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                <button class="btn btn-primary" onclick="window.location.href='login.html'"><i class="fas fa-sign-in-alt"></i> Login</button>
                <button class="btn btn-secondary" onclick="window.location.href='register.html'"><i class="fas fa-user-plus"></i> Register</button>
            </div>
        </div>
    `;
}

// --- SUBJECTS ---
async function loadSubjects() {
    try {
        // Show loading state
        subjectButtons.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading subjects...</p>
            </div>
        `;

        const response = await fetch(`${API_BASE}/subjects`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            subjectButtons.innerHTML = "";

            if (data.subjects.length === 0) {
                subjectButtons.innerHTML = "<p>No subjects available yet.</p>";
                return;
            }

            const subjectGrid = document.createElement('div');
            subjectGrid.className = 'subject-grid';

            data.subjects.forEach((sub, index) => {
                const div = document.createElement("div");
                div.className = "subject-card anim-up";
                div.style.animationDelay = `${index * 0.1}s`;
                div.innerHTML = `
                    <div class="subject-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="subject-title">${sub.name}</div>
                    <div class="subject-count">${sub.description || 'Explore quizzes'}</div>
                `;
                div.onclick = () => selectSubject(sub._id);
                subjectGrid.appendChild(div);
            });

            subjectButtons.appendChild(subjectGrid);
        }
    } catch (e) {
        console.error(e);
        subjectButtons.innerHTML = `<p style="color: #ff6b6b; text-align: center;">Error loading subjects: ${e.message}</p>`;
    }
}

function selectSubject(id) {
    currentSubjectId = id;
    subjectBox.classList.add("hidden");
    quizListBox.classList.remove("hidden");
    loadQuizzes(id);
}

// --- QUIZZES ---
async function loadQuizzes(subjectId) {
    try {
        quizListButtons.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        const response = await fetch(`${API_BASE}/quizzes?subjectId=${subjectId}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            quizListButtons.innerHTML = "";
            if (data.quizzes.length === 0) {
                quizListButtons.innerHTML = "<p>No quizzes available for this subject.</p>";
                return;
            }
            data.quizzes.forEach((q, index) => {
                const div = document.createElement("div");
                div.className = "quiz-list-item anim-up";
                div.style.animationDelay = `${index * 0.1}s`;
                div.innerHTML = `
                    <div>
                        <h3 style="margin-bottom:5px; color:#2d3748;">${q.title}</h3>
                        <div class="quiz-meta">
                            <span><i class="fas fa-layer-group"></i> ${q.difficulty}</span>
                            <span><i class="fas fa-clock"></i> ${q.timeLimit}m</span>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="startQuiz('${q._id}')">Start <i class="fas fa-arrow-right"></i></button>
                `;
                quizListButtons.appendChild(div);
            });
        }
    } catch (e) { console.error(e); }
}

function goBackToSubjects() {
    quizListBox.classList.add("hidden");
    subjectBox.classList.remove("hidden");
}

function goBackToQuizList() {
    // Not used directly but useful logic
    quizContent.classList.add("hidden");
    resultBox.classList.add("hidden");
    quizListBox.classList.remove("hidden");
}

function goHome() {
    historyBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    quizContent.classList.add("hidden");
    quizListBox.classList.add("hidden");
    subjectBox.classList.remove("hidden");
}

// --- HISTORY ---
async function showHistory() {
    subjectBox.classList.add("hidden");
    quizListBox.classList.add("hidden");
    quizContent.classList.add("hidden");
    resultBox.classList.add("hidden");
    historyBox.classList.remove("hidden");

    try {
        const response = await fetch(`${API_BASE}/results/my-history`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            historyList.innerHTML = data.results.length ? data.results.map(r => `
                <div style="background: var(--bg-card); padding:15px; border-radius:15px; margin-bottom:10px; border-left: 5px solid ${r.isPassed ? 'var(--success)' : 'var(--danger)'}; position: relative; border: 1px solid var(--border-color);">
                    <div style="position: absolute; right: 10px; top: 10px; display: flex; gap: 8px;">
                        <button onclick="viewResultDetails('${r._id}')" class="btn-icon" title="View Details" style="background: rgba(255, 255, 255, 0.05); border: none; padding: 5px 10px; border-radius: 8px; color: var(--text-main); cursor: pointer; transition: all 0.3s;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteResult('${r._id}')" class="btn-icon" title="Delete" style="background: rgba(239, 68, 68, 0.1); border: none; padding: 5px 10px; border-radius: 8px; color: var(--danger); cursor: pointer; transition: all 0.3s;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-right: 80px;">
                        <strong style="color: var(--text-main); font-size: 1.1em;">${r.quiz?.title || 'Unknown Quiz'}</strong>
                    </div>
                    <div style="margin-top:5px; font-size:0.9em; color: var(--text-muted);">
                        <span>${new Date(r.completedAt).toLocaleDateString()}</span> • 
                        <span style="color: ${r.isPassed ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">
                            Score: ${r.score}/${r.totalQuestions} (${r.percentage}%)
                        </span>
                    </div>
                </div>
             `).join('') : '<p class="text-center" style="color: rgba(255,255,255,0.6);">No history found.</p>';
        }
    } catch (e) {
        console.error(e);
        historyList.innerHTML = '<p class="text-center" style="color: rgba(255,65,108,0.8);">Failed to load history.</p>';
    }
}

async function viewResultDetails(resultId) {
    // Check if modal exists, if not create logic or re-use existing
    // We'll inject a modal into the DOM
    const existingModal = document.getElementById('resultDetailsModal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
    <div id="resultDetailsModal" class="modal active" style="align-items: flex-start; overflow-y: auto; padding: 50px 0;">
        <div class="modal-content" style="max-width: 800px; width: 90%; text-align: left; max-height: none; overflow: visible;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <h2 style="color: #333; margin: 0;">Quiz Results</h2>
                <button onclick="document.getElementById('resultDetailsModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="resultDetailsBody">
                <div class="loading" style="color: #333;"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    try {
        const response = await fetch(`${API_BASE}/results/${resultId}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success && data.result) {
            const r = data.result;
            const content = document.getElementById('resultDetailsBody');

            content.innerHTML = `
                <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 10px;">
                    <h3 style="margin-top:0; color: #2d3748;">${r.quiz?.title || 'Unknown Quiz'}</h3>
                    <div style="display: flex; gap: 20px; color: #4a5568;">
                        <span><i class="fas fa-star"></i> Score: ${r.score}/${r.totalQuestions}</span>
                        <span><i class="fas fa-chart-pie"></i> ${r.percentage}%</span>
                        <span style="color: ${r.isPassed ? 'green' : 'red'}; font-weight: bold;">${r.isPassed ? 'PASSED' : 'FAILED'}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${r.answers.map((ans, idx) => {
                const question = ans.question;
                if (!question) return `<div class="p-3 bg-red-100 rounded">Question deleted</div>`;

                const isCorrect = ans.isCorrect;
                const userAnsText = ans.selectedOption;
                // Find correct option text
                const correctOpt = question.options.find(o => o.isCorrect);
                const correctText = correctOpt ? correctOpt.text : 'N/A';

                return `
                        <div style="border: 1px solid ${isCorrect ? '#c6f6d5' : '#fed7d7'}; background: ${isCorrect ? '#f0fff4' : '#fff5f5'}; padding: 15px; border-radius: 10px;">
                            <p style="margin-top: 0; font-weight: 600; color: #2d3748;">${idx + 1}. ${question.questionText}</p>
                            <div style="font-size: 0.9em; margin-top: 10px;">
                                <div style="color: ${isCorrect ? 'green' : 'red'}; margin-bottom: 5px;">
                                    <i class="fas fa-${isCorrect ? 'check' : 'times'}"></i> Your Answer: <strong>${userAnsText || 'Skipped'}</strong>
                                </div>
                                ${!isCorrect ? `
                                <div style="color: green;">
                                    <i class="fas fa-check"></i> Correct Answer: <strong>${correctText}</strong>
                                </div>
                                ` : ''}
                                ${question.explanation ? `
                                <div style="margin-top: 10px; font-style: italic; color: #718096; background: rgba(255,255,255,0.5); padding: 8px; border-radius: 5px;">
                                    <strong>Explanation:</strong> ${question.explanation}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
            `;
        }
    } catch (e) {
        document.getElementById('resultDetailsBody').innerHTML = '<p class="text-danger">Failed to load details.</p>';
    }
}
window.viewResultDetails = viewResultDetails;

const modal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const confirmBtn = document.getElementById('confirmBtn'); // Warning: this const might duplicate if defined globally. Better to just use element.

function showModal(title, message, onConfirm) {
    const mTitle = document.getElementById('modalTitle');
    const mMessage = document.getElementById('modalMessage');
    const mBtn = document.getElementById('confirmBtn');
    const mModal = document.getElementById('confirmModal');

    mTitle.textContent = title;
    mMessage.textContent = message;

    // Remove old listeners to prevent stacking
    const newBtn = mBtn.cloneNode(true);
    mBtn.parentNode.replaceChild(newBtn, mBtn);

    newBtn.onclick = () => {
        onConfirm();
        closeModal();
    };

    mModal.classList.add('active');
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

async function deleteResult(id) {
    showModal('Delete Result', 'Are you sure you want to delete this result permanently?', async () => {
        try {
            const response = await fetch(`${API_BASE}/results/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                showHistory();
            } else {
                alert('Failed to delete result: ' + data.message);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred.');
        }
    });
}

async function clearHistory() {
    showModal('Clear History', 'Are you sure you want to clear your entire quiz history? This action cannot be undone.', async () => {
        try {
            const response = await fetch(`${API_BASE}/results/my-history`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                showHistory();
            } else {
                alert('Failed to clear history: ' + data.message);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while clearing history.');
        }
    });
}

// Exports
window.showHistory = showHistory;
window.clearHistory = clearHistory;
window.deleteResult = deleteResult;
window.closeModal = closeModal;



// --- QUIZ LOGIC ---
async function startQuiz(quizId) {
    currentQuizId = quizId;
    quizListBox.classList.add("hidden");
    quizContent.classList.remove("hidden");
    quizContent.className = "quiz-interface anim-up"; // Apply new class structure

    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            questions = data.questions;
            timeLeft = (data.quiz.timeLimit || 15) * 60; // Convert mins to seconds
            // Check if 0 questions
            if (questions.length === 0) {
                alert("This quiz has no questions!");
                goBackToQuizList();
                return;
            }

            currentQuestion = 0;
            userAnswers = new Array(questions.length).fill(null);
            loadQuestion();
            startTimer();
        }
    } catch (e) { console.error(e); }
}

function loadQuestion() {
    if (currentQuestion >= questions.length) {
        submitQuiz();
        return;
    }

    const q = questions[currentQuestion];
    // Use new structure
    quizContent.className = "quiz-interface anim-up"; // Reset class

    // Header update (if not static)
    // Content update
    questionText.textContent = q.questionText;
    progressText.innerHTML = `<span style="color:#667eea; font-weight:bold;">Question ${currentQuestion + 1}</span> <span style="color:#a0aec0;">/ ${questions.length}</span>`;

    choicesBox.className = "options-container";
    choicesBox.innerHTML = q.options.map((opt, idx) => `
        <div class="option-card" onclick="selectAnswer('${opt._id}')" id="opt_${opt._id}">
            ${opt.text}
        </div>
    `).join('');

    // Highlight selected if any
    const savedAns = userAnswers[currentQuestion];
    if (savedAns) {
        const el = document.getElementById(`opt_${savedAns}`);
        if (el) el.style.borderColor = '#667eea'; // just visual selection
    }

    prevBtn.disabled = currentQuestion === 0;
    nextBtn.innerHTML = currentQuestion === questions.length - 1 ? 'Finish' : 'Next';
}

function selectAnswer(optId) {
    userAnswers[currentQuestion] = optId;
    // Visual update using classes
    document.querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected');
    });
    const el = document.getElementById(`opt_${optId}`);
    if (el) {
        el.classList.add('selected');
    }
}

function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        loadQuestion();
    } else {
        submitQuiz();
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerText.textContent = `Time Left: ${mins}:${secs < 10 ? '0' + secs : secs}`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            submitQuiz();
        }
    }, 1000);
}

async function submitQuiz() {
    clearInterval(timer);
    quizContent.classList.add("hidden");
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Calculating Results...</div>';

    // Prepare payload
    const answersPayload = questions.map((q, idx) => ({
        questionId: q._id,
        selectedOptionId: userAnswers[idx] || null
    })).filter(a => a.selectedOptionId); // Only send answered ones? or all? Better all or handle in backend.

    try {
        const response = await fetch(`${API_BASE}/quizzes/${currentQuizId}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ answers: answersPayload })
        });
        const data = await response.json();

        if (data.success) {
            const r = data.result;
            resultBox.innerHTML = `
                <h2>🎉 Quiz Completed!</h2>
                <div style="font-size: 48px; margin: 20px 0; color: ${r.isPassed ? '#43e97b' : '#ff416c'};">
                    <i class="fas fa-${r.isPassed ? 'trophy' : 'times-circle'}"></i>
                </div>
                <p class="score-text">Score: ${r.score} / ${r.totalQuestions}</p>
                <p class="high-score-text">${r.percentage.toFixed(1)}% - ${r.isPassed ? 'PASSED' : 'FAILED'}</p>
                <div class="result-buttons">
                    <button class="restart-btn" id="restartBtn" onclick="startQuiz('${currentQuizId}')">
                        <i class="fas fa-redo"></i> Retry Quiz
                    </button>
                    <button class="home-btn" onclick="goHome()">
                        <i class="fas fa-home"></i> Back to Subjects
                    </button>
                </div>
            `;
        }
    } catch (e) { console.error(e); }
}

function restartQuiz() {
    if (resultBox) resultBox.classList.add("hidden");
    if (currentQuizId) {
        startQuiz(currentQuizId);
    } else {
        goHome();
    }
}

// Exports
window.startQuiz = startQuiz;
window.restartQuiz = restartQuiz;
window.selectAnswer = selectAnswer;
window.goHome = goHome;
window.goBackToSubjects = goBackToSubjects;
window.selectSubject = selectSubject;
window.userLogout = function () {
    if (confirm('Logout?')) {
        localStorage.removeItem('userToken');
        window.location.href = 'login.html';
    }
};