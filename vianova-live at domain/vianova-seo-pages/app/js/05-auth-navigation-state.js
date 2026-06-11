/*
 * ViaNova split JS: 05-auth-navigation-state.js
 * Auth helpers, sheet calls, session handling, dashboard/navigation/roadmap UI
 * Extracted from 01-app-core.js without changing logic.
 */

function showMsg(id, type, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'auth-msg ' + type;
  el.innerHTML = String(text || '').replace(/\n/g, '<br>');
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'auth-msg';
  el.innerHTML = '';
}
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

// ─────────────────────────────────────────────────────────
//  NETWORK: JSONP GET  (reads — ping, checkCoupon, checkPhone,
//                        markCouponUsed, canTakeTest)
// ─────────────────────────────────────────────────────────
function jsonpGet(url, params, cb) {
  if (!url) return cb('Apps Script URL not configured. Paste your /exec URL into the meta tag.', null);
  const cbName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
  params = Object.assign({}, params, { callback: cbName, _ts: Date.now() });
  const qs = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const s = document.createElement('script');
  let done = false;
  let timer = null;
  window[cbName] = function(data) {
    if (done) return; done = true; cleanup(); cb(null, data);
  };
  function cleanup() {
    try { delete window[cbName]; } catch(e) { window[cbName] = undefined; }
    if (timer) clearTimeout(timer);
    if (s.parentNode) s.parentNode.removeChild(s);
  }
  s.async = true;
  s.onerror = function() {
    if (done) return; done = true; cleanup();
    cb('Could not reach server. Check that your Apps Script is deployed with "Anyone" access and the doGet function is present.', null);
  };
  s.src = url + (url.includes('?') ? '&' : '?') + qs;
  (document.head || document.body).appendChild(s);
  timer = setTimeout(function() {
    if (done) return; done = true; cleanup();
    cb('Server timeout — Apps Script did not respond in 15 seconds.', null);
  }, 15000);
}

// ─────────────────────────────────────────────────────────
//  NETWORK: POST  (writes — signup, quizResponse)
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
//  NETWORK: WRITE via JSONP GET
//  WHY: fetch() POST to Apps Script triggers a CORS redirect
//  that browsers block from file:// and cross-origin pages.
//  JSONP script injection has NO CORS restriction and works
//  from file://, localhost, or any hosted domain.
//  All writes go through doGet in Code.gs using the 'data'
//  param, and Code.gs returns a JSONP response.
// ─────────────────────────────────────────────────────────
function sendToSheets(payload) {
  return new Promise(function(resolve, reject) {
    if (!SHEETS_URL) {
      reject(new Error('Apps Script URL not configured. Paste your /exec URL into the meta tag.'));
      return;
    }
    jsonpGet(SHEETS_URL, { action: payload.action, data: JSON.stringify(payload) }, function(err, result) {
      if (err) { reject(new Error(err)); return; }
      if (!result || result.status !== 'ok') {
        reject(new Error((result && result.message) || 'Server returned an error.'));
        return;
      }
      resolve(result);
    });
  });
}

// ─────────────────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('panel-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('panel-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active',   tab === 'signup');
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
}

function openAuthScreen(tab) {
  const landing = document.getElementById('landing-screen');
  const auth = document.getElementById('signup-screen');
  if (landing) landing.style.display = 'none';
  if (auth) auth.classList.add('open');
  document.body.classList.add('auth-locked');
  switchTab(tab || 'signup');
}

function showLandingPage() {
  const landing = document.getElementById('landing-screen');
  const auth = document.getElementById('signup-screen');
  const hook = document.getElementById('student-hook-overlay');
  if (hook) hook.classList.remove('open');
  if (auth) auth.classList.remove('open');
  if (landing) landing.style.display = 'flex';
  document.body.classList.add('auth-locked');
}

function getStudentStageLabel() {
  const cls = String(state.cls || '').trim();
  if (cls === '8' || cls === '9') return 'Foundation';
  if (cls === '10') return 'Decision Year';
  if (cls === '11') return 'Direction Building';
  if (cls === '12') return 'Launchpad';
  return 'Explore';
}
function getMissionContent() {
  const done = (state.completedTests || []).length;
  const cls = String(state.cls || '').trim();
  const first = (state.name || 'Student').split(' ')[0] || 'Student';
  const byClass = {
    '8': { title:'Build early self-awareness', copy:first + ', start discovering what energises you before stream pressure begins.', tags:['Notice strengths','Try the interest test','Explore broad career clusters'] },
    '9': { title:'Turn curiosity into direction', copy:'This is a great stage to connect interests with real subjects and future options.', tags:['Spot interest patterns','Compare streams','Save top careers'] },
    '10': { title:'Prepare for a smarter stream choice', copy:'Your class 10 profile should reduce confusion and make stream decisions feel evidence-based.', tags:['Complete all 4 tests','Discuss with parents','Review stream fit'] },
    '11': { title:'Align your current stream with future careers', copy:'Use this dashboard to validate direction, spot gaps, and strengthen your next two years.', tags:['Match stream to careers','Track aptitude gaps','Plan next milestones'] },
    '12': { title:'Convert insight into an action roadmap', copy:'You are close to launch. Use your profile to prioritise best-fit pathways and preparation strategy.', tags:['Shortlist pathways','Focus on entrances','Generate final report'] }
  };
  const defaultData = byClass[cls] || { title:'Unlock your strongest fit', copy:'Complete your assessments to turn this dashboard into a real student-specific action plan.', tags:['Start with interest','Build aptitude confidence','Unlock report'] };
  if (done >= 4) return { title:'Your profile is ready to guide real decisions', copy:'You have unlocked the strongest version of your dashboard. Now compare career matches, stream fit, and the PDF report with your academic reality.', tags:['Read top careers','Open PDF preview','Discuss at home'] };
  if (done >= 2) return { title:defaultData.title, copy:defaultData.copy + ' You already have enough signal to start comparing stream options.', tags:['Finish remaining tests','Check top stream','Open career explorer'] };
  return defaultData;
}
function getDashboardFocusItems(done) {
  const items = [];
  if (done === 0) items.push('Start with the Interest assessment to reveal what naturally attracts you.');
  if (done <= 1) items.push('Complete Aptitude next to see which problem-solving areas come more naturally.');
  if (done <= 2) items.push('Add Personality and Values so your report feels personal, not generic.');
  if (done >= 2 && done < 4) items.push('Your pattern is emerging. Finish the remaining assessments to unlock the final report.');
  if (done >= 4) {
    items.push('Open your PDF report and compare the recommended stream with your marks and subject preference.');
    items.push('Shortlist the 3 strongest career matches and read their pathways carefully.');
    items.push('Use the report with parents or a counsellor before locking important choices.');
  }
  return items.slice(0,3);
}
function getBadgeCopy(testId, done) {
  const map = { interest:'Interest themes discovered and ready to influence your career matches.', aptitude:'Problem-solving strengths mapped for stronger stream and exam decisions.', personality:'Work style signals added so recommendations feel more human and realistic.', values:'Motivation signals added to show what success may feel meaningful to you.' };
  return done ? map[testId] : 'Unlock this by finishing the ' + assessmentDisplayName(testId) + ' assessment.';
}


function normaliseSignupStream(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'pcm' || /science.*math|math.*science/.test(v)) return 'PCM';
  if (v === 'pcb' || /science.*bio|bio.*science/.test(v)) return 'PCB';
  if (v.indexOf('commerce') >= 0) return 'Commerce';
  if (v.indexOf('humanities') >= 0) return 'Humanities';
  if (v.indexOf('arts') >= 0) return 'Arts';
  return String(value || '').trim();
}
function isSeniorClass(cls) {
  const c = String(cls || '').trim();
  return c === '11' || c === '12';
}
function getSelectedSignupStream() {
  return normaliseSignupStream(state.selectedStream || state.stream || state.studentStream || '');
}
function selectedStreamLabel() {
  const s = getSelectedSignupStream();
  return s ? (' • ' + s) : '';
}
function toggleSignupStreamDropdown() {
  const clsEl = document.getElementById('su-class');
  const row = document.getElementById('su-stream-row');
  const streamEl = document.getElementById('su-stream');
  if (!clsEl || !row) return;
  const show = isSeniorClass(clsEl.value);
  row.classList.toggle('show', show);
  if (!show && streamEl) streamEl.value = '';
}
function getEffectiveReportStream(profile) {
  const selected = getSelectedSignupStream();
  if (selected) return selected;
  return String((profile && profile.recommendedStream) || '').trim();
}
function careerRequiresPcm(text) {
  text = String(text || '').toLowerCase();
  const mathCompatHealth = /(biomedical|bioinformatics|health tech|healthtech|medical device|hospital analytics|health analytics|public health data)/.test(text);
  if (mathCompatHealth) return false;
  return /(\bpcm\b|physics[^.;,]*chemistry[^.;,]*math|mathematics[^.;,]*physics|jee\b|jee main|jee advanced|\biit\b|\bnit\b|\bb\.?\s*tech\b|bachelor of technology|engineering|aerospace|aeronautical|mechanical|civil engineering|electrical|electronics|mechatronics|robotics|architecture|\bnata\b)/.test(text);
}
function careerRequiresPcb(text) {
  text = String(text || '').toLowerCase();
  const mathCompatHealth = /(biomedical|bioinformatics|health tech|healthtech|medical device|hospital analytics|health analytics|public health data)/.test(text);
  if (mathCompatHealth) return false;
  return /(\bpcb\b|biology|neet|mbbs|bds|bams|bhms|nursing|pharmacy|physiotherapy|veterinary|medical doctor|medicine|surgeon|dentist|clinical|paramedical)/.test(text);
}
function careerMatchesSelectedStream(career, selectedStream) {
  const stream = normaliseSignupStream(selectedStream || getSelectedSignupStream());
  if (!stream) return true;
  const text = careerSearchText(career || {});
  const category = String((career && career.category) || '').toLowerCase();
  const streams = String(((career && career.streams) || []).join(' ')).toLowerCase();
  const requiresPcm = careerRequiresPcm(text);
  const requiresPcb = careerRequiresPcb(text);
  const commerceFriendly = /(commerce|business|finance|account|economics|management|marketing|sales|entrepreneur|bank|audit|tax|law|ca\b|cs\b|cma\b|bba|bcom|b\.com)/.test(text + ' ' + streams + ' ' + category);
  const artsFriendly = /(arts|humanities|design|media|journal|law|psychology|education|teaching|social|public policy|civil service|history|political|literature|language|fine art|performing art|ux|content)/.test(text + ' ' + streams + ' ' + category);
  if (stream === 'PCM') return !requiresPcb;
  if (stream === 'PCB') return !requiresPcm;
  if (stream === 'Commerce') return !requiresPcm && !requiresPcb && (commerceFriendly || !/(science|medical|engineering|technology|lab|research)/.test(text));
  if (stream === 'Arts' || stream === 'Humanities') return !requiresPcm && !requiresPcb && (artsFriendly || !/(science|medical|engineering|technology|lab|research|accountancy|finance)/.test(text));
  return true;
}
function streamCompatibilityScoreForCareer(career, selectedStream) {
  const stream = normaliseSignupStream(selectedStream || getSelectedSignupStream());
  if (!stream) return 55;
  const ok = careerMatchesSelectedStream(career, stream);
  if (!ok) return 0;
  const text = careerSearchText(career || {});
  if (stream === 'PCM') return /(pcm|math|engineering|technology|software|data|architecture|physics|computer|analytics)/.test(text) ? 95 : 70;
  if (stream === 'PCB') return /(pcb|biology|medical|health|life science|pharmacy|nursing|psychology|nutrition|biotech)/.test(text) ? 95 : 70;
  if (stream === 'Commerce') return /(commerce|business|finance|account|economics|management|marketing|sales|bank|audit|tax|law|bba|bcom)/.test(text) ? 95 : 68;
  if (stream === 'Arts' || stream === 'Humanities') return /(arts|humanities|design|media|journal|law|psychology|education|social|policy|civil service|language|content)/.test(text) ? 95 : 68;
  return 65;
}

function updateProfileFromState() {
  const n = state.name || 'Student';
  const first = n.split(' ')[0] || n;
  const cls = state.cls || '—';
  const board = state.board || '—';
  const city = state.city || '—';
  const meta = ['Class ' + cls + selectedStreamLabel(), board, city].join(' • ');
  renderQuestUi();
  renderStickyMobileCta();
  const av = (n.trim()[0] || 'S').toUpperCase();
  const done = (state.completedTests || []).length;
  const profile = state.assessmentProfile || {};
  const stream = profile.recommendedStream || 'Still being estimated';
  const sa = document.getElementById('sidebar-avatar'); if (sa) sa.textContent = av;
  const sn = document.getElementById('sidebar-name'); if (sn) sn.textContent = n;
  const sm = document.getElementById('sidebar-meta'); if (sm) sm.textContent = meta;
  const gn = document.getElementById('greeting-name'); if (gn) gn.textContent = first;
  const rn = document.getElementById('report-name'); if (rn) rn.textContent = n;
  const rd = document.getElementById('report-desc');
  if (rd) rd.textContent = 'Class ' + cls + ' • ' + board + ' • ' + city + '. ' + (done ? ('Completed modules: ' + done + '/4. Your current best-fit stream is ' + stream + '.') : 'Complete your assessments to generate a detailed personalised profile here.');

  const dfn = document.getElementById('dashboard-first-name'); if (dfn) dfn.textContent = first;
  const dhc = document.getElementById('dashboard-hero-copy');
  if (dhc) dhc.textContent = done >= 4
    ? first + ', your personalised profile is ready. Use it to compare streams, career cards, and your counselling PDF with confidence.'
    : first + ', this space is now customised for Class ' + cls + ' (' + board + ') from ' + city + '. Every assessment you complete will make your dashboard smarter and more specific to you.';
  const dc1 = document.getElementById('dash-chip-class'); if (dc1) dc1.textContent = 'Class ' + cls;
  const dc2 = document.getElementById('dash-chip-board'); if (dc2) dc2.textContent = board;
  const dc3 = document.getElementById('dash-chip-city'); if (dc3) dc3.textContent = city;
  const dc4 = document.getElementById('dash-chip-stage'); if (dc4) dc4.textContent = 'Stage: ' + getStudentStageLabel();
  const da = document.getElementById('dashboard-avatar'); if (da) da.textContent = av;
  const dpn = document.getElementById('dashboard-profile-name'); if (dpn) dpn.textContent = n;
  const dpm = document.getElementById('dashboard-profile-meta'); if (dpm) dpm.textContent = meta;
  const dpl = document.getElementById('dashboard-progress-label'); if (dpl) dpl.textContent = done + ' of 4 assessments complete';
  const dfl = document.getElementById('dashboard-fit-label'); if (dfl) dfl.textContent = done ? stream : 'Complete at least one assessment to estimate stream fit';
  const motto = document.getElementById('dashboard-motto'); if (motto) motto.textContent = done >= 4 ? 'Your profile is report-ready.' : (done >= 2 ? 'You are building real direction.' : 'Every answer sharpens your path.');

  const mission = getMissionContent();
  const mw = document.getElementById('mission-window'); if (mw) mw.textContent = done >= 4 ? 'your next move' : 'this week';
  const mt = document.getElementById('mission-title'); if (mt) mt.textContent = mission.title;
  const mc = document.getElementById('mission-copy'); if (mc) mc.textContent = mission.copy;
  const mtags = document.getElementById('mission-tags'); if (mtags) mtags.innerHTML = (mission.tags || []).map(function(tag){ return '<span class="mission-tag">' + escapeHtml(tag) + '</span>'; }).join('');

  const focusBurst = document.getElementById('focus-burst'); if (focusBurst) focusBurst.textContent = done >= 4 ? 'Level Max' : 'Level ' + (done + 1);
  const focusMode = document.getElementById('dash-focus-mode'); if (focusMode) focusMode.textContent = done >= 4 ? 'Report Ready' : (done >= 2 ? 'Builder' : 'Explorer');
  const focusSub = document.getElementById('dash-focus-sub'); if (focusSub) focusSub.textContent = done >= 4 ? 'Turn insight into action' : 'Your next action is waiting';
  const focusList = document.getElementById('dashboard-focus-list');
  if (focusList) focusList.innerHTML = getDashboardFocusItems(done).map(function(item, idx){ return '<div class="focus-item"><div class="focus-num">' + (idx + 1) + '</div><div class="focus-text">' + escapeHtml(item) + '</div></div>'; }).join('');
}


function applySession(s) {
  const session = s || {};
  state.name = session.name || '';
  state.cls = session.cls || session['class'] || '';
  state.board = session.board || '';
  state.city = session.city || '';
  state.selectedStream = normaliseSignupStream(session.selectedStream || session.selected_stream || session.stream || session.currentStream || session.current_stream || '');
  state.phone = session.phone || '';
  state.email = session.email || '';
  state.coupon = session.coupon || '';
  state.loggedIn = !!session.loggedIn;
  state.assessmentResults = Object.assign({}, session.assessmentResults || {});
  state.completedTests = Array.isArray(session.completedTests) ? session.completedTests.slice() : Object.keys(state.assessmentResults);
  state.assessmentProfile = null;
  state.questProgress = Object.assign({ xp: 0, level: 1, badges: [], lastReward: '' }, session.questProgress || {});
  ensureQuestProgressShape();
  state.isAdmin = !!session.isAdmin;
  state.adminToken = session.adminToken || '';
  state.adminUser = session.adminUser || '';
  ensureAdminVisibility();
  updateProfileFromState();
  refreshProgress();
  refreshAssessmentProfile();
  renderPdfControls();
  renderStreamRecommendations();
  initCareerData();
  renderQuestUi();
  renderStickyMobileCta();
  setTimeout(function(){ renderStudentHook(); }, 120);
  syncAssessmentResultsFromServer();
}


function syncAssessmentResultsFromServer() {
  return new Promise(function(resolve) {
    if (!SHEETS_URL || !state.phone) return resolve(false);
    jsonpGet(SHEETS_URL, { action: 'getStudentResults', phone: state.phone }, function(err, data) {
      if (err || !data || !Array.isArray(data.results)) {
        // Sync failed — still refresh UI with whatever is already in state
        renderPdfControls();
        refreshProgress();
        return resolve(false);
      }
      const resultsByTest = {};
      data.results.forEach(function(item) {
        if (!item || !item.test_id) return;
        let parsed = {};
        try { parsed = item.summary_json ? JSON.parse(item.summary_json) : {}; } catch(e) { parsed = {}; }
        let answers = item.answers ? String(item.answers).split('|') : [];
        resultsByTest[item.test_id] = {
          completedAt: item.timestamp || '',
          answers: answers,
          result: parsed && Object.keys(parsed).length ? parsed : { score: Number(item.score || 0) }
        };
      });
      state.assessmentResults = Object.assign({}, resultsByTest);
      state.completedTests = Object.keys(state.assessmentResults).filter(function(k){ return !!state.assessmentResults[k]; });
      try {
        const saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
        // Only update data fields — never overwrite auth fields like pwHash
        saved.completedTests = state.completedTests;
        saved.assessmentResults = state.assessmentResults;
        saved.loggedIn = true;
        localStorage.setItem('ps_session', JSON.stringify(saved));
      } catch(e) {}
      updateProfileFromState();
      refreshProgress();
      refreshAssessmentProfile();
      renderPdfControls();
      initCareerData();
      resolve(true);
    });
  });
}


function switchRoadmapTab(id) {
  document.querySelectorAll('.roadmap-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.roadmap-tab-panel').forEach(function(p){ p.classList.remove('active'); });
  const labels = { sci:'Science', comm:'Commerce', arts:'Arts / Humanities', voc:'Vocational / ITI' };
  document.querySelectorAll('.roadmap-tab').forEach(function(t){
    if ((t.textContent || '').trim() === labels[id]) t.classList.add('active');
  });
  const panel = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');
  const helper = document.getElementById('roadmap-helper-text');
  if (helper) {
    const messages = {
      sci: 'Science pathways keep engineering, medicine, research, architecture, and defence-linked options visible.',
      comm: 'Commerce pathways are strongest when you compare professional qualifications, BBA/B.Com routes, and finance-business careers side by side.',
      arts: 'Humanities pathways open strong options in law, design, psychology, civil services, teaching, social science, and media.',
      voc: 'Vocational routes are not fallback routes. They can lead to skilled jobs, diplomas, entrepreneurship, and later lateral growth.'
    };
    helper.textContent = messages[id] || 'Explore the pathway below.';
  }
}
function roadmapJump(query) {
  const q = String(query || '').trim();
  if (!q) return;
  try {
    sendToSheets({ action:'logClientEvent', phone: state.phone || '', detail:'roadmap:' + q }).catch(function(){});
  } catch(e) {}
  const helper = document.getElementById('roadmap-helper-text');
  const clean = q.toLowerCase();
  const aliases = [
    ['software engineer','software'], ['civil engineer','civil'], ['doctor','doctor'], ['mbbs','doctor'], ['data scientist','data'], ['architect','architect'], ['biotechnologist','biotech'],
    ['chartered accountant','account'], ['investment banker','bank'], ['bank manager','bank'], ['marketing manager','marketing'], ['company secretary','secretary'], ['entrepreneur','entrepreneur'],
    ['ias officer','civil service'], ['lawyer','law'], ['journalist','journal'], ['designer','design'], ['psychologist','psychology'], ['film director','film'], ['teacher','teacher'],
    ['electrician','electrician'], ['machinist','machinist'], ['auto mechanic','mechanic'], ['diploma engineer','engineer'], ['computer operator','computer'], ['lab technician','lab'],
    ['jee','engineering'], ['neet','medical'], ['ca foundation','account'], ['cuet','college'], ['iti','vocational']
  ];
  let keyword = '';
  for (const pair of aliases) {
    if (clean.includes(pair[0])) { keyword = pair[1]; break; }
  }
  const hay = function(c) {
    return [c.title,c.cluster,c.description,c.exams,c.degree,(c.streams||[]).join(' '),(c.skills||[]).join(' ')].join(' ').toLowerCase();
  };
  const match = CAREER_STATE.all.find(function(c){ return keyword && hay(c).includes(keyword); }) || CAREER_STATE.all.find(function(c){ return hay(c).includes(clean.slice(0,32)); });
  if (match) {
    showScreen('careers');
    openCareerModalBySlug(match.slug);
    if (helper) helper.textContent = 'Opened a related career card for: ' + match.title + '. Use Career Explorer filters to compare more options.';
    return;
  }
  showScreen('careers');
  if (helper) helper.textContent = 'Moved you to Career Explorer. Try filters there to explore this pathway: ' + q;
}
function updateRoadmapUI() {
  const cls = String(state.cls || '').trim();
  const badge = document.getElementById('roadmap-class-badge');
  const best = document.getElementById('roadmap-best-stream');
  const bestCopy = document.getElementById('roadmap-best-stream-copy');
  const stageTitle = document.getElementById('roadmap-stage-title');
  const stageCopy = document.getElementById('roadmap-stage-copy');
  const nextAction = document.getElementById('roadmap-next-action');
  const nextCopy = document.getElementById('roadmap-next-copy');
  const profile = state.assessmentProfile || {};
  if (badge) badge.textContent = cls ? ('Personalised for Class ' + cls) : 'Best used in Class 10';
  if (best) best.textContent = profile.recommendedStream || ((state.completedTests || []).length ? 'Open your report' : 'Complete assessments');
  if (bestCopy) bestCopy.textContent = (profile.recommendedStream ? 'Your current assessment pattern points most strongly toward this stream. Use the roadmap below to validate it with subjects and entrances.' : 'Once at least some assessments are completed, this space will reflect your strongest-fit academic direction.');
  const stageMap = {
    '8':['Build awareness early','Use the roadmap to notice what each stream eventually unlocks before pressure starts.'],
    '9':['Start comparing seriously','This is a strong year to compare stream realities, not just popular stereotypes.'],
    '10':['Make a confident stream choice','Use this screen as your decision board for Class 11 subject selection.'],
    '11':['Check alignment, not just choice','Now verify whether your current stream still supports the careers you are attracted to.'],
    '12':['Convert exploration into action','Focus less on stream confusion now and more on course, exam, and college alignment.']
  };
  const chosen = stageMap[cls] || ['Choose with evidence','Look at interest, aptitude, personality, and values together instead of relying only on marks or peer pressure.'];
  if (stageTitle) stageTitle.textContent = chosen[0];
  if (stageCopy) stageCopy.textContent = chosen[1];
  const done = (state.completedTests || []).length;
  if (nextAction) nextAction.textContent = done >= 4 ? 'Validate top pathways' : done >= 1 ? 'Finish remaining tests' : 'Start with Interest test';
  if (nextCopy) nextCopy.textContent = done >= 4 ? 'Use the flowchart to compare the required entrances and colleges for your shortlisted careers.' : done >= 1 ? 'A few more tests will make the stream and career suggestions far more personalised.' : 'The roadmap is most useful when combined with your assessment profile.';
}

function showScreen(key) {
  if (key === 'admin' && !state.isAdmin) {
    openAdminLogin();
    return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('screen-' + key);
  if (t) t.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    const oc = b.getAttribute('onclick') || '';
    b.classList.toggle('active', oc.includes("showScreen('" + key + "')"));
  });
  syncMobileNav(key);
  if (key === 'admin' && state.isAdmin && (!state.adminData || !state.adminData.students || !state.adminData.students.length)) {
    setTimeout(function(){ loadAdminDashboard(); }, 0);
  }
  // Always re-render report controls when switching to the report tab
  if (key === 'report') {
    renderPdfControls();
  }
}


function syncMobileNav(key) {
  document.querySelectorAll('.mobile-nav .mnav-btn').forEach(function(btn){
    const oc = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', oc.includes("showScreen('" + key + "')"));
  });
}
function getAdminCode() {
  return state.adminToken || '';
}
function ensureAdminVisibility() {
  const desktop = document.getElementById('admin-nav-btn');
  const mobile = document.getElementById('mnav-admin-btn');
  if (desktop) desktop.style.display = '';
  if (mobile) mobile.style.display = '';
}
function promptAdminAccess() {
  openAdminLogin();
  return false;
}
