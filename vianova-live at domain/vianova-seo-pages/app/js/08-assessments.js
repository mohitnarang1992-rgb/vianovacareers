/*
 * ViaNova split JS: 08-assessments.js
 * Assessment progress tracking, scoring UI, quiz overlay
 * Extracted from 01-app-core.js without changing logic.
 */

const TEST_IDS = ['interest','aptitude','personality','values'];

function refreshProgress() {
  const done = TEST_IDS.filter(t => state.completedTests && state.completedTests.includes(t));
  const pct = Math.round((done.length / 4) * 100);
  const bar = document.getElementById('mainProgress');
  const pctEl = document.getElementById('progress-pct');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  const dashCount = document.getElementById('dash-assess-count');
  if (dashCount) dashCount.textContent = done.length + '/4';
  const dashAssessSub = document.getElementById('dash-assess-sub');
  if (dashAssessSub) dashAssessSub.textContent = done.length === 4 ? 'All modules completed — your PDF is unlocked' : (4 - done.length) + ' more to unlock your full report';

  TEST_IDS.forEach(t => {
    const card = document.getElementById('assess-' + t + '-card');
    if (!card) return;
    card.classList.remove('done','active-card');
    if (done.includes(t)) card.classList.add('done');
  });

  const j2 = document.getElementById('j2');
  const j3 = document.getElementById('j3');
  const j4 = document.getElementById('j4');
  if (j2) j2.className = 'j-dot' + (done.length >= 1 ? ' done' : done.length === 0 ? ' active' : '');
  if (j3) j3.className = 'j-dot' + (done.length >= 3 ? ' done' : done.length >= 1 ? ' active' : '');
  if (j4) j4.className = 'j-dot' + (done.length === 4 ? ' done' : done.length >= 3 ? ' active' : '');

  const badge = document.getElementById('assess-badge');
  if (badge) {
    const remaining = (4 - done.length);
    badge.textContent = remaining || '';
    badge.style.display = remaining ? 'inline-block' : 'none';
  }

  const badgeIds = ['interest','aptitude','personality','values'];
  badgeIds.forEach(function(id){
    const el = document.getElementById('badge-' + id + '-text');
    if (el) el.textContent = getBadgeCopy(id, done.includes(id));
  });
  const reportBadge = document.getElementById('badge-report-text');
  if (reportBadge) reportBadge.textContent = done.length === 4 ? 'Hybrid PDF unlocked with personalised insights, stream fit, and career recommendations.' : 'Complete all four assessments to unlock your hybrid PDF report.';
  const pathBadge = document.getElementById('badge-path-text');
  if (pathBadge) pathBadge.textContent = done.length >= 2 ? 'Your dashboard is now adapting to your real profile, not a generic student view.' : 'Your dashboard will personalise more deeply as you progress.';

  updateProfileFromState();
  renderQuestUi();
  renderStickyMobileCta();
}


function markTestDone(testId) {
  if (!state.completedTests) state.completedTests = [];
  if (!state.completedTests.includes(testId)) state.completedTests.push(testId);
  try {
    const saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
    saved.completedTests = state.completedTests;
    saved.assessmentResults = state.assessmentResults || {};
    localStorage.setItem('ps_session', JSON.stringify(saved));
  } catch(e) {}
  refreshProgress();
}

function refreshAssessmentProfile() {
  const results = state.assessmentResults || {};
  const profile = { completed: Object.keys(results).length, riasec:{}, aptitudePct:{}, personalityPct:{}, valuesPct:{}, topRiasec:[], topTraits:[], topValues:[], recommendedStream:'' };
  if (results.interest?.result) { profile.riasec = results.interest.result.pct || {}; profile.topRiasec = results.interest.result.topRiasec || []; }
  if (results.aptitude?.result) { profile.aptitudePct = results.aptitude.result.pct || {}; profile.topAptitude = results.aptitude.result.topAptitude || []; }
  if (results.personality?.result) { profile.personalityPct = results.personality.result.pct || {}; profile.topTraits = results.personality.result.topTraits || []; }
  if (results.values?.result) { profile.valuesPct = results.values.result.pct || {}; profile.topValues = results.values.result.topValues || []; }
  const ri = profile.riasec, apt = profile.aptitudePct;
  const science = ((ri.I||0)*0.45) + ((apt.Numerical||0)*0.2) + ((apt.Logical||0)*0.2) + ((apt.Spatial||0)*0.15);
  const commerce = ((ri.E||0)*0.3) + ((ri.C||0)*0.25) + ((apt.Numerical||0)*0.3) + ((apt.Verbal||0)*0.15);
  const humanities = ((ri.S||0)*0.35) + ((ri.A||0)*0.25) + ((apt.Verbal||0)*0.25) + (((profile.personalityPct.A||0)+(profile.personalityPct.O||0))/2)*0.15;
  const vocational = ((ri.R||0)*0.35) + ((apt.Mechanical||0)*0.25) + ((apt.Spatial||0)*0.2) + ((profile.valuesPct['Working Conditions']||0)*0.2);
  profile.streams = [
    {name:'Science + Maths', icon:'🔬', score:Math.round(science), badge:'Strong fit', badgeClass:'badge-strong', subjects:'Physics, Chemistry, Mathematics, Computer Science', text:'Best for analytical, investigative, and problem-solving strengths.'},
    {name:'Commerce + Maths', icon:'💼', score:Math.round(commerce), badge:'Good fit', badgeClass:'badge-good', subjects:'Accountancy, Economics, Business Studies, Mathematics', text:'Best for business, finance, analytics, and structured planning.'},
    {name:'Humanities / Arts', icon:'🎭', score:Math.round(humanities), badge:'Good fit', badgeClass:'badge-good', subjects:'Psychology, Economics, Design, Political Science, English', text:'Best for people understanding, creativity, and communication.'},
    {name:'Vocational + Skills', icon:'🛠️', score:Math.round(vocational), badge:tx('career.worth'), badgeClass:'badge-explore', subjects:'IT, Healthcare, Agriculture, Tourism, Design Crafts', text:'Best for practical, applied, and skill-based pathways.'}
  ].sort((a,b)=>b.score-a.score);
  const selectedAcademicStream = getSelectedSignupStream();
  if (selectedAcademicStream) {
    const selectedMap = { PCM:'Science + Maths', PCB:'Science + Biology', Commerce:'Commerce', Arts:'Humanities / Arts', Humanities:'Humanities / Arts' };
    const selectedName = selectedMap[selectedAcademicStream] || selectedAcademicStream;
    const existing = profile.streams.find(function(x){ return x.name === selectedName; });
    if (existing) {
      existing.score = Math.max(existing.score || 0, 95);
      existing.badge = 'Selected stream';
      existing.badgeClass = 'badge-strong';
    } else if (selectedAcademicStream === 'PCB') {
      profile.streams.push({name:'Science + Biology', icon:'🧬', score:95, badge:'Selected stream', badgeClass:'badge-strong', subjects:'Physics, Chemistry, Biology', text:'Your report will prioritise biology and healthcare/life-science compatible options.'});
    }
    profile.streams.sort(function(a,b){ return (b.score||0) - (a.score||0); });
    profile.recommendedStream = selectedName;
    profile.selectedSignupStream = selectedAcademicStream;
  } else {
    profile.recommendedStream = profile.streams[0] ? profile.streams[0].name : 'Flexible / Multidisciplinary';
  }
  state.assessmentProfile = profile;
  updateReportUI();
  updateRoadmapUI();
}
function renderMetricBars(targetId, items, colors) {
  const wrap = document.getElementById(targetId); if (!wrap) return;
  wrap.innerHTML = items.map((item, idx) => '<div class="i-bar-row"><div class="i-bar-label">' + escapeHtml(item.label) + '</div><div class="i-bar-track"><div class="i-bar-fill" style="width:' + item.value + '%;background:' + colors[idx % colors.length] + ';"></div></div><div class="i-pct">' + item.value + '</div></div>').join('');
}
function updateReportUI() {
  const profile = state.assessmentProfile || {};
  const riMap = {R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional'};
  const interestItems = Object.keys(profile.riasec || {}).map(k => ({ label: riMap[k] || k, value: profile.riasec[k] })).sort((a,b)=>b.value-a.value);
  if (interestItems.length) renderMetricBars('interest-bars', interestItems, ['var(--sf)','var(--purple)','var(--blue)','var(--green)','var(--amber)','var(--ink-s)']);
  const aptItems = Object.keys(profile.aptitudePct || {}).map(k => ({ label: k, value: profile.aptitudePct[k] })).sort((a,b)=>b.value-a.value);
  if (aptItems.length) renderMetricBars('aptitude-bars', aptItems, ['var(--sf)','var(--blue)','var(--green)','var(--purple)','var(--amber)']);
  const topCode = document.getElementById('report-top-code'); if (topCode) topCode.textContent = 'Top code: ' + ((profile.topRiasec || []).slice(0,2).join('-') || '—');
  const streamPill = document.getElementById('report-stream-pill'); if (streamPill) streamPill.textContent = 'Stream: ' + (profile.recommendedStream || '—');
  const dashStream = document.getElementById('dash-stream'); if (dashStream) dashStream.textContent = profile.recommendedStream || '—';
  const dashStreamSub = document.getElementById('dash-stream-sub'); if (dashStreamSub) dashStreamSub.textContent = profile.topRiasec && profile.topRiasec.length ? ('Top code ' + profile.topRiasec.slice(0,2).join('-') + ' is shaping this fit') : 'Based on your profile so far';
  const insightWrap = document.getElementById('report-insights');
  if (insightWrap) {
    const insights = [];
    if (profile.topRiasec?.includes('I')) insights.push('You like understanding how things work, which supports science, technology, and research pathways.');
    if (profile.topRiasec?.includes('A')) insights.push('You have a creative signal that strengthens design, media, architecture, or storytelling pathways.');
    if ((profile.aptitudePct?.Numerical||0) >= 70 || (profile.aptitudePct?.Logical||0) >= 70) insights.push('Your quantitative reasoning is a strong asset for engineering, finance, analytics, and competitive exams.');
    if ((profile.personalityPct?.O||0) >= 70) insights.push('High openness suggests comfort with new ideas, experimentation, and multidisciplinary learning.');
    if ((profile.valuesPct?.Relationships||0) >= 70 || (profile.valuesPct?.Support||0) >= 70) insights.push('Your values show that people, support, and impact matter in long-term career satisfaction.');
    while (insights.length < 5) insights.push('Complete all assessments to unlock more specific insight statements and stronger recommendations.');
    const colors = ['var(--sf)','var(--purple)','var(--blue)','var(--green)','var(--amber)'];
    insightWrap.innerHTML = insights.slice(0,5).map((text, idx) => '<div class="insight-item"><div class="insight-dot" style="background:' + colors[idx] + ';"></div><div class="insight-text">' + escapeHtml(text) + '</div></div>').join('');
  }
  const pers = document.getElementById('personality-summary');
  if (pers) {
    const traitNames = {O:'Openness',C:'Conscientiousness',E:'Extraversion',A:'Agreeableness',N:'Emotional Reactivity'};
    pers.innerHTML = Object.keys(profile.personalityPct || {}).sort((a,b)=>(profile.personalityPct[b]||0)-(profile.personalityPct[a]||0)).slice(0,3).map(k => '<span class="filter-chip active">' + traitNames[k] + ': ' + profile.personalityPct[k] + '</span>').join('') || '<span class="filter-chip">Complete personality test</span>';
  }
  const vals = document.getElementById('values-summary');
  if (vals) {
    vals.innerHTML = Object.keys(profile.valuesPct || {}).sort((a,b)=>(profile.valuesPct[b]||0)-(profile.valuesPct[a]||0)).slice(0,3).map(k => '<span class="filter-chip">' + escapeHtml(k) + ': ' + profile.valuesPct[k] + '</span>').join('') || '<span class="filter-chip">Complete values inventory</span>';
  }
  const actions = document.getElementById('report-actions');
  if (actions) {
    const steps = [
      {month:'This week', title:'Validate your stream fit', items:['Discuss ' + (profile.recommendedStream || 'your stream options') + ' with parents.', 'Compare your strongest aptitude sections with your school performance.', 'Shortlist 3 careers from Career Explorer.']},
      {month:'Week 2–3', title:'Explore matching careers', items:['Read 5 detailed career cards.', 'Watch one real student or professional day-in-the-life video.', 'Note entrance exams, subjects, and portfolio needs.']},
      {month:'Week 4', title:'Turn insight into action', items:['Choose one project or club aligned to your strengths.', 'Create a simple study + exploration timetable.', 'Review this report after your next academic milestone.']}
    ];
    actions.innerHTML = steps.map(step => '<div class="action-card"><div class="action-month">' + step.month + '</div><div class="action-title">' + step.title + '</div><div class="action-items">' + step.items.map(i => '<div class="action-item">' + escapeHtml(i) + '</div>').join('') + '</div></div>').join('');
  }
  const meaning = document.getElementById('report-meaning-copy');
  if (meaning) {
    const bits = [];
    if (profile.recommendedStream) bits.push('Your current pattern points most strongly toward ' + profile.recommendedStream + '.');
    if ((profile.topRiasec || []).length) bits.push('Interest themes like ' + profile.topRiasec.slice(0,2).join(' and ') + ' are influencing that direction.');
    if ((profile.topAptitude || []).length) bits.push('Your stronger aptitude areas currently include ' + profile.topAptitude.slice(0,2).join(' and ') + '.');
    if ((profile.topValues || []).length) bits.push('Long-term satisfaction may depend on values such as ' + profile.topValues.slice(0,2).join(' and ') + '.');
    meaning.textContent = bits.length ? bits.join(' ') : 'Complete your assessments to turn this into a meaningful student story.';
  }
  const confidence = document.getElementById('report-confidence-score');
  const confidenceCopy = document.getElementById('report-confidence-copy');
  const done = (state.completedTests || []).length;
  const confidenceScore = Math.min(96, 22 + (done * 18));
  if (confidence) confidence.textContent = confidenceScore + '%';
  if (confidenceCopy) confidenceCopy.textContent = done >= 4 ? 'This is now strong enough for stream comparison, shortlisting, and counselor discussion.' : ''+tx('pdf.confidence')+' rises with every completed module because the profile becomes less generic.';
  const coverStream = document.getElementById('report-cover-stream');
  const coverNext = document.getElementById('report-cover-next');
  if (coverStream) coverStream.textContent = profile.recommendedStream || 'Pending';
  if (coverNext) coverNext.textContent = done >= 4 ? 'Generate PDF + discuss' : done >= 1 ? 'Finish remaining tests' : 'Start Interest Quest';
  const counselorCopy = document.getElementById('counselor-cta-copy');
  const counselorBtn = document.getElementById('counselor-cta-btn');
  if (counselorCopy) counselorCopy.textContent = done >= 4 ? 'Your report is now detailed enough to support a meaningful counselor or mentor conversation.' : 'Unlock this after completing all four assessments so the conversation is specific, not generic.';
  if (counselorBtn) counselorBtn.textContent = done >= 4 ? 'Prepare for counselor discussion' : 'Unlock after report';
  renderAssessmentResultCards();
}

function renderAssessmentResultCards() {
  const wrap = document.getElementById('report-assessment-results');
  if (!wrap) return;
  const results = state.assessmentResults || {};
  const order = ['interest','aptitude','personality','values'];
  const cards = order.filter(id => results[id] && results[id].result).map(function(id) {
    const result = results[id].result || {};
    const recs = getAssessmentCareerRecommendations(id, result);
    let detailHtml = '';
    if (id === 'interest') {
      const labels = {R:'Realistic',I:'Investigative',A:'Artistic',S:'Social',E:'Enterprising',C:'Conventional'};
      const top = (result.topRiasec || []).slice(0,3).map(k => labels[k] || k).join(', ');
      detailHtml = '<div class="career-card-sector">Top interests: ' + escapeHtml(top || '—') + '</div>';
    } else if (id === 'aptitude') {
      const top = (result.topAptitude || []).slice(0,2).join(', ');
      detailHtml = '<div class="career-card-sector">Strongest aptitude: ' + escapeHtml(top || '—') + '</div>';
    } else if (id === 'personality') {
      const labels = {O:'Openness',C:'Conscientiousness',E:'Extraversion',A:'Agreeableness',N:'Emotional Reactivity'};
      const top = (result.topTraits || []).slice(0,2).map(k => labels[k] || k).join(', ');
      detailHtml = '<div class="career-card-sector">Top traits: ' + escapeHtml(top || '—') + '</div>';
    } else {
      const top = (result.topValues || []).slice(0,2).join(', ');
      detailHtml = '<div class="career-card-sector">Top values: ' + escapeHtml(top || '—') + '</div>';
    }
    const recHtml = recs.length
      ? recs.map(function(c){ return '<div class="stream-career-pill" onclick="openModal(\'' + c.slug + '\')">' + escapeHtml(c.title) + '</div>'; }).join('')
      : '<span class="career-tag" style="background:var(--cream-d);color:var(--ink-s);">Career cards will appear after the explorer loads.</span>';
    const dateText = results[id].completedAt ? new Date(results[id].completedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Saved';
    return '<div class="career-card"><div class="career-card-header" style="background:var(--blue-l);font-size:26px;">' + ({interest:'🧭',aptitude:'🧠',personality:'🌊',values:'⭐'})[id] + '</div><div class="career-card-body"><div class="career-card-name">' + escapeHtml(assessmentDisplayName(id)) + '</div>' + detailHtml + '<div class="career-card-tags"><span class="career-tag" style="background:var(--sf-l);color:var(--sf);">Score ' + escapeHtml(String(result.score || 0)) + '%</span><span class="career-tag" style="background:var(--green-l);color:var(--green);">' + escapeHtml(formatAssessmentSummary(id, result)) + '</span><span class="career-tag" style="background:var(--cream-d);color:var(--ink-s);">' + escapeHtml(dateText) + '</span></div><div class="fit-why" style="margin-top:14px;"><strong>What this means</strong>' + escapeHtml(getAssessmentStory(id, result)) + '</div><div style="margin-top:14px;"><div class="filter-label" style="margin-bottom:8px;">Recommended careers</div><div style="display:flex;flex-wrap:wrap;gap:8px;">' + recHtml + '</div></div></div></div>';
  });
  if (!cards.length) {
    wrap.innerHTML = '<div class="lock-state" style="grid-column:1/-1;"><div class="lock-icon">📄</div><div class="lock-title">No assessment results yet</div><div class="lock-desc">As each assessment is completed, its score, interpretation, and recommended careers will appear here.</div></div>';
    return;
  }
  wrap.innerHTML = cards.join('');
}

function renderStreamRecommendations() {
  const streams = (state.assessmentProfile && state.assessmentProfile.streams) || []; if (!streams.length) return;
  streams.forEach(function(stream, idx) {
    const el = document.getElementById('stream-card-' + idx); if (!el) return;
    el.className = 'stream-card' + (idx === 0 ? ' top-pick' : '');
    const filled = Math.max(1, Math.min(5, Math.round(stream.score / 20)));
    el.innerHTML = '<div class="stream-badge ' + stream.badgeClass + '">' + stream.badge + '</div><div class="stream-icon">' + stream.icon + '</div><div class="stream-name">' + escapeHtml(stream.name) + '</div><div class="stream-subjects">' + escapeHtml(stream.subjects) + '</div><div class="fit-indicator"><div class="fit-dots">' + Array.from({length:5}).map((_,i)=>'<span class="fit-dot ' + (i < filled ? 'filled ' + (idx===0 ? 'orange' : idx===1 ? 'green' : 'blue') : '') + '"></span>').join('') + '</div><div class="fit-text">' + escapeHtml(stream.text) + '</div></div><div class="reasons"><div class="reason-item">Fit score: ' + stream.score + '% based on your current assessment profile</div><div class="reason-item">This option strengthens when your interests and aptitudes align</div><div class="reason-item">Use this with school marks, subject preference, and family discussion</div></div>';
  });
  renderComparisonMode();
}

// ─────────────────────────────────────────────────────────
//  TEST CONNECTION
// ─────────────────────────────────────────────────────────
function testConnection() {
  const btn = document.getElementById('su-test');
  if (btn) { btn.textContent = 'Testing…'; btn.disabled = true; }
  showMsg('su-msg', 'loading', 'Pinging server…');
  jsonpGet(SHEETS_URL, { action: 'ping' }, function(err, data) {
    if (btn) { btn.textContent = 'Test server connection'; btn.disabled = false; }
    if (err)  return showMsg('su-msg', 'error', err);
    if (data && (data.status === 'ok' || data.pong)) return showMsg('su-msg', 'success', '✓ Server connected successfully! You can now sign up.');
    showMsg('su-msg', 'error', 'Server responded with unexpected format: ' + JSON.stringify(data));
  });
}

// ─────────────────────────────────────────────────────────
//  SIGN OUT
// ─────────────────────────────────────────────────────────
function logOut() {
  if (!confirm('Sign out of ViaNova?')) return;
  try { localStorage.removeItem('ps_session'); } catch(e) {}
  Object.assign(state, { name:'', cls:'', board:'', city:'', selectedStream:'', phone:'', email:'', coupon:'', loggedIn:false, completedTests:[], assessmentResults:{}, assessmentProfile:null, questProgress:{ xp:0, level:1, badges:[], lastReward:'' } });
  const ov = document.getElementById('signup-screen');
  if (ov) ov.classList.remove('open');
  document.body.classList.add('auth-locked');
  const hook = document.getElementById('student-hook-overlay');
  if (hook) hook.classList.remove('open');
  showLandingPage();
 
}

// ─────────────────────────────────────────────────────────
//  FINISH SIGNUP  (called after coupon + phone checks pass)
// ─────────────────────────────────────────────────────────
async function finishSignup(name, cls, selectedStream, board, city, phone, email, password, coupon) {
  const suBtn = document.getElementById('su-submit');
  showMsg('su-msg', 'loading', 'Creating your account…');
  if (suBtn) { suBtn.disabled = true; suBtn.textContent = 'Creating account…'; }
  const pwHash = simpleHash(password);
  try {
    // POST signup to Code.gs  →  action:'signup'
    await sendToSheets({
      action: 'signup',
      timestamp: new Date().toISOString(),
      name, 'class': cls, selectedStream, selected_stream: selectedStream, stream: selectedStream, board, city, phone, email,
      password_hash: pwHash, coupon
    });
    // Mark coupon used via JSONP GET  →  action:'markCouponUsed'
    jsonpGet(SHEETS_URL, { action: 'markCouponUsed', code: coupon, phone }, function(){});
    const session = { name, cls, selectedStream, board, city, phone, email, coupon, pwHash, loggedIn: true, completedTests: [] };
    try { localStorage.setItem('ps_session', JSON.stringify(session)); } catch(e) {}
    applySession(session);
    showMsg('su-msg', 'success', 'Account created! Welcome to ViaNova, ' + name + '.');
    setTimeout(function() {
      const ov = document.getElementById('signup-screen');
      const landing = document.getElementById('landing-screen');
      if (ov) ov.classList.remove('open');
      if (landing) landing.style.display = 'none';
      document.body.classList.remove('auth-locked');
      renderStudentHook();
    }, 1000);
  } catch(err) {
    showMsg('su-msg', 'error', 'Signup could not be saved: ' + err.message);
  } finally {
    if (suBtn) { suBtn.disabled = false; suBtn.textContent = 'Validate & create account'; }
  }
}

// ─────────────────────────────────────────────────────────
//  QUIZ OVERLAY
// ─────────────────────────────────────────────────────────
async function openQuiz(type) {
  const quiz = getLocalizedQuiz(type);
  if (!quiz) return;
  if (!state.assessmentResults) state.assessmentResults = {};
  if (state.completedTests && state.completedTests.includes(type)) {
    alert(tx('alert.doneOnce', { title: quiz.title }));
    return;
  }
  if (SHEETS_URL && state.phone) {
    const gate = await new Promise(function(resolve) {
      jsonpGet(SHEETS_URL, { action: 'canTakeTest', phone: state.phone, test_id: type }, function(err, data) {
        if (err || !data) return resolve({ canTake: true });
        resolve(data);
      });
    });
    if (gate && gate.canTake === false) {
      await syncAssessmentResultsFromServer();
      alert(tx('alert.doneOnceLogout', { title: quiz.title }));
      return;
    }
  }

  const challengeMeta = {
    interest: {
      badge: '🧭 Passion Finder',
      headline: 'Follow what gives you energy.',
      accent: '#8B5CF6',
      soft: 'rgba(139,92,246,.12)',
      icon: '🧭',
      xpPerQuestion: 12,
      speedBonus: 15,
      speedTargetMs: 9000,
      tone: 'You are mapping the fields that feel naturally exciting.'
    },
    aptitude: {
      badge: '🧠 Brain Challenge',
      headline: 'Sharpen logic, patterns, and focus.',
      accent: '#1D4E8F',
      soft: 'rgba(29,78,143,.12)',
      icon: '🧠',
      xpPerQuestion: 18,
      speedBonus: 20,
      speedTargetMs: 12000,
      tone: 'This round rewards calm thinking and problem-solving stamina.'
    },
    personality: {
      badge: '🎭 Personality Decode',
      headline: 'See how you naturally operate.',
      accent: '#1E6B4A',
      soft: 'rgba(30,107,74,.12)',
      icon: '🎭',
      xpPerQuestion: 15,
      speedBonus: 12,
      speedTargetMs: 8000,
      tone: 'Answer honestly — there is no perfect personality type.'
    },
    values: {
      badge: '🎯 Life Compass',
      headline: 'Discover what matters most to you.',
      accent: '#B86B0C',
      soft: 'rgba(184,107,12,.12)',
      icon: '🎯',
      xpPerQuestion: 15,
      speedBonus: 12,
      speedTargetMs: 8000,
      tone: 'This helps ViaNova match careers with your deeper priorities.'
    }
  };
  const meta = getChallengeMeta(type, challengeMeta[type] || challengeMeta.interest);

  const durationMin = quiz.timeLimitMin || (type === 'interest' ? 18 : type === 'personality' ? 10 : type === 'values' ? 8 : 50);
  let remaining = durationMin * 60, timerHandle = null, cur = 0;
  const ans = new Array(quiz.questions.length).fill(null);
  const answerMeta = new Array(quiz.questions.length).fill(null);
  const milestoneThresholds = [25, 50, 75, 100];
  const milestoneRewards = { 25:'🔓 Insight Spark', 50:'🧩 Pattern Pulse', 75:'🚀 Final Stretch', 100:'🏁 Challenge Clear' };
  const triggeredMilestones = new Set();
  let streakFast = 0;
  let questionShownAt = Date.now();

  const overlay = document.createElement('div');
  overlay.id = 'quiz-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:radial-gradient(circle at 12% 12%, rgba(230,244,241,.88), transparent 30%),linear-gradient(135deg,#FFFDF7 0%,#F7F3EA 58%,#E6F4F1 100%);display:flex;flex-direction:column;font-family:-apple-system,system-ui,sans-serif;overflow-y:auto;';
  overlay.innerHTML = '<div style="padding:18px 20px 10px;flex-shrink:0;">'
    + '<div style="max-width:1120px;margin:0 auto;display:flex;justify-content:space-between;gap:16px;align-items:center;">'
    +   '<div style="display:flex;align-items:center;gap:14px;min-width:0;">'
    +     '<div style="width:44px;height:44px;border-radius:14px;background:'+meta.accent+';display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 12px 28px rgba(0,0,0,.24);">'+meta.icon+'</div>'
    +     '<div style="min-width:0;">'
    +       '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#4B635F;margin-bottom:5px;">'+tx('quiz.challenge')+'</div>'
    +       '<div style="font-family:Georgia,serif;font-size:28px;line-height:1.1;color:#064E49;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+meta.badge+'</div>'
    +     '</div>'
    +   '</div>'
    +   '<button onclick="closeQuizOverlay()" style="background:white;border:1px solid #EADFCA;color:#064E49;padding:10px 16px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:600;">'+tx('quiz.exit')+'</button>'
    + '</div>'
    + '</div>'
    + '<div style="max-width:1120px;margin:0 auto;width:100%;padding:0 20px 32px;">'
    +   '<div style="display:grid;grid-template-columns:1.15fr .85fr;gap:20px;align-items:stretch;">'
    +     '<div style="background:linear-gradient(180deg,#FFFFFF 0%,#FFFAF0 100%);border:1px solid #EADFCA;box-shadow:0 16px 42px rgba(15,118,110,.10);border-radius:28px;padding:24px;position:relative;overflow:hidden;">'
    +       '<div style="position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:'+meta.soft+';"></div>'
    +       '<div style="position:relative;z-index:1;">'
    +         '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px;">'
    +           '<div><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#4B635F;margin-bottom:8px;">'+tx('quiz.activeMission')+'</div><div style="font-family:Georgia,serif;font-size:34px;line-height:1.08;color:#064E49;">'+meta.headline+'</div></div>'
    +           '<div style="padding:10px 14px;border-radius:999px;background:#E6F4F1;border:1px solid rgba(15,118,110,.16);font-size:12px;color:#0F766E;">⏳ '+durationMin+' min challenge</div>'
    +         '</div>'
    +         '<div style="font-size:14px;line-height:1.7;color:#4B635F;max-width:700px;margin-bottom:18px;">'+escapeHtml(quiz.subtitle || meta.tone)+'</div>'
    +         '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    +            '<div id="qz-chip-stage" style="padding:10px 14px;border-radius:16px;background:#FFFFFF;border:1px solid #EADFCA;font-size:13px;color:#064E49;">Stage 1</div>'
    +            '<div id="qz-chip-xp" style="padding:10px 14px;border-radius:16px;background:#FFFFFF;border:1px solid #EADFCA;font-size:13px;color:#064E49;">0 XP</div>'
    +            '<div id="qz-chip-streak" style="padding:10px 14px;border-radius:16px;background:#FFFFFF;border:1px solid #EADFCA;font-size:13px;color:#064E49;">Momentum x0</div>'
    +            '<div id="qz-chip-speed" style="padding:10px 14px;border-radius:16px;background:#FFFFFF;border:1px solid #EADFCA;font-size:13px;color:#064E49;">Speed bonus: 0</div>'
    +            '<div id="qz-chip-level" style="padding:10px 14px;border-radius:16px;background:#FFFFFF;border:1px solid #EADFCA;font-size:13px;color:#064E49;">Level 1</div>'
    +         '</div>'
    +       '</div>'
    +     '</div>'
    +     '<div style="background:white;border:1px solid #D7E5FA;box-shadow:0 16px 42px rgba(26,20,16,.12);border-radius:28px;padding:22px;">'
    +       '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
    +         '<div style="padding:14px;border-radius:18px;background:'+meta.soft+';border:1px solid rgba(0,0,0,.04);">'
    +           '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.timeLeft')+'</div>'
    +           '<div id="qz-timer-box" style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#064E49;">'+String(durationMin).padStart(2,'0')+':00</div>'
    +         '</div>'
    +         '<div style="padding:14px;border-radius:18px;background:#EEF5FF;border:1px solid #D7E5FA;">'
    +           '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.questionsSolved')+'</div>'
    +           '<div id="qz-solved-box" style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#064E49;">0/'+quiz.questions.length+'</div>'
    +         '</div>'
    +       '</div>'
    +       '<div style="font-size:12px;color:#7184A3;line-height:1.6;margin-bottom:10px;">'+tx('quiz.reward')+'</div>'
    +       '<div style="height:10px;background:#F0E9DF;border-radius:999px;overflow:hidden;margin-bottom:10px;">'
    +         '<div id="qz-pbar" style="height:100%;width:0;background:'+meta.accent+';border-radius:999px;transition:width .35s ease;"></div>'
    +       '</div>'
    +       '<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#7184A3;flex-wrap:wrap;">'
    +         '<div id="qz-progress-copy">0% complete</div>'
    +         '<div id="qz-mentor-line">'+tx('quiz.startStrong')+'</div>'
    +       '</div>'
    +       '<div style="margin-top:12px;padding:12px 14px;border-radius:16px;background:#FCFBF8;border:1px dashed #E8DED3;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px;color:#7184A3;">'
    +         '<div id="qz-unlock-line">Next unlock at 25% completion</div>'
    +         '<div id="qz-level-line">Quest progress syncs with every challenge</div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    +   '<div id="qz-body" style="max-width:1120px;margin:18px auto 0;"></div>'
    + '</div>';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function formatTime(total){ const m=String(Math.floor(total/60)).padStart(2,'0'); const s=String(total%60).padStart(2,'0'); return m+':'+s; }
  function stageLabel(idx){ return tx('quiz.stage', { n: (Math.floor((idx / Math.max(1, quiz.questions.length)) * 5) + 1) }); }
  function answeredCount(){ return ans.filter(v => v !== null).length; }
  function speedHits(){ return answerMeta.filter(m => m && m.elapsedMs <= meta.speedTargetMs).length; }
  function earnedXp(){ return answeredCount() * meta.xpPerQuestion + speedHits() * meta.speedBonus; }
  function momentumCount(){ return Math.min(5, Math.max(streakFast, Math.floor(answeredCount() / Math.max(1, Math.ceil(quiz.questions.length / 5))) + (answeredCount() ? 1 : 0))); }
  function mentorLine(){
    const pct = answeredCount() / quiz.questions.length;
    if (pct === 0) return ''+tx('quiz.startStrong')+'';
    if (pct < 0.25) return 'Nice start. Stay honest, not perfect.';
    if (pct < 0.5) return 'Good pace. You are building a clearer student profile.';
    if (pct < 0.75) return 'Momentum unlocked. Keep the flow going.';
    if (pct < 1) return 'Final stretch. Finish strong to lock the insight.';
    return 'Challenge complete. Your signal is now saved.';
  }
  function showQuestToast(message, tone) {
    let toast = document.getElementById('qz-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'qz-toast';
      toast.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10002;padding:14px 16px;border-radius:18px;background:#064E49;color:white;box-shadow:0 18px 36px rgba(0,0,0,.22);font-size:13px;font-weight:700;opacity:0;transform:translateY(10px);transition:all .2s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = tone === 'accent' ? meta.accent : '#064E49';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(showQuestToast._t);
    showQuestToast._t = setTimeout(function(){
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 1400);
  }
  function nextMilestone() {
    const progressPct = Math.round((answeredCount() / quiz.questions.length) * 100);
    return milestoneThresholds.find(function(v){ return v > progressPct; }) || null;
  }
  function syncHeader(){
    const solved = answeredCount();
    const progressPct = Math.round((solved / quiz.questions.length) * 100);
    const pbar = document.getElementById('qz-pbar'); if (pbar) pbar.style.width = progressPct + '%';
    const timerBox = document.getElementById('qz-timer-box'); if (timerBox) timerBox.textContent = formatTime(Math.max(0, remaining));
    const solvedBox = document.getElementById('qz-solved-box'); if (solvedBox) solvedBox.textContent = solved + '/' + quiz.questions.length;
    const chipStage = document.getElementById('qz-chip-stage'); if (chipStage) chipStage.textContent = stageLabel(cur + 1);
    const chipXp = document.getElementById('qz-chip-xp'); if (chipXp) chipXp.textContent = tx('quiz.xp', { xp: earnedXp() });
    const chipStreak = document.getElementById('qz-chip-streak'); if (chipStreak) chipStreak.textContent = tx('quiz.momentum', { n: momentumCount() });
    const chipSpeed = document.getElementById('qz-chip-speed'); if (chipSpeed) chipSpeed.textContent = tx('quiz.speed', { n: speedHits() });
    const qp = ensureQuestProgressShape();
    const chipLevel = document.getElementById('qz-chip-level'); if (chipLevel) chipLevel.textContent = tx('quiz.level', { n: qp.level });
    const progressCopy = document.getElementById('qz-progress-copy'); if (progressCopy) progressCopy.textContent = tx('quiz.complete', { pct: progressPct });
    const mentor = document.getElementById('qz-mentor-line'); if (mentor) mentor.textContent = mentorLine();
    const unlockLine = document.getElementById('qz-unlock-line'); if (unlockLine) unlockLine.textContent = nextMilestone() ? tx('quiz.nextUnlock', { pct: nextMilestone() }) : tx('quiz.allUnlocks');
    const levelLine = document.getElementById('qz-level-line'); if (levelLine) levelLine.textContent = tx('quiz.inLevel', { level: qp.level, xp: getQuestXpIntoLevel(qp.xp) });
  }

  function renderQ() {
    syncHeader();
    const q = quiz.questions[cur], prompt = q.prompt || q.q || q;
    const isLast = cur === quiz.questions.length - 1;
    const pref=['A','B','C','D'];
    const selected = ans[cur];
    const currentMeta = answerMeta[cur];
    const speedTag = currentMeta && currentMeta.elapsedMs <= meta.speedTargetMs
      ? '<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:'+meta.soft+';color:'+meta.accent+';font-size:12px;font-weight:700;">⚡ Speed bonus locked</div>'
      : '<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#F7F3EE;color:#7184A3;font-size:12px;font-weight:600;">+ '+meta.speedBonus+' bonus XP if answered quickly</div>';

    let optHtml = '';
    if (q.image) {
      optHtml += '<div class="quiz-image" style="margin-bottom:18px;"><img src="'+q.image+'" alt="Question visual"></div>';
    }
    if (quiz.type === 'likert5') {
      optHtml += '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">'
        + (quiz.labels||['1','2','3','4','5']).map(function(lbl, idx){
            const val = idx + 1, sel = selected === val;
            return '<button onclick="qzPick('+val+')" style="padding:16px 8px;border:'+(sel?'2px solid '+meta.accent:'1.5px solid #E8DED3')+';border-radius:18px;cursor:pointer;background:'+(sel?meta.soft:'white')+';color:'+(sel?meta.accent:'#7A6358')+';font-weight:'+(sel?'700':'500')+';line-height:1.4;transition:all .16s;box-shadow:'+(sel?'0 10px 26px rgba(26,20,16,.08)':'none')+';">'
              + '<span style="display:block;font-family:Georgia,serif;font-size:24px;line-height:1;margin-bottom:8px;color:'+(sel?meta.accent:'#1A1410')+';">'+val+'</span>'
              + '<span style="font-size:11px;">'+escapeHtml(lbl)+'</span>'
              + '</button>';
          }).join('')
        + '</div>';
    } else {
      optHtml += '<div style="display:flex;flex-direction:column;gap:12px;">'
        + (q.options||q.opts||[]).map(function(opt, i){
            const sel = selected === i;
            return '<button onclick="qzPick('+i+')" style="width:100%;padding:16px 18px;border:'+(sel?'2px solid '+meta.accent:'1.5px solid #E8DED3')+';border-radius:18px;cursor:pointer;text-align:left;background:'+(sel?meta.soft:'white')+';color:#1F2933;transition:all .16s;box-shadow:'+(sel?'0 10px 26px rgba(26,20,16,.08)':'none')+';">'
              + '<div style="display:flex;gap:14px;align-items:flex-start;">'
              +   '<div style="width:34px;height:34px;border-radius:12px;background:'+(sel?meta.accent:'#F7F3EE')+';color:'+(sel?'white':'#7A6358')+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">'+pref[i]+'</div>'
              +   '<div style="font-size:15px;line-height:1.6;font-weight:'+(sel?'700':'500')+';color:'+(sel?meta.accent:'#1A1410')+';">'+escapeHtml(opt)+'</div>'
              + '</div>'
              + '</button>';
          }).join('')
        + '</div>';
    }

    document.getElementById('qz-body').innerHTML = ''
      + '<div style="display:grid;grid-template-columns:.88fr 1.12fr;gap:18px;align-items:start;">'
      +   '<div style="background:white;border:1px solid #D7E5FA;border-radius:28px;padding:24px;box-shadow:0 16px 42px rgba(26,20,16,.10);position:sticky;top:16px;">'
      +     '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;">'
      +       '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#7184A3;margin-bottom:8px;">Question '+(cur+1)+' of '+quiz.questions.length+'</div><div style="font-family:Georgia,serif;font-size:32px;line-height:1.08;color:#10233D;">'+tx('quiz.choose')+'</div></div>'
      +       speedTag
      +     '</div>'
      +     '<div style="padding:16px;border-radius:20px;background:'+meta.soft+';border:1px solid rgba(0,0,0,.04);margin-bottom:14px;">'
      +       '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">'+tx('quiz.guide')+'</div>'
      +       '<div style="font-size:14px;line-height:1.7;color:#3D2E26;">'+meta.tone+'</div>'
      +     '</div>'
      +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      +       '<div style="padding:14px;border-radius:18px;background:#EEF5FF;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.potentialXp')+'</div><div style="font-family:Georgia,serif;font-size:28px;line-height:1;color:#10233D;">+'+meta.xpPerQuestion+'</div></div>'
      +       '<div style="padding:14px;border-radius:18px;background:#F7F3EE;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.currentReward')+'</div><div style="font-family:Georgia,serif;font-size:28px;line-height:1;color:'+meta.accent+';">'+earnedXp()+'</div></div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="background:white;border:1px solid #D7E5FA;border-radius:28px;padding:26px;box-shadow:0 16px 42px rgba(26,20,16,.10);">'
      +     '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap;">'
      +       '<div style="display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border-radius:999px;background:'+meta.soft+';color:'+meta.accent+';font-size:12px;font-weight:700;">'+meta.icon+' '+meta.badge+'</div>'
      +       '<div style="font-size:12px;color:#7184A3;">'+tx('quiz.saved')+'</div>'
      +     '</div>'
      +     '<div style="font-family:Georgia,serif;font-size:28px;line-height:1.45;color:#10233D;margin-bottom:22px;">'+escapeHtml(prompt)+'</div>'
      +     optHtml
      +     '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:24px;">'
      +       '<button onclick="qzBack()" '+(cur===0?'disabled':'')+' style="padding:12px 22px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;background:white;color:#10233D;border:1.5px solid #D7E3F2;'+(cur===0?'opacity:.45;cursor:not-allowed;':'')+'">'+tx('quiz.previous')+'</button>'
      +       '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
      +         '<button onclick="closeQuizOverlay()" style="padding:12px 18px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;background:#F4F7FB;color:#4F637D;border:1px solid #D7E3F2;">'+tx('quiz.pause')+'</button>'
      +         '<button onclick="qzNext()" '+(selected===null?'disabled':'')+' style="padding:12px 22px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;background:'+meta.accent+';color:white;border:none;box-shadow:0 10px 24px rgba(26,20,16,.16);'+(selected===null?'opacity:.45;cursor:not-allowed;':'')+'">'+(isLast?''+tx('quiz.finish')+'':''+tx('quiz.lock')+'')+'</button>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    syncHeader();
    questionShownAt = Date.now();
  }

  function computeResult(){
    if(type==='interest'){ const totals={R:0,I:0,A:0,S:0,E:0,C:0}; quiz.questions.forEach((q,i)=>totals[q.category]+=Number(ans[i]||0)); const pct={}; Object.keys(totals).forEach(k=>pct[k]=Math.round((totals[k]/50)*100)); const top=Object.keys(totals).sort((a,b)=>totals[b]-totals[a]); return {score:Math.round(Object.values(pct).reduce((a,b)=>a+b,0)/6),raw:totals,pct,topRiasec:top.slice(0,3),summaryLabel:top.slice(0,2).join('-')}; }
    if(type==='aptitude'){ const bySec={Numerical:0,Verbal:0,Logical:0,Spatial:0,Mechanical:0}, totals={Numerical:0,Verbal:0,Logical:0,Spatial:0,Mechanical:0}; quiz.questions.forEach((q,i)=>{totals[q.section]+=1; if(Number(ans[i])===Number(q.answer ?? q.ans)) bySec[q.section]+=1;}); const pct={}; Object.keys(bySec).forEach(k=>pct[k]=Math.round((bySec[k]/Math.max(1,totals[k]))*100)); return {score:Math.round(Object.values(bySec).reduce((a,b)=>a+b,0)/quiz.questions.length*100),raw:bySec,pct,topAptitude:Object.keys(pct).sort((a,b)=>pct[b]-pct[a])}; }
    if(type==='personality'){ const raw={O:0,C:0,E:0,A:0,N:0}, counts={O:0,C:0,E:0,A:0,N:0}; quiz.questions.forEach((q,i)=>{ let v=Number(ans[i]||0); if(q.reverse) v=6-v; raw[q.category]+=v; counts[q.category]+=1; }); const pct={}; Object.keys(raw).forEach(k=>pct[k]=Math.round((raw[k]/(counts[k]*5))*100)); return {score:Math.round(Object.values(pct).reduce((a,b)=>a+b,0)/5),raw,pct,topTraits:Object.keys(pct).sort((a,b)=>pct[b]-pct[a])}; }
    const raw={}, counts={}; quiz.questions.forEach((q,i)=>{ raw[q.category]=(raw[q.category]||0)+Number(ans[i]||0); counts[q.category]=(counts[q.category]||0)+1; }); const pct={}; Object.keys(raw).forEach(k=>pct[k]=Math.round((raw[k]/(counts[k]*5))*100)); return {score:Math.round(Object.values(pct).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(pct).length)),raw,pct,topValues:Object.keys(pct).sort((a,b)=>pct[b]-pct[a])};
  }

  window.qzPick = function(i){
    ans[cur] = i;
    if (!answerMeta[cur]) answerMeta[cur] = { elapsedMs: Date.now() - questionShownAt };
    const currentElapsed = answerMeta[cur] ? answerMeta[cur].elapsedMs : 999999;
    streakFast = currentElapsed <= meta.speedTargetMs ? (streakFast + 1) : 0;
    const progressPct = Math.round((answeredCount() / quiz.questions.length) * 100);
    milestoneThresholds.forEach(function(mark){
      if (progressPct >= mark && !triggeredMilestones.has(mark)) {
        triggeredMilestones.add(mark);
        showQuestToast(milestoneRewards[mark] + ' unlocked', 'accent');
      }
    });
    showQuestToast((currentElapsed <= meta.speedTargetMs ? '⚡ Fast answer! ' : '✅ Answer locked ') + '+ ' + meta.xpPerQuestion + ' base XP', currentElapsed <= meta.speedTargetMs ? 'accent' : 'dark');
    renderQ();
  };
  window.qzBack = function(){ if(cur>0){ cur--; renderQ(); } };
  window.qzNext = function(){ if(ans[cur]===null) return; if(cur<quiz.questions.length-1){ cur++; renderQ(); } else submitQuiz(); };
  window.closeQuizOverlay = function(){ if(timerHandle) clearInterval(timerHandle); const ov=document.getElementById('quiz-overlay'); if(ov) ov.remove(); const toast=document.getElementById('qz-toast'); if(toast) toast.remove(); document.body.style.overflow=''; delete window.qzPick; delete window.qzBack; delete window.qzNext; delete window.closeQuizOverlay; };

  async function submitQuiz(){
    if(timerHandle) clearInterval(timerHandle);
    const totalXp = earnedXp();
    const reward = awardQuestXp(totalXp, 'challenge_' + type, meta.badge);
    syncHeader();
    document.getElementById('qz-pbar').style.width = '100%';
    const result = computeResult();
    state.assessmentResults[type] = {completedAt:new Date().toISOString(), answers:ans.slice(), result};
    try {
      const saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
      saved.completedTests = Array.from(new Set([...(saved.completedTests||[]), type]));
      saved.assessmentResults = Object.assign({}, saved.assessmentResults || {}, state.assessmentResults);
      saved.questProgress = state.questProgress;
      localStorage.setItem('ps_session', JSON.stringify(saved));
    } catch(e) {}
    try {
      const compactRaw = {
        quizMeta:{ title:quiz.title, durationMin:durationMin, questionCount:quiz.questions.length, gamifiedTitle: meta.badge, earnedXp: totalXp, speedHits: speedHits() },
        answers: ans,
        sections: type==='aptitude' ? quiz.questions.map(q => q.section || '') : undefined
      };
      const saveResp = await sendToSheets({action:'submitTest', test_id:type, timestamp:new Date().toISOString(), name:state.name||'Student', class:state.cls||'', board:state.board||'', city:state.city||'', phone:state.phone||'', coupon:state.coupon||'', score:result.score, answers:ans, summary_json:JSON.stringify(result), raw_json:JSON.stringify(compactRaw)});
      if (saveResp && saveResp.alreadyTaken) {
        await syncAssessmentResultsFromServer();
        document.getElementById('qz-body').innerHTML = '<div style="background:white;border-radius:28px;padding:40px;border:1px solid #D7E5FA;text-align:center;box-shadow:0 16px 42px rgba(26,20,16,.10);"><div style="font-size:58px;margin-bottom:14px;">🔒</div><div style="font-family:Georgia,serif;font-size:30px;font-weight:300;margin-bottom:10px;">Challenge already submitted</div><div style="font-size:14px;color:#7184A3;line-height:1.7;max-width:560px;margin:0 auto 24px;">This module has already been completed on your account. Only the first attempt is kept.</div><button onclick="closeQuizOverlay()" style="padding:13px 26px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;background:'+meta.accent+';color:white;border:none;">'+tx('quiz.return')+'</button></div>';
        return;
      }
    } catch(e) { console.warn('Could not save quiz response:', e.message); }

    markTestDone(type); refreshAssessmentProfile(); renderPdfControls(); renderStreamRecommendations(); initCareerData();
    const scoreDisplay = type==='aptitude' ? result.score+'% overall' : (result.summaryLabel || (result.topRiasec||[]).slice(0,2).join('-') || (result.topTraits||[])[0] || (result.topValues||[])[0] || (result.score+'%'));
    document.getElementById('qz-body').innerHTML = ''
      + '<div style="background:white;border-radius:32px;padding:42px;border:1px solid #D7E5FA;text-align:center;box-shadow:0 18px 48px rgba(26,20,16,.12);max-width:980px;margin:0 auto;">'
      +   '<div style="display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:999px;background:'+meta.soft+';color:'+meta.accent+';font-size:13px;font-weight:800;margin-bottom:18px;">'+meta.icon+' '+meta.badge+' complete</div>'
      +   '<div style="font-size:62px;margin-bottom:12px;">🏁</div>'
      +   '<div style="font-family:Georgia,serif;font-size:34px;font-weight:300;margin-bottom:10px;color:#064E49;">Challenge complete!</div>'
      +   '<div style="font-size:15px;color:#7184A3;line-height:1.8;max-width:640px;margin:0 auto 26px;">Your answers have been saved. The strongest signal from this challenge is <strong>'+escapeHtml(String(scoreDisplay))+'</strong>. This now feeds into your report and recommendation engine.</div>'
      +   '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;max-width:920px;margin:0 auto 20px;">'
      +     '<div style="padding:18px;border-radius:22px;background:#EEF5FF;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Challenge score</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#064E49;">'+result.score+'%</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:'+meta.soft+';border:1px solid rgba(0,0,0,.04);"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">XP earned</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:'+meta.accent+';">'+totalXp+'</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:#F7F3EE;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Speed hits</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#064E49;">'+speedHits()+'</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:#FCFBF8;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Quest level</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#064E49;">'+reward.level+(reward.levelUp ? '↑' : '')+'</div></div>'
      +   '</div>'
      +   '<div style="background:#E3F2EC;border:1px solid rgba(30,107,74,.2);border-radius:16px;padding:12px 16px;font-size:13px;color:#1E6B4A;display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;">✓ Saved to your profile and synced to your report</div>'
      +   '<div style="background:#EEF5FF;border:1px solid #D7E5FA;border-radius:16px;padding:12px 16px;font-size:13px;color:#7184A3;display:inline-flex;align-items:center;gap:8px;margin-bottom:24px;">'+(reward.levelUp ? '🔥 Level up unlocked. Your Career Quest profile just advanced.' : 'Next level unlock in '+reward.next+' XP.')+'</div>'
      +   '<div><button onclick="closeQuizOverlay()" style="padding:13px 28px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;background:'+meta.accent+';color:white;border:none;box-shadow:0 10px 24px rgba(26,20,16,.16);">'+tx('quiz.return')+'</button></div>'
      + '</div>';
  }

  renderQ();
  timerHandle = setInterval(function(){ remaining -= 1; syncHeader(); if(remaining <= 0) submitQuiz(); }, 1000);
}

// ─────────────────────────────────────────────────────────
//  DOM READY
// ─────────────────────────────────────────────────────────
