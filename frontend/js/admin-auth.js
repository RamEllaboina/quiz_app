// API_BASE is loaded from config.js

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const messageDiv = document.getElementById('adminMessage');

    // Clear previous messages
    messageDiv.className = 'message hidden';
    messageDiv.textContent = '';

    // Validate input
    if (!username || !password) {
        showMessage('Please enter both username and password', 'error');
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE}/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store admin token and info
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('adminData', JSON.stringify(data.admin));

            showMessage('Admin login successful! Redirecting...', 'success');

            // Redirect to admin panel after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/admin.html'; // Fixed path
            }, 1500);

        } else {
            showMessage(data.message || 'Invalid credentials', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }

    } catch (error) {
        showMessage('Connection failed. Please check if server is running.', 'error');
        console.error('Admin login error:', error);

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login as Admin';
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

// Check if admin is already logged in
function checkAdminAuth() {
    const token = sessionStorage.getItem('adminToken');
    const adminData = sessionStorage.getItem('adminData');

    if (token && adminData) {
        try {
            const admin = JSON.parse(adminData);
            const currentPage = window.location.pathname;

            // If on admin login page, redirect to admin panel
            if (currentPage.includes('admin-login.html')) {
                showNotification('Already logged in. Redirecting...', 'info');
                setTimeout(() => {
                    window.location.href = '/admin.html'; // Fixed path
                }, 1000);
                return admin;
            }

            // If token expired, clear storage
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = tokenPayload.exp * 1000;
            if (Date.now() > expiryTime) {
                sessionStorage.removeItem('adminToken');
                sessionStorage.removeItem('adminData');
                if (currentPage.includes('admin.html')) {
                    window.location.href = '/admin-login.html'; // Fixed path
                }
                return null;
            }

            return admin;
        } catch (error) {
            sessionStorage.clear();
            return null;
        }
    } else {
        // If on admin page, redirect to admin login
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = '/admin-login.html'; // Fixed path
        }
        return null;
    }
}

// Admin logout function
function adminLogout() {
    if (confirm('Are you sure you want to logout as admin?')) {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminData');
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/admin-login.html'; // Fixed path
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAdminAuth();

    // Auto-focus username field
    const usernameInput = document.getElementById('adminUsername');
    if (usernameInput) {
        usernameInput.focus();
    }

    // Enter key to submit form
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
            const form = document.querySelector('#adminLoginForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
});

// Export functions for use in other files
window.checkAdminAuth = checkAdminAuth;
window.adminLogout = adminLogout;
window.showNotification = showNotification;