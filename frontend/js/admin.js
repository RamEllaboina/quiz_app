// API_BASE is already declared in admin-auth.js

// configuration loaded globally

// Global State
let currentQuizId = null;
let subjects = [];
let quizzes = [];
let currentUserRole = '';

// Auth Headers
function getAuthHeaders() {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Init
document.addEventListener('DOMContentLoaded', async function () {
    const adminData = checkAdminAuth();
    if (!adminData) return;

    currentUserRole = adminData.role;

    document.getElementById('adminName').textContent = adminData.username;
    document.getElementById('adminRole').textContent = adminData.role === 'superadmin' ? 'Super Admin' : 'Admin';
    if (adminData.role === 'superadmin') {
        document.getElementById('adminTabBtn').style.display = 'flex';
    }

    if (adminData.lastLogin) {
        document.getElementById('lastLogin').textContent = `Last login: ${new Date(adminData.lastLogin).toLocaleString()}`;
    }

    // Initial Load
    await loadSubjects();
    await loadDashboardStats();

    // Default tab
    switchTab('dashboard');
});

// --- TABS ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Find button and activate
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.onclick.toString().includes(tabName));
    if (btn) btn.classList.add('active');

    document.getElementById(tabName).classList.add('active');

    if (tabName === 'subjects') loadSubjects();
    if (tabName === 'quizzes') loadQuizzes();
    if (tabName === 'questions') loadAllQuestions();
    if (tabName === 'branches') loadBranches();
    if (tabName === 'users') loadUsers();
    if (tabName === 'admins') loadAdmins();
    if (tabName === 'settings') loadSettingsBranches();
}

// --- DASHBOARD ---
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalSubjects').textContent = data.stats.totalSubjects;
            document.getElementById('totalQuizzes').textContent = data.stats.totalQuizzes;
            document.getElementById('totalUsers').textContent = data.stats.totalUsers;
            document.getElementById('pendingUsers').textContent = data.stats.pendingUsers;
        }
    } catch (e) { console.error(e); }
}

// --- SUBJECTS ---
// --- BRANCH DASHBOARD LOGIC ---
let selectedBranchId = null; // Filter state

// Overwrite loadSubjects to support Branch Filter
async function loadSubjects() {
    const container = document.getElementById('subjectsTableBody');
    const headerParams = document.getElementById('subjects').querySelector('.filter-bar');

    // If no branch selected, show Branch Selection UI
    if (!selectedBranchId) {
        if (headerParams) headerParams.style.display = 'none'; // Hide filters/add button temporarily
        document.getElementById('branchModeHeader')?.remove(); // Cleanup

        container.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading Branches...</td></tr>';

        // Fetch branches to let user pick one
        try {
            const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                renderBranchSelector(container, 'subjects', data.branches);
            }
        } catch (e) { container.innerHTML = '<tr><td colspan="5">Error loading branches</td></tr>'; }
        return;
    }

    // If Branch SELECTED, show normal UI
    if (headerParams) headerParams.style.display = 'flex';
    updateBranchModeUI();

    try {
        let url = `${API_BASE}/subjects?branch=${selectedBranchId}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            subjects = data.subjects;
            renderSubjects(subjects);
            // Populate filter for Quizzes
            updateSubjectDropdowns();
        }
    } catch (error) {
        showNotification('Failed to load subjects', 'error');
    }
}

function renderBranchSelector(container, tabName, branches) {
    // Replace the entire TABLE with a Grid of Buttons
    // We need to target the parent of the table probably, or just replace body content.
    // Actually, let's replace the tbody with a big cell containing the grid.

    const html = `
        <tr>
            <td colspan="5" style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3><i class="fas fa-code-branch"></i> Select a Branch to manage ${tabName}</h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                    ${branches.map(b => `
                        <div onclick="selectBranchForTab('${b._id}', '${tabName}')" 
                             style="background: white; border: 2px solid #e0e0e0; border-radius: 15px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                            <div style="font-size: 40px; color: #667eea; margin-bottom: 15px;"><i class="fas fa-graduation-cap"></i></div>
                            <h4 style="margin: 0; color: #333;">${b.name}</h4>
                            <p style="color: #666; font-size: 13px; margin-top: 5px;">${b.description || ''}</p>
                        </div>
                    `).join('')}
                </div>
            </td>
        </tr>
    `;
    container.innerHTML = html;
}

function selectBranchForTab(branchId, tabName) {
    selectedBranchId = branchId;
    if (tabName === 'subjects') loadSubjects();
    if (tabName === 'quizzes') loadQuizzes();
}
window.selectBranchForTab = selectBranchForTab; // Expose

function updateBranchModeUI() {
    const container = document.getElementById('subjects');
    const existing = document.getElementById('branchModeHeader');
    if (existing) existing.remove();

    const header = document.createElement('div');
    header.id = 'branchModeHeader';
    header.style.cssText = 'background: #e3f2fd; padding: 15px; margin-bottom: 20px; border-radius: 10px; color: #0d47a1; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid #bbdefb;';

    // Find branch name
    // We might need to fetch it or finding from cache. For now just show "Selected Branch"
    // IMPROVEMENT: Fetch branch details if not available? 
    // We will trust the ID is valid.

    header.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <i class="fas fa-code-branch" style="font-size: 20px;"></i>
            <span style="font-size: 16px;">Viewing Branch: <span id="currentBranchName">${selectedBranchId}</span></span>
        </div>
        <button class="action-btn delete" onclick="clearBranchFilter()" style="padding: 8px 15px; font-size: 14px; background: white; color: #d32f2f; border: 1px solid #d32f2f;">
            <i class="fas fa-times"></i> Change Branch
        </button>
    `;

    // Try to update name asynchronously
    fetch(`${API_BASE}/branches/${selectedBranchId}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) document.getElementById('currentBranchName').innerText = d.branch.name; })
        .catch(() => { });

    // Insert after title
    const titleArea = container.querySelector('h3');
    titleArea?.parentNode?.insertBefore(header, titleArea.nextSibling);
}

function clearBranchFilter() {
    selectedBranchId = null;
    // Refresh current tab
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'subjects') loadSubjects();
    if (activeTab === 'quizzes') loadQuizzes();
}

// Function to enter Branch Mode (Called when clicking a branch in Branches Tab)
function viewBranchDashboard(branchId) {
    selectedBranchId = branchId;
    switchTab('subjects'); // Switch to subjects tab
    showNotification('Viewing Branch Subjects', 'info');
}

// Expose
window.clearBranchFilter = clearBranchFilter;
window.viewBranchDashboard = viewBranchDashboard;

function renderSubjects(subjects) {
    const tbody = document.getElementById('subjectsTableBody');
    if (!tbody) return;

    if (subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No subjects found. Add one!</td></tr>';
        return;
    }

    tbody.innerHTML = subjects.map(s => {
        // Handle multiple branches
        const branchBadges = s.branches && s.branches.length
            ? s.branches.map(b => `<span class="badge" style="background:${stringToColor(b.name || '?')}; margin-right:4px;">${b.name}</span>`).join('')
            : '<span class="badge">All</span>';

        return `
        <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.description || '-'}</td>
            <td>${branchBadges}</td>
            <td><span class="badge badge-success">Active</span></td>
            <td>
                <button class="action-btn edit" onclick="editSubject('${s._id}', '${s.name}', '${s.description || ''}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteSubject('${s._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

// Edit Subject
window.editSubject = async (id, currentName, currentDesc) => {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Subject',
        html:
            `<input id="swal-input1" class="swal2-input" placeholder="Subject Name" value="${currentName}">` +
            `<input id="swal-input2" class="swal2-input" placeholder="Description" value="${currentDesc}">`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value
            ]
        }
    });

    if (formValues) {
        try {
            const response = await fetch(`${API_BASE}/subjects/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: formValues[0], description: formValues[1] })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire('Updated!', 'Subject has been updated.', 'success');
                loadSubjects();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to update subject', 'error');
        }
    }
};

// --- USERS ---
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading Users...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found.</td></tr>';
                return;
            }

            tbody.innerHTML = ''; // Clear loading message
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="user-avatar-small" style="background:${user.status === 'active' ? 'var(--success)' : '#ccc'}">
                                ${user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>${user.fullName}</div>
                        </div>
                    </td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td style="font-family:monospace; color:#e83e8c;">${user.password || '******'}</td> <!-- Added Password -->
                    <td><span class="badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}">${user.status}</span></td>
                    <td>${new Date(user.createdAt || user.joinedAt).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteUser('${user._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading users: ${data.message || 'Unknown error'}</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading users:", error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load users. Network error.</td></tr>';
    }
}

// Helper to generate consistent color
function stringToColor(str) {
    if (!str) return '#ccc';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Open Subject Modal
async function showAddSubjectModal() {
    // Fetch branches for checkboxes
    let branchCheckboxes = '<p>No branches found. Create one fast!</p>';
    try {
        const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.branches.length) {
            branchCheckboxes = data.branches.map(b => {
                // Pre-select if current branch filter is active
                const isSelected = selectedBranchId && b._id === selectedBranchId;
                const checked = isSelected ? 'checked' : '';

                return `
                    <div style="margin-bottom: 8px; display: flex; align-items: center;">
                        <input type="checkbox" id="branch_${b._id}" name="subjectBranches" value="${b._id}" ${checked} style="width: auto; margin-right: 10px;">
                        <label for="branch_${b._id}" style="margin: 0; cursor: pointer;">${b.name}</label>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        console.error("Error fetching branches", e);
        branchCheckboxes = '<p style="color:red">Error loading branches.</p>';
    }

    const modalHtml = `
    <div id="addSubjectModal" class="modal active" style="display:flex;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Subject</h3>
                <button class="close-modal" type="button" id="closeSubjectModal">&times;</button>
            </div>
            <div class="form-group">
                <label>Subject Name</label>
                <input type="text" id="newSubjectName" class="form-control" placeholder="e.g. Mathematics">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="newSubjectDesc" class="form-control" placeholder="Description"></textarea>
            </div>
            <div class="form-group">
                <label>Branches <small>(Select at least one)</small></label>
                <div id="newSubjectBranches" style="border: 2px solid #e0e0e0; border-radius: 10px; padding: 15px; max-height: 200px; overflow-y: auto;">
                    ${branchCheckboxes}
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn btn-cancel" type="button" id="cancelSubjectModal">Cancel</button>
                <button class="modal-btn btn-confirm" type="button" id="btnCreateSubject">Create</button>
            </div>
        </div>
    </div>`;

    // Remove any existing modals first
    const existing = document.getElementById('addSubjectModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind Events Immediately - SAFE WAY
    const modal = document.getElementById('addSubjectModal');
    const closeBtn = document.getElementById('closeSubjectModal');
    const cancelBtn = document.getElementById('cancelSubjectModal');
    const createBtn = document.getElementById('btnCreateSubject');

    // Close Actions
    const closeFunc = () => modal.remove();
    closeBtn.onclick = closeFunc;
    cancelBtn.onclick = closeFunc;

    // Create Action
    createBtn.onclick = handleCreateSubject;

    // Focus Name Input
    setTimeout(() => document.getElementById('newSubjectName')?.focus(), 100);
}
window.showAddSubjectModal = showAddSubjectModal;

// Create Subject
async function handleCreateSubject() {
    const name = document.getElementById('newSubjectName').value;
    const description = document.getElementById('newSubjectDesc').value;

    // Get selected branches from checkboxes
    const checkboxes = document.querySelectorAll('input[name="subjectBranches"]:checked');
    let branches = Array.from(checkboxes).map(cb => cb.value);

    // If we are in a specific branch view (selectedBranchId), ensure it's included even if user unchecked it? 
    // Or did we force check? We didn't force disable. 
    // If the user unchecked it while inside that branch view, the subject won't appear there. 
    // But that might be intended. 
    // However, the prompt says: "by opening branch ., the admin can add new subject to that branch"
    // This implies intent. I'll trust the checkboxes. If they uncheck it, so be it.

    console.log('Creating Subject:', { name, description, branches }); // Debug Log

    if (!name) {
        alert('Subject Name is required');
        return;
    }
    if (branches.length === 0) {
        alert('Please select at least one branch');
        return;
    }

    const btn = document.getElementById('btnCreateSubject');
    if (btn) {
        btn.innerText = 'Creating...';
        btn.disabled = true;
    }

    try {
        console.log("Sending POST /subjects", { name, branches });
        const response = await fetch(`${API_BASE}/subjects`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, description, branches })
        });

        const data = await response.json();
        console.log("Create Subject Response:", data);

        if (data.success) {
            showNotification('Subject created successfully', 'success');
            document.getElementById('addSubjectModal').remove();
            loadSubjects();
        } else {
            if (data.message && data.message.includes('already exists')) {
                alert(`Error: Subject '${name}' already exists. Please choose a different name.`);
            } else {
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error("Subject Create Error:", error);
        alert('Network Error: ' + error.message);
    } finally {
        if (btn) {
            btn.innerText = 'Create';
            btn.disabled = false;
        }
    }
}
window.handleCreateSubject = handleCreateSubject;

// Don't overwrite handleCreateSubject since we replaced the modal logic entirely above
// We just need deleteSubject
async function deleteSubject(id) {
    if (!confirm("Delete this subject? This might delete associated quizzes!")) return;
    try {
        await fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        showNotification('Subject deleted', 'success');
        loadSubjects();
    } catch (e) { showNotification('Error deleting subject', 'error'); }
}

// --- QUIZZES ---
async function loadQuizzes() {
    const container = document.getElementById('quizzesTableBody');
    const headerParams = document.getElementById('quizzes').querySelector('.filter-bar');

    // ENFORCE BRANCH SELECTION
    if (!selectedBranchId) {
        if (headerParams) headerParams.style.display = 'none';
        document.getElementById('branchModeQuizHeader')?.remove(); // Cleanup unique ID for quiz header if any

        // Re-use logic for selector
        container.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading Branches...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                renderBranchSelector(container, 'quizzes', data.branches);
            }
        } catch (e) { container.innerHTML = '<tr><td colspan="6">Error loading branches</td></tr>'; }
        return;
    }

    // Branch Selected
    if (headerParams) headerParams.style.display = 'flex';

    // Inject Branch Header specifically for Quizzes tab (copy logic)
    const quizContainer = document.getElementById('quizzes');
    const existing = document.getElementById('branchModeQuizHeader');
    if (existing) existing.remove();

    const header = document.createElement('div');
    header.id = 'branchModeQuizHeader';
    header.style.cssText = 'background: #e3f2fd; padding: 15px; margin-bottom: 20px; border-radius: 10px; color: #0d47a1; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid #bbdefb;';

    header.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <i class="fas fa-code-branch" style="font-size: 20px;"></i>
            <span style="font-size: 16px;">Viewing Quizzes for Branch ID: ${selectedBranchId}</span>
        </div>
        <button class="action-btn delete" onclick="clearBranchFilter()" style="padding: 8px 15px; font-size: 14px; background: white; color: #d32f2f; border: 1px solid #d32f2f;">
            <i class="fas fa-times"></i> Change Branch
        </button>
    `;
    // Update name
    fetch(`${API_BASE}/branches/${selectedBranchId}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) header.querySelector('span').innerHTML = `Viewing Quizzes for: ${d.branch.name}`; });

    const titleArea = quizContainer.querySelector('h3');
    titleArea?.parentNode?.insertBefore(header, titleArea.nextSibling);

    try {
        const subjectId = document.getElementById('quizSubjectFilter')?.value;
        let url = `${API_BASE}/quizzes`;
        if (subjectId) url += `?subjectId=${subjectId}`;

        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            quizzes = data.quizzes;

            // Client-side filter to ensure quizzes belong to subjects of this branch
            // We need to fetch subjects of this branch first to know which quizzes to show? 
            // Or rely on the 'subject' population in quiz.
            // Quiz has 'subject' populated. 'Subject' has 'branches' array.
            // But populate usually returns name/id. We updated subjectRoutes to return branches.
            // Let's check if Quiz object has Subject.branches embedded? 
            // Quiz Model populates 'subject'. 
            // In quizRoutes: .populate('subject', 'name') -> ONLY name is populated! 
            // We need to update backend to populate branches too OR fetch full subjects list and filter.

            // Strategy: Fetch Subjects for this branch. Filter Quizzes whose subject ID is in that list.
            const subjectRes = await fetch(`${API_BASE}/subjects?branch=${selectedBranchId}`, { headers: getAuthHeaders() });
            const subjectData = await subjectRes.json();

            if (subjectData.success) {
                const validSubjectIds = subjectData.subjects.map(s => s._id);
                quizzes = quizzes.filter(q => validSubjectIds.includes(q.subject?._id || q.subject));

                // Also update the dropdown to only show these subjects
                const select = document.getElementById('quizSubjectFilter');
                if (select) {
                    select.innerHTML = '<option value="">All Subjects</option>' +
                        subjectData.subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
                }
            }

            renderQuizzes();
        }
    } catch (e) { showNotification('Failed to load quizzes', 'error'); }
}

function renderQuizzes() {
    const tbody = document.getElementById('quizzesTableBody');
    tbody.innerHTML = quizzes.map(q => `
        <tr>
            <td><strong>${q.title}</strong></td>
            <td>${q.subject?.name || 'Unknown'}</td>
            <td><span class="badge badge-${q.difficulty}">${q.difficulty}</span></td>
            <td>${q.timeLimit} min</td>
            <td>${q.passingScore}%</td>
            <td>
                <button class="action-btn edit" onclick="prepareEditQuiz('${q._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn edit" onclick="openQuizEditor('${q._id}', '${q.title.replace(/'/g, "\\'")}')"><i class="fas fa-list"></i> Qs</button>
                <button class="action-btn delete" onclick="deleteQuiz('${q._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Prepare Edit Quiz (Fetch Data First)
window.prepareEditQuiz = async (id) => {
    try {
        // Show loading
        Swal.fire({ title: 'Loading...', didOpen: () => Swal.showLoading() });

        const response = await fetch(`${API_BASE}/quizzes/${id}`, { headers: getAuthHeaders() });
        const data = await response.json();

        Swal.close();

        if (data.success) {
            editQuiz(data.quiz);
        } else {
            Swal.fire('Error', 'Failed to fetch quiz details', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error', 'error');
    }
};

// Edit Quiz Modal
window.editQuiz = async (quiz) => {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Quiz Details',
        html:
            `<label>Title</label><input id="swal-quiz-title" class="swal2-input" value="${quiz.title}">` +
            `<label>Time Limit (min)</label><input id="swal-quiz-time" type="number" class="swal2-input" value="${quiz.timeLimit}">` +
            `<label>Passing Score (%)</label><input id="swal-quiz-score" type="number" class="swal2-input" value="${quiz.passingScore}">` +
            `<label>Difficulty</label><select id="swal-quiz-diff" class="swal2-input">
                <option value="easy" ${quiz.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                <option value="medium" ${quiz.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="hard" ${quiz.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
            </select>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                title: document.getElementById('swal-quiz-title').value,
                timeLimit: document.getElementById('swal-quiz-time').value,
                passingScore: document.getElementById('swal-quiz-score').value,
                difficulty: document.getElementById('swal-quiz-diff').value
            }
        }
    });

    if (formValues) {
        try {
            const response = await fetch(`${API_BASE}/quizzes/${quiz._id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formValues)
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire('Updated!', 'Quiz details updated.', 'success');
                loadQuizzes();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to update quiz', 'error');
        }
    }
};

// Open Quiz Modal
function showAddQuizModal() {
    // Populate subjects dropdown in quiz modal
    const select = document.getElementById('quizSubjectSelect');
    select.innerHTML = '<option value="">Select a Subject...</option>' +
        subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');

    openModal('addQuizModal');
}
window.showAddQuizModal = showAddQuizModal;

// Handle Quiz Creation
async function handleCreateQuiz(e) {
    e.preventDefault();

    const title = document.getElementById('quizTitle').value;
    const subject = document.getElementById('quizSubjectSelect').value;
    const difficulty = document.getElementById('quizDifficulty').value;
    const timeLimit = document.getElementById('quizTimeLimit').value;
    const passingScore = document.getElementById('quizPassingScore').value;

    if (!subject) {
        showNotification('Please select a subject', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quizzes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                subject,
                difficulty,
                timeLimit: parseInt(timeLimit),
                passingScore: parseInt(passingScore)
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Quiz created successfully', 'success');
            closeModal('addQuizModal');
            document.getElementById('addQuizForm').reset();
            loadQuizzes();
            loadDashboardStats(); // Refresh stats to update quiz count
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) { showNotification('Error creating quiz', 'error'); }
}
window.handleCreateQuiz = handleCreateQuiz;

// Import Quiz Modal
function showImportQuizModal() {
    const select = document.getElementById('importQuizSubjectSelect');
    select.innerHTML = '<option value="">Select a Subject...</option>' +
        subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');

    openModal('importQuizModal');
}
window.showImportQuizModal = showImportQuizModal;

async function handleImportQuiz(e) {
    e.preventDefault();

    const subjectId = document.getElementById('importQuizSubjectSelect').value;
    const fileInput = document.getElementById('quizFile');
    const file = fileInput.files[0];

    if (!file) return showNotification('Please select a file', 'error');

    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            const json = JSON.parse(event.target.result);

            // Merge subjectId
            json.subject = subjectId;

            const response = await fetch(`${API_BASE}/quizzes/import`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(json)
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Quiz imported successfully', 'success');
                closeModal('importQuizModal');
                document.getElementById('importQuizForm').reset();
                loadQuizzes();
                loadDashboardStats();
            } else {
                showNotification(data.message || 'Import failed', 'error');
            }
        } catch (error) {
            showNotification('Invalid JSON file', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
}
window.handleImportQuiz = handleImportQuiz;

async function deleteQuiz(id) {
    if (!confirm("Delete this quiz? This will delete all questions and results associated with it.")) return;
    try {
        const response = await fetch(`${API_BASE}/quizzes/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Quiz deleted successfully', 'success');
            loadQuizzes();
            loadDashboardStats();
        } else {
            showNotification(data.message || 'Failed to delete quiz', 'error');
        }
    } catch (e) {
        showNotification('Error deleting quiz', 'error');
        console.error(e);
    }
}

// --- SETTINGS TAB (Quiz Timing Manager) ---

// 1. Load Branches when entering Settings Tab
async function loadSettingsBranches() {
    const select = document.getElementById('settingBranchSelect');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (data.success) {
            select.innerHTML = '<option value="">-- Choose Branch --</option>' +
                data.branches.map(b => `<option value="${b._id}">${b.name}</option>`).join('');
        }
    } catch (e) {
        console.error("Error loading branches for settings", e);
    }
}

// 2. Load Subjects when Branch Selected
async function loadSettingsSubjects() {
    const branchId = document.getElementById('settingBranchSelect').value;
    const subjectGroup = document.getElementById('settingSubjectGroup');
    const select = document.getElementById('settingSubjectSelect');

    // Reset downstream
    select.innerHTML = '<option value="">-- Choose Subject --</option>';
    document.getElementById('settingQuizSelect').innerHTML = '<option value="">-- Choose Quiz --</option>';
    document.getElementById('settingQuizGroup').style.opacity = '0.5';
    document.getElementById('settingQuizGroup').style.pointerEvents = 'none';
    document.getElementById('settingEditor').style.display = 'none';

    if (!branchId) {
        subjectGroup.style.opacity = '0.5';
        subjectGroup.style.pointerEvents = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/subjects?branch=${branchId}`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (data.success) {
            select.innerHTML = '<option value="">-- Choose Subject --</option>' +
                data.subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');

            // Enable
            subjectGroup.style.opacity = '1';
            subjectGroup.style.pointerEvents = 'all';
        }
    } catch (e) { console.error(e); }
}

// 3. Load Quizzes when Subject Selected
async function loadSettingsQuizzes() {
    const subjectId = document.getElementById('settingSubjectSelect').value;
    const quizGroup = document.getElementById('settingQuizGroup');
    const select = document.getElementById('settingQuizSelect');

    // Reset downstream
    select.innerHTML = '<option value="">-- Choose Quiz --</option>';
    document.getElementById('settingEditor').style.display = 'none';

    if (!subjectId) {
        quizGroup.style.opacity = '0.5';
        quizGroup.style.pointerEvents = 'none';
        return;
    }

    try {
        // Fetch ALL quizzes then filter by subject (or use query param if supported)
        // Using existing endpoint
        const res = await fetch(`${API_BASE}/quizzes`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (data.success) {
            const filtered = data.quizzes.filter(q => (q.subject?._id || q.subject) === subjectId);

            select.innerHTML = '<option value="">-- Choose Quiz --</option>' +
                filtered.map(q => `<option value="${q._id}">${q.title}</option>`).join('');

            // Enable
            quizGroup.style.opacity = '1';
            quizGroup.style.pointerEvents = 'all';
        }
    } catch (e) { console.error(e); }
}

// 4. Load Quiz Details for Editing
async function loadSettingsQuizDetails() {
    const quizId = document.getElementById('settingQuizSelect').value;
    const editor = document.getElementById('settingEditor');

    if (!quizId) {
        editor.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/quizzes/${quizId}`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (data.success) {
            const q = data.quiz;
            document.getElementById('settingQuizName').textContent = q.title;
            document.getElementById('settingTimeLimit').value = q.timeLimit || 0;
            document.getElementById('settingPassingScore').value = q.passingScore || 0;

            editor.style.display = 'block';
        }
    } catch (e) { console.error(e); }
}

// 5. Save Changes
async function saveQuizSettings() {
    const quizId = document.getElementById('settingQuizSelect').value;
    const timeLimit = document.getElementById('settingTimeLimit').value;
    const passingScore = document.getElementById('settingPassingScore').value;

    if (!quizId) return;

    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                timeLimit: parseInt(timeLimit),
                passingScore: parseInt(passingScore)
            })
        });

        const data = await response.json();
        if (data.success) {
            Swal.fire('Success', 'Quiz timing updated successfully!', 'success');
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Failed to save settings', 'error');
    }
}

// Expose these functions to window
window.loadSettingsBranches = loadSettingsBranches;
window.loadSettingsSubjects = loadSettingsSubjects;
window.loadSettingsQuizzes = loadSettingsQuizzes;
window.loadSettingsQuizDetails = loadSettingsQuizDetails;
window.saveQuizSettings = saveQuizSettings;

async function loadQuizQuestions(quizId) {
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}/admin`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            renderQuizQuestions(data.questions);
        }
    } catch (e) { showNotification('Failed to load questions', 'error'); }
}

function renderQuizQuestions(questions) {
    const tbody = document.getElementById('quizQuestionsBody');
    if (questions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No questions in this quiz. Add one!</td></tr>';
        return;
    }

    tbody.innerHTML = questions.map(q => `
        <tr>
            <td>${q.questionText}</td>
            <td>
                <ul style="list-style:none; padding:0; font-size:0.9em;">
                    ${q.options.map(opt => `
                        <li style="${opt.isCorrect ? 'color:green; font-weight:bold;' : ''}">
                            ${opt.text} ${opt.isCorrect ? '✔' : ''}
                        </li>
                    `).join('')}
                </ul>
            </td>
            <td>
                <button class="action-btn delete" onclick="deleteQuestion('${q._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Open Add Question Modal
function showAddQuestionModal() {
    if (!currentQuizId) return showNotification('No quiz selected', 'error');
    openModal('addQuestionModal');
}
window.showAddQuestionModal = showAddQuestionModal;

// Handle Question Creation via Modal
async function handleCreateQuestion(e) {
    e.preventDefault();

    const questionText = document.getElementById('modalQuestionText').value;
    const optionInputs = document.querySelectorAll('input[name="modalOptionText"]');
    const correctOptionIndex = document.querySelector('input[name="modalCorrectOption"]:checked').value;

    // Construct options array
    const options = Array.from(optionInputs).map((input, index) => ({
        text: input.value,
        isCorrect: index.toString() === correctOptionIndex
    }));

    await saveQuestion({
        quiz: currentQuizId,
        questionText,
        options,
        difficulty: 'medium' // Determine or inherited from quiz? For now default.
    });

    closeModal('addQuestionModal');
    document.getElementById('addQuestionModalForm').reset();
}

async function saveQuestion(payload) {
    try {
        console.log('Saving question with payload:', payload);
        console.log('Current quiz ID:', currentQuizId);

        const response = await fetch(`${API_BASE}/quizzes/${currentQuizId}/questions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log('Question save response:', data);
        
        if (data.success) {
            showNotification('Question Added', 'success');
            loadQuizQuestions(currentQuizId);
        } else {
            showNotification('Failed to add question: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (e) { 
        console.error('Error saving question:', e);
        showNotification('Failed to add question: ' + e.message, 'error');
    }
}

async function deleteQuestion(qId) {
    if (!confirm("Delete question?")) return;
    try {
        const response = await fetch(`${API_BASE}/quizzes/${currentQuizId}/questions/${qId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            loadQuizQuestions(currentQuizId);
        }
    } catch (e) { }
}

// Open Quiz Editor
function openQuizEditor(quizId, quizTitle) {
    currentQuizId = quizId;
    document.getElementById('editorQuizTitle').textContent = quizTitle;
    switchTab('quizEditor');
    loadQuizQuestions(quizId);
}

// --- ADMINS ---
async function loadAdmins() {
    try {
        const response = await fetch(`${API_BASE}/admin/admins`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const tbody = document.getElementById('adminsTableBody');
            tbody.innerHTML = data.admins.map(a => `
                <tr>
                    <td>${a.username}</td>
                    <td>${a.email}</td>
                    <td>${a.role}</td>
                    <td>${a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : 'Never'}</td>
                </tr>
            `).join('');
        }
    } catch (e) { showNotification('Access Denied', 'error'); }
}

// Handle Create Admin via Modal
async function handleCreateAdmin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch(`${API_BASE}/admin/create-subadmin`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Sub-Admin Created Successfully', 'success');
            closeModal('addAdminModal');
            document.getElementById('addAdminForm').reset();
            loadAdmins();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) { showNotification('Error creating admin', 'error'); }
}

function showAddAdminModal() {
    openModal('addAdminModal');
}
window.showAddAdminModal = showAddAdminModal;

// --- USERS ---
async function loadUsers() {
    try {
        const filterStatus = document.getElementById('userFilter')?.value || 'all';
        const searchTerm = document.getElementById('searchUser')?.value || '';

        // If filter is explicitly 'pending', use the specific pending endpoint or filter the general one
        // The backend has /admin/users which accepts status query param
        let url = `${API_BASE}/admin/users?status=${filterStatus}`;
        if (searchTerm) url += `&search=${searchTerm}`;

        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;

            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = data.users.map(u => {
                const joinedDate = new Date(u.createdAt || u.submittedAt).toLocaleDateString();
                // Check if expiresAt exists and format, or show 'Unlimited'
                const expiresDate = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : 'Unlimited';
                let statusBadge = '';

                if (u.status === 'pending') statusBadge = '<span class="badge badge-medium">Pending</span>';
                else if (u.status === 'active') statusBadge = '<span class="badge badge-easy">Active</span>';
                else if (u.status === 'suspended') statusBadge = '<span class="badge badge-hard">Suspended</span>';
                else statusBadge = `<span class="badge">${u.status}</span>`;

                let actions = '';
                if (u.status === 'pending') {
                    actions = `
                        <button class="action-btn edit" onclick="approveUser('${u._id}')" title="Approve"><i class="fas fa-check"></i></button>
                        <button class="action-btn delete" onclick="rejectUser('${u._id}')" title="Reject"><i class="fas fa-times"></i></button>
                    `;
                } else if (u.status === 'active') {
                    // Added Edit Date action
                    actions = `
                        <button class="action-btn edit" onclick="editUserExpiry('${u._id}', '${u.expiresAt || ''}')" title="Edit Expiry"><i class="fas fa-calendar-alt"></i></button>
                        <button class="action-btn delete" onclick="deleteUser('${u._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    `;
                }

                return `
                <tr>
                    <td><strong>${u.fullName || u.username}</strong></td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td>${statusBadge}</td>
                    <td>${joinedDate}</td>
                    <td style="color: ${u.expiresAt ? '#e11d48' : '#10b981'}; font-weight: 500;">${expiresDate}</td>
                    <td>
                        <div class="action-buttons">
                            ${actions}
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        }
    } catch (e) {
        showNotification('Failed to load users', 'error');
        console.error(e);
    }
}

// New Approve User with Expiry Modal
let userToApproveId = null;

function approveUser(id) {
    userToApproveId = id;

    // Create Modal if not exists
    let modal = document.getElementById('approveUserModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'approveUserModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="margin-bottom: 20px;">Approve User</h3>
                <p>Set an expiration date for this user (Optional).</p>
                <p style="font-size: 0.9em; color: #666; margin-bottom: 20px;">
                    Users will be automatically deleted after this date.
                </p>
                
                <div class="form-group" style="text-align: left;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Expiration Date</label>
                    <input type="date" id="approveUserExpiry" class="form-control" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <small style="color: #888;">Leave blank for no expiration (permanent access)</small>
                </div>
                
                <div class="modal-actions" style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="modal-btn btn-cancel" onclick="closeApproveModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button class="modal-btn btn-confirm" onclick="confirmApproveUser()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Approve Access</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Reset date input
    document.getElementById('approveUserExpiry').value = '';

    // Show modal
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeApproveModal() {
    const modal = document.getElementById('approveUserModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    userToApproveId = null;
}

async function confirmApproveUser() {
    if (!userToApproveId) return;

    const expiryDate = document.getElementById('approveUserExpiry').value;
    const btn = document.querySelector('#approveUserModal .btn-confirm');
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/admin/approve-user/${userToApproveId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ expiresAt: expiryDate || null })
        });
        const data = await response.json();

        if (data.success) {
            showNotification('User approved successfully', 'success');
            closeApproveModal();
            loadUsers();
            loadDashboardStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) {
        showNotification('Error approving user', 'error');
        console.error(e);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function rejectUser(id) {
    const reason = prompt("Enter a reason for rejection (optional):");
    if (reason === null) return; // Cancelled

    try {
        const response = await fetch(`${API_BASE}/admin/reject-user/${id}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ rejectionReason: reason })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('User rejected', 'success');
            loadUsers();
            loadDashboardStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) { showNotification('Error rejecting user', 'error'); }
}

async function deleteUser(id) {
    if (!confirm("Delete this user permanently?")) return;
    try {
        const response = await fetch(`${API_BASE}/admin/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            showNotification('User deleted', 'success');
            loadUsers();
            loadDashboardStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) { showNotification('Error deleting user', 'error'); }
}

// Search and Filter Handlers
window.filterUsers = loadUsers;
window.searchUsers = () => {
    // Debounce could be added here
    loadUsers();
};
// Make functions global
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.deleteUser = deleteUser;


// Shared Utils
function updateSubjectDropdowns() {
    const select = document.getElementById('quizSubjectFilter');
    if (select) {
        select.innerHTML = '<option value="">All Subjects</option>' +
            subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    }
}

// Exported functions
window.switchTab = switchTab;
window.loadSubjects = loadSubjects;
window.loadQuizzes = loadQuizzes;
window.loadAdmins = loadAdmins;
window.openQuizEditor = openQuizEditor;
window.deleteSubject = deleteSubject;
window.deleteQuiz = deleteQuiz;
// --- EDIT EXPIRY MODAL ---
let userToEditId = null;

function editUserExpiry(userId, currentExpiry) {
    userToEditId = userId;

    let modal = document.getElementById('editExpiryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'editExpiryModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="margin-bottom: 20px;">Modify Access Duration</h3>
                <div class="form-group" style="text-align: left;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">New Expiration Date</label>
                    <input type="date" id="editExpiryDate" class="form-control" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <small style="color: #888;">Clear to make access permanent (Unlimited)</small>
                </div>
                <div class="modal-actions" style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="modal-btn btn-cancel" onclick="closeEditExpiryModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button class="modal-btn btn-confirm" onclick="confirmEditExpiry()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Update</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Set current value if exists (format YYYY-MM-DD)
    const input = document.getElementById('editExpiryDate');
    if (currentExpiry && currentExpiry !== 'undefined' && currentExpiry !== 'null') {
        const date = new Date(currentExpiry);
        if (!isNaN(date)) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            input.value = `${yyyy}-${mm}-${dd}`;
        } else { input.value = ''; }
    } else {
        input.value = '';
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeEditExpiryModal() {
    const modal = document.getElementById('editExpiryModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    userToEditId = null;
}

async function confirmEditExpiry() {
    if (!userToEditId) return;

    const expiryDate = document.getElementById('editExpiryDate').value;
    const btn = document.querySelector('#editExpiryModal .btn-confirm');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userToEditId}/expiry`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ expiresAt: expiryDate || null })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Access duration updated', 'success');
            closeEditExpiryModal();
            loadUsers(); // Refresh table
        } else {
            showNotification(data.message || 'Failed to update', 'error');
        }
    } catch (e) {
        showNotification('Server Error', 'error');
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update';
    }
}

window.editUserExpiry = editUserExpiry;
window.closeEditExpiryModal = closeEditExpiryModal;
window.confirmEditExpiry = confirmEditExpiry;

window.deleteQuestion = deleteQuestion;

window.adminLogout = function () {
    if (confirm("Logout?")) {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminData');
        window.location.href = 'admin-login.html';
    }
};

// --- QUESTIONS BANK ---
// --- QUESTIONS BANK (Hierarchical) ---
async function initQuestionsTab() {
    // Populate Subject Filter if empty
    const subjectSelect = document.getElementById('questionSubjectFilter');
    if (subjectSelect && subjectSelect.options.length <= 1) {
        try {
            const res = await fetch(`${API_BASE}/subjects`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                subjectSelect.innerHTML = '<option value="">Select Subject...</option>' +
                    data.subjects.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
            }
        } catch (e) { console.error('Error loading subjects for questions tab', e); }
    }
}

async function onQuestionSubjectChange() {
    const subjectId = document.getElementById('questionSubjectFilter').value;
    const quizSelect = document.getElementById('questionQuizFilter');
    const tableBody = document.getElementById('questionsNavTableBody');
    const addBtn = document.getElementById('btnAddQuestionNav');

    // Reset Quiz Filter
    quizSelect.innerHTML = '<option value="">Select Quiz...</option>';
    quizSelect.disabled = true;

    // Reset Table
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding:20px; color:#666;"><i class="fas fa-level-up-alt"></i> Please select a Subject and Quiz above to view questions</td></tr>';
    if (addBtn) addBtn.style.display = 'none';

    if (!subjectId) return;

    try {
        // Fetch ALL quizzes then filter by subject (or use query param if supported)
        const response = await fetch(`${API_BASE}/quizzes`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            // Filter client side to be safe, or if API doesn't filtering
            const filteredQuizzes = data.quizzes.filter(q => (q.subject?._id || q.subject) === subjectId);

            if (filteredQuizzes.length === 0) {
                quizSelect.innerHTML = '<option value="">No quizzes in this subject</option>';
            } else {
                quizSelect.innerHTML = '<option value="">Select Quiz...</option>' +
                    filteredQuizzes.map(q => `<option value="${q._id}">${q.title}</option>`).join('');
                quizSelect.disabled = false;
            }
        }
    } catch (e) { console.error(e); }
}

async function onQuestionQuizChange() {
    const quizId = document.getElementById('questionQuizFilter').value;
    const addBtn = document.getElementById('btnAddQuestionNav');
    const tableBody = document.getElementById('questionsNavTableBody');

    if (!quizId) {
        currentQuizId = null;
        addBtn.style.display = 'none';
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding:20px; color:#666;"><i class="fas fa-level-up-alt"></i> Please select a Subject and Quiz above to view questions</td></tr>';
        return;
    }

    currentQuizId = quizId;
    addBtn.style.display = 'block'; // Show Add Button

    // Load Questions for this quiz into the nav table
    loadQuizQuestions(quizId, 'questionsNavTableBody');
}

// Modify loadQuizQuestions to accept target table - Re-declared to ensure correct scope
async function loadQuizQuestions(quizId, targetTableId = 'quizQuestionsBody') {
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}/admin`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            renderQuizQuestions(data.questions, targetTableId);
        }
    } catch (e) { showNotification('Failed to load questions', 'error'); }
}

// Modify renderQuizQuestions to accept target table
function renderQuizQuestions(questions, targetTableId = 'quizQuestionsBody') {
    const tbody = document.getElementById(targetTableId);
    if (!tbody) return;

    if (questions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No questions in this quiz. Add one!</td></tr>';
        return;
    }

    tbody.innerHTML = questions.map(q => `
        <tr>
            <td>${q.questionText}</td>
            <td>
                <ul style="list-style:none; padding:0; font-size:0.9em;">
                    ${q.options.map(opt => `
                        <li style="${opt.isCorrect ? 'color:green; font-weight:bold;' : ''}">
                            ${opt.text} ${opt.isCorrect ? '✔' : ''}
                        </li>
                    `).join('')}
                </ul>
            </td>
            <td>
                <button class="action-btn delete" onclick="deleteQuestion('${q._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Re-map loadAllQuestions for switchTab compatibility
window.loadAllQuestions = initQuestionsTab;
window.onQuestionSubjectChange = onQuestionSubjectChange;
window.onQuestionQuizChange = onQuestionQuizChange;

// --- BRANCH MANAGEMENT ---
async function loadBranches() {
    try {
        const response = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            renderBranches(data.branches);
        }
    } catch (e) {
        showNotification('Failed to load branches', 'error');
    }
}

function renderBranches(branches) {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;

    if (branches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No branches found. Add one!</td></tr>';
        return;
    }

    tbody.innerHTML = branches.map(b => `
        <tr>
            <td><strong>${b.name}</strong></td>
            <td>${b.description || '-'}</td>
            <td><span class="badge badge-success">Active</span></td>
            <td>
                <button class="action-btn edit" onclick="viewBranchDashboard('${b._id}')" title="View Subjects"><i class="fas fa-external-link-alt"></i> Open</button>
                <button class="action-btn delete" onclick="deleteBranch('${b._id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function showAddBranchModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'addBranchModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add New Branch</h3>
            <div class="form-group">
                <label>Branch Name</label>
                <input type="text" id="newBranchName" class="form-control" placeholder="e.g. CSE, ECE">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="newBranchDesc" class="form-control" placeholder="Optional description"></textarea>
            </div>
            <div class="modal-actions">
                <button class="modal-btn btn-cancel" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="modal-btn btn-confirm" onclick="createBranch()">Create</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function createBranch() {
    const name = document.getElementById('newBranchName').value;
    const description = document.getElementById('newBranchDesc').value;

    if (!name) return showNotification('Branch name is required', 'error');

    try {
        const response = await fetch(`${API_BASE}/branches`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, description })
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Branch created successfully', 'success');
            document.getElementById('addBranchModal').remove();
            loadBranches();
        } else {
            showNotification(data.message || 'Failed to create branch', 'error');
        }
    } catch (e) {
        showNotification('Server Error', 'error');
    }
}

async function deleteBranch(id) {
    if (!confirm('Delete this branch? Only do this if no users/subjects are linked.')) return;
    try {
        await fetch(`${API_BASE}/branches/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        showNotification('Branch deleted', 'success');
        loadBranches();
    } catch (e) { showNotification('Failed to delete', 'error'); }
}

// Expose functions
window.loadBranches = loadBranches;
window.createBranch = createBranch;
window.deleteBranch = deleteBranch;
window.showAddBranchModal = showAddBranchModal;
// window.showAddSubjectModal is already assigned earlier to the correct version

function showNotification(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return alert(msg); // Fallback

    const toast = document.createElement('div');
    toast.className = `notification ${type}`; // Reusing existing CSS classes or adding inline
    toast.style.cssText = `
        background: ${type === 'success' ? '#43e97b' : type === 'error' ? '#ff416c' : '#667eea'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        margin-bottom: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
        min-width: 300px;
    `;

    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${msg}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal Helpers
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Global exports for Modal Usage
// Global exports for Modal Usage
window.openModal = openModal;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.handleCreateSubject = handleCreateSubject; // Reverted name
window.handleCreateQuiz = handleCreateQuiz;
window.handleCreateQuestion = handleCreateQuestion;
window.handleCreateAdmin = handleCreateAdmin;

// Ensure switchTab is globally available
window.switchTab = switchTab;
window.loadUsers = loadUsers;
window.closeApproveModal = closeApproveModal;
window.confirmApproveUser = confirmApproveUser;