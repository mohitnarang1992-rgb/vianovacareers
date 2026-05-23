// ============================================================
//  PathSaathi — Google Apps Script Backend  (Code.gs)
//  PathSaathi v2 integrated backend
//  Paste this entire file into Apps Script, then:
//  Deploy → New Deployment → Web App
//    Execute as : Me
//    Who has access : Anyone
//  Copy the /exec URL → paste into the HTML meta tag:
//    <meta name="pathsaathi-sheets-url" content="YOUR_URL">
// ============================================================

// ── Sheet names (change here if you rename tabs) ──────────
var SHEET = {
  COUPONS   : 'Coupons',          // coupon_code | used | used_by_phone | used_at
  SIGNUPS   : 'Signups',          // timestamp | name | class | board | city | phone | email | password_hash | coupon
  RESPONSES : 'Quiz_Responses',   // timestamp | phone | name | coupon | test_id | score | answers | attempt_number
  LOG       : 'Activity_Log',     // timestamp | phone | action | detail
  CAREERS   : 'Standalone Specializations', // imported from the career workbook
};

var ADMIN = {
  accessCode: 'PATHSAATHI_ADMIN_2026',
  latestRows: 100
};

// ── Spreadsheet (auto-detects; no need to change) ─────────
function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── Get or create a named sheet with a header row ─────────
function getSheet(name, headers) {
  var wb = ss();
  var sh = wb.getSheetByName(name);
  if (!sh) {
    sh = wb.insertSheet(name);
    if (headers && headers.length) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1A3A5C')
        .setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

// ── CORS headers (for fetch() calls from the HTML) ────────

function ensureResponsesSchema_() {
  var required = ['timestamp','phone','name','class','board','city','coupon','test_id','score','answers','summary_json','raw_json','attempt_number'];
  var sh = getSheet(SHEET.RESPONSES, required);
  var lastCol = Math.max(sh.getLastColumn(), required.length);
  var current = sh.getRange(1,1,1,lastCol).getValues()[0].map(function(h){ return String(h||'').trim().toLowerCase(); });
  var needsUpdate = required.some(function(h, idx){ return current[idx] !== h; });
  if (needsUpdate) {
    sh.getRange(1,1,1,required.length).setValues([required]);
    sh.getRange(1, 1, 1, required.length)
      .setFontWeight('bold')
      .setBackground('#1A3A5C')
      .setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function responseColumnMap_(sh) {
  var header = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), 13)).getValues()[0].map(function(h){ return String(h||'').trim().toLowerCase(); });
  var map = {};
  header.forEach(function(name, idx){ if (name) map[name] = idx; });
  return map;
}

function addCorsHeaders(output) {
  // Apps Script ContentService TextOutput does not reliably support custom
  // response headers in all contexts. The frontend uses JSONP for cross-origin
  // requests, so returning the output directly is the safest option here.
  return output;
}

// ── OPTIONS pre-flight (browser sometimes sends this) ─────
function doOptions() {
  return addCorsHeaders(
    ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT)
  );
}

// ─────────────────────────────────────────────────────────
//  doGet  — handles ALL requests from the HTML.
//
//  Read actions (ping, checkCoupon, checkPhone,
//    markCouponUsed, canTakeTest, getStudentResults)
//    arrive with individual URL params.
//
//  Write actions (signup, quizResponse / submitTest)
//    arrive with action= and data=<JSON string>.
//    We route them through routePost() after parsing data.
//
//  All responses are JSONP so they work from file://,
//  localhost, and any cross-origin domain without CORS.
// ─────────────────────────────────────────────────────────
function doGet(e) {
  var p        = e.parameter || {};
  var action   = (p.action   || '').trim();
  var callback = (p.callback || 'callback').trim();

  var result;
  try {
    // Write actions sent as JSONP GET (data param contains full JSON payload)
    if (action === 'signup' || action === 'quizResponse' || action === 'submitTest') {
      var payload = {};
      try { payload = JSON.parse(p.data || '{}'); } catch(err) { payload = p; }
      result = routePost(action, payload);
    } else {
      result = routeGet(action, p);
    }
  } catch (err) {
    result = { status: 'error', message: err.message };
  }

  var jsonp = callback + '(' + JSON.stringify(result) + ')';
  return ContentService
    .createTextOutput(jsonp)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ─────────────────────────────────────────────────────────
//  doPost — kept for completeness / future server-side use.
//  The HTML no longer calls this directly (uses doGet JSONP
//  instead to avoid the CORS redirect issue).
// ─────────────────────────────────────────────────────────
function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return respond({ status: 'error', message: 'Invalid JSON body: ' + err.message });
  }

  var action = (data.action || '').trim();
  var result;
  try {
    result = routePost(action, data);
  } catch (err) {
    result = { status: 'error', message: err.message };
  }

  return respond(result);
}

function respond(obj) {
  return addCorsHeaders(
    ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// ─────────────────────────────────────────────────────────
//  GET route dispatcher
// ─────────────────────────────────────────────────────────
function routeGet(action, p) {
  switch (action) {

    // ── Connection test (testConnection button) ──────────
    case 'ping':
    case 'health':
      return { status: 'ok', pong: true, ts: new Date().toISOString(), version: 'v2' };

    // ── Coupon validation (signup step 1) ────────────────
    case 'checkCoupon':
      return actionCheckCoupon(p);

    // ── Phone lookup (signup step 2 + login) ─────────────
    case 'checkPhone':
      return actionCheckPhone(p);

    // ── Mark coupon used after successful signup ──────────
    case 'markCouponUsed':
      return actionMarkCouponUsed(p);

    // ── Check if student has already taken a test ─────────
    case 'canTakeTest':
      return actionCanTakeTest(p);

    // ── Return all quiz responses for a student ───────────
    case 'getStudentResults':
      return actionGetStudentResults(p);

    // ── Return dynamic career card data from the imported career sheet ──
    case 'getCareers':
      return actionGetCareers();

    case 'getAdminDashboard':
      return actionGetAdminDashboard(p);

    default:
      return { status: 'error', message: 'Unknown GET action: ' + action };
  }
}

// ─────────────────────────────────────────────────────────
//  POST route dispatcher
// ─────────────────────────────────────────────────────────
function routePost(action, data) {
  switch (action) {

    // ── New student signup ───────────────────────────────
    case 'signup':
      return actionSignup(data);

    // ── Quiz response save (submitQuiz inside openQuiz) ───
    case 'quizResponse':
    case 'submitTest':
      return actionSaveQuizResponse(data);

    case 'getAdminDashboard':
      return actionGetAdminDashboard(data);

    case 'logClientEvent':
      return actionLogClientEvent(data);

    case 'roadmapEvent':
      data = data || {};
      data.detail = 'roadmap:' + String(data.detail || 'interaction');
      return actionLogClientEvent(data);

    default:
      return { status: 'error', message: 'Unknown POST action: ' + action };
  }
}

// ─────────────────────────────────────────────────────────
//  ACTION: ping  (already handled inline above)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
//  ACTION: checkCoupon
//  Params: code
//  Returns: { valid: bool, message: string }
// ─────────────────────────────────────────────────────────
function actionCheckCoupon(p) {
  var code = (p.code || '').toUpperCase().trim();
  if (!code) return { valid: false, message: 'Coupon code is empty.' };

  var sh = getSheet(SHEET.COUPONS, ['coupon_code', 'used', 'used_by_phone', 'used_at']);
  var data = sh.getDataRange().getValues();

  // Row 0 is the header
  for (var i = 1; i < data.length; i++) {
    var rowCode = String(data[i][0] || '').toUpperCase().trim();
    if (rowCode === code) {
      var usedFlag = String(data[i][1] || '').toUpperCase().trim();
      if (usedFlag === 'TRUE' || usedFlag === '1' || usedFlag === 'YES') {
        return { valid: false, message: 'This coupon has already been used. Each coupon gives access to one student only.' };
      }
      return { valid: true, message: 'Coupon is valid.' };
    }
  }

  return { valid: false, message: 'Coupon "' + code + '" was not found. Please check the code and try again.' };
}

// ─────────────────────────────────────────────────────────
//  ACTION: markCouponUsed
//  Params: code, phone
//  Returns: { status: 'ok' } or error
// ─────────────────────────────────────────────────────────
function actionMarkCouponUsed(p) {
  var code  = (p.code  || '').toUpperCase().trim();
  var phone = (p.phone || '').trim();
  if (!code) return { status: 'error', message: 'No coupon code provided.' };

  var sh   = getSheet(SHEET.COUPONS, ['coupon_code', 'used', 'used_by_phone', 'used_at']);
  var data = sh.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').toUpperCase().trim() === code) {
      sh.getRange(i + 1, 2).setValue('TRUE');
      sh.getRange(i + 1, 3).setValue(phone);
      sh.getRange(i + 1, 4).setValue(new Date().toISOString());
      appendLog(phone, 'couponUsed', 'Coupon ' + code + ' marked used');
      return { status: 'ok' };
    }
  }

  return { status: 'error', message: 'Coupon not found to mark as used.' };
}


function getStudentResultSummaryByPhone(phone) {
  var sh = getSheet(SHEET.RESPONSES, ['timestamp','phone','name','class','board','city','coupon','test_id','score','answers','summary_json','raw_json','attempt_number']);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { completed_tests: [], completed_count: 0 };
  var header    = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var colPhone  = header.indexOf('phone');
  var colTestId = header.indexOf('test_id');
  var seen = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colPhone] || '').trim() !== phone) continue;
    var testId = String(data[i][colTestId] || '').trim().toLowerCase();
    if (testId) seen[testId] = true;
  }
  var completed = Object.keys(seen);
  return { completed_tests: completed, completed_count: completed.length };
}

// ─────────────────────────────────────────────────────────
//  ACTION: checkPhone
//  Params: phone
//  Returns: { exists: bool, name, class, board, city, email, coupon, password_hash }
// ─────────────────────────────────────────────────────────
function actionCheckPhone(p) {
  var phone = (p.phone || '').trim();
  if (!phone) return { exists: false, message: 'No phone number provided.' };

  var sh   = getSheet(SHEET.SIGNUPS, ['timestamp','name','class','board','city','phone','email','password_hash','coupon']);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { exists: false };

  var header = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var col = {
    name  : header.indexOf('name'),
    cls   : header.indexOf('class'),
    board : header.indexOf('board'),
    city  : header.indexOf('city'),
    phone : header.indexOf('phone'),
    email : header.indexOf('email'),
    hash  : header.indexOf('password_hash'),
    coupon: header.indexOf('coupon'),
  };

  for (var i = 1; i < data.length; i++) {
    var rowPhone = String(data[i][col.phone] || '').trim();
    if (rowPhone === phone) {
      var progress = getStudentResultSummaryByPhone(phone);
      return {
        exists        : true,
        name          : String(data[i][col.name]   || ''),
        'class'       : String(data[i][col.cls]    || ''),
        board         : String(data[i][col.board]  || ''),
        city          : String(data[i][col.city]   || ''),
        email         : String(data[i][col.email]  || ''),
        coupon        : String(data[i][col.coupon] || ''),
        password_hash : String(data[i][col.hash]   || ''),
        // alias for robustness — HTML tries both keys
        passwordhash  : String(data[i][col.hash]   || ''),
        completed_tests : progress.completed_tests,
        completed_count : progress.completed_count
      };
    }
  }

  return { exists: false };
}

// ─────────────────────────────────────────────────────────
//  ACTION: signup (POST)
//  Body: { action, timestamp, name, class, board, city, phone, email, password_hash, coupon }
//  Returns: { status: 'ok' } or error
// ─────────────────────────────────────────────────────────
function actionSignup(data) {
  var phone = (data.phone || '').trim();
  if (!phone) return { status: 'error', message: 'Phone number is required.' };

  // Prevent duplicate signups
  var check = actionCheckPhone({ phone: phone });
  if (check.exists) {
    return { status: 'error', message: 'This mobile number is already registered.' };
  }

  var sh = getSheet(SHEET.SIGNUPS, ['timestamp','name','class','board','city','phone','email','password_hash','coupon']);
  sh.appendRow([
    data.timestamp    || new Date().toISOString(),
    data.name         || '',
    data['class']     || data.cls || '',
    data.board        || '',
    data.city         || '',
    phone,
    data.email        || '',
    data.password_hash || '',
    data.coupon        || '',
  ]);

  // Also mark the coupon used (belt-and-suspenders — HTML also calls markCouponUsed via JSONP)
  if (data.coupon) {
    actionMarkCouponUsed({ code: data.coupon, phone: phone });
  }

  appendLog(phone, 'signup', 'New student: ' + (data.name || ''));
  return { status: 'ok', message: 'Account created.' };
}

// ─────────────────────────────────────────────────────────
//  ACTION: quizResponse / submitTest (POST)
//  Body: { action, sheet?, timestamp, name, class, phone, coupon?, test_id?, score, answers }
//  Saves to Quiz_Responses sheet.
//  Each student can only have ONE saved row per test_id (enforced here).
//  Returns: { status: 'ok', alreadyTaken: bool }
// ─────────────────────────────────────────────────────────
function actionSaveQuizResponse(data) {
  // Normalise test identifier — HTML uses either 'test_id' or derives it from sheet name
  var testId = (data.test_id || '').trim().toLowerCase();
  if (!testId && data.sheet) {
    // sheet name pattern: "Interest_Assessment_Responses" → "interest"
    testId = String(data.sheet).toLowerCase().split('_')[0];
  }
  if (!testId) testId = 'unknown';

  var phone  = (data.phone  || '').trim();
  var coupon = (data.coupon || '').trim();

  if (!phone) return { status: 'error', alreadyTaken: false, message: 'Phone number is required to save a test.' };

  var sh = ensureResponsesSchema_();
  var existing = sh.getDataRange().getValues();
  var colMap = responseColumnMap_(sh);
  var colPhone  = colMap.phone;
  var colTestId = colMap.test_id;

  // Count existing attempts for this phone + testId
  var attemptCount = 0;
  for (var i = 1; i < existing.length; i++) {
    var rPhone  = colPhone  >= 0 ? String(existing[i][colPhone]  || '').trim() : '';
    var rTestId = colTestId >= 0 ? String(existing[i][colTestId] || '').trim().toLowerCase() : '';
    if (rPhone === phone && rTestId === testId) {
      attemptCount++;
    }
  }

  // Block second attempt — one submission per test per student
  if (attemptCount >= 1) {
    return { status: 'ok', alreadyTaken: true, message: 'This test has already been submitted once. Only the first attempt is saved.' };
  }

  // Save the response
  var answers = data.answers;
  if (Array.isArray(answers)) answers = answers.join('|');
  answers = String(answers || '');

  sh.appendRow([
    data.timestamp || new Date().toISOString(),
    phone,
    data.name  || '',
    data['class'] || data.cls || '',
    data.board || '',
    data.city || '',
    coupon,
    testId,
    data.score || 0,
    answers,
    data.summary_json || '',
    data.raw_json || '',
    1,   // attempt_number
  ]);

  appendLog(phone, 'quizDone', 'Test: ' + testId + ' | Score: ' + data.score);
  return { status: 'ok', alreadyTaken: false, message: 'Response saved.' };
}

// ─────────────────────────────────────────────────────────
//  ACTION: canTakeTest (GET)
//  Params: phone, test_id
//  Returns: { canTake: bool, attemptCount: number }
// ─────────────────────────────────────────────────────────
function actionCanTakeTest(p) {
  var phone  = (p.phone   || '').trim();
  var testId = (p.test_id || '').trim().toLowerCase();

  if (!phone || !testId) {
    return { canTake: false, attemptCount: 0, message: 'phone and test_id are required.' };
  }

  var sh = ensureResponsesSchema_();
  var data   = sh.getDataRange().getValues();
  if (data.length < 2) return { canTake: true, attemptCount: 0 };

  var colMap    = responseColumnMap_(sh);
  var colPhone  = colMap.phone;
  var colTestId = colMap.test_id;
  var count     = 0;

  for (var i = 1; i < data.length; i++) {
    var rPhone  = String(data[i][colPhone]  || '').trim();
    var rTestId = String(data[i][colTestId] || '').trim().toLowerCase();
    if (rPhone === phone && rTestId === testId) count++;
  }

  return { canTake: count < 1, attemptCount: count };
}

// ─────────────────────────────────────────────────────────
//  ACTION: getStudentResults (GET)
//  Params: phone
//  Returns: { results: [ { test_id, score, timestamp, answers } ] }
// ─────────────────────────────────────────────────────────
function actionGetStudentResults(p) {
  var phone = (p.phone || '').trim();
  if (!phone) return { results: [], message: 'phone is required.' };

  var sh   = ensureResponsesSchema_();
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { results: [] };

  var colMap     = responseColumnMap_(sh);
  var colPhone   = colMap.phone;
  var colTestId  = colMap.test_id;
  var colScore   = colMap.score;
  var colTs      = colMap.timestamp;
  var colAns     = colMap.answers;
  var colSummary = colMap.summary_json;
  var colRaw     = colMap.raw_json;

  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colPhone] || '').trim() === phone) {
      results.push({
        test_id   : String(data[i][colTestId] || ''),
        score     : data[i][colScore],
        timestamp : String(data[i][colTs]     || ''),
        answers   : String(data[i][colAns]    || ''),
        summary_json : String(colSummary >= 0 ? (data[i][colSummary] || '') : ''),
        raw_json     : String(colRaw >= 0 ? (data[i][colRaw] || '') : ''),
      });
    }
  }

  results.sort(function(a, b) {
    return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
  });
  return { results: results };
}



// ─────────────────────────────────────────────────────────
//  ACTION: getCareers (GET)
//  Returns normalised career-card data from the imported
//  "Standalone Specializations" sheet.
//  Note: import the Excel workbook into the same Google
//  Spreadsheet so that this sheet exists.
// ─────────────────────────────────────────────────────────
function actionGetCareers() {
  var sh = ss().getSheetByName(SHEET.CAREERS);
  if (!sh) {
    return {
      status: 'error',
      message: 'Career sheet "' + SHEET.CAREERS + '" was not found. Import the Excel workbook into this spreadsheet first.'
    };
  }

  var data = sh.getDataRange().getValues();
  if (!data || data.length < 2) {
    return { status: 'ok', careers: [], filters: { parentClusters: [], entranceExams: [], hollandCodes: [], degreeDiplomas: [] } };
  }

  var header = data[0].map(function(h) {
    return String(h || '').toLowerCase().trim();
  });

  function col(name) { return header.indexOf(String(name).toLowerCase()); }
  function splitMulti(value) {
    return String(value || '')
      .split(/;|,|\||\n/g)
      .map(function(v){ return String(v || '').replace(/\s+/g, ' ').trim(); })
      .filter(function(v){ return v && v !== '—' && v !== '-' && v !== 'NA' && v !== 'N/A'; });
  }
  function uniqSorted(arr) {
    var seen = {};
    return arr.filter(function(v) {
      var key = String(v || '').toLowerCase();
      if (!v || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort();
  }
  function inferStreams(minEducation, degree, title, cluster, exams) {
    var text = [minEducation, degree, title, cluster, exams].join(' ').toLowerCase();
    var streams = [];

    if (/(b\.?tech|b\.?e\.?|engineering|jee|neet|physics|chemistry|biology|medical|nursing|pharma|b\.sc|science|computer|it\b|ai|ml|lab|agriculture|forestry|fisheries|math|mathematics)/.test(text)) {
      streams.push('Science');
    }
    if (/(fine arts|b\.fa|nift|nid|design|animation|film|journalism|music|fashion|craft|creative|graphic|media)/.test(text)) {
      streams.push('Arts');
    }
    if (/(llb|law|political science|public administration|history|psychology|sociology|humanities|civil service|education|teaching|journalism|social work|criminology)/.test(text)) {
      streams.push('Humanities');
    }
    if (/(b\.com|commerce|ca |ca foundation|cma|cs |acca|bank|finance|account|audit|tax|economics|business|management|marketing|sales|company secretary|investment)/.test(text)) {
      streams.push(/math|mathematics|statistics|analytics|economics|bba|finance|accountancy/.test(text) ? 'Commerce with Maths' : 'Commerce without Maths');
    }

    if (!streams.length) {
      if (/(business|commerce|finance|bank|insurance)/.test(text)) streams.push('Commerce with Maths');
      else if (/(law|government|public|teacher|social|counselling)/.test(text)) streams.push('Humanities');
      else if (/(art|design|media|fashion)/.test(text)) streams.push('Arts');
      else streams.push('Science');
    }

    return uniqSorted(streams);
  }

  var cols = {
    title             : col('standalone career'),
    parentCluster     : col('parent cluster'),
    minimumEducation  : col('minimum education'),
    degree            : col('key degree / certification'),
    exams             : col('entrance exams'),
    entrySalary       : col('entry salary (annual)'),
    midSalary         : col('mid-career salary'),
    seniorSalary      : col('senior salary'),
    description       : col('job description (brief)'),
    skills            : col('key skills'),
    employers         : col('typical employers'),
    hollandCode       : col('holland code'),
    workEnvironment   : col('work environment'),
    careerPath        : col('career path'),
    automationRisk    : col('automation risk'),
    internationalScope: col('international scope'),
    govtSchemes       : col('govt schemes'),
    trend             : col('trend (1 line)')
  };

  var careers = [];
  var parentClusters = [];
  var entranceExams = [];
  var hollandCodes = [];
  var degreeDiplomas = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var title = String(row[cols.title] || '').trim();
    if (!title) continue;

    var parentCluster = String(row[cols.parentCluster] || '').trim();
    var minimumEducation = String(row[cols.minimumEducation] || '').trim();
    var degree = String(row[cols.degree] || '').trim();
    var exams = String(row[cols.exams] || '').trim();
    var hollandCode = String(row[cols.hollandCode] || '').trim();
    var streams = inferStreams(minimumEducation, degree, title, parentCluster, exams);

    if (parentCluster) parentClusters.push(parentCluster);
    parentClusters = parentClusters;
    entranceExams = entranceExams.concat(splitMulti(exams));
    if (hollandCode) hollandCodes.push(hollandCode);
    degreeDiplomas = degreeDiplomas.concat(splitMulti(degree));

    careers.push({
      title             : title,
      parentCluster     : parentCluster,
      minimumEducation  : minimumEducation,
      degree            : degree,
      exams             : exams,
      entrySalary       : String(row[cols.entrySalary] || '').trim(),
      midSalary         : String(row[cols.midSalary] || '').trim(),
      seniorSalary      : String(row[cols.seniorSalary] || '').trim(),
      description       : String(row[cols.description] || '').trim(),
      skills            : String(row[cols.skills] || '').trim(),
      employers         : String(row[cols.employers] || '').trim(),
      hollandCode       : hollandCode,
      workEnvironment   : String(row[cols.workEnvironment] || '').trim(),
      careerPath        : String(row[cols.careerPath] || '').trim(),
      automationRisk    : String(row[cols.automationRisk] || '').trim(),
      internationalScope: String(row[cols.internationalScope] || '').trim(),
      govtSchemes       : String(row[cols.govtSchemes] || '').trim(),
      trend             : String(row[cols.trend] || '').trim(),
      streams           : streams
    });
  }

  return {
    status: 'ok',
    count: careers.length,
    careers: careers,
    filters: {
      parentClusters: uniqSorted(parentClusters),
      entranceExams: uniqSorted(entranceExams),
      hollandCodes: uniqSorted(hollandCodes),
      degreeDiplomas: uniqSorted(degreeDiplomas)
    }
  };
}

// ─────────────────────────────────────────────────────────
//  Helper: append a row to the Activity_Log sheet
// ─────────────────────────────────────────────────────────
function appendLog(phone, action, detail) {
  try {
    var sh = getSheet(SHEET.LOG, ['timestamp','phone','action','detail']);
    sh.appendRow([ new Date().toISOString(), phone || '', action || '', detail || '' ]);
  } catch (e) {
    // Logging must never crash the main action
  }
}

// ─────────────────────────────────────────────────────────
//  One-time setup: run this manually once from the
//  Apps Script editor to create all sheets with headers.
//  Menu: Run → setupSheets
// ─────────────────────────────────────────────────────────
function setupSheets() {
  getSheet(SHEET.COUPONS,   ['coupon_code', 'used', 'used_by_phone', 'used_at']);
  getSheet(SHEET.SIGNUPS,   ['timestamp', 'name', 'class', 'board', 'city', 'phone', 'email', 'password_hash', 'coupon']);
ensureResponsesSchema_();
  getSheet(SHEET.LOG,       ['timestamp', 'phone', 'action', 'detail']);
  SpreadsheetApp.getUi().alert('Core PathSaathi sheets created successfully! Import the career workbook as additional tabs, especially "Standalone Specializations", for dynamic career cards.');
}

// ─────────────────────────────────────────────────────────
//  Seed a few test coupons. Run once manually if needed.
//  Menu: Run → seedCoupons
// ─────────────────────────────────────────────────────────
function seedCoupons() {
  var codes = [
    'PATH2024A', 'PATH2024B', 'PATH2024C', 'PATH2024D', 'PATH2024E',
    'SAATHI001', 'SAATHI002', 'SAATHI003', 'SAATHI004', 'SAATHI005',
    'NEP2025A',  'NEP2025B',  'NEP2025C',  'NEP2025D',  'NEP2025E',
  ];
  var sh = getSheet(SHEET.COUPONS, ['coupon_code', 'used', 'used_by_phone', 'used_at']);
  var existing = sh.getDataRange().getValues().slice(1).map(function(r){ return String(r[0]).toUpperCase().trim(); });
  var added = 0;
  codes.forEach(function(code) {
    if (existing.indexOf(code) === -1) {
      sh.appendRow([code, 'FALSE', '', '']);
      added++;
    }
  });
  SpreadsheetApp.getUi().alert('Added ' + added + ' new coupon(s). Already present: ' + (codes.length - added));
}

// ─────────────────────────────────────────────────────────
//  Quick self-test: run from editor to verify routing works.
//  Menu: Run → selfTest
// ─────────────────────────────────────────────────────────
function selfTest() {
  var ui = SpreadsheetApp.getUi();

  // ping
  var ping = routeGet('ping', {});
  if (ping.status !== 'ok') { ui.alert('FAIL: ping\n' + JSON.stringify(ping)); return; }

  // checkCoupon — expects at least one coupon row
  var cc = routeGet('checkCoupon', { code: 'PATH2024A' });
  Logger.log('checkCoupon PATH2024A: ' + JSON.stringify(cc));

  // checkPhone — phone should not exist yet
  var cp = routeGet('checkPhone', { phone: '9999999999' });
  Logger.log('checkPhone 9999999999: ' + JSON.stringify(cp));

  ui.alert('Self-test passed. Check Logs (View → Logs) for details.');
}


function isAdminAuthorized_(payload) {
  return payload && String(payload.access_code || '').trim() === String(ADMIN.accessCode);
}

function actionLogClientEvent(data) {
  appendLog((data && data.phone) || '', 'clientEvent', (data && data.detail) || '');
  return { status: 'ok' };
}

function actionGetAdminDashboard(payload) {
  if (!isAdminAuthorized_(payload || {})) {
    return { status: 'error', message: 'Admin access denied.' };
  }

  var signupsSheet = getSheet(SHEET.SIGNUPS, ['timestamp','name','class','board','city','phone','email','password_hash','coupon']);
  var responsesSheet = ensureResponsesSchema_();
  var logSheet = getSheet(SHEET.LOG, ['timestamp','phone','action','detail']);

  var signupRows = signupsSheet.getDataRange().getValues();
  var responseRows = responsesSheet.getDataRange().getValues();
  var logRows = logSheet.getDataRange().getValues();

  var signupHeader = signupRows.length ? signupRows[0].map(function(h){ return String(h || '').toLowerCase().trim(); }) : [];
  var signupCol = {
    timestamp: signupHeader.indexOf('timestamp'),
    name: signupHeader.indexOf('name'),
    cls: signupHeader.indexOf('class'),
    board: signupHeader.indexOf('board'),
    city: signupHeader.indexOf('city'),
    phone: signupHeader.indexOf('phone'),
    email: signupHeader.indexOf('email'),
    coupon: signupHeader.indexOf('coupon')
  };

  var responsesByPhone = {};
  for (var i = 1; i < responseRows.length; i++) {
    var phone = String(responseRows[i][1] || '').trim();
    if (!phone) continue;
    if (!responsesByPhone[phone]) responsesByPhone[phone] = {};
    var testId = String(responseRows[i][7] || '').trim().toLowerCase();
    if (testId) responsesByPhone[phone][testId] = true;
  }

  var students = [];
  for (var s = 1; s < signupRows.length; s++) {
    var rowPhone = String(signupRows[s][signupCol.phone] || '').trim();
    var completed = Object.keys(responsesByPhone[rowPhone] || {});
    students.push({
      timestamp: String(signupRows[s][signupCol.timestamp] || ''),
      name: String(signupRows[s][signupCol.name] || ''),
      class: String(signupRows[s][signupCol.cls] || ''),
      board: String(signupRows[s][signupCol.board] || ''),
      city: String(signupRows[s][signupCol.city] || ''),
      phone: rowPhone,
      email: String(signupRows[s][signupCol.email] || ''),
      coupon: String(signupRows[s][signupCol.coupon] || ''),
      completed_count: completed.length,
      completed_tests: completed.join(', ')
    });
  }

  var tests = [];
  for (var r = Math.max(1, responseRows.length - ADMIN.latestRows); r < responseRows.length; r++) {
    tests.push({
      timestamp: String(responseRows[r][0] || ''),
      phone: String(responseRows[r][1] || ''),
      name: String(responseRows[r][2] || ''),
      class: String(responseRows[r][3] || ''),
      board: String(responseRows[r][4] || ''),
      city: String(responseRows[r][5] || ''),
      coupon: String(responseRows[r][6] || ''),
      test_id: String(responseRows[r][7] || ''),
      score: String(responseRows[r][8] || '')
    });
  }
  tests.sort(function(a,b){ return String(b.timestamp).localeCompare(String(a.timestamp)); });

  var logs = [];
  for (var l = Math.max(1, logRows.length - ADMIN.latestRows); l < logRows.length; l++) {
    logs.push({
      timestamp: String(logRows[l][0] || ''),
      phone: String(logRows[l][1] || ''),
      action: String(logRows[l][2] || ''),
      detail: String(logRows[l][3] || '')
    });
  }
  logs.sort(function(a,b){ return String(b.timestamp).localeCompare(String(a.timestamp)); });

  return {
    status: 'ok',
    students: students,
    tests: tests,
    logs: logs
  };
}
