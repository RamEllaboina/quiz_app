const API_BASE = '/api'; // Changed to relative path
let currentQuestionId = null;
let questions = [];
let categories = [];

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Admin Panel Functions
document.addEventListener('DOMContentLoaded', async function() {
    // Check admin authentication
    const adminData = checkAdminAuth();
    if (!adminData) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Show admin info
    document.getElementById('adminName').textContent = adminData.username;
    document.getElementById('adminRole').textContent = adminData.role === 'superadmin' ? 'Super Admin' : 'Admin';
    
    // Load initial data
    try {
        await Promise.all([
            loadDashboardStats(),
            loadCategories(),
            loadQuestions(),
            loadUsers()
        ]);
    } catch (error) {
        console.error('Initial data loading failed:', error);
        showNotification('Failed to load initial data', 'error');
    }
    
    // Setup tabs
    setupTabs();
    
    // Setup event listeners
    setupAdminEventListeners();
});

// Load dashboard statistics - FIXED ENDPOINT
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStatsDisplay(data.stats);
        } else if (response.status === 401) {
            adminLogout();
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        // Don't show error on initial load to avoid spam
    }
}

// Load categories - FIXED ENDPOINT
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/quiz/categories`);
        
        const data = await response.json();
        
        if (data.success) {
            categories = data.categories;
            updateCategoryFilters();
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// Load questions - FIXED ENDPOINT
async function loadQuestions() {
    try {
        const category = document.getElementById('filterCategory')?.value || '';
        const difficulty = document.getElementById('filterDifficulty')?.value || '';
        
        let url = `${API_BASE}/admin/questions`;
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (difficulty) params.append('difficulty', difficulty);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            questions = data.questions;
            renderQuestionsTable();
        } else if (response.status === 401) {
            adminLogout();
        }
    } catch (error) {
        console.error('Failed to load questions:', error);
        showNotification('Failed to load questions', 'error');
    }
}

// Load users - FIXED ENDPOINT
async function loadUsers() {
    try {
        const filter = document.getElementById('userFilter')?.value || 'all';
        const search = document.getElementById('searchUser')?.value || '';
        
        let url = `${API_BASE}/admin/users`;
        const params = new URLSearchParams();
        if (filter !== 'all') params.append('status', filter);
        if (search) params.append('search', search);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderUsersTable(data.users);
        } else if (response.status === 401) {
            adminLogout();
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users', 'error');
    }
}

// Add new question - FIXED ENDPOINT
async function addQuestion() {
    try {
        const category = document.getElementById('newCategory').value.trim().toLowerCase();
        const difficulty = document.getElementById('newDifficulty').value;
        const questionText = document.getElementById('newQuestionText').value.trim();
        const optionInputs = document.querySelectorAll('.option-input');
        const correctOption = document.querySelector('input[name="correctOption"]:checked').value;
        
        // Validation
        if (!category || !difficulty || !questionText) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        
        if (optionInputs.length !== 4) {
            showNotification('Exactly 4 options are required', 'error');
            return;
        }
        
        const options = Array.from(optionInputs).map((input, index) => ({
            text: input.value.trim(),
            isCorrect: index === parseInt(correctOption)
        }));
        
        const emptyOption = options.find(opt => !opt.text);
        if (emptyOption) {
            showNotification('All options must be filled', 'error');
            return;
        }
        
        // Prepare data
        const questionData = {
            category,
            difficulty,
            questionText,
            options
        };
        
        // Send request
        const response = await fetch(`${API_BASE}/admin/questions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(questionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Question added successfully!', 'success');
            resetForm();
            
            // Reload questions and stats
            await Promise.all([
                loadDashboardStats(),
                loadQuestions()
            ]);
            
            // Switch to questions tab
            switchTab('questions');
        } else {
            showNotification(data.message || 'Failed to add question', 'error');
        }
    } catch (error) {
        console.error('Add question error:', error);
        showNotification('Failed to add question', 'error');
    }
}

// Update question - FIXED ENDPOINT
async function updateQuestion(event) {
    event.preventDefault();
    
    try {
        const category = document.getElementById('editCategory').value.trim().toLowerCase();
        const difficulty = document.getElementById('editDifficulty').value;
        const questionText = document.getElementById('editQuestionText').value.trim();
        const optionInputs = document.querySelectorAll('.edit-option-input');
        const correctOption = document.querySelector('input[name="editCorrectOption"]:checked').value;
        
        const options = Array.from(optionInputs).map((input, index) => ({
            text: input.value.trim(),
            isCorrect: index === parseInt(correctOption)
        }));
        
        const questionData = {
            category,
            difficulty,
            questionText,
            options
        };
        
        const response = await fetch(`${API_BASE}/admin/questions/${currentQuestionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(questionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Question updated successfully!', 'success');
            closeEditModal();
            await loadQuestions();
        } else {
            showNotification(data.message || 'Failed to update question', 'error');
        }
    } catch (error) {
        console.error('Update question error:', error);
        showNotification('Failed to update question', 'error');
    }
}

// Delete question - FIXED ENDPOINT
async function confirmDelete() {
    try {
        const response = await fetch(`${API_BASE}/admin/questions/${currentQuestionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Question deleted successfully!', 'success');
            closeDeleteModal();
            await Promise.all([
                loadDashboardStats(),
                loadQuestions()
            ]);
        } else {
            showNotification(data.message || 'Failed to delete question', 'error');
        }
    } catch (error) {
        console.error('Delete question error:', error);
        showNotification('Failed to delete question', 'error');
    }
}

// Delete user - FIXED ENDPOINT
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('User deleted successfully!', 'success');
            await loadUsers();
        } else {
            showNotification(data.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('Failed to delete user', 'error');
    }
}

// Rest of your functions remain the same...
// (keep all other functions as they are, they're fine)