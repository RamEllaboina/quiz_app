# 🤖 Quiz App Chatbot Setup Guide

## Overview
Your quiz app now includes an AI-powered chatbot assistant that can help users with:
- Quiz recommendations
- Study tips and guidance
- Technical questions about subjects
- Progress tracking advice

## 🔧 Setup Instructions

### 1. Get Groq API Key
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the API key

### 2. Configure API Key

#### Option A: Frontend Configuration (Development Only)
Create a file named `.env` in your frontend folder:

```bash
# In: frontend/.env
GROQ_API_KEY=your_actual_groq_api_key_here
```

#### Option B: Direct Code Configuration (Quick Setup)
Edit `frontend/js/chatbot.js` and replace the placeholder:

```javascript
// Find this line in chatbot.js
constructor() {
    this.apiKey = process.env.GROQ_API_KEY || 'your-groq-api-key-here';
    // ...
}

// Replace with:
constructor() {
    this.apiKey = 'your_actual_groq_api_key_here';
    // ...
}
```

### 3. Test the Chatbot
1. Start your server: `npm run dev` (backend)
2. Open `http://localhost:3000` in browser
3. Login as a user (e.g., `johnstudent` / `user123`)
4. Click the chat icon (💬) in bottom-right corner
5. Try asking questions like:
   - "What quizzes are available for me?"
   - "Help me study Java"
   - "Study tips for quizzes"

## 🎯 Chatbot Features

### Smart Suggestions
The chatbot provides quick suggestion buttons:
- **📝 Available Quizzes** - Shows relevant quizzes
- **☕ Java Help** - Java programming assistance
- **💡 Study Tips** - Learning strategies

### Context-Aware Responses
- Knows user's branch and subjects
- Provides personalized quiz recommendations
- Offers relevant study guidance

### Fallback Mode
If API key isn't configured, the chatbot works with rule-based responses for basic functionality.

## 🔒 Security Note

**Important**: In production, API keys should be handled through a backend service for security. The frontend approach is only suitable for development/demo purposes.

### Production Setup (Recommended)
Create a backend endpoint that proxies requests to Groq:

```javascript
// Add to backend routes
router.post('/chatbot', async (req, res) => {
    const { message } = req.body;
    
    // Call Groq API here with server-side key
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: message }]
        })
    });
    
    res.json(await response.json());
});
```

## 🎨 Customization

### Chatbot Appearance
Edit `frontend/js/chatbot.js` styles to customize:
- Colors and theme
- Chat bubble styles
- Position and size
- Suggestions

### Response Behavior
Modify the `getFallbackResponse()` function to add more rule-based responses.

### Context Integration
Enhance `getUserContext()` to include:
- User's quiz history
- Current progress
- Preferred subjects
- Performance metrics

## 🚀 Advanced Features

### Future Enhancements
1. **Voice Input** - Add speech-to-text
2. **Quiz Generation** - AI-generated quiz questions
3. **Progress Analysis** - Detailed learning insights
4. **Multi-language Support** - Support for different languages
5. **Study Reminders** - Proactive learning suggestions

### Integration Ideas
- Connect to user's quiz history
- Provide personalized learning paths
- Generate practice questions
- Offer exam preparation tips

## 🐛 Troubleshooting

### Common Issues

**Chatbot not appearing:**
- Check that `chatbot.js` is included in HTML
- Ensure you're on a user page (not admin)
- Check browser console for errors

**API not working:**
- Verify API key is correct
- Check network connectivity
- Ensure Groq API credits are available

**Responses are generic:**
- API key might not be configured
- Chatbot is using fallback mode
- Check browser console for API errors

### Debug Mode
Add this to chatbot constructor for debugging:
```javascript
constructor() {
    this.debug = true; // Enable console logging
    // ...
}
```

## 📞 Support

For issues with:
- **Groq API**: Check [Groq Documentation](https://console.groq.com/docs)
- **Chatbot Functionality**: Review browser console logs
- **Quiz App**: Check existing app documentation

---

**Enjoy your AI-powered quiz assistant! 🎉**
