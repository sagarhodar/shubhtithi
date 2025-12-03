// ==========================================
// Jyotish Calendar - Complete Updated app.js with 2FA
// ==========================================

// Global State
let currentView = 'public';
let currentViewType = 'calendar'; // 'calendar' or 'list'
let currentDate = new Date();
let adminCurrentDate = new Date();
let selectedGoodColor = null;
let selectedBadColor = null;
let currentUser = null;
let editingEntryId = null;
let pendingEntryData = null;
let totpSecret = null;
let user2FAEnabled = false;

// Color Palette
const COLOR_PALETTE = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#008000' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Navy', hex: '#000080' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Indigo', hex: '#4B0082' }
];

// Firestore Collections
const ENTRIES_COLLECTION = 'calendar_entries';
const PENDING_ENTRIES_COLLECTION = 'pending_entries';
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
    setupColorPalettes();
}

// ==========================================
// Auth Listener
// ==========================================
function setupAuthListener() {
    if (typeof auth === 'undefined') {
        console.warn('Auth not defined');
        return;
    }

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
            
            // Check if user has 2FA enabled
            check2FAStatus();
        } else {
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl) userInfoEl.style.display = 'none';
            user2FAEnabled = false;
            if (currentView === 'admin') {
                showPublicView();
                currentView = 'public';
                const adminToggleBtn = document.getElementById('adminToggleBtn');
                if (adminToggleBtn) {
                    adminToggleBtn.textContent = 'Admin Mode';
                    adminToggleBtn.style.background = 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
                }
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

    // Single toggle button for view
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleView);

    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    const adminPrevMonthBtn = document.getElementById('adminPrevMonthBtn');
    const adminNextMonthBtn = document.getElementById('adminNextMonthBtn');
    if (adminPrevMonthBtn) adminPrevMonthBtn.addEventListener('click', () => navigateAdminMonth(-1));
    if (adminNextMonthBtn) adminNextMonthBtn.addEventListener('click', () => navigateAdminMonth(1));

    const addEntryBtn = document.getElementById('addEntryBtn');
    const reviewEntryBtn = document.getElementById('reviewEntryBtn');
    const confirmedEntryBtn = document.getElementById('confirmedEntryBtn');
    const adminCalendarBtn = document.getElementById('adminCalendarBtn');

    if (addEntryBtn) addEntryBtn.addEventListener('click', openAddEntryModal);
    if (reviewEntryBtn) reviewEntryBtn.addEventListener('click', showReviewEntries);
    if (confirmedEntryBtn) confirmedEntryBtn.addEventListener('click', showConfirmedEntries);
    if (adminCalendarBtn) adminCalendarBtn.addEventListener('click', showAdminCalendar);

    const saveEntryBtn = document.getElementById('saveEntryBtn');
    const finalSaveBtn = document.getElementById('finalSaveBtn');

    if (saveEntryBtn) saveEntryBtn.addEventListener('click', validateAndShowConfirm);
    if (finalSaveBtn) finalSaveBtn.addEventListener('click', () => {
        if (!pendingEntryData && !editingEntryId) {
            showToast('Please fill and confirm the entry before saving.', 'error');
            return;
        }
        saveNewEntry();
    });

    // 2FA Setup
    const verify2FABtn = document.getElementById('verify2FABtn');
    if (verify2FABtn) verify2FABtn.addEventListener('click', verify2FASetup);

    const submit2FABtn = document.getElementById('submit2FABtn');
    if (submit2FABtn) submit2FABtn.addEventListener('click', verify2FACode);

    // Modal close on outside click
    window.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// ==========================================
// View Toggle
// ==========================================
function toggleView() {
    const calendarContainer = document.getElementById('calendarContainer');
    const listContainer = document.getElementById('listContainer');
    const toggleText = document.getElementById('viewToggleText');
    const toggleIcon = document.getElementById('viewToggleIcon');

    if (currentViewType === 'calendar') {
        // Switch to list
        currentViewType = 'list';
        if (calendarContainer) calendarContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
        if (toggleText) toggleText.textContent = 'Switch to Calendar View';
        if (toggleIcon) toggleIcon.textContent = '📋';
        loadListView();
    } else {
        // Switch to calendar
        currentViewType = 'calendar';
        if (calendarContainer) calendarContainer.style.display = 'block';
        if (listContainer) listContainer.style.display = 'none';
        if (toggleText) toggleText.textContent = 'Switch to List View';
        if (toggleIcon) toggleIcon.textContent = '📅';
        loadPublicCalendar();
    }
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
    if (!auth) {
        showToast('Auth not available', 'error');
        return;
    }
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully', 'info');
            showPublicView();
            currentView = 'public';
            user2FAEnabled = false;
            const adminToggleBtn = document.getElementById('adminToggleBtn');
            if (adminToggleBtn) {
                adminToggleBtn.textContent = 'Admin Mode';
                adminToggleBtn.style.background = 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
            }
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
// 2FA Functions (WebCrypto-based TOTP, base32)
// ==========================================
// ==========================================
// 2FA Functions (WebCrypto-based TOTP, base32)
// Note: totpSecret and user2FAEnabled are globals declared at file top.
// ==========================================

// ---------- Base32 utils (RFC4648 minimal) ----------
const _base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(bytes){
  let bits = 0, value=0, output='';
  for(let i=0;i<bytes.length;i++){
    value = (value<<8) | bytes[i];
    bits += 8;
    while(bits >= 5){
      output += _base32chars[(value >>> (bits-5)) & 31];
      bits -= 5;
    }
  }
  if(bits>0) output += _base32chars[(value << (5-bits)) & 31];
  return output;
}
function base32Decode(str){
  const clean = (''+str).replace(/=+$/,'').replace(/[^A-Z2-7]/ig,'').toUpperCase();
  const bytes = [];
  let bits=0, value=0;
  for(let i=0;i<clean.length;i++){
    const idx = _base32chars.indexOf(clean[i]);
    if(idx<0) continue;
    value = (value<<5) | idx;
    bits += 5;
    if(bits>=8){
      bytes.push((value >>> (bits-8)) & 0xFF);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// ---------- Secure secret generation ----------
function generateTOTPSecret(lenBytes = 10){
  // lenBytes=10 -> ~16 base32 chars; increase for longer secrets
  const arr = new Uint8Array(lenBytes);
  crypto.getRandomValues(arr);
  return base32Encode(arr).replace(/=/g,'');
}

// Keep your format helper (uses global totpSecret)
function formatSecretKey(secret) {
  if (!secret) return '';
  const groups = secret.match(/.{1,4}/g);
  return groups ? groups.join(' ') : secret;
}

// ---------- TOTP generation & verification (SHA-1 HMAC) ----------
async function generateTOTP(secretBase32, forTime = null, digits = 6, period = 30){
  const keyBytes = base32Decode(secretBase32);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const time = Math.floor((forTime ? Math.floor(forTime/1000) : Math.floor(Date.now()/1000)) / period);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(time / 0x100000000);
  const low = time & 0xffffffff;
  view.setUint32(0, high);
  view.setUint32(4, low);

  const hmacBuf = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const hmac = new Uint8Array(hmacBuf);
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset+1] & 0xff) << 16) |
               ((hmac[offset+2] & 0xff) << 8) |
               (hmac[offset+3] & 0xff);
  const otp = (code % (10 ** digits)).toString().padStart(digits, '0');
  return otp;
}

async function verifyTOTP(secretBase32, token, windowSteps = 4) {
  const now = Date.now();
  for (let i = -windowSteps; i <= windowSteps; i++) {
    const t = now + (i * 30 * 1000); // period = 30 sec
    const gen = await generateTOTP(secretBase32, t);
    if (gen === token) return true;
  }
  return false;
}

// ==========================================
// UI + Firestore integration (adapted)
// NOTE: Do NOT redeclare totpSecret or user2FAEnabled here.
// ==========================================

// Check 2FA status from Firestore
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
                totpSecret = null;
            }
        })
        .catch((error) => {
            console.error('Error checking 2FA status:', error);
        });
}

// Open setup modal and generate a new secret (client-only until verification)
function open2FASetupModal() {
    if (!currentUser) return;

    // Generate TOTP secret (secure)
    const secret = generateTOTPSecret();
    totpSecret = secret;

    // Build otpauth URL (RFC style) - URL-encode label and issuer
    const label = encodeURIComponent(`${currentUser.email}`);
    const issuer = encodeURIComponent('JyotishCalendar');
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Render QR code to canvas (if QR library available)
    const canvas = document.getElementById('qrCanvas');
    if (canvas && typeof QRCode !== 'undefined') {
        try { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); } catch(e){}
        new QRCode(canvas, {
            text: otpauthUrl,
            width: 250,
            height: 250
        });
    }

    // Display secret key (readable grouped)
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

// Verify setup: user enters current code from their authenticator app
async function verify2FASetup() {
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

    if (!totpSecret) {
        showToast('No secret generated. Re-open setup.', 'error');
        return;
    }

    try {
        const ok = await verifyTOTP(totpSecret, code, 1);
        if (ok) {
            // Save secret to Firestore
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
    } catch (err) {
        console.error('TOTP verification error:', err);
        showToast('Error verifying code', 'error');
    }
}

// Open/close verify modal (when user needs to enter TOTP to switch to admin mode)
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

// Verify existing TOTP to enter admin/edit mode
async function verify2FACode() {
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

    if (!totpSecret) {
        // If we don't have secret locally, try to fetch from Firestore once (fallback)
        try {
            const doc = await db.collection(USER_SETTINGS_COLLECTION).doc(currentUser.uid).get();
            if (doc.exists && doc.data().totpSecret) {
                totpSecret = doc.data().totpSecret;
            } else {
                showToast('2FA not configured for this account', 'error');
                return;
            }
        } catch (err) {
            console.error('Error fetching secret:', err);
            showToast('Error verifying 2FA', 'error');
            return;
        }
    }

    try {
        const ok = await verifyTOTP(totpSecret, code, 1);
        if (ok) {
            close2FAVerifyModal();
            showToast('Verified successfully!', 'success');
            proceedToAdminMode();
        } else {
            showToast('Invalid code. Please try again.', 'error');
        }
    } catch (err) {
        console.error('TOTP verification error:', err);
        showToast('Error verifying code', 'error');
    }
}

// The rest of your "proceedToAdminMode" remains unchanged
function proceedToAdminMode() {
    currentView = 'admin';
    showAdminView();
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    if (adminToggleBtn) {
        adminToggleBtn.textContent = 'Public View';
        adminToggleBtn.style.background = 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)';
    }
}


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
        
        // Check if 2FA is setup
        if (!user2FAEnabled) {
            // Need to setup 2FA
            open2FASetupModal();
        } else {
            // Need to verify 2FA
            open2FAVerifyModal();
        }
    } else {
        currentView = 'public';
        showPublicView();
        const adminToggleBtn = document.getElementById('adminToggleBtn');
        if (adminToggleBtn) {
            adminToggleBtn.textContent = 'Admin Mode';
            adminToggleBtn.style.background = 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
        }
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
    showAdminDashboard();
    loadAdminStats();
}

function showAdminDashboard() {
    const dashboard = document.querySelector('.admin-dashboard');
    const adminListView = document.getElementById('adminListView');
    const adminCalendarView = document.getElementById('adminCalendarView');
    const reviewEntriesView = document.getElementById('reviewEntriesView');

    if (dashboard) dashboard.style.display = 'block';
    if (adminListView) adminListView.style.display = 'none';
    if (adminCalendarView) adminCalendarView.style.display = 'none';
    if (reviewEntriesView) reviewEntriesView.style.display = 'none';
}

// ==========================================
// Color Palette Setup
// ==========================================
function setupColorPalettes() {
    const goodPalette = document.getElementById('goodColorPalette');
    const badPalette = document.getElementById('badColorPalette');

    if (!goodPalette || !badPalette) return;

    COLOR_PALETTE.forEach(color => {
        const goodBtn = document.createElement('button');
        goodBtn.className = 'color-option';
        goodBtn.style.background = color.hex;
        goodBtn.dataset.color = color.hex;
        goodBtn.dataset.name = color.name;
        goodBtn.title = color.name;
        goodBtn.addEventListener('click', (e) => selectGoodColor(e, color.hex, color.name));
        goodPalette.appendChild(goodBtn);

        const badBtn = document.createElement('button');
        badBtn.className = 'color-option';
        badBtn.style.background = color.hex;
        badBtn.dataset.color = color.hex;
        badBtn.dataset.name = color.name;
        badBtn.title = color.name;
        badBtn.addEventListener('click', (e) => selectBadColor(e, color.hex, color.name));
        badPalette.appendChild(badBtn);
    });
}

function selectGoodColor(event, hex, name) {
    selectedGoodColor = { hex, name };
    document.querySelectorAll('#goodColorPalette .color-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    if (event && event.currentTarget) event.currentTarget.classList.add('selected');
    const sel = document.getElementById('selectedGoodColor');
    if (sel) sel.value = name;
}

function selectBadColor(event, hex, name) {
    selectedBadColor = { hex, name };
    document.querySelectorAll('#badColorPalette .color-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    if (event && event.currentTarget) event.currentTarget.classList.add('selected');
    const sel = document.getElementById('selectedBadColor');
    if (sel) sel.value = name;
}

// Continue in next part...
// ==========================================
// Add this to the end of app.js Part 1
// ==========================================

// ==========================================
// Calendar Rendering
// ==========================================
function loadPublicCalendar() {
    renderCalendar(currentDate, 'calendarGrid', 'currentMonthYear', false);
}

function renderCalendar(date, gridId, titleId, isAdmin) {
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
            const dayCell = createDayCell(dayNum, month - 1, year, true, entries, isAdmin);
            grid.appendChild(dayCell);
        }

        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
            const dayCell = createDayCell(day, month, year, false, entries, isAdmin);
            if (isToday) dayCell.classList.add('today');
            grid.appendChild(dayCell);
        }

        const totalCells = firstDay + daysInMonth;
        const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = createDayCell(day, month + 1, year, true, entries, isAdmin);
            grid.appendChild(dayCell);
        }
    });
}

function createDayCell(day, month, year, isOtherMonth, entries, isAdmin) {
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
        const entryStart = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
        const entryEnd = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);
        return (entryStart <= dayEnd && entryEnd >= dayStart);
    });

    if (dayEntries.length > 0) {
        const indicators = document.createElement('div');
        indicators.className = 'day-indicators';

        // Get unique good/bad colors and bad time
        let goodColorHex = null;
        let badColorHex = null;
        let hasBadTime = false;

        dayEntries.forEach(e => {
            if (e.goodColor && !goodColorHex) goodColorHex = e.goodColor.hex;
            if (e.badColor && !badColorHex) badColorHex = e.badColor.hex;
            if (!e.goodColor && !e.badColor) hasBadTime = true;
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
        openDayView(day, month, year, isAdmin);
    });

    return cell;
}

// ==========================================
// Month Navigation
// ==========================================
function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    currentDate = new Date(currentDate);
    loadPublicCalendar();
}

function navigateAdminMonth(direction) {
    adminCurrentDate.setMonth(adminCurrentDate.getMonth() + direction);
    adminCurrentDate = new Date(adminCurrentDate);
    renderCalendar(adminCurrentDate, 'adminCalendarGrid', 'adminCurrentMonthYear', true);
}

// ==========================================
// Firestore Data Loading
// ==========================================
function loadMonthEntries(year, month, callback) {
    if (typeof db === 'undefined') {
        console.warn('Firestore (db) not defined.');
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
                const entryStart = (data.startDate && data.startDate.toDate) ? data.startDate.toDate() : new Date(data.startDate);
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
    if (typeof db === 'undefined') {
        showToast('Database not available', 'error');
        hideLoading();
        return;
    }

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
                listContainer.appendChild(createEntryCard(entry, false));
            });

            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading list:', error);
            hideLoading();
        });
}

// ==========================================
// Entry Card Creation
// ==========================================
function createEntryCard(entry, showActions) {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const timeRange = document.createElement('div');
    timeRange.className = 'entry-time-range';
    const start = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
    const end = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);
    timeRange.textContent = formatDateRange(start, end);
    card.appendChild(timeRange);

    if (entry.goodColor || entry.badColor) {
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'entry-colors';

        if (entry.goodColor) {
            const goodDiv = document.createElement('div');
            goodDiv.className = 'entry-color-item';
            const goodBox = document.createElement('div');
            goodBox.className = 'entry-color-box';
            goodBox.style.background = entry.goodColor.hex;
            const goodLabel = document.createElement('span');
            goodLabel.className = 'entry-color-label';
            goodLabel.textContent = `Good: ${entry.goodColor.name}`;
            goodDiv.appendChild(goodBox);
            goodDiv.appendChild(goodLabel);
            colorsDiv.appendChild(goodDiv);
        }

        if (entry.badColor) {
            const badDiv = document.createElement('div');
            badDiv.className = 'entry-color-item';
            const badBox = document.createElement('div');
            badBox.className = 'entry-color-box';
            badBox.style.background = entry.badColor.hex;
            const badLabel = document.createElement('span');
            badLabel.className = 'entry-color-label';
            badLabel.textContent = `Bad: ${entry.badColor.name}`;
            badDiv.appendChild(badBox);
            badDiv.appendChild(badLabel);
            colorsDiv.appendChild(badDiv);
        }

        card.appendChild(colorsDiv);
    } else {
        const badTimeLabel = document.createElement('div');
        badTimeLabel.style.cssText = 'font-weight: 700; color: #000; padding: 10px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;';
        badTimeLabel.textContent = '⚫ BAD TIME';
        card.appendChild(badTimeLabel);
    }

    if (entry.notes) {
        const notes = document.createElement('div');
        notes.className = 'entry-notes';
        notes.textContent = entry.notes;
        card.appendChild(notes);
    }

    if (showActions) {
        const actions = document.createElement('div');
        actions.className = 'entry-actions';

        if (entry.isPending) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'entry-btn confirm';
            confirmBtn.textContent = '✓ Confirm';
            confirmBtn.onclick = () => confirmEntry(entry.id);
            actions.appendChild(confirmBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'entry-btn edit';
        editBtn.textContent = '✎ Edit';
        editBtn.onclick = () => editEntry(entry);
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'entry-btn delete';
        deleteBtn.textContent = '✕ Delete';
        deleteBtn.onclick = () => deleteEntry(entry.id, entry.isPending);
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
    }

    return card;
}

// ==========================================
// Day View Modal
// ==========================================
function openDayView(day, month, year, isAdmin) {
    const dayDate = new Date(year, month, day);
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    const titleEl = document.getElementById('dayViewTitle');
    if (titleEl) titleEl.textContent = formatDate(dayDate);

    if (typeof db === 'undefined') {
        showToast('Database not available', 'error');
        return;
    }

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
                const entryStart = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
                const entryEnd = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);

                if (entryEnd >= startOfDay && entryStart <= endOfDay) {
                    dayEntries.push(entry);
                    hasEntries = true;
                }
            });

            if (!hasEntries) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No entries for this day</p>';
            } else {
                dayEntries.forEach(entry => {
                    container.appendChild(createDayEntryCard(entry, isAdmin));
                });
            }

            const modal = document.getElementById('dayViewModal');
            if (modal) modal.classList.add('active');
        })
        .catch((error) => {
            console.error('Error loading day entries:', error);
        });
}

function createDayEntryCard(entry, isAdmin) {
    const card = document.createElement('div');
    card.className = 'day-entry-card';

    if (entry.goodColor || entry.badColor) {
        card.classList.add('has-colors');

        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = 'font-weight: 600; margin-bottom: 10px; font-size: 1.05rem;';
        const start = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
        const end = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);
        timeDiv.textContent = formatTimeRange(start, end);
        card.appendChild(timeDiv);

        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'entry-colors';

        if (entry.goodColor) {
            const item = document.createElement('div');
            item.className = 'entry-color-item';
            item.innerHTML = `
                <div class="entry-color-box" style="background: ${entry.goodColor.hex}"></div>
                <span class="entry-color-label">Good: ${entry.goodColor.name}</span>
            `;
            colorsDiv.appendChild(item);
        }

        if (entry.badColor) {
            const item = document.createElement('div');
            item.className = 'entry-color-item';
            item.innerHTML = `
                <div class="entry-color-box" style="background: ${entry.badColor.hex}"></div>
                <span class="entry-color-label">Bad: ${entry.badColor.name}</span>
            `;
            colorsDiv.appendChild(item);
        }

        card.appendChild(colorsDiv);
    } else {
        card.classList.add('bad-time');

        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = 'font-weight: 700; font-size: 1.1rem;';
        timeDiv.textContent = '⚫ BAD TIME';
        card.appendChild(timeDiv);

        const start = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
        const end = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);

        const rangeDiv = document.createElement('div');
        rangeDiv.style.cssText = 'margin-top: 8px; color: #666;';
        rangeDiv.textContent = formatTimeRange(start, end);
        card.appendChild(rangeDiv);
    }

    if (entry.notes) {
        const notes = document.createElement('div');
        notes.style.cssText = 'margin-top: 10px; font-style: italic; color: #666; font-size: 0.95rem;';
        notes.textContent = entry.notes;
        card.appendChild(notes);
    }

    if (isAdmin) {
        const actions = document.createElement('div');
        actions.className = 'entry-actions';
        actions.style.marginTop = '15px';

        const editBtn = document.createElement('button');
        editBtn.className = 'entry-btn edit';
        editBtn.textContent = '✎ Edit';
        editBtn.onclick = () => { closeDayViewModal(); editEntry(entry); };
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'entry-btn delete';
        deleteBtn.textContent = '✕ Delete';
        deleteBtn.onclick = () => { closeDayViewModal(); deleteEntry(entry.id, false); };
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
    }

    return card;
}

function closeDayViewModal() {
    const modal = document.getElementById('dayViewModal');
    if (modal) modal.classList.remove('active');
}

// Continue with remaining functions in next comment...
// ==========================================
// Add this to the end of app.js Part 2
// ==========================================

// ==========================================
// Admin Stats
// ==========================================
function loadAdminStats() {
    if (typeof db === 'undefined') return;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    db.collection(PENDING_ENTRIES_COLLECTION)
        .get()
        .then((snapshot) => {
            const el = document.getElementById('statPending');
            if (el) el.textContent = snapshot.size;
        });

    db.collection(ENTRIES_COLLECTION)
        .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(firstDayOfMonth))
        .get()
        .then((snapshot) => {
            const el = document.getElementById('statThisMonth');
            if (el) el.textContent = snapshot.size;
        });

    db.collection(ENTRIES_COLLECTION)
        .get()
        .then((snapshot) => {
            const el = document.getElementById('statTotal');
            if (el) el.textContent = snapshot.size;
        });
}

// ==========================================
// Admin Actions
// ==========================================
function showReviewEntries() {
    const dashboard = document.querySelector('.admin-dashboard');
    const reviewView = document.getElementById('reviewEntriesView');
    if (dashboard) dashboard.style.display = 'none';
    if (reviewView) reviewView.style.display = 'block';

    showLoading();
    db.collection(PENDING_ENTRIES_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get()
        .then((querySnapshot) => {
            const container = document.getElementById('reviewEntryList');
            if (!container) {
                hideLoading();
                return;
            }
            container.innerHTML = '';

            if (querySnapshot.empty) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No pending entries</p>';
                hideLoading();
                return;
            }

            querySnapshot.forEach((doc) => {
                const entry = { id: doc.id, isPending: true, ...doc.data() };
                container.appendChild(createEntryCard(entry, true));
            });

            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading pending entries:', error);
            hideLoading();
        });
}

function showConfirmedEntries() {
    const dashboard = document.querySelector('.admin-dashboard');
    const adminListView = document.getElementById('adminListView');
    if (dashboard) dashboard.style.display = 'none';
    if (adminListView) adminListView.style.display = 'block';

    showLoading();
    db.collection(ENTRIES_COLLECTION)
        .orderBy('startDate', 'desc')
        .limit(50)
        .get()
        .then((querySnapshot) => {
            const container = document.getElementById('adminEntryList');
            if (!container) {
                hideLoading();
                return;
            }
            container.innerHTML = '';

            if (querySnapshot.empty) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No confirmed entries</p>';
                hideLoading();
                return;
            }

            querySnapshot.forEach((doc) => {
                const entry = { id: doc.id, ...doc.data() };
                container.appendChild(createEntryCard(entry, true));
            });

            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading confirmed entries:', error);
            hideLoading();
        });
}

function showAdminCalendar() {
    const dashboard = document.querySelector('.admin-dashboard');
    if (dashboard) dashboard.style.display = 'none';
    const adminCalendarView = document.getElementById('adminCalendarView');
    if (adminCalendarView) adminCalendarView.style.display = 'block';
    renderCalendar(adminCurrentDate, 'adminCalendarGrid', 'adminCurrentMonthYear', true);
}

// ==========================================
// Add/Edit Entry
// ==========================================
function openAddEntryModal() {
    editingEntryId = null;
    const titleEl = document.getElementById('entryModalTitle');
    if (titleEl) titleEl.textContent = 'Add New Entry';
    const modal = document.getElementById('addEntryModal');
    if (modal) modal.classList.add('active');

    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000);
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const startInput = document.getElementById('startDateTime');
    const endInput = document.getElementById('endDateTime');
    const notesInput = document.getElementById('entryNotes');
    const selectedGoodInput = document.getElementById('selectedGoodColor');
    const selectedBadInput = document.getElementById('selectedBadColor');

    if (startInput) startInput.value = formatDateTimeLocal(startTime);
    if (endInput) endInput.value = formatDateTimeLocal(endTime);
    if (notesInput) notesInput.value = '';
    if (selectedGoodInput) selectedGoodInput.value = '';
    if (selectedBadInput) selectedBadInput.value = '';

    selectedGoodColor = null;
    selectedBadColor = null;
    pendingEntryData = null;

    document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
}

function editEntry(entry) {
    if (!entry) {
        showToast('No entry data to edit', 'error');
        return;
    }

    editingEntryId = entry.id || null;
    const titleEl = document.getElementById('entryModalTitle');
    if (titleEl) titleEl.textContent = 'Edit Entry';
    const modal = document.getElementById('addEntryModal');
    if (modal) modal.classList.add('active');

    const startInput = document.getElementById('startDateTime');
    const endInput = document.getElementById('endDateTime');
    const notesInput = document.getElementById('entryNotes');
    const selectedGoodInput = document.getElementById('selectedGoodColor');
    const selectedBadInput = document.getElementById('selectedBadColor');

    const startDate = (entry.startDate && entry.startDate.toDate) ? entry.startDate.toDate() : new Date(entry.startDate);
    const endDate = (entry.endDate && entry.endDate.toDate) ? entry.endDate.toDate() : new Date(entry.endDate);

    if (startInput) startInput.value = formatDateTimeLocal(startDate);
    if (endInput) endInput.value = formatDateTimeLocal(endDate);
    if (notesInput) notesInput.value = entry.notes || '';

    selectedGoodColor = null;
    selectedBadColor = null;
    document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
    if (selectedGoodInput) selectedGoodInput.value = '';
    if (selectedBadInput) selectedBadInput.value = '';

    if (entry.goodColor) {
        selectedGoodColor = entry.goodColor;
        if (selectedGoodInput) selectedGoodInput.value = entry.goodColor.name;
        const goodBtn = document.querySelector(`#goodColorPalette .color-option[data-color="${entry.goodColor.hex}"]`);
        if (goodBtn) goodBtn.classList.add('selected');
    }

    if (entry.badColor) {
        selectedBadColor = entry.badColor;
        if (selectedBadInput) selectedBadInput.value = entry.badColor.name;
        const badBtn = document.querySelector(`#badColorPalette .color-option[data-color="${entry.badColor.hex}"]`);
        if (badBtn) badBtn.classList.add('selected');
    }

    pendingEntryData = {
        startDate: startDate,
        endDate: endDate,
        goodColor: entry.goodColor || null,
        badColor: entry.badColor || null,
        notes: entry.notes || ''
    };
}

function closeAddEntryModal() {
    const modal = document.getElementById('addEntryModal');
    if (modal) modal.classList.remove('active');
    editingEntryId = null;
}

// ==========================================
// Validate & Confirm
// ==========================================
function validateAndShowConfirm() {
    const startDateTimeInput = document.getElementById('startDateTime') ? document.getElementById('startDateTime').value : '';
    const endDateTimeInput = document.getElementById('endDateTime') ? document.getElementById('endDateTime').value : '';

    if (!startDateTimeInput || !endDateTimeInput) {
        showToast('Please select start and end date/time', 'error');
        return;
    }

    const startDateTime = new Date(startDateTimeInput);
    const endDateTime = new Date(endDateTimeInput);
    const notes = document.getElementById('entryNotes') ? document.getElementById('entryNotes').value.trim() : '';

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        showToast('Invalid date/time format', 'error');
        return;
    }

    if (endDateTime <= startDateTime) {
        showToast('End time must be after start time', 'error');
        return;
    }

    pendingEntryData = {
        startDate: startDateTime,
        endDate: endDateTime,
        goodColor: selectedGoodColor,
        badColor: selectedBadColor,
        notes: notes
    };

    const confirmContent = document.getElementById('confirmEntryContent');
    if (!confirmContent) return;

    if (selectedGoodColor || selectedBadColor) {
        let html = '<h4>Do you want to add?</h4>';
        html += '<div class="confirm-colors">';
        if (selectedGoodColor) {
            html += `
                <div class="confirm-color-item">
                    <div class="confirm-color-box" style="background: ${selectedGoodColor.hex}"></div>
                    <div class="confirm-color-label">Good Color: ${selectedGoodColor.name}</div>
                </div>
            `;
        }
        if (selectedBadColor) {
            html += `
                <div class="confirm-color-item">
                    <div class="confirm-color-box" style="background: ${selectedBadColor.hex}"></div>
                    <div class="confirm-color-label">Bad Color: ${selectedBadColor.name}</div>
                </div>
            `;
        }
        html += '</div>';
        html += `<div class="confirm-time">${formatDateRange(startDateTime, endDateTime)}</div>`;
        confirmContent.innerHTML = html;
    } else {
        confirmContent.innerHTML = `
            <h4>Do you want to add?</h4>
            <div style="font-size: 1.5rem; font-weight: 700; margin: 30px 0;">⚫ BAD TIME</div>
            <div class="confirm-time">${formatDateRange(startDateTime, endDateTime)}</div>
        `;
    }

    closeAddEntryModal();
    const confirmModal = document.getElementById('confirmEntryModal');
    if (confirmModal) confirmModal.classList.add('active');
}

function closeConfirmEntryModal() {
    const modal = document.getElementById('confirmEntryModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// Save Entry
// ==========================================
function saveNewEntry() {
    if (!pendingEntryData || !pendingEntryData.startDate || !pendingEntryData.endDate) {
        showToast('No entry data found. Please try again.', 'error');
        return;
    }

    showLoading();
    closeConfirmEntryModal();

    const entryData = {
        startDate: firebase.firestore.Timestamp.fromDate(pendingEntryData.startDate),
        endDate: firebase.firestore.Timestamp.fromDate(pendingEntryData.endDate),
        notes: pendingEntryData.notes || '',
        createdAt: firebase.firestore.Timestamp.now()
    };

    if (pendingEntryData.goodColor) {
        entryData.goodColor = pendingEntryData.goodColor;
    }
    if (pendingEntryData.badColor) {
        entryData.badColor = pendingEntryData.badColor;
    }

    let operationPromise;
    if (editingEntryId) {
        const updateData = Object.assign({}, entryData);
        delete updateData.createdAt;
        operationPromise = db.collection(ENTRIES_COLLECTION).doc(editingEntryId).update(updateData);
    } else {
        operationPromise = db.collection(PENDING_ENTRIES_COLLECTION).add(entryData);
    }

    operationPromise
        .then(() => {
            hideLoading();
            showToast(editingEntryId ? 'Entry updated successfully!' : 'Entry added successfully! Pending review.', 'success');
            loadAdminStats();
            editingEntryId = null;
            pendingEntryData = null;

            const reviewVisible = document.getElementById('reviewEntriesView') && document.getElementById('reviewEntriesView').style.display !== 'none';
            const adminListVisible = document.getElementById('adminListView') && document.getElementById('adminListView').style.display !== 'none';
            const adminCalendarVisible = document.getElementById('adminCalendarView') && document.getElementById('adminCalendarView').style.display !== 'none';

            if (reviewVisible) showReviewEntries();
            else if (adminListVisible) showConfirmedEntries();
            else if (adminCalendarVisible) showAdminCalendar();
        })
        .catch((error) => {
            console.error('Error saving entry:', error);
            hideLoading();
            showToast('Error saving entry. Please try again.', 'error');
        });
}

// ==========================================
// Confirm/Delete Entry
// ==========================================
function confirmEntry(entryId) {
    if (!entryId) return;
    showLoading();

    db.collection(PENDING_ENTRIES_COLLECTION)
        .doc(entryId)
        .get()
        .then((doc) => {
            if (!doc.exists) throw new Error('Entry not found');

            const entryData = doc.data();
            entryData.confirmedAt = firebase.firestore.Timestamp.now();

            return db.collection(ENTRIES_COLLECTION).add(entryData);
        })
        .then(() => {
            return db.collection(PENDING_ENTRIES_COLLECTION).doc(entryId).delete();
        })
        .then(() => {
            hideLoading();
            showToast('Entry confirmed and published!', 'success');
            loadAdminStats();
            showReviewEntries();
        })
        .catch((error) => {
            console.error('Error confirming entry:', error);
            hideLoading();
            showToast('Error confirming entry. Please try again.', 'error');
        });
}

function deleteEntry(entryId, isPending) {
    if (!entryId) return;
    showLoading();

    const collection = isPending ? PENDING_ENTRIES_COLLECTION : ENTRIES_COLLECTION;

    db.collection(collection)
        .doc(entryId)
        .delete()
        .then(() => {
            hideLoading();
            showToast('Entry deleted successfully', 'success');
            loadAdminStats();

            if (isPending) {
                showReviewEntries();
            } else {
                showConfirmedEntries();
            }
        })
        .catch((error) => {
            console.error('Error deleting entry:', error);
            hideLoading();
            showToast('Error deleting entry. Please try again.', 'error');
        });
}

// ==========================================
// Utility Functions
// ==========================================
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

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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