// ==========================================
// Jyotish Calendar - New Admin Workflow
// Part 1: Core, Auth & Workflow State
// ==========================================

// Global State
let currentView = 'public';
let currentViewType = 'calendar';
let currentDate = new Date();
let currentUser = null;
let totpSecret = null;
let user2FAEnabled = false;

// Admin Workflow State
let workflowStep = 0;
let adminCurrentDate = new Date();
let selectedFromDate = null;
let selectedToDate = null;
let selectedFromTime = null;
let selectedToTime = null;
let selectedGoodColors = [];
let selectedBadColors = [];
let isBadTime = false;

// Color Palette - Fixed 16 colors
const COLOR_PALETTE = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#008000', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FFA500', // Orange
    '#800080', // Purple
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#808080', // Gray
    '#800000', // Maroon
    '#000080', // Navy
    '#A52A2A', // Brown
    '#FFC0CB', // Pink
    '#4B0082'  // Indigo
];

// Collections
const ENTRIES_COLLECTION = 'calendar_entries';
const USER_SETTINGS_COLLECTION = 'user_settings';

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupAuthListener();
});

function initializeApp() {
    showPublicView();
}

// ==========================================
// Auth Listener
// ==========================================
function setupAuthListener() {
    if (typeof auth === 'undefined') return;

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user && user.providerData && user.providerData[0] && user.providerData[0].providerId === 'google.com') {
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl) userInfoEl.style.display = 'flex';
            const userPhotoEl = document.getElementById('userPhoto');
            if (userPhotoEl) userPhotoEl.src = user.photoURL || '';
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = user.displayName || 'Admin';
            closeLoginModal();
            check2FAStatus();
        } else {
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl) userInfoEl.style.display = 'none';
            user2FAEnabled = false;
            if (currentView === 'admin') {
                showPublicView();
                currentView = 'public';
                updateAdminToggleButton();
            }
        }
    });
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    if (adminToggleBtn) adminToggleBtn.addEventListener('click', toggleAdminMode);

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) googleSignInBtn.addEventListener('click', signInWithGoogle);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleView);

    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    const adminPrevMonth = document.getElementById('adminPrevMonth');
    const adminNextMonth = document.getElementById('adminNextMonth');
    if (adminPrevMonth) adminPrevMonth.addEventListener('click', () => navigateAdminMonth(-1));
    if (adminNextMonth) adminNextMonth.addEventListener('click', () => navigateAdminMonth(1));

    const verify2FABtn = document.getElementById('verify2FABtn');
    if (verify2FABtn) verify2FABtn.addEventListener('click', verify2FASetup);

    const submit2FABtn = document.getElementById('submit2FABtn');
    if (submit2FABtn) submit2FABtn.addEventListener('click', verify2FACode);

    window.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// ==========================================
// Authentication
// ==========================================
function signInWithGoogle() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        showToast('Auth not available', 'error');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => {
            showToast('Signed in successfully!', 'success');
            closeLoginModal();
        })
        .catch((error) => {
            console.error('Sign in error:', error);
            showToast('Sign in failed. Please try again.', 'error');
        });
}

function logout() {
    if (!auth) return;
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully', 'info');
            showPublicView();
            currentView = 'public';
            user2FAEnabled = false;
            updateAdminToggleButton();
        })
        .catch((error) => {
            console.error('Logout error:', error);
            showToast('Logout failed', 'error');
        });
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// 2FA Functions
// ==========================================
function check2FAStatus() {
    if (!currentUser) return;
    
    db.collection(USER_SETTINGS_COLLECTION)
        .doc(currentUser.uid)
        .get()
        .then((doc) => {
            if (doc.exists && doc.data().totpSecret) {
                user2FAEnabled = true;
                totpSecret = doc.data().totpSecret;
            } else {
                user2FAEnabled = false;
            }
        })
        .catch((error) => {
            console.error('Error checking 2FA status:', error);
        });
}

function open2FASetupModal() {
    if (!currentUser) return;
    
    const secret = generateTOTPSecret();
    totpSecret = secret;
    
    const otpauthUrl = `otpauth://totp/JyotishCalendar:${currentUser.email}?secret=${secret}&issuer=JyotishCalendar`;
    
const container = document.getElementById('qrCodeContainer');

if (container && typeof QRCode !== 'undefined') {
    // Clear previous QR if any
    container.innerHTML = "";

    new QRCode(container, {
        text: otpauthUrl,
        width: 250,
        height: 250
    });
}

    
    const secretKeyDisplay = document.getElementById('secretKeyDisplay');
    if (secretKeyDisplay) {
        secretKeyDisplay.textContent = formatSecretKey(secret);
    }
    
    const modal = document.getElementById('setup2FAModal');
    if (modal) modal.classList.add('active');
}

function close2FASetupModal() {
    const modal = document.getElementById('setup2FAModal');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('verifyOtpInput');
    if (input) input.value = '';
}

function verify2FASetup() {
    const otpInput = document.getElementById('verifyOtpInput');
    if (!otpInput || !otpInput.value) {
        showToast('Please enter the 6-digit code', 'error');
        return;
    }
    
    const code = otpInput.value.trim();
    if (code.length !== 6) {
        showToast('Code must be 6 digits', 'error');
        return;
    }
    
    if (verifyTOTP(totpSecret, code)) {
        db.collection(USER_SETTINGS_COLLECTION)
            .doc(currentUser.uid)
            .set({
                totpSecret: totpSecret,
                enabled2FA: true,
                setupDate: firebase.firestore.Timestamp.now()
            })
            .then(() => {
                user2FAEnabled = true;
                close2FASetupModal();
                showToast('2FA enabled successfully!', 'success');
                proceedToAdminMode();
            })
            .catch((error) => {
                console.error('Error saving 2FA:', error);
                showToast('Error enabling 2FA', 'error');
            });
    } else {
        showToast('Invalid code. Please try again.', 'error');
    }
}

function open2FAVerifyModal() {
    const modal = document.getElementById('verify2FAModal');
    if (modal) modal.classList.add('active');
    const input = document.getElementById('otp2FAInput');
    if (input) input.focus();
}

function close2FAVerifyModal() {
    const modal = document.getElementById('verify2FAModal');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('otp2FAInput');
    if (input) input.value = '';
}

function verify2FACode() {
    const otpInput = document.getElementById('otp2FAInput');
    if (!otpInput || !otpInput.value) {
        showToast('Please enter the 6-digit code', 'error');
        return;
    }
    
    const code = otpInput.value.trim();
    if (code.length !== 6) {
        showToast('Code must be 6 digits', 'error');
        return;
    }
    
    if (verifyTOTP(totpSecret, code)) {
        close2FAVerifyModal();
        showToast('Verified successfully!', 'success');
        proceedToAdminMode();
    } else {
        showToast('Invalid code. Please try again.', 'error');
    }
}

function generateTOTPSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

function formatSecretKey(secret) {
    return secret.match(/.{1,4}/g).join(' ');
}

function verifyTOTP(secret, token) {
    if (typeof OTPAuth === 'undefined') {
        console.error('OTPAuth library not loaded');
        return false;
    }
    
    try {
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(secret),
            digits: 6,
            period: 30
        });
        
        const delta = totp.validate({ token, window: 1 });
        return delta !== null;
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
}

function proceedToAdminMode() {
    currentView = 'admin';
    showAdminView();
    updateAdminToggleButton();
}

// Continue in Part 2...
// ==========================================
// Add this to the end of app.js Part 1
// Part 2: Workflow Steps & UI Rendering
// ==========================================

// ==========================================
// Toast Notifications
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// View Management
// ==========================================
function toggleAdminMode() {
    if (currentView === 'public') {
        if (!currentUser || !currentUser.providerData || currentUser.providerData[0].providerId !== 'google.com') {
            openLoginModal();
            return;
        }
        
        if (!user2FAEnabled) {
            open2FASetupModal();
        } else {
            open2FAVerifyModal();
        }
    } else {
        currentView = 'public';
        showPublicView();
        updateAdminToggleButton();
    }
}

function updateAdminToggleButton() {
    const btn = document.getElementById('adminToggleBtn');
    if (!btn) return;
    
    if (currentView === 'admin') {
        btn.textContent = 'Public View';
        btn.style.background = 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)';
    } else {
        btn.textContent = 'Admin Mode';
        btn.style.background = 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
    }
}

function showPublicView() {
    const publicView = document.getElementById('publicView');
    const adminView = document.getElementById('adminView');
    if (publicView) publicView.classList.add('active');
    if (adminView) adminView.classList.remove('active');
    if (currentViewType === 'calendar') {
        loadPublicCalendar();
    } else {
        loadListView();
    }
}

function showAdminView() {
    const adminView = document.getElementById('adminView');
    const publicView = document.getElementById('publicView');
    if (adminView) adminView.classList.add('active');
    if (publicView) publicView.classList.remove('active');
    resetWorkflow();
    renderAdminCalendar();
}

function toggleView() {
    const calendarContainer = document.getElementById('calendarContainer');
    const listContainer = document.getElementById('listContainer');
    const toggleText = document.getElementById('viewToggleText');
    const toggleIcon = document.getElementById('viewToggleIcon');

    if (currentViewType === 'calendar') {
        currentViewType = 'list';
        if (calendarContainer) calendarContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
        if (toggleText) toggleText.textContent = 'Switch to Calendar View';
        if (toggleIcon) toggleIcon.textContent = '📋';
        loadListView();
    } else {
        currentViewType = 'calendar';
        if (calendarContainer) calendarContainer.style.display = 'block';
        if (listContainer) listContainer.style.display = 'none';
        if (toggleText) toggleText.textContent = 'Switch to List View';
        if (toggleIcon) toggleIcon.textContent = '📅';
        loadPublicCalendar();
    }
}

// ==========================================
// Workflow Management
// ==========================================
function resetWorkflow() {
    workflowStep = 0;
    selectedFromDate = null;
    selectedToDate = null;
    selectedFromTime = null;
    selectedToTime = null;
    selectedGoodColors = [];
    selectedBadColors = [];
    isBadTime = false;
    renderWorkflowUI();
}

function renderWorkflowUI() {
    const panelContent = document.getElementById('panelContent');
    const panelButtons = document.getElementById('panelButtons');
    if (!panelContent || !panelButtons) return;

    switch (workflowStep) {
        case 0:
            renderStep0();
            break;
        case 1:
            renderStep1();
            break;
        case 2:
            renderStep2();
            break;
        case 3:
            renderStep3();
            break;
        case 4:
            renderStep4();
            break;
        case 5:
            renderStep5();
            break;
    }

    updatePanelButtons();
}

// ==========================================
// STEP 0: Initial State
// ==========================================
function renderStep0() {
    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
        <div class="panel-title">Select First Date</div>
        <div class="panel-info">
            <div class="panel-info-line">Tap any date on the calendar to begin</div>
        </div>
    `;
}

// ==========================================
// STEP 1: From Date Selected - Choose From Time
// ==========================================
function renderStep1() {
    const panelContent = document.getElementById('panelContent');
    const dateStr = formatDateShort(selectedFromDate);
    
    panelContent.innerHTML = `
        <div class="panel-title">Select Start Time</div>
        <div class="panel-info">
            <div class="panel-info-line"><strong>From:</strong> ${dateStr}</div>
        </div>
        <div class="time-selector" id="timeSelector"></div>
    `;

    renderTimeSelector('timeSelector', (time) => {
        selectedFromTime = time;
        workflowStep = 2;
        renderWorkflowUI();
    });
}

// ==========================================
// STEP 2: From Time Selected - Choose To Date
// ==========================================
function renderStep2() {
    const panelContent = document.getElementById('panelContent');
    const dateStr = formatDateShort(selectedFromDate);
    
    panelContent.innerHTML = `
        <div class="panel-title">Start Selected</div>
        <div class="panel-info">
            <div class="panel-info-line"><strong>From:</strong> ${dateStr} | ${selectedFromTime}</div>
            <div class="panel-info-line" style="margin-top: 10px; color: #FF6B35;">Now select SECOND date...</div>
        </div>
    `;
}

// ==========================================
// STEP 3: To Date Selected - Choose To Time
// ==========================================
function renderStep3() {
    const panelContent = document.getElementById('panelContent');
    const fromDateStr = formatDateShort(selectedFromDate);
    const toDateStr = formatDateShort(selectedToDate);
    
    panelContent.innerHTML = `
        <div class="panel-title">Select End Time</div>
        <div class="panel-info">
            <div class="panel-info-line"><strong>From:</strong> ${fromDateStr} | ${selectedFromTime}</div>
            <div class="panel-info-line"><strong>To:</strong> ${toDateStr}</div>
        </div>
        <div class="time-selector" id="timeSelector"></div>
    `;

    renderTimeSelector('timeSelector', (time) => {
        selectedToTime = time;
        workflowStep = 4;
        renderWorkflowUI();
    });
}

// ==========================================
// STEP 4: Times Selected - Choose Colors
// ==========================================
function renderStep4() {
    const panelContent = document.getElementById('panelContent');
    const fromDateStr = formatDateShort(selectedFromDate);
    const toDateStr = formatDateShort(selectedToDate);
    
    panelContent.innerHTML = `
        <div class="panel-title">Choose Colors</div>
        <div class="panel-info">
            <div class="panel-info-line"><strong>From:</strong> ${fromDateStr} | ${selectedFromTime}</div>
            <div class="panel-info-line"><strong>To:</strong> ${toDateStr} | ${selectedToTime}</div>
        </div>
        
        <div class="color-section">
            <div class="color-section-title">Choose GOOD Colors</div>
            <div class="color-palette" id="goodColorPalette"></div>
        </div>
        
        <div class="color-section">
            <div class="color-section-title">Choose BAD Colors</div>
            <div class="color-palette" id="badColorPalette"></div>
        </div>
    `;

    renderColorPalette('goodColorPalette', selectedGoodColors, (colors) => {
        selectedGoodColors = colors;
    });

    renderColorPalette('badColorPalette', selectedBadColors, (colors) => {
        selectedBadColors = colors;
    });
}

// ==========================================
// STEP 5: Final Summary
// ==========================================
function renderStep5() {
    const panelContent = document.getElementById('panelContent');
    const fromDateStr = formatDateShort(selectedFromDate);
    const toDateStr = formatDateShort(selectedToDate);
    
    if (isBadTime) {
        panelContent.innerHTML = `
            <div class="summary-box">
                <div class="summary-title">✓ ENTRY READY</div>
                <div class="summary-dates">
                    <div class="summary-date-line"><strong>From:</strong> ${fromDateStr} | ${selectedFromTime}</div>
                    <div class="summary-date-line"><strong>To:</strong> ${toDateStr} | ${selectedToTime}</div>
                </div>
                <div class="summary-badtime">
                    <div class="summary-badtime-icon">⚫</div>
                    <div class="summary-badtime-text">BAD TIME</div>
                </div>
            </div>
        `;
    } else {
        let goodColorsHtml = '';
        selectedGoodColors.forEach(color => {
            goodColorsHtml += `
                <div class="summary-color-item">
                    <div class="summary-color-box" style="background: ${color}"></div>
                    <span class="summary-color-hex">${color}</span>
                </div>
            `;
        });

        let badColorsHtml = '';
        selectedBadColors.forEach(color => {
            badColorsHtml += `
                <div class="summary-color-item">
                    <div class="summary-color-box" style="background: ${color}"></div>
                    <span class="summary-color-hex">${color}</span>
                </div>
            `;
        });

        panelContent.innerHTML = `
            <div class="summary-box">
                <div class="summary-title">✓ ENTRY READY</div>
                <div class="summary-dates">
                    <div class="summary-date-line"><strong>From:</strong> ${fromDateStr} | ${selectedFromTime}</div>
                    <div class="summary-date-line"><strong>To:</strong> ${toDateStr} | ${selectedToTime}</div>
                </div>
                <div class="summary-colors">
                    ${selectedGoodColors.length > 0 ? `
                        <div class="summary-color-section">
                            <div class="summary-color-label">GOOD:</div>
                            <div class="summary-color-items">${goodColorsHtml}</div>
                        </div>
                    ` : ''}
                    ${selectedBadColors.length > 0 ? `
                        <div class="summary-color-section">
                            <div class="summary-color-label">BAD:</div>
                            <div class="summary-color-items">${badColorsHtml}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

// ==========================================
// Update Panel Buttons
// ==========================================
function updatePanelButtons() {
    const panelButtons = document.getElementById('panelButtons');
    if (!panelButtons) return;

    let buttonsHtml = `
        <button class="panel-btn cancel-btn" onclick="resetWorkflow()">Cancel</button>
        <button class="panel-btn review-btn" onclick="openReviewMode()">Review</button>
    `;

    if (workflowStep === 4) {
        buttonsHtml += `
            <button class="panel-btn continue-btn" onclick="proceedToSummary()">Continue</button>
            <button class="panel-btn badtime-btn" onclick="selectBadTime()">BAD TIME</button>
        `;
    }

    if (workflowStep === 5) {
        buttonsHtml += `
            <button class="panel-btn add-entry-btn" onclick="saveEntry()">Add Entry</button>
            <button class="panel-btn new-entry-btn" onclick="resetWorkflow()">New Entry</button>
        `;
    }

    panelButtons.innerHTML = buttonsHtml;
}

// ==========================================
// Time Selector Renderer (12x2 Grid)
// ==========================================
function renderTimeSelector(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // AM Row
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'time-btn am';
        btn.textContent = `${i} AM`;
        btn.onclick = () => {
            onSelect(`${i} AM`);
        };
        container.appendChild(btn);
    }

    // PM Row
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'time-btn pm';
        btn.textContent = `${i} PM`;
        btn.onclick = () => {
            onSelect(`${i} PM`);
        };
        container.appendChild(btn);
    }
}

// ==========================================
// Color Palette Renderer (8x2 Grid)
// ==========================================
function renderColorPalette(containerId, selectedColors, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    COLOR_PALETTE.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.background = color;
        
        if (selectedColors.includes(color)) {
            btn.classList.add('selected');
        }

        btn.onclick = () => {
            const index = selectedColors.indexOf(color);
            if (index > -1) {
                selectedColors.splice(index, 1);
                btn.classList.remove('selected');
            } else {
                selectedColors.push(color);
                btn.classList.add('selected');
            }
            onChange(selectedColors);
        };

        container.appendChild(btn);
    });
}

// ==========================================
// Workflow Actions
// ==========================================
function proceedToSummary() {
    if (selectedGoodColors.length === 0 && selectedBadColors.length === 0) {
        showToast('Please select at least one color or choose BAD TIME', 'error');
        return;
    }
    isBadTime = false;
    workflowStep = 5;
    renderWorkflowUI();
}

function selectBadTime() {
    if (selectedGoodColors.length > 0 || selectedBadColors.length > 0) {
        showToast('BAD TIME cannot have colors. Clear colors first.', 'error');
        return;
    }
    isBadTime = true;
    workflowStep = 5;
    renderWorkflowUI();
}

// Continue in Part 3...
// ==========================================
// Add this to the end of app.js Part 2
// Part 3: Calendar, Saving & Review
// ==========================================

// ==========================================
// Admin Calendar Rendering
// ==========================================
function navigateAdminMonth(direction) {
    adminCurrentDate.setMonth(adminCurrentDate.getMonth() + direction);
    adminCurrentDate = new Date(adminCurrentDate);
    renderAdminCalendar();
}

function renderAdminCalendar() {
    const year = adminCurrentDate.getFullYear();
    const month = adminCurrentDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const titleEl = document.getElementById('adminMonthYear');
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('adminCalendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const dayCell = createAdminDayCell(dayNum, month - 1, year, true);
        grid.appendChild(dayCell);
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        const dayCell = createAdminDayCell(day, month, year, false);
        if (isToday) dayCell.classList.add('today');
        grid.appendChild(dayCell);
    }

    // Next month filler
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const dayCell = createAdminDayCell(day, month + 1, year, true);
        grid.appendChild(dayCell);
    }
}

function createAdminDayCell(day, month, year, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if (isOtherMonth) cell.classList.add('other-month');

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    const cellDate = new Date(year, month, day);

    // Check if selected
    if (selectedFromDate && cellDate.getTime() === selectedFromDate.getTime()) {
        cell.classList.add('selected');
    }
    if (selectedToDate && cellDate.getTime() === selectedToDate.getTime()) {
        cell.classList.add('selected');
    }

    // Check if in range
    if (selectedFromDate && selectedToDate) {
        const from = selectedFromDate.getTime();
        const to = selectedToDate.getTime();
        const current = cellDate.getTime();
        if (current > Math.min(from, to) && current < Math.max(from, to)) {
            cell.classList.add('in-range');
        }
    }

    cell.addEventListener('click', () => {
        handleDateSelection(cellDate);
    });

    return cell;
}

function handleDateSelection(date) {
    if (workflowStep === 0) {
        // First date selection
        selectedFromDate = date;
        workflowStep = 1;
        renderAdminCalendar();
        renderWorkflowUI();
    } else if (workflowStep === 2) {
        // Second date selection
        selectedToDate = date;
        
        // Auto-sort if needed
        if (selectedToDate < selectedFromDate) {
            const temp = selectedFromDate;
            selectedFromDate = selectedToDate;
            selectedToDate = temp;
        }
        
        workflowStep = 3;
        renderAdminCalendar();
        renderWorkflowUI();
    }
}

// ==========================================
// Save Entry to Firebase
// ==========================================
function saveEntry() {
    if (!selectedFromDate || !selectedToDate || !selectedFromTime || !selectedToTime) {
        showToast('Missing required information', 'error');
        return;
    }

    showLoading();

    const fromDateTime = combineDateAndTime(selectedFromDate, selectedFromTime);
    const toDateTime = combineDateAndTime(selectedToDate, selectedToTime);

    const entryData = {
        fromDate: firebase.firestore.Timestamp.fromDate(selectedFromDate),
        toDate: firebase.firestore.Timestamp.fromDate(selectedToDate),
        fromTime: selectedFromTime,
        toTime: selectedToTime,
        startDate: firebase.firestore.Timestamp.fromDate(fromDateTime),
        endDate: firebase.firestore.Timestamp.fromDate(toDateTime),
        goodColors: selectedGoodColors,
        badColors: selectedBadColors,
        badTime: isBadTime,
        created: firebase.firestore.Timestamp.now()
    };

    // Convert colors to good/bad color objects for display
    if (!isBadTime) {
        if (selectedGoodColors.length > 0) {
            entryData.goodColor = { hex: selectedGoodColors[0], name: getColorName(selectedGoodColors[0]) };
        }
        if (selectedBadColors.length > 0) {
            entryData.badColor = { hex: selectedBadColors[0], name: getColorName(selectedBadColors[0]) };
        }
    }

    db.collection(ENTRIES_COLLECTION)
        .add(entryData)
        .then(() => {
            hideLoading();
            showToast('Entry saved successfully!', 'success');
            resetWorkflow();
        })
        .catch((error) => {
            console.error('Error saving entry:', error);
            hideLoading();
            showToast('Error saving entry', 'error');
        });
}

function combineDateAndTime(date, timeStr) {
    const [time, period] = timeStr.split(' ');
    let hour = parseInt(time);
    
    if (period === 'PM' && hour !== 12) {
        hour += 12;
    } else if (period === 'AM' && hour === 12) {
        hour = 0;
    }

    const newDate = new Date(date);
    newDate.setHours(hour, 0, 0, 0);
    return newDate;
}

function getColorName(hex) {
    const colorNames = {
        '#000000': 'Black',
        '#FFFFFF': 'White',
        '#FF0000': 'Red',
        '#008000': 'Green',
        '#0000FF': 'Blue',
        '#FFFF00': 'Yellow',
        '#FFA500': 'Orange',
        '#800080': 'Purple',
        '#00FFFF': 'Cyan',
        '#FF00FF': 'Magenta',
        '#808080': 'Gray',
        '#800000': 'Maroon',
        '#000080': 'Navy',
        '#A52A2A': 'Brown',
        '#FFC0CB': 'Pink',
        '#4B0082': 'Indigo'
    };
    return colorNames[hex.toUpperCase()] || hex;
}

// ==========================================
// Review Mode
// ==========================================
function openReviewMode() {
    showLoading();
    
    db.collection(ENTRIES_COLLECTION)
        .orderBy('created', 'desc')
        .limit(50)
        .get()
        .then((querySnapshot) => {
            const container = document.getElementById('reviewEntriesList');
            if (!container) {
                hideLoading();
                return;
            }
            container.innerHTML = '';

            if (querySnapshot.empty) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No entries saved yet</p>';
                hideLoading();
                document.getElementById('reviewModal').classList.add('active');
                return;
            }

            querySnapshot.forEach((doc) => {
                const entry = { id: doc.id, ...doc.data() };
                container.appendChild(createReviewEntryCard(entry));
            });

            hideLoading();
            document.getElementById('reviewModal').classList.add('active');
        })
        .catch((error) => {
            console.error('Error loading entries:', error);
            hideLoading();
            showToast('Error loading entries', 'error');
        });
}

function createReviewEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'review-entry-card';

    const fromDateStr = formatDateShort(entry.fromDate.toDate());
    const toDateStr = formatDateShort(entry.toDate.toDate());

    let contentHtml = `
        <button class="review-entry-delete" onclick="deleteReviewEntry('${entry.id}')">✕</button>
        <div class="summary-title">✓ ENTRY READY</div>
        <div class="summary-dates">
            <div class="summary-date-line"><strong>From:</strong> ${fromDateStr} | ${entry.fromTime}</div>
            <div class="summary-date-line"><strong>To:</strong> ${toDateStr} | ${entry.toTime}</div>
        </div>
    `;

    if (entry.badTime) {
        contentHtml += `
            <div class="summary-badtime">
                <div class="summary-badtime-icon">⚫</div>
                <div class="summary-badtime-text">BAD TIME</div>
            </div>
        `;
    } else {
        let goodColorsHtml = '';
        if (entry.goodColors && entry.goodColors.length > 0) {
            entry.goodColors.forEach(color => {
                goodColorsHtml += `
                    <div class="summary-color-item">
                        <div class="summary-color-box" style="background: ${color}"></div>
                        <span class="summary-color-hex">${color}</span>
                    </div>
                `;
            });
        }

        let badColorsHtml = '';
        if (entry.badColors && entry.badColors.length > 0) {
            entry.badColors.forEach(color => {
                badColorsHtml += `
                    <div class="summary-color-item">
                        <div class="summary-color-box" style="background: ${color}"></div>
                        <span class="summary-color-hex">${color}</span>
                    </div>
                `;
            });
        }

        contentHtml += `<div class="summary-colors">`;
        if (goodColorsHtml) {
            contentHtml += `
                <div class="summary-color-section">
                    <div class="summary-color-label">GOOD:</div>
                    <div class="summary-color-items">${goodColorsHtml}</div>
                </div>
            `;
        }
        if (badColorsHtml) {
            contentHtml += `
                <div class="summary-color-section">
                    <div class="summary-color-label">BAD:</div>
                    <div class="summary-color-items">${badColorsHtml}</div>
                </div>
            `;
        }
        contentHtml += `</div>`;
    }

    card.innerHTML = contentHtml;
    return card;
}

function deleteReviewEntry(entryId) {
    if (!entryId) return;

    showLoading();
    db.collection(ENTRIES_COLLECTION)
        .doc(entryId)
        .delete()
        .then(() => {
            hideLoading();
            showToast('Entry deleted successfully', 'success');
            openReviewMode(); // Refresh list
        })
        .catch((error) => {
            console.error('Error deleting entry:', error);
            hideLoading();
            showToast('Error deleting entry', 'error');
        });
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// Public Calendar & List View
// ==========================================

function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    currentDate = new Date(currentDate);
    loadPublicCalendar();
}

function loadPublicCalendar() {
    renderPublicCalendar(currentDate, 'calendarGrid', 'currentMonthYear');
}

function renderPublicCalendar(date, gridId, titleId) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const titleEl = document.getElementById(titleId);
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    loadMonthEntries(year, month, (entries) => {
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const dayCell = createPublicDayCell(dayNum, month - 1, year, true, entries);
            grid.appendChild(dayCell);
        }

        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
            const dayCell = createPublicDayCell(day, month, year, false, entries);
            if (isToday) dayCell.classList.add('today');
            grid.appendChild(dayCell);
        }

        const totalCells = firstDay + daysInMonth;
        const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = createPublicDayCell(day, month + 1, year, true, entries);
            grid.appendChild(dayCell);
        }
    });
}

function createPublicDayCell(day, month, year, isOtherMonth, entries) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if (isOtherMonth) cell.classList.add('other-month');

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    const dayStart = new Date(year, month, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

    const dayEntries = entries.filter(entry => {
        const entryStart = entry.startDate.toDate();
        const entryEnd = entry.endDate.toDate();
        return (entryStart <= dayEnd && entryEnd >= dayStart);
    });

    if (dayEntries.length > 0) {
        const indicators = document.createElement('div');
        indicators.className = 'day-indicators';

        let goodColorHex = null;
        let badColorHex = null;
        let hasBadTime = false;

        dayEntries.forEach(e => {
            if (e.goodColor && !goodColorHex) goodColorHex = e.goodColor.hex;
            if (e.badColor && !badColorHex) badColorHex = e.badColor.hex;
            if (e.badTime) hasBadTime = true;
        });

        if (goodColorHex) {
            const ind = document.createElement('div');
            ind.className = 'day-indicator good-color';
            ind.style.background = goodColorHex;
            indicators.appendChild(ind);
        }

        if (badColorHex) {
            const ind = document.createElement('div');
            ind.className = 'day-indicator bad-color';
            ind.style.background = badColorHex;
            indicators.appendChild(ind);
        }

        if (hasBadTime) {
            const ind = document.createElement('div');
            ind.className = 'day-indicator bad-time';
            indicators.appendChild(ind);
        }

        cell.appendChild(indicators);
    }

    cell.addEventListener('click', () => {
        openDayView(day, month, year);
    });

    return cell;
}

function loadMonthEntries(year, month, callback) {
    if (typeof db === 'undefined') {
        callback([]);
        return;
    }

    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    db.collection(ENTRIES_COLLECTION)
        .where('endDate', '>=', firebase.firestore.Timestamp.fromDate(startDate))
        .get()
        .then((querySnapshot) => {
            const entries = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const entryStart = data.startDate.toDate();
                if (entryStart <= endDate) {
                    entries.push({ id: doc.id, ...data });
                }
            });
            callback(entries);
        })
        .catch((error) => {
            console.error('Error loading entries:', error);
            callback([]);
        });
}

function loadListView() {
    showLoading();
    
    db.collection(ENTRIES_COLLECTION)
        .orderBy('startDate', 'desc')
        .limit(50)
        .get()
        .then((querySnapshot) => {
            const listContainer = document.getElementById('entryList');
            if (!listContainer) {
                hideLoading();
                return;
            }
            listContainer.innerHTML = '';

            if (querySnapshot.empty) {
                listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No entries found</p>';
                hideLoading();
                return;
            }

            querySnapshot.forEach((doc) => {
                const entry = { id: doc.id, ...doc.data() };
                listContainer.appendChild(createListEntryCard(entry));
            });

            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading list:', error);
            hideLoading();
        });
}

function createListEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const start = entry.startDate.toDate();
    const end = entry.endDate.toDate();

    const timeRange = document.createElement('div');
    timeRange.className = 'entry-time-range';
    timeRange.textContent = formatDateRange(start, end);
    card.appendChild(timeRange);

    if (entry.badTime) {
        const badTimeLabel = document.createElement('div');
        badTimeLabel.style.cssText = 'font-weight: 700; color: #000; padding: 10px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;';
        badTimeLabel.textContent = '⚫ BAD TIME';
        card.appendChild(badTimeLabel);
    } else {
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'entry-colors';

        if (entry.goodColor) {
            const goodDiv = document.createElement('div');
            goodDiv.className = 'entry-color-item';
            goodDiv.innerHTML = `
                <div class="entry-color-box" style="background: ${entry.goodColor.hex}"></div>
                <span class="entry-color-label">Good: ${entry.goodColor.name}</span>
            `;
            colorsDiv.appendChild(goodDiv);
        }

        if (entry.badColor) {
            const badDiv = document.createElement('div');
            badDiv.className = 'entry-color-item';
            badDiv.innerHTML = `
                <div class="entry-color-box" style="background: ${entry.badColor.hex}"></div>
                <span class="entry-color-label">Bad: ${entry.badColor.name}</span>
            `;
            colorsDiv.appendChild(badDiv);
        }

        card.appendChild(colorsDiv);
    }

    return card;
}

// ==========================================
// Day View Modal
// ==========================================
function openDayView(day, month, year) {
    const dayDate = new Date(year, month, day);
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    const titleEl = document.getElementById('dayViewTitle');
    if (titleEl) titleEl.textContent = formatDate(dayDate);

    db.collection(ENTRIES_COLLECTION)
        .get()
        .then((querySnapshot) => {
            const container = document.getElementById('dayViewEntries');
            if (!container) return;
            container.innerHTML = '';

            let hasEntries = false;
            const dayEntries = [];

            querySnapshot.forEach((doc) => {
                const entry = { id: doc.id, ...doc.data() };
                const entryStart = entry.startDate.toDate();
                const entryEnd = entry.endDate.toDate();

                if (entryEnd >= startOfDay && entryStart <= endOfDay) {
                    dayEntries.push(entry);
                    hasEntries = true;
                }
            });

            if (!hasEntries) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No entries for this day</p>';
            } else {
                dayEntries.forEach(entry => {
                    container.appendChild(createDayEntryCard(entry));
                });
            }

            document.getElementById('dayViewModal').classList.add('active');
        })
        .catch((error) => {
            console.error('Error loading day entries:', error);
        });
}

function createDayEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'day-entry-card';

    const start = entry.startDate.toDate();
    const end = entry.endDate.toDate();

    if (entry.badTime) {
        card.innerHTML = `
            <div style="font-weight: 700; font-size: 1.1rem;">⚫ BAD TIME</div>
            <div style="margin-top: 8px; color: #666;">${formatTimeRange(start, end)}</div>
        `;
    } else {
        card.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 10px; font-size: 1.05rem;">${formatTimeRange(start, end)}</div>
            <div class="entry-colors">
                ${entry.goodColor ? `
                    <div class="entry-color-item">
                        <div class="entry-color-box" style="background: ${entry.goodColor.hex}"></div>
                        <span class="entry-color-label">Good: ${entry.goodColor.name}</span>
                    </div>
                ` : ''}
                ${entry.badColor ? `
                    <div class="entry-color-item">
                        <div class="entry-color-box" style="background: ${entry.badColor.hex}"></div>
                        <span class="entry-color-label">Bad: ${entry.badColor.name}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    return card;
}

function closeDayViewModal() {
    const modal = document.getElementById('dayViewModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// Utility Functions
// ==========================================
function formatDateShort(date) {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateRange(start, end) {
    const startStr = start.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const endStr = end.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `${startStr} to ${endStr}`;
}

function formatTimeRange(start, end) {
    const startStr = start.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const endStr = end.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `${startStr} - ${endStr}`;
}

function showLoading() {
    const el = document.getElementById('loadingSpinner');
    if (el) el.style.display = 'flex';
}

function hideLoading() {
    const el = document.getElementById('loadingSpinner');
    if (el) el.style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ==========================================
// Service Worker Registration
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed', error));
    });
}