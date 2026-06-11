/*
 * ViaNova split JS: 03-career-explorer.js
 * Career state, career normalization, filters, rendering, modal and career loading
 * Extracted from 01-app-core.js without changing logic.
 */

const CAREER_STATE = {
  all: [],
  filtered: [],
  category: '',
  loaded: false,
  options: {
    parentClusters: [],
    entranceExams: [],
    streamOptions: ['Science','Humanities','Arts','Commerce with Maths','Commerce without Maths'],
    hollandCodes: [],
    degreeDiplomas: []
  },
  filters: {
    parentCluster: '',
    entranceExam: '',
    stream: '',
    hollandCode: '',
    degree: ''
  }
};

const CAREER_THEME_BY_CATEGORY = {
  'Science': { bg: 'var(--sf-l)', fg: 'var(--sf)' },
  'Arts': { bg: 'var(--purple-l)', fg: 'var(--purple)' },
  'Commerce': { bg: 'var(--amber-l)', fg: 'var(--amber)' },
  'Humanities': { bg: 'var(--green-l)', fg: 'var(--green)' },
  'Recommended for you': { bg: 'var(--blue-l)', fg: 'var(--blue)' },
  'All careers': { bg: 'var(--cream-d)', fg: 'var(--ink)' }
};

function safeText(v, fallback) {
  const val = String(v == null ? '' : v).trim();
  return val || (fallback || '—');
}
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function slugifyCareer(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'career';
}
function splitList(value, maxItems) {
  return String(value || '')
    .split(/[;,]|\s\|\s|\n/g)
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, maxItems || 6);
}

function inferCareerCategory(streams, cluster, title, description) {
  const streamText = (Array.isArray(streams) ? streams.join(' ') : String(streams || '')).toLowerCase();
  if (streamText.includes('science')) return 'Science';
  if (streamText.includes('arts')) return 'Arts';
  if (streamText.includes('humanities')) return 'Humanities';
  if (streamText.includes('commerce')) return 'Commerce';
  const text = (cluster + ' ' + title + ' ' + description).toLowerCase();
  if (/(engineer|technology|software|data|computer|physics|chemistry|biology|medical|lab|science|environment)/.test(text)) return 'Science';
  if (/(design|creative|media|film|art|animation|fashion|music|graphic)/.test(text)) return 'Arts';
  if (/(finance|bank|commerce|account|tax|economics|audit|market|sales|business)/.test(text)) return 'Commerce';
  if (/(law|public|policy|social|teacher|education|journal|history|psychology|civil service|ngo|humanities)/.test(text)) return 'Humanities';
  return 'Recommended for you';
}
function scoreCareer(career) {
  const base = (career.title || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  let score = 50 + (base % 18);
  const profile = (state && state.assessmentProfile) || null;
  if (!profile) return Math.max(45, Math.min(98, score));
  const topRiasec = profile.topRiasec || [];
  const apt = profile.aptitudePct || {};
  const stream = (profile.recommendedStream || '').toLowerCase();
  const holland = String(career.hollandCode || '').toUpperCase();
  const text = [career.cluster, career.description, (career.skills||[]).join(' '), career.exams, career.degree].join(' ').toLowerCase();
  if (topRiasec.includes('I') && /(science|research|data|technology|engineer|doctor|analysis|lab|software|ai|medical)/.test(text)) score += 14;
  if (topRiasec.includes('A') && /(design|creative|media|animation|fashion|music|film|writing|art)/.test(text)) score += 14;
  if (topRiasec.includes('S') && /(teacher|counsel|psych|social|ngo|health|education|public service)/.test(text)) score += 14;
  if (topRiasec.includes('E') && /(business|management|marketing|sales|entrepreneur|commerce|finance)/.test(text)) score += 12;
  if (topRiasec.includes('C') && /(account|audit|bank|operations|administration|compliance)/.test(text)) score += 12;
  if (topRiasec.includes('R') && /(mechanic|technical|machine|field|construction|hardware|aviation)/.test(text)) score += 12;
  if ((apt.Numerical || 0) >= 70 && /(finance|economics|account|data|engineer|analytics|math)/.test(text)) score += 8;
  if ((apt.Logical || 0) >= 70 && /(software|engineering|law|analytics|strategy|ai|research)/.test(text)) score += 8;
  if ((apt.Spatial || 0) >= 70 && /(architect|design|animation|civil|interior|product)/.test(text)) score += 8;
  if ((apt.Verbal || 0) >= 70 && /(journal|law|teaching|marketing|media|content|psychology)/.test(text)) score += 8;
  if ((apt.Mechanical || 0) >= 70 && /(mechanic|automobile|manufacturing|industrial|technical|aviation)/.test(text)) score += 8;
  if (stream.includes('science') && String(career.category||'').toLowerCase()==='science') score += 10;
  if (stream.includes('commerce') && String(career.category||'').toLowerCase()==='commerce') score += 10;
  if ((stream.includes('humanities') || stream.includes('arts')) && ['arts','humanities'].includes(String(career.category||'').toLowerCase())) score += 10;
  if (holland && topRiasec.join('').includes(holland[0])) score += 4;
  return Math.max(45, Math.min(98, Math.round(score)));
}
function normaliseDelimitedValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function textMatchesNeedle(haystack, needle) {
  const h = String(haystack || '').toLowerCase();
  const n = String(needle || '').toLowerCase().trim();
  return !n || h.indexOf(n) !== -1;
}
function normaliseCareer(career, index) {
  const title = safeText(career.title || career.name || career.title_en || career.name_en || career['Career Title'] || career['Career'] || career['Profession'], tx('career.option'));
  const cluster = safeText(career.parentCluster || career.cluster || career.cluster_en || career.parentCluster_en || career['Broad Career Cluster'] || career['Parent Cluster'] || career['Career Cluster'], tx('career.cluster'));
  const description = safeText(career.description || career.description_en || career['Job Description'] || career['Overview'] || career['Description'], tx('career.noDesc'));
  const streams = Array.isArray(career.streams) ? career.streams.filter(Boolean) : splitList(career.streams || career.streamTags || career.stream || career['Stream'] || career['Eligible Stream'] || career['Recommended Stream'] || '', 8);
  const category = inferCareerCategory(streams, cluster, title, description);
  const score = career.matchScore ? Number(career.matchScore) : scoreCareer({ title, cluster, description, streams, category, skills: splitList(career.skills_en || career.skillsEn || career.skills || career['Core Skills Required'] || '', 8), exams: career.exams || career['Key Entrance Exams'], degree: career.degree || career['Recommended Degree / Program'], hollandCode: career.hollandCode || career['Holland Code'] });
  return {
    slug: slugifyCareer(title) + '-' + index,
    title,
    title_hi: career.title_hi || career.name_hi || career.titleHi || career.nameHi || career['title Hindi'] || career['name Hindi'] || career['Title Hindi'] || career['Career Hindi'] || '',
    title_en: career.title_en || career.name_en || career.titleEn || career.nameEn || title,
    cluster,
    cluster_hi: career.cluster_hi || career.parentCluster_hi || career.clusterHi || career.parentClusterHi || career['cluster Hindi'] || career['Parent Cluster Hindi'] || '',
    cluster_en: career.cluster_en || career.parentCluster_en || career.clusterEn || career.parentClusterEn || cluster,
    category,
    streams,
    specialization: safeText(career.specialization || career['Specific Specialization'], title),
    description,
    description_hi: career.description_hi || career.descriptionHi || career['description Hindi'] || career['Description Hindi'] || '',
    description_en: career.description_en || career.descriptionEn || description,
    skills_hi: career.skills_hi || career.skillsHi || career['skills Hindi'] || career['Skills Hindi'] || '',
    skills_en: career.skills_en || career.skillsEn || career.skills || career['Core Skills Required'] || '',
    skills: splitList(career.skills_en || career.skillsEn || career.skills || career['Core Skills Required'] || career.skills_hi || career.skillsHi || '', 6),
    education_hi: career.minimumEducation_hi || career.education_hi || career.minimumEducationHi || career.educationHi || career['education Hindi'] || career['Minimum Education Hindi'] || '',
    education_en: career.minimumEducation_en || career.education_en || career.minimumEducationEn || career.educationEn || career.minimumEducation || career.education || career['Minimum Education Required'] || '',
    education: safeText(career.minimumEducation_en || career.minimumEducationEn || career.minimumEducation || career.education || career['Minimum Education Required'] || career.minimumEducation_hi || career.education_hi, tx('career.educationFallback')), 
    degree_hi: career.degree_hi || career.degreeHi || career['degree Hindi'] || career['Degree Hindi'] || '',
    degree_en: career.degree_en || career.degreeEn || career.degree || career['Recommended Degree / Program'] || '',
    degree: safeText(career.degree_en || career.degreeEn || career.degree || career['Recommended Degree / Program'] || career.degree_hi || career.degreeHi, tx('career.degreeFallback')), 
    exams_hi: career.exams_hi || career.examsHi || career['exams Hindi'] || career['Entrance Exams Hindi'] || '',
    exams_en: career.exams_en || career.examsEn || career.exams || career['Key Entrance Exams'] || '',
    exams: safeText(career.exams_en || career.examsEn || career.exams || career['Key Entrance Exams'] || career.exams_hi || career.examsHi, tx('career.examsFallback')), 
    examList: splitList(career.exams, 20),
    degreeList: splitList(career.degree, 20),
    salary: [safeText(career.entrySalary, ''), safeText(career.midSalary, ''), safeText(career.seniorSalary, '')].filter(v => v && v !== '—').join(' → ') || tx('career.salaryFallback'),
    employers_hi: career.employers_hi || career.employersHi || career['employers Hindi'] || career['Employers Hindi'] || '',
    employers_en: career.employers_en || career.employersEn || career.employers || career['Typical Employers'] || '',
    employers: safeText(career.employers_en || career.employersEn || career.employers || career.employers_hi || career.employersHi, tx('career.employersFallback')),
    hollandCode: safeText(career.hollandCode || career['Holland Code'], ''),
    hollandTraits: splitList([career.hollandTrait1 || career['Holland Trait 1'], career.hollandTrait2 || career['Holland Trait 2'], career.hollandTrait3 || career['Holland Trait 3']].filter(Boolean).join('; '), 3),
    subjects: safeText(career.subjects || career['Subjects You Will Study'], ''),
    workEnvironment_hi: career.workEnvironment_hi || career.workEnvironmentHi || career['workEnvironment Hindi'] || career['Work Environment Hindi'] || '',
    workEnvironment_en: career.workEnvironment_en || career.workEnvironmentEn || career.workEnvironment || career['Job Environment / Work Setting'] || '',
    workEnvironment: safeText(career.workEnvironment_en || career.workEnvironmentEn || career.workEnvironment || career.workEnvironment_hi || career.workEnvironmentHi, tx('career.workEnvFallback')),
    careerPath_hi: career.careerPath_hi || career.careerPathHi || career['careerPath Hindi'] || career['Career Path Hindi'] || '',
    careerPath_en: career.careerPath_en || career.careerPathEn || career.careerPath || '',
    careerPath: safeText(career.careerPath_en || career.careerPathEn || career.careerPath || career.careerPath_hi || career.careerPathHi, tx('career.pathFallback')),
    workLifeBalance: safeText(career.workLifeBalance || career['Work-Life Balance'], 'Not specified'),
    jobStability: safeText(career.jobStability || career['Job Stability'], 'Not specified'),
    automationRisk: safeText(career.automationRisk || career['Automation / AI Risk'], 'Not specified'),
    internationalScope: safeText(career.internationalScope, 'Varies by specialization'),
    govtSchemes: safeText(isHindi() ? (career.govtSchemes_hi || career.govtSchemesHi || career.govtSchemes) : (career.govtSchemes_en || career.govtSchemesEn || career.govtSchemes), tx('career.schemeFallback')),
    trend: safeText(career.trend || career['Industry Trends & Future Outlook'], ''),
    score,
    emoji: career.emoji || pickCareerEmoji(title, category),
    theme: CAREER_THEME_BY_CATEGORY[category] || CAREER_THEME_BY_CATEGORY['Recommended for you']
  };
}
function pickCareerEmoji(title, category) {
  const text = String(title || '').toLowerCase();
  if (text.includes('data')) return '📊';
  if (text.includes('design')) return '🎨';
  if (text.includes('architect')) return '🏛️';
  if (text.includes('psych')) return '🧠';
  if (text.includes('market')) return '📣';
  if (text.includes('journal')) return '📰';
  if (text.includes('aero') || text.includes('space')) return '✈️';
  if (text.includes('game')) return '🎮';
  if (text.includes('law')) return '⚖️';
  if (text.includes('doctor') || text.includes('health')) return '🩺';
  if (text.includes('teacher')) return '📚';
  if (text.includes('engineer') || text.includes('software') || text.includes('ai')) return '🤖';
  return ({'Science':'🔬','Arts':'🎨','Commerce':'💼','Humanities':'📚','Recommended for you':'⭐'})[category] || '💼';
}
function getCareerTags(career) {
  return localizedCareerTags(career);
}
function careerSubtitle(career) {
  return localizedCareerSubtitle(career);
}

function getCareerWhyFit(career) {
  const profile = state.assessmentProfile || {};
  const reasons = [];
  const topRi = profile.topRiasec || [];
  const topApt = profile.topAptitude || [];
  const topTraits = profile.topTraits || [];
  const topVals = profile.topValues || [];
  const text = [career.title, career.cluster, career.description, career.exams, career.degree, (career.skills||[]).join(' '), (career.streams||[]).join(' ')].join(' ').toLowerCase();
  if (topRi.some(k => /I|R/.test(k)) && /(engineer|tech|research|data|science|lab|medical|robot|software|analysis)/.test(text)) reasons.push('your interest profile leans investigative/practical');
  if (topRi.some(k => /A|S/.test(k)) && /(design|psych|teacher|media|social|journal|writer|art|architecture)/.test(text)) reasons.push('your interests include creative or people-facing themes');
  if (topRi.some(k => /E|C/.test(k)) && /(business|finance|bank|manager|marketing|commerce|analyst|operations)/.test(text)) reasons.push('your profile supports structured or enterprising work');
  if (topApt.some(k => /Numerical|Logical/.test(k)) && /(engineer|finance|data|account|analytics|bank|consult)/.test(text)) reasons.push('your stronger aptitude areas support analytical demands');
  if (topApt.some(k => /Verbal/.test(k)) && /(law|journal|teacher|psych|media|civil service|content)/.test(text)) reasons.push('your verbal strength can help in communication-heavy roles');
  if (topApt.some(k => /Mechanical|Spatial/.test(k)) && /(mechanic|architect|aviation|design|engineer|machinist|technical)/.test(text)) reasons.push('your spatial or mechanical ability fits practical design/technical work');
  if (topTraits.some(k => /O|C/.test(k))) reasons.push('your personality suggests you can handle learning depth and structured preparation');
  if (topVals.length) reasons.push('the role can be checked against what matters most to you at work');
  if (!reasons.length) reasons.push('the role matches one or more themes in your current profile');
  return 'This career is worth exploring because ' + reasons.slice(0,2).join(' and ') + '.';
}
function getCareerNextAction(career) {
  const stream = (career.streams && career.streams[0]) || 'this pathway';
  if (career.score >= 85) return 'Treat this as a priority option. Compare it with your stream fit, subjects required, and entrance pathway.';
  if (career.score >= 70) return 'Shortlist this with 2–3 similar careers and compare skills, entrances, and study demands.';
  return 'Keep this as an explore option. Read the pathway, then compare it with stronger-fit roles before deciding.';
}
function renderQuestUi() {
  const qp = ensureQuestProgressShape();
  const fill = Math.max(0, Math.min(100, (getQuestXpIntoLevel(qp.xp) / 250) * 100));
  const levelValue = document.getElementById('quest-level-value');
  const levelCopy = document.getElementById('quest-level-copy');
  const fillEl = document.getElementById('quest-xp-fill');
  const xpMeta = document.getElementById('quest-xp-meta');
  const badgeMeta = document.getElementById('quest-badge-meta');
  const nextMeta = document.getElementById('quest-next-meta');
  const focusBurst = document.getElementById('focus-burst');
  const reportCoverLevel = document.getElementById('report-cover-level');
  const hookLevel = document.getElementById('hook-chip-level');
  if (levelValue) levelValue.textContent = 'Level ' + qp.level + ' • ' + qp.xp + ' XP';
  if (levelCopy) levelCopy.textContent = qp.lastReward ? ('Latest unlock: ' + qp.lastReward + '. Keep going to improve personalization, not just visuals.') : 'Complete assessments to climb levels, unlock badges, and make the platform feel more personalised.';
  if (fillEl) fillEl.style.width = fill + '%';
  if (xpMeta) xpMeta.textContent = getQuestXpIntoLevel(qp.xp) + ' / 250 XP in this level';
  if (badgeMeta) badgeMeta.textContent = (qp.badges || []).length + ' badges unlocked';
  if (nextMeta) nextMeta.textContent = getQuestXpToNextLevel(qp.xp) + ' XP to next level';
  if (focusBurst) focusBurst.textContent = 'Level ' + qp.level;
  if (reportCoverLevel) reportCoverLevel.textContent = 'Level ' + qp.level;
  if (hookLevel) hookLevel.textContent = '⭐ Level ' + qp.level;
}
function renderStudentHook() {
  const ov = document.getElementById('student-hook-overlay');
  if (!ov || !state.loggedIn) return;
  const done = (state.completedTests || []).length;
  const first = (state.name || 'Student').split(' ')[0];
  const profile = state.assessmentProfile || {};
  const title = document.getElementById('hook-title');
  const copy = document.getElementById('hook-copy');
  const classChip = document.getElementById('hook-chip-class');
  const streamChip = document.getElementById('hook-chip-stream');
  const sideValue = document.getElementById('hook-side-value');
  const sideCopy = document.getElementById('hook-side-copy');
  const list = document.getElementById('hook-mini-list');
  if (title) title.textContent = 'Welcome ' + first + '. Your next smart move starts here.';
  if (copy) copy.textContent = done ? 'You have already built some signal. Use this launchpad to continue the next assessment or move into comparison and report mode.' : 'Before the dashboard, this quick launch screen points you toward the best first step for your current class and progress.';
  if (classChip) classChip.textContent = '🎓 Class ' + (state.cls || '—') + ' • ' + (state.board || 'Board');
  if (streamChip) streamChip.textContent = '🧭 ' + (profile.recommendedStream ? ('Top stream: ' + profile.recommendedStream) : 'Stream fit pending');
  if (sideValue) sideValue.textContent = done >= 4 ? 'Decision Stage' : done >= 2 ? 'Momentum Stage' : 'Explorer Stage';
  if (sideCopy) sideCopy.textContent = done >= 4 ? 'Your profile is strong enough for report, comparison mode, and a counselor conversation.' : done >= 1 ? 'A few more modules will make the output feel much more personal and useful.' : 'Start with the first quest so the app can stop behaving like a generic brochure.';
  if (list) {
    const items = done >= 4 ? [
      'Open the premium report summary.',
      'Compare your top stream options.',
      'Use the PDF with parents or a counselor.'
    ] : done >= 1 ? [
      'Complete the next best assessment.',
      'Watch your stream recommendation sharpen.',
      'Shortlist careers once fit reasons appear.'
    ] : [
      'Start with Interest Quest.',
      'Build confidence with Aptitude next.',
      'Unlock a parent-ready report.'
    ];
    list.innerHTML = items.map((t,i)=>'<div class="hook-mini-item"><div class="hook-mini-bullet">' + (i+1) + '</div><div>' + escapeHtml(t) + '</div></div>').join('');
  }
  try {
    const key = 'ps_hook_seen_' + (state.phone || 'guest') + '_' + new Date().toISOString().slice(0,10);
    if (!sessionStorage.getItem(key)) {
      ov.classList.add('open');
      sessionStorage.setItem(key, '1');
    }
  } catch(e) { ov.classList.add('open'); }
}
function dismissStudentHook(target) {
  const ov = document.getElementById('student-hook-overlay');
  if (ov) ov.classList.remove('open');
  if (target) showScreen(target);
}
function renderStickyMobileCta() {
  const copy = document.getElementById('sticky-mobile-copy');
  const btn = document.getElementById('sticky-mobile-btn');
  const done = (state.completedTests || []).length;
  if (copy) copy.textContent = done >= 4 ? 'Your full report is ready. Compare paths or open the PDF.' : done >= 1 ? 'Keep the momentum going. Finish the next quest for a sharper report.' : 'Start with your first quest to unlock personalized recommendations.';
  if (btn) {
    btn.textContent = done >= 4 ? 'Open report' : done >= 1 ? 'Continue quest' : 'Start now';
    btn.setAttribute('onclick', done >= 4 ? "showScreen('report')" : "showScreen('assess')");
  }
}
function renderComparisonMode() {
  const grid = document.getElementById('stream-compare-grid');
  const mistakes = document.getElementById('roadmap-mistakes-list');
  const streams = (state.assessmentProfile && state.assessmentProfile.streams) || [];
  if (!grid) return;
  if (!streams.length) {
    grid.innerHTML = '<div class="compare-card"><div class="compare-top"><div class="compare-name">Complete assessments</div><div class="compare-badge">Locked</div></div><div class="story-copy">This space compares fit, effort, and examples after enough assessment data is available.</div></div>';
  } else {
    grid.innerHTML = streams.slice(0,3).map(function(s, idx){
      const effort = s.score >= 82 ? 'Feels aligned' : s.score >= 68 ? 'Needs validation' : 'Explore carefully';
      const careers = guessStreamCareers(s.name).slice(0,3).join(', ');
      const caution = idx === 0 ? 'Still compare with marks and subject comfort.' : 'Treat this as an alternative, not an automatic rejection.';
      return '<div class="compare-card"><div class="compare-top"><div class="compare-name">' + escapeHtml(s.name) + '</div><div class="compare-badge">' + (idx===0 ? 'Best fit' : 'Alternative') + '</div></div><div class="compare-metric"><span>Match score</span><strong>' + s.score + '%</strong></div><div class="compare-metric"><span>Decision read</span><strong>' + escapeHtml(effort) + '</strong></div><div class="compare-metric"><span>Typical directions</span><strong style="text-align:right;max-width:60%;">' + escapeHtml(careers) + '</strong></div><div class="compare-metric"><span>Keep in mind</span><strong style="text-align:right;max-width:60%;">' + escapeHtml(caution) + '</strong></div></div>';
    }).join('');
  }
  if (mistakes) {
    const cls = String(state.cls || '');
    const items = [
      'Do not choose only by marks. A stream decision is stronger when interest, aptitude, and motivation agree.',
      'Do not assume popular streams are always better. Pathways, entrance exams, and career satisfaction matter too.',
      cls === '10' ? 'For Class 10, compare subject comfort now, not just a dream job later.' : 'Keep checking whether today’s academic choices still support tomorrow’s options.'
    ];
    mistakes.innerHTML = items.map(function(t){ return '<div class="mistake-item"><div class="mistake-dot">!</div><div>' + escapeHtml(t) + '</div></div>'; }).join('');
  }
}
function guessStreamCareers(streamName) {
  const s = String(streamName || '').toLowerCase();
  if (s.includes('science')) return ['Engineering','Research','Medicine'];
  if (s.includes('commerce')) return ['Finance','Business','Analytics'];
  if (s.includes('humanities') || s.includes('arts')) return ['Psychology','Law','Design'];
  return ['Skilled trades','Applied tech','Entrepreneurship'];
}
function handleCounselorCta() {
  const done = (state.completedTests || []).length;
  if (done < 4) {
    alert('Complete all 4 assessments first so a counselor conversation can be specific and useful.');
    showScreen('assess');
    return;
  }
  alert('Next step: use the PDF report, shortlist 3 careers, and discuss stream fit, entrance plan, and strengths with a counselor or mentor.');
}

function getQuestLevelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.max(1, Math.floor(safeXp / 250) + 1);
}
function getQuestXpIntoLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return safeXp % 250;
}
function getQuestXpToNextLevel(xp) {
  return 250 - getQuestXpIntoLevel(xp);
}
function ensureQuestProgressShape() {
  const qp = Object.assign({ xp: 0, level: 1, badges: [], lastReward: '' }, state.questProgress || {});
  qp.xp = Math.max(0, Number(qp.xp) || 0);
  qp.level = getQuestLevelFromXp(qp.xp);
  if (!Array.isArray(qp.badges)) qp.badges = [];
  state.questProgress = qp;
  return qp;
}
function saveQuestProgress() {
  ensureQuestProgressShape();
  try {
    const saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
    saved.questProgress = state.questProgress;
    saved.completedTests = state.completedTests || saved.completedTests || [];
    saved.assessmentResults = state.assessmentResults || saved.assessmentResults || {};
    localStorage.setItem('ps_session', JSON.stringify(saved));
  } catch(e) {}
}
function awardQuestXp(amount, badgeKey, rewardLabel) {
  const qp = ensureQuestProgressShape();
  const beforeLevel = qp.level;
  qp.xp += Math.max(0, Number(amount) || 0);
  qp.level = getQuestLevelFromXp(qp.xp);
  if (badgeKey && !qp.badges.includes(badgeKey)) qp.badges.push(badgeKey);
  if (rewardLabel) qp.lastReward = rewardLabel;
  saveQuestProgress();
  return { gained: amount, levelUp: qp.level > beforeLevel, level: qp.level, xp: qp.xp, next: getQuestXpToNextLevel(qp.xp) };
}

function assessmentDisplayName(testId) {
  return ({interest:'Interest (RIASEC)', aptitude:'Aptitude', personality:'Personality (Big Five)', values:'Work Values'})[testId] || testId;
}
function formatAssessmentSummary(testId, result) {
  result = result || {};
  if (testId === 'interest') return 'Top code: ' + ((result.topRiasec || []).slice(0,2).join('-') || '—');
  if (testId === 'aptitude') return 'Strongest area: ' + (((result.topAptitude || [])[0]) || '—');
  if (testId === 'personality') return 'Top trait: ' + (((result.topTraits || [])[0]) || '—');
  if (testId === 'values') return 'Top value: ' + (((result.topValues || [])[0]) || '—');
  return 'Score: ' + (result.score || 0) + '%';
}

function getAssessmentStory(testId, result) {
  result = result || {};
  const lang = (typeof currentLang === 'function' ? currentLang() : (state && state.lang) || 'en');
  const hi = lang === 'hi';
  if (testId === 'interest') {
    const top = (result.topRiasec || []).slice(0, 2).join('-') || '—';
    const mapEn = {
      R: 'practical, hands-on and tool-oriented learning',
      I: 'research, analysis and problem-solving',
      A: 'creative expression, design and originality',
      S: 'helping, teaching and people-facing work',
      E: 'leadership, business and persuasion',
      C: 'structure, planning and detail-oriented work'
    };
    const mapHi = {
      R: 'व्यावहारिक, हाथों से सीखने और टूल-आधारित काम',
      I: 'रिसर्च, विश्लेषण और समस्या समाधान',
      A: 'रचनात्मकता, डिजाइन और नए विचार',
      S: 'लोगों की मदद, शिक्षण और संवाद-आधारित काम',
      E: 'लीडरशिप, बिज़नेस और प्रभाव डालने की क्षमता',
      C: 'संरचना, योजना और विवरण पर ध्यान'
    };
    const first = (result.topRiasec || [])[0];
    return hi
      ? 'आपका रुचि पैटर्न ' + top + ' की ओर संकेत करता है। इसका मतलब है कि आपको ' + ((mapHi[first] || 'अपनी रुचि से जुड़े काम') ) + ' वाले क्षेत्रों को गंभीरता से explore करना चाहिए।'
      : 'Your interest pattern points toward ' + top + '. This means you should seriously explore pathways connected with ' + ((mapEn[first] || 'your strongest interest area')) + '.';
  }
  if (testId === 'aptitude') {
    const top = (result.topAptitude || [])[0] || '—';
    return hi
      ? 'आपका सबसे मजबूत aptitude area ' + top + ' दिख रहा है। Stream और career चुनते समय इसे marks, subject comfort और entrance exam requirements के साथ मिलाकर देखें।'
      : 'Your strongest aptitude area currently appears to be ' + top + '. Use this together with marks, subject comfort, and entrance-exam requirements before making a stream or career choice.';
  }
  if (testId === 'personality') {
    const top = (result.topTraits || [])[0] || '—';
    const labelsHi = {O:'Openness / नए विचारों के लिए openness', C:'Conscientiousness / planning और discipline', E:'Extraversion / social energy', A:'Agreeableness / cooperation', N:'Emotional Reactivity / emotional sensitivity'};
    const labelsEn = {O:'Openness', C:'Conscientiousness', E:'Extraversion', A:'Agreeableness', N:'Emotional Reactivity'};
    return hi
      ? 'आपकी personality में ' + (labelsHi[top] || top) + ' प्रमुख दिखता है। इसका उपयोग career environment चुनने में करें — जैसे structured, creative, people-facing या independent work setting।'
      : 'Your personality profile is led by ' + (labelsEn[top] || top) + '. Use this to choose the right career environment, such as structured, creative, people-facing, or independent work settings.';
  }
  if (testId === 'values') {
    const top = (result.topValues || [])[0] || '—';
    return hi
      ? 'आपके लिए काम में ' + top + ' महत्वपूर्ण दिखता है। Long-term satisfaction के लिए केवल salary या popularity नहीं, बल्कि इन values से match भी ज़रूरी है।'
      : 'Your work-values profile highlights ' + top + '. For long-term satisfaction, do not judge careers only by salary or popularity; check whether the work matches these values.';
  }
  return hi
    ? 'यह assessment आपके overall career profile को और स्पष्ट बनाता है।'
    : 'This assessment adds another layer to your overall career profile.';
}

function assessmentCareerMatch(testId, career, result) {
  let score = career.score || 50;
  const text = [career.title, career.cluster, career.description, career.exams, career.degree, (career.skills||[]).join(' '), (career.streams||[]).join(' ')].join(' ').toLowerCase();
  if (testId === 'interest') {
    const top = result.topRiasec || [];
    if (top.includes('I') && /(science|research|data|technology|engineer|doctor|analysis|lab|software|ai|medical)/.test(text)) score += 18;
    if (top.includes('A') && /(design|creative|media|animation|fashion|music|film|writing|art|ux|graphic)/.test(text)) score += 18;
    if (top.includes('S') && /(teacher|counsel|psych|social|ngo|health|education|public service)/.test(text)) score += 18;
    if (top.includes('E') && /(business|management|marketing|sales|entrepreneur|commerce|finance)/.test(text)) score += 16;
    if (top.includes('C') && /(account|audit|bank|operations|administration|compliance)/.test(text)) score += 16;
    if (top.includes('R') && /(mechanic|technical|machine|field|construction|hardware|aviation)/.test(text)) score += 16;
  } else if (testId === 'aptitude') {
    const pct = result.pct || {};
    if ((pct.Numerical || 0) >= 70 && /(finance|economics|account|data|engineer|analytics|math|statistic)/.test(text)) score += 20;
    if ((pct.Logical || 0) >= 70 && /(software|engineering|law|analytics|strategy|ai|research)/.test(text)) score += 20;
    if ((pct.Spatial || 0) >= 70 && /(architect|design|animation|civil|interior|product)/.test(text)) score += 20;
    if ((pct.Verbal || 0) >= 70 && /(journal|law|teaching|marketing|media|content|psychology)/.test(text)) score += 20;
    if ((pct.Mechanical || 0) >= 70 && /(mechanic|automobile|manufacturing|industrial|technical|aviation)/.test(text)) score += 20;
  } else if (testId === 'personality') {
    const pct = result.pct || {};
    if ((pct.O || 0) >= 70 && /(design|research|innovation|product|strategy|creative|architecture)/.test(text)) score += 16;
    if ((pct.C || 0) >= 70 && /(account|operations|project|compliance|audit|admin|planning)/.test(text)) score += 16;
    if ((pct.E || 0) >= 70 && /(marketing|sales|management|public|media|entrepreneur|client)/.test(text)) score += 16;
    if ((pct.A || 0) >= 70 && /(teacher|psych|counsel|social|health|education|hr)/.test(text)) score += 16;
    if ((pct.N || 0) <= 45 && /(lead|management|field|client|high pressure|sales|entrepreneur)/.test(text)) score += 10;
  } else if (testId === 'values') {
    const top = result.topValues || [];
    if (top.some(v => /achievement/i.test(v)) && /(research|doctor|engineer|law|founder|consult)/.test(text)) score += 16;
    if (top.some(v => /independence/i.test(v)) && /(design|writer|entrepreneur|consult|freelance|architect)/.test(text)) score += 16;
    if (top.some(v => /recognition/i.test(v)) && /(media|marketing|management|law|entrepreneur)/.test(text)) score += 16;
    if (top.some(v => /relationship|support/i.test(v)) && /(teacher|psych|doctor|nurse|social|hr|counsel)/.test(text)) score += 16;
    if (top.some(v => /working conditions/i.test(v)) && /(government|bank|operations|compliance|administration)/.test(text)) score += 16;
  }
  return Math.round(score);
}
function getAssessmentCareerRecommendations(testId, result) {
  if (!CAREER_STATE.all || !CAREER_STATE.all.length || !result) return [];
  return CAREER_STATE.all.slice()
    .map(c => Object.assign({}, c, { assessmentScore: assessmentCareerMatch(testId, c, result) }))
    .sort((a, b) => b.assessmentScore - a.assessmentScore)
    .slice(0, 3);
}
function getActiveCareerFilters() {
  return {
    parentCluster: normaliseDelimitedValue(document.getElementById('career-parent-cluster')?.value),
    entranceExam: normaliseDelimitedValue(document.getElementById('career-entrance-exam')?.value),
    stream: normaliseDelimitedValue(document.getElementById('career-stream-filter')?.value),
    hollandCode: normaliseDelimitedValue(document.getElementById('career-holland-code')?.value),
    degree: normaliseDelimitedValue(document.getElementById('career-degree-filter')?.value)
  };
}
function careerMatchesCategory(career, category) {
  if (!category || category === 'Recommended for you') return true;
  if (category === 'Commerce') return career.streams.some(s => /commerce/i.test(s));
  return career.streams.some(s => s.toLowerCase() === category.toLowerCase()) || career.category === category;
}
function careerMatchesFilters(career, filters) {
  if (filters.parentCluster && career.cluster.toLowerCase() !== filters.parentCluster.toLowerCase()) return false;
  if (filters.entranceExam && !career.examList.some(x => x.toLowerCase() === filters.entranceExam.toLowerCase()) && !textMatchesNeedle(career.exams, filters.entranceExam)) return false;
  if (filters.stream && !career.streams.some(x => x.toLowerCase() === filters.stream.toLowerCase())) return false;
  if (filters.hollandCode && career.hollandCode.toLowerCase() !== filters.hollandCode.toLowerCase()) return false;
  if (filters.degree && !career.degreeList.some(x => x.toLowerCase() === filters.degree.toLowerCase()) && !textMatchesNeedle(career.degree, filters.degree)) return false;
  return true;
}
function populateCareerFilterOptions() {
  const map = [
    ['career-parent-cluster-list', CAREER_STATE.options.parentClusters],
    ['career-entrance-exam-list', CAREER_STATE.options.entranceExams],
    ['career-holland-code-list', CAREER_STATE.options.hollandCodes],
    ['career-degree-filter-list', CAREER_STATE.options.degreeDiplomas]
  ];
  map.forEach(function(item) {
    const el = document.getElementById(item[0]);
    if (!el) return;
    el.innerHTML = item[1].map(v => '<option value="' + escapeHtml(v) + '"></option>').join('');
  });
}
function updateCareerFilterSummary(total, shown) {
  const el = document.getElementById('career-filter-summary');
  if (!el) return;
  const active = [];
  if (CAREER_STATE.category && CAREER_STATE.category !== 'Recommended for you') active.push(CAREER_STATE.category);
  Object.entries(CAREER_STATE.filters).forEach(([k,v]) => { if (v) active.push(v); });
  el.textContent = active.length
    ? 'Showing ' + shown + ' of ' + total + ' careers for: ' + active.join(' • ')
    : 'Showing all careers, sorted by best match.';
}
function renderTopCareerPicks() {
  const wrap = document.getElementById('top-career-picks');
  if (!wrap) return;
  const picks = CAREER_STATE.all.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  if (!picks.length) {
    wrap.innerHTML = '<div class="career-preview"><div class="career-icon" style="background:var(--cream-d);">📭</div><div style="flex:1;"><div class="career-name">' + tx('career.noFound') + '</div><div class="career-field">' + tx('career.noBackend') + '</div></div><div class="fit-bar"><div class="fit-pct">--</div><div class="fit-track"><div class="fit-fill" style="width:0%"></div></div></div></div>';
    return;
  }
  wrap.innerHTML = picks.map(career => `
    <div class="career-preview" onclick="openModal('${career.slug}')">
      <div class="career-icon" style="background:${career.theme.bg};">${career.emoji}</div>
      <div style="flex:1;">
        <div class="career-name">${escapeHtml(localizedCareerTitle(career))}</div>
        <div class="career-field">${escapeHtml(careerSubtitle(career).toLowerCase())}</div>
        <div class="fit-why"><strong>${tx('career.why')}</strong>${escapeHtml(getCareerWhyFit(career))}</div>
      </div>
      <div class="fit-bar">
        <div class="fit-pct">${career.score}%</div>
        <div class="fit-track"><div class="fit-fill" style="width:${career.score}%"></div></div>
      </div>
    </div>
  `).join('');
}
function renderCareerGrid() {
  const grid = document.getElementById('career-grid');
  if (!grid) return;
  const activeCat = CAREER_STATE.category;
  const filters = CAREER_STATE.filters;
  const careers = CAREER_STATE.all
    .filter(c => careerMatchesCategory(c, activeCat))
    .filter(c => careerMatchesFilters(c, filters))
    .sort((a, b) => b.score - a.score);
  CAREER_STATE.filtered = careers;
  updateCareerFilterSummary(CAREER_STATE.all.length, careers.length);
  if (!careers.length) {
    grid.innerHTML = '<div class="career-card"><div class="career-card-header" style="background:var(--cream-d);">📭</div><div class="career-card-body"><div class="career-card-name">'+tx('career.noAvailable')+'</div><div class="career-card-sector">'+tx('career.noMatched')+'</div><div class="career-card-tags"><span class="career-tag" style="background:var(--cream-d);color:var(--ink-s);">'+tx('career.tryAnother')+'</span></div></div><div class="career-card-footer"><span class="match-score">--</span><span style="font-size:12px;color:var(--ink-s);">'+tx('career.viewCard')+'</span></div></div>';
    return;
  }
  grid.innerHTML = careers.map(career => {
    const tags = getCareerTags(career);
    return `
      <div class="career-card" data-cat="${escapeHtml(career.category)}" onclick="openModal('${career.slug}')">
        <div class="career-card-header" style="background:${career.theme.bg};">${career.emoji}</div>
        <div class="career-card-body">
          <div class="career-card-name">${escapeHtml(localizedCareerTitle(career))}</div>
          <div class="career-card-sector">${escapeHtml(careerSubtitle(career))}</div>
          <div class="career-card-tags">
            ${tags.map((tag, idx) => `<span class="career-tag" style="background:${idx === 0 ? career.theme.bg : idx === 1 ? 'var(--green-l)' : 'var(--cream-d)'};color:${idx === 0 ? career.theme.fg : idx === 1 ? 'var(--green)' : 'var(--ink-m)'};">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="fit-why"><strong>${tx('career.why')}</strong>${escapeHtml(getLocalizedCareerWhyFit(career))}<div class="fit-match-meter"><div class="fit-match-fill" style="width:${career.score}%"></div></div></div>
        </div>
        <div class="career-card-footer"><span class="match-score">${tx('career.match', { score: career.score })}</span><span style="font-size:12px;color:var(--ink-s);">${career.score >= 80 ? tx('career.highFit') : career.score >= 65 ? tx('career.worth') : tx('career.care')}</span></div>
      </div>`;
  }).join('');
}
function renderCareerContent() {
  renderTopCareerPicks();
  renderCareerGrid();
}
function openCareerModalBySlug(slug) {
  const career = CAREER_STATE.all.find(c => c.slug === slug);
  if (!career) return;
  const overlay = document.getElementById('career-modal-overlay');
  if (!overlay) return;
  document.getElementById('career-modal-emoji').textContent = career.emoji;
  document.getElementById('career-modal-title').textContent = localizedCareerTitle(career);
  setCareerModalSectionLabels();
  document.getElementById('career-modal-sector').textContent = careerSubtitle(career);
  document.getElementById('career-modal-description').textContent = localizedCareerLongField(career, 'description', 'career.noDesc');
  document.getElementById('career-modal-salary').textContent = isHindi() ? tx('career.salaryFallback') : career.salary;
  document.getElementById('career-modal-work-env').textContent = localizedCareerLongField(career, 'workEnvironment', 'career.workEnvFallback');
  document.getElementById('career-modal-employers').textContent = localizedCareerLongField(career, 'employers', 'career.employersFallback');
  document.getElementById('career-modal-path').textContent = localizedCareerLongField(career, 'careerPath', 'career.pathFallback');
  const fitWhyEl = document.getElementById('career-modal-fit-why');
  if (fitWhyEl) fitWhyEl.innerHTML = '<strong>' + tx('career.why') + '</strong>' + escapeHtml(getLocalizedCareerWhyFit(career));
  const nextActionEl = document.getElementById('career-modal-next-action');
  if (nextActionEl) nextActionEl.textContent = getLocalizedCareerNextAction(career);

  const skills = document.getElementById('career-modal-skills');
  const skillList = localizeCareerList(career, 'skills', career.skills && career.skills.length ? career.skills : ['Communication', 'Problem solving']);
  skills.innerHTML = skillList.map(skill => `<span class="skill-pill">${escapeHtml(skill)}</span>`).join('');

  const pathwayItems = [
      localizedCareerLongField(career, 'education', 'career.educationFallback'),
      localizedCareerLongField(career, 'degree', 'career.degreeFallback'),
      localizedCareerLongField(career, 'exams', 'career.examsFallback')
    ]
    .filter(Boolean)
    .slice(0, 3)
    .map((text, idx) => `<div class="pathway-step"><div class="step-num">${idx + 1}</div><div class="step-text">${escapeHtml(text)}</div></div>`);
  document.getElementById('career-modal-pathway').innerHTML = pathwayItems.join('');

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCareerModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const overlay = document.getElementById('career-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
function openModal(id) {
  openCareerModalBySlug(id);
}
function closeModal(id, event) {
  closeCareerModal(event);
}
function setCareerFilter(category) {
  CAREER_STATE.category = category || '';
  document.querySelectorAll('#career-filter-row .filter-chip').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.cat || btn.textContent.trim()) === CAREER_STATE.category);
  });
  renderCareerGrid();
}
function toggleChip(el) {
  setCareerFilter(el.dataset.cat || el.textContent.trim());
}
function handleCareerFilterChange() {
  CAREER_STATE.filters = getActiveCareerFilters();
  renderCareerGrid();
}
function clearCareerFilters() {
  ['career-parent-cluster','career-entrance-exam','career-stream-filter','career-holland-code','career-degree-filter'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  CAREER_STATE.filters = getActiveCareerFilters();
  renderCareerGrid();
}
function loadCareersFromServer() {
  return new Promise(function(resolve, reject) {
    if (!SHEETS_URL) {
      reject(new Error('Apps Script URL not configured.'));
      return;
    }
    jsonpGet(SHEETS_URL, { action: 'getCareers' }, function(err, data) {
      if (err) { reject(new Error(err)); return; }
      if (!data || data.status !== 'ok' || !Array.isArray(data.careers)) {
        reject(new Error((data && data.message) || 'Career data could not be loaded.'));
        return;
      }
      resolve(data);
    });
  });
}
async function initCareerData() {
  try {
    const payload = await loadCareersFromServer();
    const careers = payload.careers || [];
    CAREER_STATE.options.parentClusters = (payload.filters && payload.filters.parentClusters) || [];
    CAREER_STATE.options.entranceExams = (payload.filters && payload.filters.entranceExams) || [];
    CAREER_STATE.options.hollandCodes = (payload.filters && payload.filters.hollandCodes) || [];
    CAREER_STATE.options.degreeDiplomas = (payload.filters && payload.filters.degreeDiplomas) || [];
    CAREER_STATE.all = careers.map(normaliseCareer).filter(c => c.title && c.title !== 'Career Option');
    CAREER_STATE.loaded = true;
    populateCareerFilterOptions();
    renderCareerContent();
  } catch (err) {
    console.warn('Career data load failed:', err.message);
    const grid = document.getElementById('career-grid');
    const picks = document.getElementById('top-career-picks');
    if (picks) {
      picks.innerHTML = '<div class="career-preview"><div class="career-icon" style="background:var(--cream-d);">⚠️</div><div style="flex:1;"><div class="career-name">Career cards not loaded</div><div class="career-field">' + escapeHtml(err.message) + '</div></div><div class="fit-bar"><div class="fit-pct">--</div><div class="fit-track"><div class="fit-fill" style="width:0%"></div></div></div></div>';
    }
    if (grid) {
      grid.innerHTML = '<div class="career-card"><div class="career-card-header" style="background:var(--cream-d);">⚠️</div><div class="career-card-body"><div class="career-card-name">Unable to load careers</div><div class="career-card-sector">' + escapeHtml(err.message) + '</div><div class="career-card-tags"><span class="career-tag" style="background:var(--cream-d);color:var(--ink-s);">Check backend setup</span></div></div><div class="career-card-footer"><span class="match-score">--</span><span style="font-size:12px;color:var(--ink-s);">'+tx('career.viewCard')+'</span></div></div>';
    }
  }
}


// ── Quiz definitions (maps to Code.gs test_id values) ─────
