const config = {
    // Development URL (Localhost)
    development: 'http://localhost:3000/api',

    // Production URL (Update this when deploying)
    production: window.location.hostname.includes('vercel.app')
        ? '/api'  // Vercel serverless functions
        : 'https://your-backend-app.onrender.com/api' // Fallback
};

// Determine environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Set API Base
window.API_BASE = isLocal ? config.development : config.production;

// Check for file:// protocol
if (window.location.protocol === 'file:') {
    const msg = "⚠️ Warning: You are opening this file directly. Features requiring the backend will not work.\n" +
        "Please open via http://localhost:3000 if running locally.";
    console.warn(msg);
    // Optional: Alert user once
    if (!sessionStorage.getItem('fileProtocolWarned')) {
        alert(msg);
        sessionStorage.setItem('fileProtocolWarned', 'true');
    }
} else {
    console.log(`🚀 App Configuration Loaded: ${isLocal ? 'Development' : 'Production'} Mode`);
    console.log(`🔗 API Base: ${window.API_BASE}`);
}
