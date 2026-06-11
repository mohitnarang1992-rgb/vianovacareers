/*
 * ViaNova split JS: 09-init-inline-handlers.js
 * DOMContentLoaded initialisation and global inline handler exposure
 * Extracted from 01-app-core.js without changing logic.
 */

document.addEventListener('DOMContentLoaded', function() {
  initLanguageControls();
  const suClassEl = document.getElementById('su-class');
  if (suClassEl) { suClassEl.addEventListener('change', toggleSignupStreamDropdown); toggleSignupStreamDropdown(); }

  // ── Auto-login from localStorage ──────────────────────
  try {
    const saved = JSON.parse(localStorage.getItem('ps_session') || 'null');
    if (saved && saved.loggedIn) {
      applySession(saved);
      const ov = document.getElementById('signup-screen');
      const landing = document.getElementById('landing-screen');
      if (ov) ov.classList.remove('open');
      if (landing) landing.style.display = 'none';
      document.body.classList.remove('auth-locked');
    } else {
      document.body.classList.add('auth-locked');
    }
  } catch(e) {}

  updateProfileFromState();
  refreshProgress();
  renderPdfControls();
  updateRoadmapUI();
  ensureAdminVisibility();
  renderQuestUi();
  renderStickyMobileCta();
  updateRoadmapUI();

  // ── SIGNUP handler ────────────────────────────────────
  const suBtn = document.getElementById('su-submit');
  if (suBtn) {
    suBtn.addEventListener('click', function() {
      clearMsg('su-msg');
      const name     = document.getElementById('su-name').value.trim();
      const cls      = document.getElementById('su-class').value.trim();
      const selectedStream = normaliseSignupStream((document.getElementById('su-stream') || {}).value || '');
      const board    = document.getElementById('su-board').value.trim();
      const city     = document.getElementById('su-city').value.trim();
      const phone    = document.getElementById('su-phone').value.trim();
      const email    = document.getElementById('su-email').value.trim();
      const password = document.getElementById('su-password').value;
      const coupon   = document.getElementById('su-coupon').value.trim().toUpperCase();

      if (!name)                   return showMsg('su-msg','error','Please enter your full name.');
      if (!cls)                    return showMsg('su-msg','error','Please select your class.');
      if (isSeniorClass(cls) && !selectedStream) return showMsg('su-msg','error','Please select your current stream for Class 11 or 12.');
      if (!board)                  return showMsg('su-msg','error','Please enter your board.');
      if (!city)                   return showMsg('su-msg','error','Please enter your city.');
      if (!/^\d{10}$/.test(phone)) return showMsg('su-msg','error','Enter a valid 10-digit mobile number.');
      if (password.length < 6)     return showMsg('su-msg','error','Password must be at least 6 characters.');
      if (!coupon)                 return showMsg('su-msg','error','Coupon code is required to access ViaNova.');

      if (!SHEETS_URL) return showMsg('su-msg','error','Server not configured yet. Paste your Apps Script /exec URL in the meta tag at the top of this HTML file.');

      suBtn.disabled = true;
      suBtn.textContent = 'Checking coupon…';
      showMsg('su-msg','loading','Validating your coupon code…');

      // Step 1: Check coupon  →  Code.gs action:'checkCoupon'
      jsonpGet(SHEETS_URL, { action: 'checkCoupon', code: coupon }, function(err, data) {
        if (err) {
          suBtn.disabled = false; suBtn.textContent = 'Validate & create account';
          return showMsg('su-msg','error', err);
        }
        if (!data || !data.valid) {
          suBtn.disabled = false; suBtn.textContent = 'Validate & create account';
          return showMsg('su-msg','error', (data && data.message) || 'Coupon is invalid or already used.');
        }

        // Step 2: Check phone not already registered  →  Code.gs action:'checkPhone'
        suBtn.textContent = 'Checking mobile…';
        showMsg('su-msg','loading','Checking if mobile number is already registered…');
        jsonpGet(SHEETS_URL, { action: 'checkPhone', phone }, function(err2, data2) {
          if (!err2 && data2 && data2.exists) {
            suBtn.disabled = false; suBtn.textContent = 'Validate & create account';
            return showMsg('su-msg','error','This mobile number is already registered. Please log in instead.');
          }
          // Step 3: Create account  →  Code.gs action:'signup'
          finishSignup(name, cls, selectedStream, board, city, phone, email, password, coupon);
        });
      });
    });
  }

  // ── LOGIN handler ─────────────────────────────────────
  const liBtn = document.getElementById('li-submit');
  if (liBtn) {
    liBtn.addEventListener('click', function() {
      clearMsg('li-msg');
      const phone    = document.getElementById('li-phone').value.trim();
      const password = document.getElementById('li-password').value;

      if (!/^\d{10}$/.test(phone)) return showMsg('li-msg','error','Enter a valid 10-digit mobile number.');
      if (!password)               return showMsg('li-msg','error','Please enter your password.');

      liBtn.disabled = true; liBtn.textContent = 'Logging in…';
      showMsg('li-msg','loading','Checking your credentials…');

      // Fast path: check localStorage first (works offline on same device)
      try {
        const cached = JSON.parse(localStorage.getItem('ps_session') || 'null');
        if (cached && cached.phone === phone && cached.pwHash === simpleHash(password)) {
          applySession(cached);
          showMsg('li-msg','success','Welcome back, ' + cached.name + '!');
          liBtn.disabled = false; liBtn.textContent = 'Log in';
          setTimeout(() => { const ov=document.getElementById('signup-screen'); const landing=document.getElementById('landing-screen'); if(ov) ov.classList.remove('open'); if(landing) landing.style.display='none'; document.body.classList.remove('auth-locked'); renderStudentHook(); }, 800);
          return;
        }
      } catch(e) {}

      if (!SHEETS_URL) {
        liBtn.disabled = false; liBtn.textContent = 'Log in';
        return showMsg('li-msg','error','Server not configured. Please sign up on this device first, or configure the Apps Script URL.');
      }

      // Server lookup  →  Code.gs action:'checkPhone'
      jsonpGet(SHEETS_URL, { action: 'checkPhone', phone }, function(err, data) {
        liBtn.disabled = false; liBtn.textContent = 'Log in';
        if (err || !data) return showMsg('li-msg','error', err || 'Could not reach server. Check your connection.');
        if (!data.exists) return showMsg('li-msg','error','No account found for this mobile. Please sign up first.');

        const serverHash = data.password_hash || data.passwordhash || '';
        if (serverHash !== simpleHash(password)) return showMsg('li-msg','error','Incorrect password. Please try again.');

        // Preserve any completedTests / assessmentResults already stored on this device
        let existingCompleted = [];
        let existingResults = {};
        try {
          const prev = JSON.parse(localStorage.getItem('ps_session') || 'null');
          if (prev && prev.phone === phone) {
            existingCompleted = Array.isArray(prev.completedTests) ? prev.completedTests : [];
            existingResults   = prev.assessmentResults && typeof prev.assessmentResults === 'object' ? prev.assessmentResults : {};
          }
        } catch(e) {}

        const session = {
          name: data.name, cls: data['class'], board: data.board,
          city: data.city, selectedStream: data.selectedStream || data.selected_stream || data.stream || data.currentStream || data.current_stream || '', phone, email: data.email, coupon: data.coupon,
          pwHash: serverHash, loggedIn: true,
          completedTests: existingCompleted,
          assessmentResults: existingResults
        };
        // Save to localStorage AFTER applySession + server sync (handled inside applySession → syncAssessmentResultsFromServer)
        applySession(session);
        showMsg('li-msg','success','Welcome back, ' + data.name + '!');
        setTimeout(() => { const ov=document.getElementById('signup-screen'); const landing=document.getElementById('landing-screen'); if(ov) ov.classList.remove('open'); if(landing) landing.style.display='none'; document.body.classList.remove('auth-locked'); renderStudentHook(); }, 800);
      });
    });
  }

});




// ─────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────
//  GLOBAL UI HANDLERS
//  Keeps inline onclick handlers working even after refactors.
// ─────────────────────────────────────────────────────────
(function exposeInlineHandlers(){
  var names = ['adminDownloadStudentReport','adminLogin','adminLogout','clearCareerFilters','closeAdminLogin','closeCareerModal','dismissStudentHook','downloadAdminCsv','generateCompiledPdf','handleCounselorCta','loadAdminDashboard','logOut','openAdminLogin','openAuthScreen','openModal','openQuiz','previewCompiledPdf','roadmapJump','showLandingPage','showScreen','switchRoadmapTab','switchTab','testConnection','toggleAdminAnalysis'];
  names.forEach(function(name){
    try {
      if (typeof window[name] !== 'function' && typeof eval(name) === 'function') {
        window[name] = eval(name);
      }
    } catch(e) {}
  });
})();
