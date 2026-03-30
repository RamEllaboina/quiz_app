// API_BASE is already declared in user-auth.js

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const branch = document.getElementById('branch').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('message');

    // Clear previous messages
    messageDiv.className = 'message hidden';
    messageDiv.textContent = '';

    // Validation
    if (!fullName || !username || !email || !password || !confirmPassword || !branch) {
        showMessage('All fields are required', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    if (username.length < 3) {
        showMessage('Username must be at least 3 characters', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    // Username validation (alphanumeric and underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showMessage('Username can only contain letters, numbers, and underscores', 'error');
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                username,
                email,
                branch,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage(data.message || 'Registration successful! Awaiting admin approval.', 'success');

            // Reset form
            document.getElementById('registerForm').reset();

            // Show additional info
            messageDiv.innerHTML += `
                <br><br>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <strong><i class="fas fa-clock"></i> What happens next?</strong>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">
                        Your registration has been submitted for admin approval. 
                        You will receive an email notification once your account is approved.
                        Approval typically takes 1-2 business hours.
                    </p>
                </div>
            `;

            // Redirect to login after 5 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);

        } else {
            showMessage(data.message || 'Registration failed', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }

    } catch (error) {
        showMessage('Registration failed. Please try again.', 'error');
        console.error('Registration error:', error);

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Create Account';
        submitBtn.disabled = false;
    }

    function showMessage(text, type) {
        messageDiv.innerHTML = text;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
    }
});

// Check username availability (optional feature)
async function checkUsernameAvailability(username) {
    if (username.length < 3) return false;

    try {
        // In a real app, you would have an endpoint for this
        const response = await fetch(`${API_BASE}/auth/check-username/${username}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Check username error:', error);
        return true; // Assume available if check fails
    }
}

// Check email availability (optional feature)
async function checkEmailAvailability(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    try {
        // In a real app, you would have an endpoint for this
        const response = await fetch(`${API_BASE}/auth/check-email/${email}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Check email error:', error);
        return true;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is already logged in
    const user = checkUserAuth();
    if (user) {
        window.location.href = 'index.html';
        return;
    }

    // Load Branches
    await loadBranches();

    // Auto-focus first field
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.focus();
    }

    // Real-time validation
    const inputs = document.querySelectorAll('#registerForm input');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            validateField(this);
        });

        input.addEventListener('input', function () {
            clearFieldError(this);
        });
    });
});

async function loadBranches() {
    const select = document.getElementById('branch');
    try {
        // Show loading state
        select.innerHTML = '<option value="" disabled selected>Loading branches...</option>';
        select.disabled = true;

        // API_BASE is global or hardcoded here if needed, but normally from user-auth
        // Assuming user-auth.js defines it or we use relative path
        const base = typeof API_BASE !== 'undefined' ? API_BASE : '/api';

        const response = await fetch(`${base}/branches/public`);
        const data = await response.json();

        select.innerHTML = '<option value="" disabled selected>Select Branch</option>';
        select.disabled = false;

        if (data.success && data.branches.length > 0) {
            data.branches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b._id;
                opt.textContent = b.name;
                select.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = "No branches available";
            select.appendChild(opt);
        }
    } catch (e) {
        console.error("Failed to load branches", e);
        select.innerHTML = '<option value="" disabled selected>Error loading branches</option>';
        select.disabled = true;
    }
}

// Field validation
function validateField(field) {
    const value = field.value.trim();
    const fieldId = field.id;

    switch (fieldId) {
        case 'fullName':
            if (value.length < 2) {
                showFieldError(field, 'Full name must be at least 2 characters');
                return false;
            }
            break;

        case 'username':
            if (value.length < 3) {
                showFieldError(field, 'Username must be at least 3 characters');
                return false;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                showFieldError(field, 'Only letters, numbers, and underscores allowed');
                return false;
            }
            break;

        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                showFieldError(field, 'Please enter a valid email');
                return false;
            }
            break;

        case 'password':
            if (value.length < 4) {
                showFieldError(field, 'Password must be at least 4 characters');
                return false;
            }
            break;

        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (value !== password) {
                showFieldError(field, 'Passwords do not match');
                return false;
            }
            break;
    }

    clearFieldError(field);
    return true;
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ff416c;
        font-size: 12px;
        margin-top: 5px;
    `;

    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#ff416c';
}

// Clear field error
function clearFieldError(field) {
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    field.style.borderColor = '#e0e0e0';
}

// Password strength indicator
document.getElementById('password')?.addEventListener('input', function (e) {
    const password = e.target.value;
    const strengthDiv = document.getElementById('passwordStrength');

    let strength = 0;
    if (password.length >= 4) strength++;
    if (/[a-zA-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    strengthDiv.className = 'password-strength';
    if (password.length === 0) {
        strengthDiv.style.display = 'none';
    } else {
        strengthDiv.style.display = 'block';
        if (strength === 1) {
            strengthDiv.classList.add('strength-weak');
            strengthDiv.textContent = 'Weak';
        } else if (strength === 2) {
            strengthDiv.classList.add('strength-fair');
            strengthDiv.textContent = 'Fair';
        } else if (strength === 3) {
            strengthDiv.classList.add('strength-good');
            strengthDiv.textContent = 'Good';
        } else if (strength >= 4) {
            strengthDiv.classList.add('strength-strong');
            strengthDiv.textContent = 'Strong';
        }
    }
});

// Use checkUserAuth from user-auth.js
// checkUserAuth is available from user-auth.js