// API_BASE is loaded from config.js

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked;
    const messageDiv = document.getElementById('message');

    // Clear previous messages
    messageDiv.className = 'message hidden';
    messageDiv.textContent = '';

    // Validation
    if (!username || !password) {
        showMessage('Please enter both username/email and password', 'error');
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store token and user info
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }

            showMessage('Login successful! Redirecting...', 'success');

            // Redirect to quiz after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } else {
            showMessage(data.message || 'Invalid credentials', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }

    } catch (error) {
        showMessage('Login failed. Please check your connection.', 'error');
        console.error('Login error:', error);

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        submitBtn.disabled = false;
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 3000);
        }
    }
});

// Check if user is already logged in
function checkUserAuth() {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            const currentPage = window.location.pathname;

            // If on login/register page, redirect to quiz
            if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
                showNotification('Already logged in. Redirecting...', 'info');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                return user;
            }

            // Check token expiry
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = tokenPayload.exp * 1000;
                if (Date.now() > expiryTime) {
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    if (!currentPage.includes('login.html') && !currentPage.includes('register.html')) {
                        window.location.href = 'login.html';
                    }
                    return null;
                }
            } catch (e) {
                // Token parsing failed
                localStorage.clear();
                return null;
            }

            return user;
        } catch (error) {
            localStorage.clear();
            return null;
        }
    } else {
        // If on protected page, redirect to login
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') && !currentPage.includes('admin')) {
            // Don't redirect from index page - let quiz.js handle it
            return null;
        }
        return null;
    }
}

// Logout function
function userLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('rememberMe');
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        background: type === 'success' ? '#43e97b' : type === 'error' ? '#ff416c' : '#667eea',
        color: 'white',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: '9999',
        animation: 'slideIn 0.3s ease'
    });

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Check registration status
async function checkRegistrationStatus(email) {
    try {
        const response = await fetch(`${API_BASE}/auth/check-status/${encodeURIComponent(email)}`);
        const data = await response.json();

        if (data.success) {
            return data;
        }
        return null;
    } catch (error) {
        console.error('Check status error:', error);
        return null;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    checkUserAuth();

    // Auto-focus username field
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }

    // Auto-fill remember me
    if (localStorage.getItem('rememberMe') === 'true') {
        const rememberMeCheckbox = document.getElementById('rememberMe');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }

    // Enter key to submit form
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
            const form = document.querySelector('#loginForm') || document.querySelector('#adminLoginForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
});

// Export functions for use in other files
window.checkUserAuth = checkUserAuth;
window.userLogout = userLogout;
window.showNotification = showNotification;
window.checkRegistrationStatus = checkRegistrationStatus;