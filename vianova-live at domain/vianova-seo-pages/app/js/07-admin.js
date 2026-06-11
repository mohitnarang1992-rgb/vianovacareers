/*
 * ViaNova split JS: 07-admin.js
 * Permanent admin login, dashboard, student reports and data analysis.
 */

function openAdminLogin() {
  var overlay = document.getElementById('admin-login-overlay');
  if (overlay) overlay.classList.add('open');
  var msg = document.getElementById('admin-login-msg');
  if (msg) msg.textContent = '';
}

function closeAdminLogin() {
  var overlay = document.getElementById('admin-login-overlay');
  if (overlay) overlay.classList.remove('open');
}

function setAdminMsg(type, text) {
  var msg = document.getElementById('admin-login-msg');
  if (!msg) return;
  msg.className = 'admin-login-msg ' + (type || '');
  msg.textContent = text || '';
}

async function adminLogin() {
  var userEl = document.getElementById('admin-login-id');
  var passEl = document.getElementById('admin-login-password');
  var btn = document.getElementById('admin-login-submit');
  var loginId = String((userEl && userEl.value) || '').trim();
  var password = String((passEl && passEl.value) || '');

  if (!loginId) return setAdminMsg('error', 'Please enter admin login ID.');
  if (!password) return setAdminMsg('error', 'Please enter admin password.');
  if (!SHEETS_URL) return setAdminMsg('error', 'Apps Script URL is not configured in the meta tag.');

  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
  setAdminMsg('loading', 'Checking admin credentials from Google Sheet…');

  try {
    var result = await sendToSheets({ action:'adminLogin', admin_id: loginId, password: password });
    state.isAdmin = true;
    state.adminUser = result.admin_name || loginId;
    state.adminToken = result.admin_token || result.token || '';
    if (!state.adminToken) throw new Error('Admin login succeeded but no admin token was returned by Apps Script.');

    try {
      var saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
      saved.isAdmin = true;
      saved.adminUser = state.adminUser;
      saved.adminToken = state.adminToken;
      localStorage.setItem('ps_session', JSON.stringify(saved));
    } catch(e) {}

    ensureAdminVisibility();
    closeAdminLogin();
    await loadAdminDashboard();
  } catch(err) {
    setAdminMsg('error', (err && err.message) ? err.message : 'Invalid admin login.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Login as admin'; }
  }
}

function adminLogout() {
  state.isAdmin = false;
  state.adminToken = '';
  state.adminUser = '';
  state.adminData = { students:[], tests:[], logs:[] };
  try {
    var saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
    delete saved.isAdmin;
    delete saved.adminUser;
    delete saved.adminToken;
    localStorage.setItem('ps_session', JSON.stringify(saved));
  } catch(e) {}
  ensureAdminVisibility();
  showScreen('dashboard');
}

async function loadAdminDashboard() {
  if (!state.isAdmin || !state.adminToken) {
    openAdminLogin();
    return;
  }
  const studentsWrap = document.getElementById('admin-students-wrap');
  const testsWrap = document.getElementById('admin-tests-wrap');
  const logWrap = document.getElementById('admin-log-wrap');
  if (studentsWrap) studentsWrap.innerHTML = '<div class="admin-empty">Loading admin data…</div>';
  if (testsWrap) testsWrap.innerHTML = '<div class="admin-empty">Loading submissions…</div>';
  if (logWrap) logWrap.innerHTML = '<div class="admin-empty">Loading activity…</div>';
  try {
    const data = await sendToSheets({ action:'getAdminDashboard', admin_token: state.adminToken });
    state.adminData = data || { students:[], tests:[], logs:[] };
    renderAdminDashboard();
    showScreen('admin');
  } catch(err) {
    if (studentsWrap) studentsWrap.innerHTML = '<div class="admin-empty">Could not load admin data: ' + escapeHtml(err.message || 'Unknown error') + '</div>';
  }
}

function adminSafe(value) {
  return escapeHtml(value == null ? '' : value);
}

function adminStudentCompletedCount(student, tests) {
  var direct = Number(student.completed_count || student.completedCount || 0);
  if (direct) return direct;
  var completedTests = String(student.completed_tests || student.completedTests || '').split(/[|,]/).map(function(x){ return x.trim(); }).filter(Boolean);
  if (completedTests.length) return completedTests.length;
  var phone = String(student.phone || '').trim();
  var unique = {};
  (tests || []).forEach(function(t){ if (String(t.phone || '').trim() === phone && t.test_id) unique[t.test_id] = true; });
  return Object.keys(unique).length;
}

function renderAdminTable(containerId, columns, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="admin-empty">No rows found.</div>';
    return;
  }
  const html = '<table class="admin-table"><thead><tr>' + columns.map(function(c){ return '<th>' + adminSafe(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function(row){
      return '<tr>' + columns.map(function(c){
        if (c.render) return '<td>' + c.render(row) + '</td>';
        return '<td>' + adminSafe(row[c.key]) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  el.innerHTML = html;
}

function renderAdminDashboard() {
  const data = state.adminData || { students:[], tests:[], logs:[] };
  const students = data.students || [];
  const tests = data.tests || [];
  const logs = data.logs || [];
  const fullyComplete = students.filter(function(s){ return adminStudentCompletedCount(s, tests) >= 4; }).length;
  const completionRate = students.length ? Math.round((fullyComplete / students.length) * 100) : 0;
  const setText = function(id, value){ var el = document.getElementById(id); if (el) el.textContent = value; };
  setText('admin-kpi-students', students.length);
  setText('admin-kpi-complete', fullyComplete);
  setText('admin-kpi-submissions', tests.length);
  setText('admin-kpi-activity', logs.length);
  setText('admin-kpi-completion-rate', completionRate + '%');
  setText('admin-user-label', state.adminUser ? ('Logged in as ' + state.adminUser) : 'Admin');

  renderAdminTable('admin-students-wrap', [
    {key:'name', label:'Name'},
    {key:'phone', label:'Phone'},
    {key:'class', label:'Class'},
    {key:'board', label:'Board'},
    {key:'city', label:'City'},
    {key:'selected_stream', label:'Stream', render:function(row){ return adminSafe(row.selected_stream || row.selectedStream || row.stream || ''); }},
    {key:'completed_count', label:'Completed', render:function(row){ return adminSafe(adminStudentCompletedCount(row, tests) + '/4'); }},
    {key:'completed_tests', label:'Tests'},
    {key:'actions', label:'Report', render:function(row){
      var phone = String(row.phone || '').replace(/'/g, '');
      return '<button class="admin-action-btn" onclick="adminDownloadStudentReport(\'' + adminSafe(phone) + '\')">Download report</button>';
    }}
  ], students);

  renderAdminTable('admin-tests-wrap', [
    {key:'timestamp', label:'Timestamp'}, {key:'phone', label:'Phone'}, {key:'name', label:'Name'},
    {key:'test_id', label:'Test'}, {key:'score', label:'Score'}
  ], tests);

  renderAdminTable('admin-log-wrap', [
    {key:'timestamp', label:'Timestamp'}, {key:'phone', label:'Phone'}, {key:'action', label:'Action'}, {key:'detail', label:'Detail'}
  ], logs);

  renderAdminAnalysis();
  filterAdminTables();
}

function countBy(rows, keyFn) {
  var map = {};
  (rows || []).forEach(function(row){
    var k = keyFn(row) || 'Not provided';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.keys(map).map(function(k){ return { label:k, value:map[k] }; }).sort(function(a,b){ return b.value - a.value; });
}

function renderMiniBars(id, title, items) {
  var el = document.getElementById(id);
  if (!el) return;
  var max = Math.max.apply(null, [1].concat((items || []).map(function(x){ return x.value || 0; })));
  el.innerHTML = '<h3>' + escapeHtml(title) + '</h3>' + ((items || []).slice(0,8).map(function(x){
    var pct = Math.round(((x.value || 0) / max) * 100);
    return '<div class="admin-bar-row"><div class="admin-bar-meta"><span>' + escapeHtml(x.label) + '</span><strong>' + escapeHtml(x.value) + '</strong></div><div class="admin-bar-track"><div style="width:' + pct + '%"></div></div></div>';
  }).join('') || '<div class="admin-empty small">No data yet.</div>');
}

function renderAdminAnalysis() {
  var data = state.adminData || { students:[], tests:[], logs:[] };
  var students = data.students || [];
  var tests = data.tests || [];
  var completed = students.filter(function(s){ return adminStudentCompletedCount(s, tests) >= 4; });
  renderMiniBars('admin-analysis-class', 'Students by class', countBy(students, function(s){ return s['class'] || s.cls; }));
  renderMiniBars('admin-analysis-city', 'Students by city', countBy(students, function(s){ return s.city; }));
  renderMiniBars('admin-analysis-tests', 'Submissions by module', countBy(tests, function(t){ return t.test_id; }));
  renderMiniBars('admin-analysis-completion', 'Completion status', [
    {label:'Completed all 4 modules', value: completed.length},
    {label:'Incomplete profile', value: Math.max(students.length - completed.length, 0)}
  ]);
}

function toggleAdminAnalysis() {
  var panel = document.getElementById('admin-analysis-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderAdminAnalysis();
}

function filterAdminTables() {
  const q = String((document.getElementById('admin-search-input') || {}).value || '').toLowerCase().trim();
  document.querySelectorAll('.admin-table tbody tr').forEach(function(tr){
    const txt = String(tr.textContent || '').toLowerCase();
    tr.style.display = !q || txt.indexOf(q) !== -1 ? '' : 'none';
  });
}

function downloadAdminCsv() {
  var data = state.adminData || { students:[], tests:[], logs:[] };
  var rows = [['Type','Name','Phone','Class','Board','City','Stream','Completed','Test','Score','Timestamp']];
  (data.students || []).forEach(function(s){ rows.push(['Student',s.name||'',s.phone||'',s['class']||s.cls||'',s.board||'',s.city||'',s.selected_stream||s.selectedStream||s.stream||'',adminStudentCompletedCount(s,data.tests||[]) + '/4','','','']); });
  (data.tests || []).forEach(function(t){ rows.push(['Submission',t.name||'',t.phone||'','','','','','',t.test_id||'',t.score||'',t.timestamp||'']); });
  var csv = rows.map(function(r){ return r.map(function(c){ return '"' + String(c == null ? '' : c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'ViaNova_Admin_Data.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 300);
}

function findAdminStudent(phone) {
  phone = String(phone || '').trim();
  return ((state.adminData || {}).students || []).find(function(s){ return String(s.phone || '').trim() === phone; }) || null;
}

function parseStudentResultsFromRows(phone, resultRows) {
  var resultsByTest = {};
  (resultRows || []).forEach(function(item){
    if (!item || !item.test_id) return;
    var parsed = {};
    try { parsed = item.summary_json ? JSON.parse(item.summary_json) : {}; } catch(e) { parsed = {}; }
    var answers = item.answers ? String(item.answers).split('|') : [];
    resultsByTest[item.test_id] = {
      completedAt: item.timestamp || '',
      answers: answers,
      result: parsed && Object.keys(parsed).length ? parsed : { score: Number(item.score || 0) }
    };
  });
  return resultsByTest;
}

async function adminDownloadStudentReport(phone) {
  if (!state.isAdmin || !state.adminToken) return openAdminLogin();
  var student = findAdminStudent(phone);
  if (!student) return alert('Student not found in admin data. Refresh admin data and try again.');

  var oldState = JSON.parse(JSON.stringify({
    name:state.name, cls:state.cls, board:state.board, city:state.city, selectedStream:state.selectedStream,
    phone:state.phone, email:state.email, coupon:state.coupon, completedTests:state.completedTests,
    assessmentResults:state.assessmentResults, assessmentProfile:state.assessmentProfile
  }));

  try {
    var data = await sendToSheets({ action:'getStudentResults', phone: phone, admin_token: state.adminToken });
    var rows = (data && data.results) || ((state.adminData || {}).tests || []).filter(function(t){ return String(t.phone || '').trim() === String(phone || '').trim(); });
    var resultMap = parseStudentResultsFromRows(phone, rows);
    var completed = Object.keys(resultMap);
    if (completed.length < 4) {
      alert('This student has completed only ' + completed.length + '/4 modules. Report download is available after all 4 modules are complete.');
      return;
    }
    state.name = student.name || 'Student';
    state.cls = student['class'] || student.cls || '';
    state.board = student.board || '';
    state.city = student.city || '';
    state.selectedStream = normaliseSignupStream(student.selected_stream || student.selectedStream || student.stream || '');
    state.phone = student.phone || phone;
    state.email = student.email || '';
    state.coupon = student.coupon || '';
    state.assessmentResults = resultMap;
    state.completedTests = completed;
    refreshAssessmentProfile();
    await generateCompiledPdf();
  } catch(err) {
    alert((err && err.message) ? err.message : 'Could not download student report.');
  } finally {
    Object.assign(state, oldState);
    refreshAssessmentProfile();
    renderAdminDashboard();
  }
}
