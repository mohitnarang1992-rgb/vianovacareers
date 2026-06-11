/*
 * ViaNova split JS: 06-pdf-report.js
 * Report recommendation logic, PDF controls, compiled PDF generator
 * Extracted from 01-app-core.js without changing logic.
 */

function buildCareerRecommendationsForPdf(limit) {
  // Career Explorer may be filtered by the user, but report logic should never depend on UI filters.
  // It always uses the full career database and keeps career-level sorting only for exploration cards.
  const selectedStream = getSelectedSignupStream();
  const items = (CAREER_STATE.all || []).filter(function(c){ return careerMatchesSelectedStream(c, selectedStream); }).slice().sort(function(a,b){ return (b.score||0) - (a.score||0); });
  return items.slice(0, limit || 6);
}

function profileScoreValue(map, key) {
  if (!map) return 0;
  if (map[key] != null) return Number(map[key]) || 0;
  const low = String(key || '').toLowerCase();
  const found = Object.keys(map).find(function(k){ return String(k).toLowerCase() === low; });
  return found ? (Number(map[found]) || 0) : 0;
}
function topProfileKeys(map, limit) {
  return Object.keys(map || {}).sort(function(a,b){ return Number(map[b]||0) - Number(map[a]||0); }).slice(0, limit || 3);
}
function clampReportScore(v) { return Math.max(45, Math.min(98, Math.round(Number(v) || 0))); }
function careerSearchText(career) {
  return [career.title, career.cluster, career.category, career.description, career.subjects, career.degree, career.exams, (career.skills||[]).join(' '), career.workEnvironment, career.workLifeBalance, career.jobStability, career.trend, career.automationRisk, (career.streams||[]).join(' ')].join(' ').toLowerCase();
}
function scoreByEvidenceRules(text, pctMap, rules) {
  let total = 0, weight = 0;
  rules.forEach(function(rule){
    if (rule.re.test(text)) {
      total += profileScoreValue(pctMap, rule.key) * (rule.weight || 1);
      weight += (rule.weight || 1);
    }
  });
  return weight ? (total / weight) : 0;
}
function buildCareerClusterRecommendationsForPdf(limit) {
  const selectedStream = getSelectedSignupStream();
  const careers = (CAREER_STATE.all || []).filter(function(c){ return c && c.cluster && c.cluster !== 'Career Cluster' && careerMatchesSelectedStream(c, selectedStream); });
  if (!careers.length) return [];
  const profile = (state && state.assessmentProfile) || {};
  const riasecPct = profile.riasec || profile.riasecPct || {};
  const aptPct = profile.aptitudePct || profile.aptitude || {};
  const traitPct = profile.personalityPct || profile.traits || {};
  const valuePct = profile.valuesPct || profile.values || {};
  const topRiasec = (profile.topRiasec && profile.topRiasec.length ? profile.topRiasec : topProfileKeys(riasecPct, 3)).map(function(x){ return String(x).charAt(0).toUpperCase(); });
  const topApt = profile.topAptitude && profile.topAptitude.length ? profile.topAptitude : topProfileKeys(aptPct, 3);
  const topTraits = profile.topTraits && profile.topTraits.length ? profile.topTraits : topProfileKeys(traitPct, 3);
  const topValues = profile.topValues && profile.topValues.length ? profile.topValues : topProfileKeys(valuePct, 3);
  const recStream = String(getEffectiveReportStream(profile) || '').toLowerCase();
  const groups = {};

  careers.forEach(function(c){
    const key = String(c.cluster || 'Other Career Cluster').trim();
    if (!groups[key]) groups[key] = { cluster:key, careers:[], hollandLetters:{}, streamHits:0, text:'' };
    const g = groups[key];
    g.careers.push(c);
    g.text += ' ' + careerSearchText(c);
    String(c.hollandCode || '').toUpperCase().replace(/[^RIASEC]/g,'').split('').forEach(function(letter){ g.hollandLetters[letter] = (g.hollandLetters[letter] || 0) + 1; });
    (c.hollandTraits || []).forEach(function(t){
      const m = String(t||'').toLowerCase();
      const map = {realistic:'R', investigative:'I', artistic:'A', social:'S', enterprising:'E', conventional:'C'};
      Object.keys(map).forEach(function(k){ if (m.indexOf(k) >= 0) g.hollandLetters[map[k]] = (g.hollandLetters[map[k]] || 0) + 1; });
    });
    if (!recStream) return;
    g.streamHits += streamCompatibilityScoreForCareer(c, recStream) / 100;
  });

  const aptRules = [
    {key:'Logical', weight:1.3, re:/(software|coding|engineering|law|logic|analytics|analysis|research|ai|data|strategy|technology)/},
    {key:'Numerical', weight:1.2, re:/(finance|economics|account|audit|data|analytics|statistics|math|bank|investment|actuarial)/},
    {key:'Verbal', weight:1.1, re:/(law|journal|media|content|teaching|psychology|counsel|marketing|public|communication|policy)/},
    {key:'Spatial', weight:1.1, re:/(architecture|design|animation|civil|interior|fashion|product|visual|mapping)/},
    {key:'Mechanical', weight:1.1, re:/(mechanic|automobile|manufacturing|industrial|machine|aviation|hardware|technical|maintenance)/}
  ];
  const traitRules = [
    {key:'O', weight:1.1, re:/(design|creative|research|innovation|product|strategy|architecture|writing|media|science)/},
    {key:'C', weight:1.1, re:/(account|audit|operations|compliance|government|administration|planning|project|bank|law)/},
    {key:'E', weight:1.0, re:/(business|management|marketing|sales|entrepreneur|public|media|leadership|client|hospitality)/},
    {key:'A', weight:1.0, re:/(teacher|education|psychology|counsel|health|social|hr|ngo|support|care)/}
  ];
  const valueRules = [
    {key:'Achievement', weight:1.0, re:/(research|doctor|engineer|law|founder|consult|management|civil service|competitive|growth)/},
    {key:'Independence', weight:1.0, re:/(design|writer|entrepreneur|consult|freelance|architect|creative|startup)/},
    {key:'Recognition', weight:1.0, re:/(media|marketing|management|law|public|leadership|politics|brand|performance)/},
    {key:'Relationships', weight:1.0, re:/(teacher|psychology|doctor|nurse|social|hr|counsel|health|education|community)/},
    {key:'Support', weight:0.8, re:/(team|support|mentor|education|health|social|government|organization)/},
    {key:'Working Conditions', weight:1.0, re:/(government|bank|operations|compliance|administration|stable|office|public sector)/},
    {key:'Lifestyle', weight:0.8, re:/(flexible|remote|design|consult|writer|balance|wellness|education)/},
    {key:'Learning', weight:0.9, re:/(research|technology|science|medical|law|data|ai|innovation|continuous)/}
  ];

  return Object.keys(groups).map(function(key){
    const g = groups[key];
    const totalCareers = g.careers.length || 1;
    const dominantLetters = Object.keys(g.hollandLetters).sort(function(a,b){ return g.hollandLetters[b] - g.hollandLetters[a]; }).slice(0,3);
    let riasecScore = 0;
    if (dominantLetters.length) {
      riasecScore = dominantLetters.reduce(function(sum,l,i){
        const pct = profileScoreValue(riasecPct, l) || (topRiasec.indexOf(l) >= 0 ? (88 - topRiasec.indexOf(l)*10) : 48);
        return sum + pct * (i === 0 ? 1.25 : i === 1 ? 1 : 0.8);
      }, 0) / dominantLetters.reduce(function(sum,l,i){ return sum + (i === 0 ? 1.25 : i === 1 ? 1 : 0.8); }, 0);
    } else {
      riasecScore = topRiasec.length ? 58 : 50;
    }
    const aptitudeScore = scoreByEvidenceRules(g.text, aptPct, aptRules) || (topApt.length ? 58 : 50);
    const personalityScore = scoreByEvidenceRules(g.text, traitPct, traitRules) || (topTraits.length ? 58 : 50);
    const valuesScore = scoreByEvidenceRules(g.text, valuePct, valueRules) || (topValues.length ? 58 : 50);
    const streamScore = recStream ? Math.round((g.streamHits / totalCareers) * 100) : 55;
    const finalScore = clampReportScore((riasecScore*0.35) + (aptitudeScore*0.25) + (personalityScore*0.15) + (valuesScore*0.15) + (streamScore*0.10));
    const samples = g.careers.slice().sort(function(a,b){ return (b.score||0) - (a.score||0); }).slice(0, 10);
    const evidence = [];
    if (dominantLetters.length) evidence.push('Interest fit: ' + dominantLetters.join('-'));
    if (topApt.length) evidence.push('Aptitude signal: ' + topApt.slice(0,2).join(', '));
    if (topTraits.length) evidence.push('Personality signal: ' + topTraits.slice(0,2).join(', '));
    if (topValues.length) evidence.push('Work value signal: ' + topValues.slice(0,2).join(', '));
    if (getSelectedSignupStream()) evidence.push('Stream compatibility: ' + getSelectedSignupStream());
    return {
      cluster:key,
      title:key,
      score:finalScore,
      careerCount:totalCareers,
      sampleCareers:samples,
      sampleCareerTitles:samples.map(function(c){ return c.title; }).filter(Boolean),
      dominantRiasec:dominantLetters,
      evidence:evidence,
      category:(samples[0] && samples[0].category) || 'Career Cluster',
      streams:Array.from(new Set([].concat.apply([], samples.map(function(c){ return c.streams || []; })))).slice(0,3),
      description: describeCareerClusterFit(key, dominantLetters, topApt, topValues)
    };
  }).sort(function(a,b){ return b.score - a.score; }).slice(0, limit || 5);
}
function buildClusterRecommendationsForPdf(limit) { return buildCareerClusterRecommendationsForPdf(limit); }
function describeCareerClusterFit(cluster, riasecLetters, topApt, topValues) {
  const hi = isHindi && isHindi();
  const r = (riasecLetters && riasecLetters.length) ? riasecLetters.join('-') : 'RIASEC';
  const apt = (topApt && topApt.length) ? topApt.slice(0,2).join(', ') : (hi ? 'aptitude pattern' : 'aptitude pattern');
  const vals = (topValues && topValues.length) ? topValues.slice(0,2).join(', ') : (hi ? 'work values' : 'work values');
  return hi ? ('यह cluster ' + r + ' रुचि पैटर्न, ' + apt + ' aptitude और ' + vals + ' values के आधार पर explore करने योग्य दिशा दिखाता है।') : ('This cluster is worth exploring because it aligns with the ' + r + ' interest pattern, ' + apt + ' aptitude signals and ' + vals + ' work values.');
}
function clusterSampleCareerText(cluster, maxItems) {
  const arr = (cluster && cluster.sampleCareerTitles) || [];
  return arr.slice(0, maxItems || 8).join(', ') || (isHindi() ? 'Career Explorer में related careers देखें' : 'Explore related careers in Career Explorer');
}
function renderPdfControls() {
  const done = (state.completedTests || []).length;
  const chip = document.getElementById('pdf-report-chip');
  const status = document.getElementById('pdf-report-status');
  const genBtn = document.getElementById('pdf-generate-btn');
  const previewBtn = document.getElementById('pdf-preview-btn');
  if (!chip || !status || !genBtn || !previewBtn) return;
  if (done >= 4) {
    chip.className = 'pdf-ready';
    chip.textContent = tx('pdf.ready');
    status.textContent = tx('pdf.status.ready');
    genBtn.disabled = false;
    previewBtn.disabled = false;
    genBtn.textContent = tx('pdf.generate');
    previewBtn.textContent = tx('pdf.preview');
  } else {
    chip.className = 'filter-chip';
    chip.textContent = tx('pdf.locked');
    status.textContent = tx('pdf.status.locked', { done: done });
    genBtn.disabled = true;
    previewBtn.disabled = true;
    genBtn.textContent = tx('pdf.generate');
    previewBtn.textContent = tx('pdf.preview');
  }
}
function previewCompiledPdf() {
  const area = document.getElementById('pdf-preview-area');
  if (!area) return;
  const profile = state.assessmentProfile || {};
  const careers = buildCareerRecommendationsForPdf(5);
  const done = (state.completedTests || []).length;
  const topCareers = careers.map(function(c){ return escapeHtml(localizedCareerTitle(c)); }).join(', ') || (isHindi() ? 'Career Explorer data load होने के बाद shortlist दिखेगी।' : 'Career shortlist will appear after explorer data loads.');
  const confidence = Math.min(96, 22 + (done * 18));
  area.style.display = 'block';
  area.innerHTML =
    '<div style="font-family:Georgia,serif;font-size:24px;margin-bottom:12px;color:var(--ink);">'+tx('pdf.preview.title')+'</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
      '<div style="background:white;border:1px solid var(--cream-d);border-radius:14px;padding:14px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-s);margin-bottom:8px;">'+tx('pdf.cover')+'</div><div style="font-size:15px;font-weight:700;color:var(--ink);">' + escapeHtml(state.name || 'Student') + '</div><div style="font-size:12px;color:var(--ink-s);margin-top:6px;">Class ' + escapeHtml(state.cls || '—') + ' • ' + escapeHtml(state.board || '—') + ' • ' + escapeHtml(state.city || '—') + '</div></div>' +
      '<div style="background:white;border:1px solid var(--cream-d);border-radius:14px;padding:14px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-s);margin-bottom:8px;">'+tx('pdf.confidence')+'</div><div style="font-size:28px;font-family:Georgia,serif;color:var(--sf);">' + confidence + '%</div><div style="font-size:12px;color:var(--ink-s);margin-top:6px;">'+tx('pdf.confidence.note')+'</div></div>' +
    '</div>' +
    '<div style="font-size:13px;color:#7184A3;line-height:1.8;background:white;border:1px solid var(--cream-d);border-radius:14px;padding:16px;">' +
      '<strong>'+tx('pdf.stream')+':</strong> ' + escapeHtml(profile.recommendedStream || '—') + '<br>' +
      '<strong>'+tx('pdf.interest')+':</strong> ' + escapeHtml(((profile.topRiasec || []).slice(0,2).join('-')) || '—') + '<br>' +
      '<strong>'+tx('pdf.topCareers')+':</strong> ' + topCareers + '<br>' +
      '<strong>'+tx('pdf.adds')+':</strong> '+tx('pdf.adds.text')+'' +
    '</div>';
}

async function generateCompiledPdf() {
  if (isHindi()) {
    if ((state.completedTests || []).length < 4) { alert(tx('alert.completeFirst')); return; }
    generateHtmlBasedReport();
    return;
  }
  if ((state.completedTests || []).length < 4) {
    alert(tx('alert.completeFirst'));
    return;
  }

  const btn = document.getElementById('pdf-generate-btn');
  if (btn) { btn.disabled = true; btn.textContent = tx('pdf.generating'); }

  try {
    if (!window.jspdf) {
      await new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = function() { reject(new Error('Could not load PDF library.')); };
        document.body.appendChild(s);
      });
    }

    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error('PDF library did not initialize correctly.');

    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const profile  = state.assessmentProfile || {};
    const results  = state.assessmentResults || {};
    const clusters = buildCareerClusterRecommendationsForPdf(5) || [];

    const PW = 595.28, PH = 841.89;
    const M = 42, CW = PW - (M * 2);
    const C = {
      navy:[22,35,63], navy2:[31,49,87], night:[14,22,42],
      orange:[232,97,10], orange2:[255,151,76], orangeSoft:[255,241,230],
      blue:[55,104,196], blueSoft:[232,241,255],
      green:[35,150,98], greenSoft:[229,247,238],
      purple:[116,87,190], purpleSoft:[241,236,255],
      amber:[196,128,32], amberSoft:[255,247,226],
      red:[210,75,75], redSoft:[255,235,235],
      ink:[28,39,60], ink2:[84,99,125], muted:[137,151,176],
      line:[219,228,240], page:[248,251,255], white:[255,255,255]
    };

    const interest    = (results.interest    && results.interest.result)    || {};
    const aptitude    = (results.aptitude    && results.aptitude.result)    || {};
    const personality = (results.personality && results.personality.result) || {};
    const values      = (results.values      && results.values.result)      || {};

    const riasecPct   = interest.pct     || profile.riasec         || {};
    const aptitudePct = aptitude.pct     || profile.aptitudePct    || {};
    const traitPct    = personality.pct  || profile.personalityPct || {};
    const valuePct    = values.pct       || profile.valuesPct      || {};

    function sf(v, fb) { return String(v == null || v === '' ? (fb || '—') : v); }
    function esc(v) { return sf(v, '').replace(/\s+/g, ' ').trim(); }
    function clamp(n, min, max) { n = Number(n || 0); return Math.max(min, Math.min(max, isFinite(n) ? n : 0)); }
    function pct(v) { const n = Number(v || 0); return Math.round(n <= 10 ? clamp(n * 10, 0, 100) : clamp(n, 0, 100)); }
    function topKeys(obj, n) { return Object.keys(obj || {}).sort(function(a,b){ return Number(obj[b]||0) - Number(obj[a]||0); }).slice(0, n || 3); }
    function cap(s) { s = sf(s, ''); return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—'; }

    const topRiasec   = (profile.topRiasec && profile.topRiasec.length ? profile.topRiasec : topKeys(riasecPct, 3));
    const topAptitude = (profile.topAptitude && profile.topAptitude.length ? profile.topAptitude : topKeys(aptitudePct, 3));
    const topTraits   = (profile.topTraits && profile.topTraits.length ? profile.topTraits : topKeys(traitPct, 3));
    const topValues   = (profile.topValues && profile.topValues.length ? profile.topValues : topKeys(valuePct, 3));

    const studentName = esc(state.name || 'Student');
    const firstName = studentName.split(' ')[0] || 'Student';
    const recommendedStream = esc(profile.recommendedStream || 'To be discussed with counselor');
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    const confidence = Math.max(68, Math.min(96, 62 + (state.completedTests || []).length * 6 + Math.round(((clusters[0] && clusters[0].score) || 0) / 10)));

    let y = M;
    function setFill(c){ doc.setFillColor(c[0],c[1],c[2]); }
    function setDraw(c){ doc.setDrawColor(c[0],c[1],c[2]); }
    function setText(c){ doc.setTextColor(c[0],c[1],c[2]); }
    function font(style, size, color){ doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size || 10); setText(color || C.ink); }
    function serif(style, size, color){ doc.setFont('times', style || 'normal'); doc.setFontSize(size || 10); setText(color || C.ink); }
    function rr(x, yy, w, h, r, mode){ doc.roundedRect(x, yy, w, h, r, r, mode || 'F'); }
    function wrap(text, w){ return doc.splitTextToSize(sf(text, ''), w); }
    function textBlock(text, x, yy, w, size, color, style, lh, maxLines){
      font(style || 'normal', size || 10, color || C.ink2);
      let lines = wrap(text, w);
      if (maxLines) lines = lines.slice(0, maxLines);
      doc.text(lines, x, yy);
      return yy + lines.length * (lh || (size + 4));
    }
    function safeText(text, x, yy, w, size, color, style, maxLines){
      const lines = wrap(text, w).slice(0, maxLines || 99);
      font(style || 'normal', size || 10, color || C.ink);
      doc.text(lines, x, yy);
      return lines.length;
    }
    function addPage(){ doc.addPage(); y = M; pageBase(); }
    function pageBase(){ setFill(C.page); doc.rect(0,0,PW,PH,'F'); }
    function divider(yy){ setDraw(C.line); doc.setLineWidth(0.6); doc.line(M, yy, PW-M, yy); }
    function pageHeader(label, title, subtitle){
      setFill(C.page); doc.rect(0,0,PW,PH,'F');
      setFill(C.navy); doc.rect(0,0,8,PH,'F');
      setFill(C.orange); rr(M, M, 54, 22, 11, 'F'); font('bold', 8, C.white); doc.text(label, M+13, M+14);
      serif('bold', 24, C.ink); doc.text(title, M+66, M+18);
      y = M + 44;
      if (subtitle) y = textBlock(subtitle, M+66, y, CW-66, 9.5, C.ink2, 'normal', 13) + 8;
      divider(y); y += 20;
    }
    function pill(x, yy, label, bg, fg){
      font('bold', 8, fg || C.white);
      const tw = doc.getTextWidth(sf(label));
      setFill(bg || C.orange); rr(x, yy-11, tw+18, 17, 8.5, 'F');
      doc.text(sf(label), x+9, yy);
      return tw + 18;
    }
    function card(x, yy, w, h, bg, stroke){
      setFill(bg || C.white); setDraw(stroke || C.line); doc.setLineWidth(0.6); rr(x, yy, w, h, 14, 'FD');
    }
    function miniCard(x, yy, w, h, label, value, note, color, bg){
      card(x, yy, w, h, bg || C.white, C.line);
      setFill(color || C.orange); rr(x, yy, w, 4, 2, 'F');
      font('bold', 7.5, C.muted); doc.text(sf(label).toUpperCase(), x+12, yy+17);
      serif('bold', 15, color || C.orange); doc.text(wrap(value || '—', w-24).slice(0,2), x+12, yy+36);
      if (note) textBlock(note, x+12, yy+56, w-24, 8, C.ink2, 'normal', 10, 2);
    }
    function progressBar(x, yy, w, h, value, color, bg){
      const p = pct(value);
      setFill(bg || C.line); rr(x, yy, w, h, h/2, 'F');
      setFill(color || C.orange); rr(x, yy, Math.max(h, w*p/100), h, h/2, 'F');
      return p;
    }
    function metricRow(label, value, color, highlight){
      const rowH = 25;
      if (highlight) { setFill(highlight); rr(M-4, y-10, CW+8, rowH, 8, 'F'); }
      font('normal', 9.5, C.ink); doc.text(sf(label), M, y+3);
      const p = progressBar(M+185, y-4, CW-245, 8, value, color || C.orange, C.line);
      font('bold', 9, color || C.orange); doc.text(p + '%', PW-M-34, y+3);
      y += rowH;
    }
    function insightBox(title, body, color, bg){
      card(M, y, CW, 68, bg || C.white, C.line);
      setFill(color || C.orange); doc.circle(M+18, y+19, 5, 'F');
      font('bold', 10.5, C.ink); doc.text(title, M+32, y+20);
      textBlock(body, M+32, y+38, CW-48, 9, C.ink2, 'normal', 12, 3);
      y += 80;
    }
    function ensure(space){ if (y + space > PH - 58) addPage(); }

    function footer(){
      const total = doc.getNumberOfPages();
      for (let i=2; i<=total; i++) {
        doc.setPage(i);
        setFill(C.navy); doc.rect(0, PH-34, PW, 34, 'F');
        font('normal', 8, [174,188,210]); doc.text('ViaNova Career Discovery Report  •  Confidential', M, PH-13);
        doc.text('Page ' + i + ' of ' + total + '  •  ' + dateStr, PW-M-128, PH-13);
      }
    }

    const riasecNames = {R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional'};
    const traitNames = {O:'Openness', C:'Conscientiousness', E:'Extraversion', A:'Agreeableness', N:'Emotional Sensitivity'};
    const palette = [C.orange, C.blue, C.green, C.purple, C.amber];

    // PAGE 1: PREMIUM COVER
    setFill(C.night); doc.rect(0,0,PW,PH,'F');
    setFill(C.navy2); doc.circle(PW-72, 94, 172, 'F');
    setFill(C.navy); doc.circle(PW-62, 118, 116, 'F');
    setFill(C.orange); doc.circle(PW-72, 112, 48, 'F');
    setFill(C.blue); doc.circle(40, PH-70, 138, 'F');
    setFill(C.purple); doc.circle(32, PH-82, 78, 'F');

    setFill([255,255,255]); rr(M, 50, 86, 30, 15, 'F');
    font('bold', 9, C.orange); doc.text('VIANOVA', M+17, 69);
    font('bold', 8, [178,196,224]); doc.text('NEP 2020 • STUDENT CAREER GUIDANCE', M, 114);
    serif('bold', 46, C.white); doc.text('Career Discovery', M, 165);
    serif('normal', 34, [201,215,238]); doc.text('Report', M, 204);
    setFill(C.orange); doc.rect(M, 224, 92, 3, 'F');
    textBlock('A premium, counselor-ready report combining interests, aptitude, personality, work values, stream fit and career recommendations.', M, 255, 360, 12, [198,211,233], 'normal', 18, 5);

    card(M, 342, CW, 152, [24,37,66], [55,72,108]);
    font('bold', 8, C.orange); doc.text('PREPARED FOR', M+20, 368);
    serif('bold', 28, C.white); doc.text(wrap(studentName, CW-40).slice(0,2), M+20, 400);
    font('normal', 10.5, [184,200,226]); doc.text('Class ' + sf(state.cls) + '  •  ' + sf(state.board) + '  •  ' + sf(state.city), M+20, 426);
    font('normal', 9, [148,166,200]); doc.text('Generated on ' + dateStr, M+20, 448);
    pill(M+20, 480, 'Confidential Student Report', C.orange, C.white);

    const cY = 535, cW = (CW - 24) / 3;
    miniCard(M, cY, cW, 92, 'Recommended stream', recommendedStream, 'Best current fit', C.orange, [26,42,74]);
    miniCard(M+cW+12, cY, cW, 92, 'Confidence', confidence + '%', 'Multi-assessment signal', C.blue, [26,42,74]);
    miniCard(M+(cW+12)*2, cY, cW, 92, 'Interest code', topRiasec.slice(0,2).join('-') || '—', 'RIASEC pattern', C.purple, [26,42,74]);
    font('normal', 8.5, [155,174,206]); doc.text('This report is a guidance tool and should be read with academic performance, real behaviour and counselor discussion.', M, PH-52);
    font('bold', 9, C.orange); doc.text('Discover • Decide • Design', M, PH-32);

    // PAGE 2: EXECUTIVE SNAPSHOT
    addPage();
    pageHeader('01', 'Executive Snapshot', 'The most important decision signals from all completed assessments, presented in a parent and counselor friendly format.');
    const snapW = (CW - 36) / 4;
    miniCard(M, y, snapW, 82, 'Stream', recommendedStream, '', C.orange, C.white);
    miniCard(M+snapW+12, y, snapW, 82, 'Top aptitude', cap(topAptitude[0]), '', C.blue, C.white);
    miniCard(M+(snapW+12)*2, y, snapW, 82, 'Top trait', cap(topTraits[0]), '', C.purple, C.white);
    miniCard(M+(snapW+12)*3, y, snapW, 82, 'Top value', cap(topValues[0]), '', C.green, C.white);
    y += 106;

    card(M, y, CW, 96, C.white, C.line);
    font('bold', 11, C.ink); doc.text('Profile confidence', M+18, y+24);
    font('normal', 9, C.ink2); doc.text('How complete and coherent the available assessment evidence looks right now.', M+18, y+42);
    progressBar(M+18, y+58, CW-92, 13, confidence, C.green, C.line);
    serif('bold', 26, C.green); doc.text(confidence + '%', PW-M-62, y+69);
    y += 120;

    insightBox('What stands out for ' + firstName, 'Interest pattern: ' + (topRiasec.map(function(k){return riasecNames[k] || cap(k);}).join(', ') || '—') + '. Aptitude strengths: ' + (topAptitude.map(cap).join(', ') || '—') + '.', C.orange, C.orangeSoft);
    insightBox('How to use this report', 'Use these insights to shortlist streams and careers, then validate them with subject comfort, marks trend, entrance exam readiness, budget, location and family context.', C.blue, C.blueSoft);

    // PAGE 3: INTERESTS & APTITUDE
    addPage();
    pageHeader('02', 'Interest & Aptitude Analysis', 'Interests show what energises the student; aptitude shows where problem-solving confidence is currently stronger.');
    serif('bold', 17, C.ink); doc.text('Interest profile — RIASEC', M, y); y += 26;
    ['R','I','A','S','E','C'].forEach(function(k){ metricRow((riasecNames[k] || k) + ' (' + k + ')', riasecPct[k] || 0, C.orange, topRiasec.includes(k) ? C.orangeSoft : null); });
    y += 12;
    insightBox('RIASEC reading', 'The top RIASEC codes point to learning environments and career tasks that may feel naturally motivating for the student.', C.orange, C.orangeSoft);
    ensure(220);
    serif('bold', 17, C.ink); doc.text('Aptitude profile', M, y); y += 26;
    const aptKeys = Object.keys(aptitudePct || {});
    if (aptKeys.length) aptKeys.forEach(function(k){ metricRow(cap(k), aptitudePct[k] || 0, C.blue, topAptitude.includes(k) ? C.blueSoft : null); });
    else { textBlock('Aptitude data was not found in the local report state.', M, y, CW, 10, C.ink2); y += 24; }

    // PAGE 4: PERSONALITY & VALUES
    addPage();
    pageHeader('03', 'Personality & Work Values', 'These dimensions explain the kind of work environment, motivation and routine that may suit the student.');
    serif('bold', 17, C.ink); doc.text('Personality — Big Five', M, y); y += 26;
    const traitKeys = Object.keys(traitPct || {}).slice(0, 6);
    if (traitKeys.length) traitKeys.forEach(function(k){ metricRow(traitNames[k] || cap(k), traitPct[k] || 0, C.purple, topTraits.includes(k) ? C.purpleSoft : null); });
    else { textBlock('Personality data was not found in the local report state.', M, y, CW, 10, C.ink2); y += 24; }
    y += 12;
    insightBox('Personality reading', 'Higher traits are not “good” or “bad”; they indicate preferred ways of learning, collaborating, handling structure and responding to challenge.', C.purple, C.purpleSoft);
    ensure(220);
    serif('bold', 17, C.ink); doc.text('Work values', M, y); y += 26;
    const valKeys = Object.keys(valuePct || {}).slice(0, 8);
    if (valKeys.length) valKeys.forEach(function(k){ metricRow(cap(k), valuePct[k] || 0, C.green, topValues.includes(k) ? C.greenSoft : null); });
    else { textBlock('Work values data was not found in the local report state.', M, y, CW, 10, C.ink2); y += 24; }

    // PAGE 5: STREAM FIT
    addPage();
    pageHeader('04', 'Stream Fit Recommendation', 'A practical decision page designed for student-parent-counselor discussion.');
    card(M, y, CW, 138, C.navy, C.navy);
    font('bold', 8.5, C.orange); doc.text('RECOMMENDED STREAM', M+22, y+28);
    serif('bold', 28, C.white); doc.text(wrap(recommendedStream, CW-44).slice(0,2), M+22, y+66);
    textBlock('This recommendation combines interests, aptitude strengths, personality signals, work values and visible career alignment. It should be validated with marks and subject comfort before final selection.', M+22, y+96, CW-44, 9.5, [194,209,234], 'normal', 13, 3);
    y += 166;
    const fitW = (CW - 20) / 2;
    card(M, y, fitW, 118, C.white, C.line);
    font('bold', 10, C.ink); doc.text('Why this may fit', M+16, y+22);
    textBlock('Your strongest evidence areas currently point toward ' + recommendedStream + '. The final choice should also consider subject enjoyment and preparation discipline.', M+16, y+42, fitW-32, 9, C.ink2, 'normal', 13, 5);
    card(M+fitW+20, y, fitW, 118, C.white, C.line);
    font('bold', 10, C.ink); doc.text('What to verify next', M+fitW+36, y+22);
    textBlock('Compare exam requirements, school subject availability, coaching needs, budget, and the student’s willingness to study the core subjects daily.', M+fitW+36, y+42, fitW-32, 9, C.ink2, 'normal', 13, 5);
    y += 146;
    insightBox('Counselor note', 'Do not use the stream recommendation as a label. Use it as a conversation starter to compare the top-fit direction against realistic academic and family constraints.', C.amber, C.amberSoft);

    // PAGE 6: CAREER CLUSTER RECOMMENDATIONS
    addPage();
    pageHeader('05', 'Top Career Clusters to Explore', 'Broad career directions first — the student should explore related careers inside each cluster before choosing.');
    if (clusters.length) {
      clusters.slice(0,5).forEach(function(c, idx){
        ensure(112);
        const h = 104, ac = palette[idx % palette.length], score = pct(c.score || (88 - idx * 4));
        card(M, y, CW, h, C.white, C.line);
        setFill(ac); rr(M, y, 5, h, 3, 'F');
        setFill(ac); doc.circle(M+24, y+24, 12, 'F'); font('bold', 9, C.white); doc.text(String(idx+1), M+20, y+28);
        serif('bold', 15, C.ink); doc.text(wrap(sf(c.cluster, 'Career cluster'), 300).slice(0,1), M+46, y+24);
        pill(PW-M-78, y+24, score + '% cluster fit', score >= 80 ? C.green : C.orange, C.white);
        font('normal', 8.5, C.ink2); doc.text('Related careers: ' + sf(String(c.careerCount || 0), '—') + '  •  Interest code: ' + sf((c.dominantRiasec || []).join('-'), '—'), M+46, y+40);
        textBlock(sf(c.description || 'Profile-based broad career cluster to explore.', ''), M+46, y+57, CW-70, 8.5, C.ink2, 'normal', 11, 2);
        font('normal', 8, C.ink2); doc.text(wrap('Explore: ' + clusterSampleCareerText(c, 6), CW-70).slice(0,2), M+46, y+88);
        y += h + 11;
      });
    } else {
      insightBox('Career explorer not loaded', 'Career cluster recommendations will appear once career explorer data is available in the app.', C.blue, C.blueSoft);
    }

    // PAGE 7: ACTION PLAN
    addPage();
    pageHeader('06', 'Action Plan & Discussion '+tx('quiz.guide')+'', 'Move from report reading to real decisions with structured next steps.');
    const plans = [
      ['Week 1', 'Review the report with parents. Mark the top 3 stream or career options that feel worth exploring.'],
      ['Week 2', 'Open the career cards and check courses, entrance exams, colleges and daily work reality.'],
      ['Week 3', 'Compare subject difficulty, marks trend, preparation demand and backup options.'],
      ['Week 4', 'Finalize a preliminary direction and plan a counselor/mentor review.']
    ];
    const planW = (CW - 16) / 2, planH = 92;
    plans.forEach(function(p, i){
      const x = M + (i % 2) * (planW + 16), yy = y + Math.floor(i / 2) * (planH + 14), ac = palette[i % palette.length];
      card(x, yy, planW, planH, C.white, C.line); setFill(ac); rr(x, yy, planW, 4, 2, 'F');
      font('bold', 9, ac); doc.text(p[0].toUpperCase(), x+14, yy+24);
      textBlock(p[1], x+14, yy+45, planW-28, 9, C.ink2, 'normal', 13, 3);
    });
    y += (planH * 2) + 42;

    const prompts = [
      'What evidence supports this stream beyond marks alone?',
      'Which careers are exciting and realistic at the same time?',
      'What exam, subject or budget constraints may affect the choice?',
      'What skills should the student start building in the next 90 days?',
      'Which options are primary choices and which are safe backups?'
    ];
    card(M, y, CW, 154, C.amberSoft, C.line);
    font('bold', 11, C.amber); doc.text('Parent & Counselor Discussion Prompts', M+18, y+24);
    prompts.forEach(function(p, i){
      setFill(C.amber); doc.circle(M+22, y+48+i*18, 3, 'F');
      font('normal', 9.5, C.ink); doc.text(p, M+34, y+51+i*18);
    });
    y += 180;
    card(M, y, CW, 58, C.navy, C.navy);
    font('bold', 8.5, C.orange); doc.text('IMPORTANT NOTE', M+16, y+18);
    textBlock('This report is a decision-support tool, not a fixed verdict. Final stream and career decisions should combine assessment evidence with marks, subject comfort, parent context and informed exploration.', M+16, y+36, CW-32, 8.8, [195,210,234], 'normal', 12, 3);

    footer();
    const filename = (studentName.replace(/[^\w\-]+/g, '_') || 'student') + '_ViaNova_Premium_Report.pdf';
    doc.save(filename);
    try { if (SHEETS_URL && state.phone) sendToSheets({action:'logClientEvent', phone:state.phone, detail:'Premium PDF generated'}); } catch(e) {}
  } catch(err) {
    console.error(err);
    alert((err && err.message) ? err.message : 'Could not generate PDF.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = tx('pdf.generate'); }
  }
}

