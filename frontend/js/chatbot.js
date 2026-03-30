// Chatbot functionality using Groq API
class QuizChatbot {
    constructor() {
        this.apiKey = localStorage.getItem('groq_api_key') || '';
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        this.createChatbotUI();
        this.bindEvents();
        this.loadChatHistory();
    }

    createChatbotUI() {
        // Create chatbot container
        const chatbotHTML = `
            <div id="quizChatbot" class="chatbot-container">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <i class="fas fa-robot"></i>
                        <div>
                            <div>Quiz Assistant</div>
                            <div class="chatbot-status">
                                <div class="status-dot"></div>
                                <span>Online</span>
                            </div>
                        </div>
                    </div>
                    <button class="chatbot-toggle" id="chatbotToggle">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="chatbot-messages" id="chatbotMessages">
                    <div class="message bot-message">
                        <div class="message-content">
                            <p>👋 Hi! I'm your AI Quiz Assistant! I'm here to help you succeed.</p>
                            <p>I can assist you with:</p>
                            <ul>
                                <li>📚 Personalized quiz recommendations</li>
                                <li>📖 Subject explanations and concepts</li>
                                <li>💡 Study strategies and tips</li>
                                <li>🔍 Technical questions and doubts</li>
                                <li>📊 Progress tracking insights</li>
                            </ul>
                            <p>What would you like to explore today? 🚀</p>
                        </div>
                        <div class="message-time">${this.getCurrentTime()}</div>
                    </div>
                </div>
                
                <div class="chatbot-input-container">
                    <div class="chatbot-suggestions">
                        <button class="suggestion-btn" data-message="What quizzes are available for me?">
                            📝 Available Quizzes
                        </button>
                        <button class="suggestion-btn" data-message="Help me study Java">
                            ☕ Java Help
                        </button>
                        <button class="suggestion-btn" data-message="Study tips for quizzes">
                            💡 Study Tips
                        </button>
                        <button class="suggestion-btn" data-message="Track my progress">
                            📊 My Progress
                        </button>
                        <button class="suggestion-btn" onclick="quizChatbot.analyzeQuizHistory()">
                            🔍 Analyze My Quiz History
                        </button>
                    </div>
                    <div class="chatbot-input-wrapper">
                        <input type="text" id="chatbotInput" placeholder="Type your message..." />
                        <button id="chatbotSend" class="send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="chatbot-fab" id="chatbotFab">
                <i class="fas fa-comments"></i>
                <span class="chat-badge">1</span>
            </div>
        `;

        // Add chatbot to body
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
        
        // Add CSS styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style id="chatbotStyles">
                .chatbot-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 400px;
                    height: 650px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 24px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    z-index: 10000;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 2px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    animation: slideInUp 0.4s ease-out;
                }

                @keyframes slideInUp {
                    from {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .chatbot-container.open {
                    display: flex;
                }

                .chatbot-header {
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }

                .chatbot-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 600;
                    font-size: 18px;
                }

                .chatbot-title i {
                    font-size: 24px;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                .chatbot-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    opacity: 0.9;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: statusPulse 2s infinite;
                }

                @keyframes statusPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .chatbot-toggle {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                }

                .chatbot-toggle:hover {
                    background: rgba(255,255,255,0.3);
                    transform: rotate(90deg);
                }

                .chatbot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(10px);
                }

                .chatbot-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .chatbot-messages::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }

                .chatbot-messages::-webkit-scrollbar-thumb {
                    background: rgba(102, 126, 234, 0.5);
                    border-radius: 10px;
                }

                .message {
                    margin-bottom: 16px;
                    max-width: 80%;
                    animation: messageSlide 0.3s ease-out;
                }

                @keyframes messageSlide {
                    from {
                        transform: translateX(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .bot-message {
                    align-self: flex-start;
                }

                .user-message {
                    align-self: flex-end;
                    margin-left: auto;
                }

                .message-content {
                    padding: 14px 18px;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    position: relative;
                    word-wrap: break-word;
                }

                .bot-message .message-content {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-bottom-left-radius: 4px;
                }

                .user-message .message-content {
                    background: #f3f4f6;
                    color: #1f2937;
                    border-bottom-right-radius: 4px;
                }

                .message-time {
                    font-size: 11px;
                    color: #6b7280;
                    margin-top: 6px;
                    text-align: right;
                    opacity: 0.7;
                }

                .bot-message .message-time {
                    text-align: left;
                }

                .chatbot-input-container {
                    padding: 20px;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(255,255,255,0.2);
                }

                .chatbot-suggestions {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                }

                .suggestion-btn {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 14px;
                    border-radius: 20px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    white-space: nowrap;
                    color: white;
                    backdrop-filter: blur(10px);
                }

                .suggestion-btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .chatbot-input-wrapper {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                #chatbotInput {
                    flex: 1;
                    padding: 12px 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 25px;
                    outline: none;
                    font-size: 14px;
                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(10px);
                    transition: all 0.3s;
                }

                #chatbotInput:focus {
                    border-color: rgba(255,255,255,0.6);
                    background: white;
                }

                #chatbotInput::placeholder {
                    color: #9ca3af;
                }

                .send-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border: none;
                    color: white;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .send-btn:hover {
                    transform: scale(1.05) rotate(5deg);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                }

                .send-btn:active {
                    transform: scale(0.95);
                }

                .chatbot-fab {
                    position: fixed;
                    bottom: 25px;
                    right: 25px;
                    width: 68px;
                    height: 68px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s;
                    z-index: 9999;
                    animation: fabPulse 3s infinite;
                }

                @keyframes fabPulse {
                    0%, 100% { 
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }
                    50% { 
                        box-shadow: 0 8px 35px rgba(102, 126, 234, 0.6);
                    }
                }

                .chatbot-fab:hover {
                    transform: scale(1.1) rotate(5deg);
                    box-shadow: 0 12px 35px rgba(102, 126, 234, 0.6);
                }

                .chatbot-fab i {
                    font-size: 28px;
                    animation: iconBounce 2s infinite;
                }

                @keyframes iconBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }

                .chat-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: bold;
                    animation: badgePulse 2s infinite;
                }

                @keyframes badgePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                .typing-indicator {
                    display: none;
                    padding: 14px 18px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    margin-bottom: 16px;
                    color: white;
                    border-bottom-left-radius: 4px;
                    max-width: 80%;
                }

                .typing-indicator.active {
                    display: block;
                    animation: messageSlide 0.3s ease-out;
                }

                .typing-dots {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }

                .typing-dot {
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }

                .typing-dot:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .typing-dot:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.7;
                    }
                    30% {
                        transform: translateY(-10px);
                        opacity: 1;
                    }
                }

                .real-time-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    color: rgba(255,255,255,0.8);
                    margin-top: 4px;
                }

                @media (max-width: 480px) {
                    .chatbot-container {
                        width: calc(100vw - 20px);
                        height: 75vh;
                        bottom: 10px;
                        right: 10px;
                        border-radius: 20px;
                    }

                    .chatbot-fab {
                        width: 60px;
                        height: 60px;
                        bottom: 15px;
                        right: 15px;
                    }

                    .chatbot-fab i {
                        font-size: 24px;
                    }
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .user-message .message-content {
                        background: #374151;
                        color: #f9fafb;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    bindEvents() {
        // Toggle chatbot
        document.getElementById('chatbotFab').addEventListener('click', () => this.toggleChatbot());
        document.getElementById('chatbotToggle').addEventListener('click', () => this.toggleChatbot());

        // Send message
        document.getElementById('chatbotSend').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.getAttribute('data-message');
                document.getElementById('chatbotInput').value = message;
                this.sendMessage();
            });
        });
    }

    toggleChatbot() {
        const container = document.getElementById('quizChatbot');
        const fab = document.getElementById('chatbotFab');
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            container.classList.add('open');
            fab.style.display = 'none';
            document.getElementById('chatbotInput').focus();
            this.clearBadgeCount();
            this.updateOnlineStatus('online');
            
            // Simulate periodic status updates
            this.startStatusUpdates();
        } else {
            container.classList.remove('open');
            fab.style.display = 'flex';
            this.updateOnlineStatus('away');
            this.stopStatusUpdates();
        }
    }

    startStatusUpdates() {
        // Simulate real-time status changes
        this.statusInterval = setInterval(() => {
            const statuses = ['online', 'online', 'online'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            this.updateOnlineStatus(randomStatus);
        }, 30000); // Update every 30 seconds
    }

    stopStatusUpdates() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message with real-time timestamp
        this.addMessage(message, 'user');
        input.value = '';

        // Show typing indicator immediately
        this.showTypingIndicator();

        // Simulate real-time response delay
        const responseDelay = Math.random() * 1000 + 500; // 500-1500ms
        
        setTimeout(async () => {
            try {
                const response = await this.callGroqAPI(message);
                this.hideTypingIndicator();
                this.addMessage(response, 'bot');
                this.updateOnlineStatus('responding');
                
                // Update status back to online after response
                setTimeout(() => this.updateOnlineStatus('online'), 2000);
            } catch (error) {
                this.hideTypingIndicator();
                this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                this.updateOnlineStatus('error');
                setTimeout(() => this.updateOnlineStatus('online'), 3000);
            }
        }, responseDelay);
    }

    updateOnlineStatus(status) {
        const statusElement = document.querySelector('.chatbot-status span');
        const statusDot = document.querySelector('.status-dot');
        
        if (!statusElement || !statusDot) return;
        
        switch(status) {
            case 'online':
                statusElement.textContent = 'Online';
                statusDot.style.background = '#10b981';
                break;
            case 'responding':
                statusElement.textContent = 'Typing...';
                statusDot.style.background = '#f59e0b';
                break;
            case 'error':
                statusElement.textContent = 'Connection issue';
                statusDot.style.background = '#ef4444';
                break;
            case 'away':
                statusElement.textContent = 'Away';
                statusDot.style.background = '#6b7280';
                break;
        }
    }

    addRealTimeIndicator() {
        const lastMessage = document.querySelector('.message:last-child .message-content');
        if (lastMessage && !lastMessage.querySelector('.real-time-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'real-time-indicator';
            indicator.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Delivered</span>
            `;
            lastMessage.appendChild(indicator);
            
            // Update to "Read" after a delay
            setTimeout(() => {
                indicator.innerHTML = `
                    <i class="fas fa-check-double" style="color: #10b981;"></i>
                    <span>Read</span>
                `;
            }, 2000);
        }
    }

    async callGroqAPI(message) {
        // Check if API key is configured
        if (!this.apiKey || this.apiKey === 'your-groq-api-key-here') {
            return this.getFallbackResponse(message);
        }

        // Context about the quiz app
        const context = `
            You are a helpful quiz assistant for an online quiz application. 
            The app has multiple branches (Computer Science, IT, Electronics, Mechanical), 
            subjects (Java Programming, Data Structures, Web Development, Database Management, Digital Electronics),
            and quizzes with different difficulty levels.
            
            Current user context: ${this.getUserContext()}
            
            IMPORTANT: Always provide branch-specific recommendations and advice. If the user is from a specific branch,
            focus on subjects and topics relevant to that branch. For example:
            - Computer Science/IT: Focus on Java, Data Structures, Web Development, Database Management
            - Electronics: Focus on Digital Electronics, circuits, hardware-related topics
            - Mechanical: Focus on engineering fundamentals, mechanics-related topics
            
            Be friendly, helpful, and provide concise responses. Focus on:
            - Branch-specific quiz recommendations
            - Subject explanations relevant to user's branch
            - Technical explanations tailored to user's field
            - Study tips for user's specific branch
            - Progress guidance based on branch curriculum
        `;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: context },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Groq API Error:', error);
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Simple rule-based responses as fallback
        if (lowerMessage.includes('quiz') && lowerMessage.includes('available')) {
            return "I can see you have several quizzes available! Based on your branch, you can try Java Basics, Data Structures, or Web Development quizzes. Each quiz has different difficulty levels to help you learn progressively.";
        }
        
        if (lowerMessage.includes('java') || lowerMessage.includes('programming')) {
            return "Java is a versatile programming language! For your Java quiz, focus on concepts like JVM, object-oriented programming, and basic syntax. Practice with simple programs and understand the core concepts.";
        }
        
        if (lowerMessage.includes('study') || lowerMessage.includes('tips')) {
            return "Here are some study tips: 1) Practice regularly with short quizzes, 2) Focus on understanding concepts rather than memorizing, 3) Take breaks between study sessions, 4) Use the quiz history to track your progress!";
        }
        
        if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
            return "I'm here to help! I can assist with quiz recommendations, study tips, and technical questions. Just ask me anything about your learning journey!";
        }
        
        return "I'm currently in demo mode, but I'd be happy to help! You can ask me about available quizzes, study tips, or technical questions. For full AI assistance, please configure the Groq API key.";
    }

    getUserContext() {
        // Get user info from localStorage or session
        const userInfo = localStorage.getItem('userData') || sessionStorage.getItem('userData') || localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                const branch = user.branch || user.branchName || 'Not specified';
                const username = user.username || 'Student';
                const role = user.role || 'user';
                
                // Get branch-specific context
                let branchContext = '';
                if (typeof branch === 'object' && branch.name) {
                    branchContext = `, Branch: ${branch.name}`;
                } else if (typeof branch === 'string') {
                    branchContext = `, Branch: ${branch}`;
                }
                
                return `User: ${username}, Role: ${role}${branchContext}`;
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        return 'Guest user';
    }

    addMessage(content, type) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.formatMessage(content)}</p>
            </div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add real-time indicator for user messages
        if (type === 'user') {
            this.addRealTimeIndicator();
        }
        
        // Update badge count
        this.updateBadgeCount();
        
        // Save to chat history
        this.messages.push({ content, type, time: new Date().toISOString() });
        this.saveChatHistory();
    }

    updateBadgeCount() {
        if (!this.isOpen) {
            const badge = document.querySelector('.chat-badge');
            if (badge) {
                const currentCount = parseInt(badge.textContent) || 0;
                badge.textContent = currentCount + 1;
                badge.style.display = 'flex';
            }
        }
    }

    async analyzeQuizHistory() {
        // Show loading message
        this.addMessage("🔍 Analyzing your quiz history... This might take a moment.", 'bot');
        this.showTypingIndicator();

        try {
            // Get quiz history from localStorage
            const quizHistory = this.getQuizHistory();
            
            if (!quizHistory || quizHistory.length === 0) {
                this.hideTypingIndicator();
                this.addMessage("📝 I don't see any quiz history yet. Take some quizzes first, and I'll be happy to analyze your performance!", 'bot');
                return;
            }

            // Prepare analysis data
            const analysisData = this.prepareAnalysisData(quizHistory);
            
            // Call Groq API for analysis
            const analysisPrompt = `
                As an expert educational analyst, please analyze this quiz history data and provide detailed insights:
                
                User Context: ${this.getUserContext()}
                
                ${analysisData}
                
                Please provide:
                1. Performance Overview (strengths and weaknesses)
                2. Subject-wise analysis
                3. Branch-specific improvement recommendations
                4. Study plan suggestions tailored to user's branch
                5. Specific topics to focus on based on branch curriculum
                
                Be encouraging and constructive in your feedback. Always consider the user's branch when providing recommendations.
            `;

            const response = await this.callGroqAPI(analysisPrompt);
            this.hideTypingIndicator();
            
            // Format and display the analysis
            const formattedResponse = this.formatAnalysisResponse(response);
            this.addMessage(formattedResponse, 'bot');
            
            // Update status
            this.updateOnlineStatus('responding');
            setTimeout(() => this.updateOnlineStatus('online'), 3000);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage("❌ Sorry, I encountered an error while analyzing your quiz history. Please try again later.", 'bot');
            this.updateOnlineStatus('error');
            setTimeout(() => this.updateOnlineStatus('online'), 3000);
        }
    }

    async getQuizHistory() {
        try {
            // Get user token for authentication
            const token = localStorage.getItem('userToken');
            if (!token) {
                return [];
            }

            // Fetch quiz history from the API
            const response = await fetch(`${window.API_BASE}/results/my-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch quiz history:', response.status);
                return [];
            }

            const data = await response.json();
            return data.success && data.results ? data.results : [];
            
        } catch (error) {
            console.error('Error fetching quiz history:', error);
            
            // Fallback to localStorage if API fails
            return this.getQuizHistoryFromStorage();
        }
    }

    getQuizHistoryFromStorage() {
        // Try to get quiz history from various possible localStorage keys
        const possibleKeys = ['quizHistory', 'quizResults', 'attempts', 'history'];
        let quizHistory = [];
        
        for (const key of possibleKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        quizHistory = parsed;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return quizHistory;
    }

    prepareAnalysisData(quizHistory) {
        // Structure the quiz data for analysis
        let analysisText = "Quiz Performance Data:\n\n";
        
        quizHistory.forEach((attempt, index) => {
            analysisText += `Quiz ${index + 1}:\n`;
            analysisText += `- Subject: ${attempt.subjectName || attempt.subject || attempt.quizName || 'Unknown'}\n`;
            analysisText += `- Score: ${attempt.score || attempt.percentage || 'N/A'}%\n`;
            analysisText += `- Status: ${attempt.isPassed ? '✅ Passed' : '❌ Failed'}\n`;
            analysisText += `- Total Questions: ${attempt.totalQuestions || 'N/A'}\n`;
            analysisText += `- Correct Answers: ${attempt.correctAnswers || 'N/A'}\n`;
            analysisText += `- Time Taken: ${attempt.timeTaken || 'N/A'}\n`;
            analysisText += `- Difficulty: ${attempt.difficulty || 'N/A'}\n`;
            analysisText += `- Date: ${attempt.date || attempt.createdAt || new Date(attempt.timestamp).toLocaleDateString()}\n`;
            
            // Add question details if available
            if (attempt.questions && Array.isArray(attempt.questions)) {
                analysisText += `- Question Breakdown:\n`;
                attempt.questions.forEach((q, qIndex) => {
                    const isCorrect = q.userAnswer === q.correctAnswer || q.isCorrect;
                    analysisText += `  Q${qIndex + 1}: ${isCorrect ? '✅' : '❌'} ${q.subject || q.category || 'General'}\n`;
                });
            }
            
            analysisText += "\n";
        });
        
        // Add summary statistics
        const totalQuizzes = quizHistory.length;
        const averageScore = quizHistory.reduce((acc, curr) => {
            const score = curr.score || curr.percentage || 0;
            return acc + parseFloat(score);
        }, 0) / totalQuizzes;
        
        const passedQuizzes = quizHistory.filter(q => q.isPassed).length;
        const passRate = (passedQuizzes / totalQuizzes * 100).toFixed(2);
        
        analysisText += `Summary Statistics:\n`;
        analysisText += `- Total Quizzes Attempted: ${totalQuizzes}\n`;
        analysisText += `- Average Score: ${averageScore.toFixed(2)}%\n`;
        analysisText += `- Pass Rate: ${passRate}% (${passedQuizzes}/${totalQuizzes})\n`;
        
        // Subject breakdown
        const subjectStats = {};
        quizHistory.forEach(attempt => {
            const subject = attempt.subjectName || attempt.subject || attempt.quizName || 'Unknown';
            if (!subjectStats[subject]) {
                subjectStats[subject] = { count: 0, totalScore: 0, passed: 0 };
            }
            subjectStats[subject].count++;
            subjectStats[subject].totalScore += parseFloat(attempt.score || attempt.percentage || 0);
            if (attempt.isPassed) {
                subjectStats[subject].passed++;
            }
        });
        
        analysisText += `- Subject Performance:\n`;
        Object.entries(subjectStats).forEach(([subject, stats]) => {
            const avgScore = stats.totalScore / stats.count;
            const subjectPassRate = (stats.passed / stats.count * 100).toFixed(2);
            analysisText += `  ${subject}: ${avgScore.toFixed(2)}% avg, ${subjectPassRate}% pass rate (${stats.count} quizzes)\n`;
        });
        
        return analysisText;
    }

    formatAnalysisResponse(response) {
        // Format the AI response with better structure and emojis
        return `📊 **Your Quiz Performance Analysis** 📊\n\n${response}\n\n---\n💡 **Tip**: Keep practicing regularly to improve your scores!`;
    }

    clearBadgeCount() {
        const badge = document.querySelector('.chat-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator active';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        document.getElementById('chatbotMessages').appendChild(indicator);
        document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    formatMessage(content) {
        // Convert URLs to links, format code blocks, etc.
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    saveChatHistory() {
        localStorage.setItem('chatbotHistory', JSON.stringify(this.messages));
    }

    loadChatHistory() {
        const history = localStorage.getItem('chatbotHistory');
        if (history) {
            this.messages = JSON.parse(history);
            // Optionally restore previous messages to UI
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize on all pages except admin pages
    if (!window.location.pathname.includes('admin')) {
        window.quizChatbot = new QuizChatbot();
        console.log('Chatbot initialized on:', window.location.pathname);
        
        // Make analyzeQuizHistory globally accessible
        window.analyzeQuizHistory = () => window.quizChatbot.analyzeQuizHistory();
    } else {
        console.log('Chatbot disabled on admin page');
    }
});
