// ─────────────────────────────────────────────────────────────
// FINAL REPORT FORMAT + SIDEBAR LANGUAGE PATCH
// Uses the uploaded 7-page premium report structure for both English and Hindi.
// Keeps layout identical; only swaps content language.
// ─────────────────────────────────────────────────────────────
(function vianovaFinalReportAndShellPatch(){
  function currentLang(){
    try { if (window.AppState && AppState.lang) return AppState.lang; } catch(e){}
    try { if (localStorage.getItem('vianova_lang')) return localStorage.getItem('vianova_lang'); } catch(e){}
    try { if (localStorage.getItem('vn_lang')) return localStorage.getItem('vn_lang'); } catch(e){}
    return 'en';
  }
  function isHi(){ return String(currentLang()).toLowerCase().slice(0,2) === 'hi'; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pct(v){ var n = Number(v); if(!isFinite(n)) n = 0; if(n <= 1 && n > 0) n = n*100; return Math.max(0, Math.min(100, Math.round(n))); }
  function objPct(o){ return (o && (o.pct || o.percent || o.scores || o.score || o)) || {}; }
  function byValue(o){ return Object.keys(o||{}).sort(function(a,b){ return Number(o[b]||0) - Number(o[a]||0); }); }
  function safeState(){ try { return window.state || state || {}; } catch(e){ return window.state || {}; } }
  function val(o, keys){
    if(!o) return '';
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(o[k] != null && o[k] !== '') return o[k];
    }
    return '';
  }
  function raw(c, base){
    if(!c) return '';
    var lang = isHi() ? 'hi' : 'en';
    var keys = [];
    if(lang === 'hi') keys.push(base+'_hi', base+'Hi', base+'_hindi', base+'Hindi', 'hi_'+base);
    keys.push(base, base+'_en', base+'En', 'en_'+base);
    for(var i=0;i<keys.length;i++){
      var k=keys[i];
      if(c[k] != null && c[k] !== '') return c[k];
    }
    // loose normalized search
    var want = String(base).toLowerCase().replace(/[^a-z0-9]/g,'');
    var suffix = lang === 'hi' ? 'hi' : 'en';
    var first='';
    for(var key in c){
      var nk = String(key).toLowerCase().replace(/[^a-z0-9]/g,'');
      if(lang === 'hi' && (nk === want+'hi' || nk === 'hi'+want || nk.indexOf(want)>=0 && nk.indexOf('hi')>=0)) return c[key];
      if(!first && (nk === want || nk.indexOf(want)>=0)) first = c[key];
    }
    return first || '';
  }
  function split(v, max){
    if(Array.isArray(v)) return v.filter(Boolean).slice(0,max||99);
    return String(v||'').split(/[,;|\n]+/).map(function(x){return x.trim();}).filter(Boolean).slice(0,max||99);
  }
  var termHi = {
    'Realistic':'व्यावहारिक','Investigative':'विश्लेषणात्मक','Artistic':'रचनात्मक','Social':'सामाजिक','Enterprising':'नेतृत्वशील','Conventional':'संगठित',
    'R':'R','I':'I','A':'A','S':'S','E':'E','C':'C',
    'Numerical':'संख्यात्मक','Verbal':'भाषिक','Logical':'तार्किक','Spatial':'स्थानिक','Mechanical':'यांत्रिक',
    'Openness':'नई सोच','Conscientiousness':'अनुशासन','Extraversion':'मिलनसारिता','Agreeableness':'सहयोगशीलता','Emotional Reactivity':'भावनात्मक संवेदनशीलता','Emotional Sensitivity':'भावनात्मक संवेदनशीलता',
    'Achievement':'उपलब्धि','Independence':'स्वतंत्रता','Recognition':'पहचान','Relationships':'रिश्ते','Support':'सहयोग','Working Conditions':'कार्य स्थितियाँ','Lifestyle':'जीवनशैली','Learning':'सीखना',
    'Science':'विज्ञान','Commerce':'कॉमर्स','Commerce + Maths':'कॉमर्स + गणित','Commerce without Maths':'कॉमर्स बिना गणित','Humanities':'मानविकी','Arts':'कला','Maths':'गणित','Mathematics':'गणित',
    'Field':'क्षेत्र','Stream':'स्ट्रीम','match':'मिलान','Best current fit':'सर्वश्रेष्ठ वर्तमान फिट','Multi-assessment signal':'मल्टी-असेसमेंट संकेत','RIASEC pattern':'RIASEC पैटर्न',
    'Law & Legal Services':'कानून और विधिक सेवाएँ','Finance, Banking & Insurance':'फाइनेंस, बैंकिंग और बीमा','Arts, Media & Communication':'कला, मीडिया और संचार','Engineering Technicians':'इंजीनियरिंग टेक्नीशियन','Legal & Social Service Associates':'कानूनी और सामाजिक सेवा सहयोगी','IT & Communications Technicians':'आईटी और संचार टेक्नीशियन'
  };
  var titleHi = {
    'Labour Law Expert':'श्रम कानून विशेषज्ञ','Credit Analyst':'क्रेडिट विश्लेषक','Animator':'एनिमेटर','Textile Technician':'टेक्सटाइल तकनीशियन','Disability Support Worker':'दिव्यांग सहायता कार्यकर्ता','Cyber Café Manager':'साइबर कैफे मैनेजर','Data Scientist':'डेटा वैज्ञानिक','Chartered Accountant':'चार्टर्ड अकाउंटेंट','Financial Analyst':'फाइनेंशियल एनालिस्ट','Lawyer':'वकील','Psychologist':'मनोवैज्ञानिक','Teacher':'शिक्षक','Graphic Designer':'ग्राफिक डिजाइनर','UX Designer':'यूएक्स डिजाइनर','Software Developer':'सॉफ्टवेयर डेवलपर','Digital Marketer':'डिजिटल मार्केटर','Business Analyst':'बिजनेस एनालिस्ट','Architect':'आर्किटेक्ट','Doctor':'डॉक्टर','Engineer':'इंजीनियर'
  };
  function tr(x){
    var s = String(x == null ? '' : x).trim();
    if(!isHi()) return s || '—';
    return termHi[s] || s || '—';
  }
  function careerTitle(c, idx){
    var t = raw(c,'title') || raw(c,'name') || raw(c,'career') || raw(c,'profession') || raw(c,'job') || '';
    if(isHi()) return titleHi[String(t).trim()] || t || ('करियर विकल्प '+(idx||''));
    return t || ('Career option '+(idx||''));
  }
  function careerCluster(c){
    return tr(raw(c,'cluster') || raw(c,'parentCluster') || raw(c,'sector') || raw(c,'field') || (isHi()?'करियर क्षेत्र':'Career field'));
  }
  function careerStreams(c){
    var s = raw(c,'stream') || raw(c,'streams') || raw(c,'recommendedStream') || '';
    var arr = split(s,2).map(tr).filter(Boolean);
    return arr.length ? arr.join(', ') : (isHi() ? 'स्ट्रीम verify करें' : 'Stream to verify');
  }
  function hasLatinLeak(s){ return /[A-Za-z]{4,}/.test(String(s||'')); }
  function careerDesc(c, idx){
    if(!isHi()){
      return raw(c,'description') || raw(c,'overview') || raw(c,'details') || ('Specialist in '+careerTitle(c,idx)+' within '+careerCluster(c)+' field. Explore required subjects, entrance pathways, colleges, skills and day-to-day work before deciding.');
    }
    var d = raw(c,'description') || raw(c,'overview') || raw(c,'details') || '';
    if(d && !hasLatinLeak(d)) return d;
    return 'यह करियर विकल्प विद्यार्थी की रुचि, aptitude, personality और work values के आधार पर explore करने योग्य दिशा दिखाता है। निर्णय लेने से पहले इस क्षेत्र के subjects, entrance exams, colleges, जरूरी skills, daily work reality और long-term growth path को counselor के साथ verify करें।';
  }
  function careerSkills(c){
    if(isHi()){
      var hi = raw(c,'skills') || raw(c,'keySkills') || '';
      if(hi && !hasLatinLeak(hi)) return split(hi,4);
      return ['विषय की समझ','समस्या समाधान','संचार कौशल','निरंतर सीखना'];
    }
    var en = raw(c,'skills') || raw(c,'keySkills') || '';
    return split(en,5).length ? split(en,5) : ['Subject understanding','Problem solving','Communication','Continuous learning'];
  }
  function topCareers(n){
    try { if(typeof buildCareerClusterRecommendationsForPdf === 'function') return buildCareerClusterRecommendationsForPdf(n||5) || []; } catch(e){}
    try { if(typeof buildCareerRecommendationsForPdf === 'function') return buildCareerRecommendationsForPdf(n||6) || []; } catch(e){}
    try { if(window.careers && window.careers.length) return window.careers.slice(0,n||6); } catch(e){}
    try { if(typeof CAREERS !== 'undefined' && CAREERS.length) return CAREERS.slice(0,n||6); } catch(e){}
    return [];
  }
  function copy(){
    return isHi() ? {
      brand:'VIANOVA', eyebrow:'NEP 2020 • विद्यार्थी करियर मार्गदर्शन', title:'करियर डिस्कवरी रिपोर्ट', sub:'रुचि, aptitude, personality, work values, stream fit और career recommendations को जोड़ने वाली premium, counselor-ready report.', prepared:'तैयार किया गया', confidential:'गोपनीय विद्यार्थी रिपोर्ट', recommended:'सुझाई गई स्ट्रीम', confidence:'विश्वसनीयता', interestCode:'रुचि कोड', bestFit:'सर्वश्रेष्ठ वर्तमान फिट', signal:'मल्टी-असेसमेंट संकेत', pattern:'RIASEC पैटर्न', footer:'ViaNova Career Discovery Report • Confidential', coverNote:'यह रिपोर्ट guidance tool है। इसे academic performance, real behaviour और counselor discussion के साथ पढ़ें।', motto:'Discover • Decide • Design',
      p2:'मुख्य सारांश', p2sub:'सभी completed assessments से निकले सबसे महत्वपूर्ण decision signals — parent और counselor friendly format में।', stream:'स्ट्रीम', topApt:'मुख्य aptitude', topTrait:'मुख्य trait', topValue:'मुख्य value', profileConf:'Profile confidence', profileConfText:'Available assessment evidence अभी कितना complete और coherent दिख रहा है।', stands:'विद्यार्थी के बारे में क्या साफ दिखता है', use:'इस report का उपयोग कैसे करें', useText:'इन insights से streams और careers shortlist करें, फिर subject comfort, marks trend, entrance exam readiness, budget, location और family context के साथ validate करें।',
      p3:'रुचि और Aptitude विश्लेषण', p3sub:'Interests बताते हैं कि विद्यार्थी को क्या energise करता है; aptitude बताता है कि problem-solving confidence कहाँ मजबूत है।', interestProfile:'Interest profile — RIASEC', riasecReading:'RIASEC reading', riasecText:'Top RIASEC codes learning environments और career tasks की दिशा बताते हैं जो student को naturally motivating लग सकते हैं।', aptProfile:'Aptitude profile',
      p4:'Personality और Work Values', p4sub:'ये dimensions बताते हैं कि student के लिए किस तरह का work environment, motivation और routine suited हो सकता है।', personality:'Personality — Big Five', personalityReading:'Personality reading', personalityText:'Higher traits “good” या “bad” नहीं होते; वे learning, collaboration, structure और challenge को handle करने के preferred ways बताते हैं।', workValues:'Work values',
      p5:'Stream Fit Recommendation', p5sub:'Student-parent-counselor discussion के लिए practical decision page.', recStream:'सुझाई गई स्ट्रीम', streamPara:'यह recommendation interests, aptitude strengths, personality signals, work values और visible career alignment को combine करता है। Final selection से पहले marks और subject comfort के साथ validate करें।', whyFit:'यह क्यों fit हो सकता है', whyText:'Strongest evidence areas अभी इस stream की तरफ संकेत देते हैं। Final choice में subject enjoyment और preparation discipline भी शामिल करें।', verify:'आगे क्या verify करें', verifyText:'Exam requirements, school subject availability, coaching needs, budget और core subjects को daily पढ़ने की willingness compare करें।', counselor:'Counselor note', counselorText:'Stream recommendation को label की तरह न use करें। इसे top-fit direction को realistic academic और family constraints के साथ compare करने के लिए conversation starter की तरह use करें।',
      p6:'Top Career Clusters to Explore', p6sub:'पहले broad career cluster देखें; फिर Career Explorer में related careers compare करें.', field:'क्षेत्र', streamLabel:'स्ट्रीम', match:'मिलान', skills:'मुख्य कौशल',
      p7:'Action Plan और Discussion Guide', p7sub:'Report reading से real decisions तक structured next steps.', week:['WEEK 1','WEEK 2','WEEK 3','WEEK 4'], weekText:['Parents के साथ report review करें। Top 3 stream या career options mark करें जिन्हें explore करना worth लगे।','Career cards खोलकर courses, entrance exams, colleges और daily work reality check करें।','Subject difficulty, marks trend, preparation demand और backup options compare करें।','Preliminary direction finalize करें और counselor/mentor review plan करें।'], prompts:'Parent और Counselor Discussion Prompts', qs:['Marks के अलावा इस stream को कौन सा evidence support करता है?','कौन से careers exciting और realistic दोनों हैं?','कौन से exam, subject या budget constraints choice को affect कर सकते हैं?','अगले 90 दिनों में student को कौन सी skills build करनी चाहिए?','Primary choices और safe backups कौन से हैं?'], important:'महत्वपूर्ण नोट', final:'यह report decision-support tool है, fixed verdict नहीं। Final stream और career decisions में assessment evidence के साथ marks, subject comfort, parent context और informed exploration भी शामिल करें।', print:'Print / PDF सेव करें', close:'बंद करें'
    } : {
      brand:'VIANOVA', eyebrow:'NEP 2020 • STUDENT CAREER GUIDANCE', title:'Career Discovery Report', sub:'A premium, counselor-ready report combining interests, aptitude, personality, work values, stream fit and career recommendations.', prepared:'PREPARED FOR', confidential:'Confidential Student Report', recommended:'RECOMMENDED STREAM', confidence:'CONFIDENCE', interestCode:'INTEREST CODE', bestFit:'Best current fit', signal:'Multi-assessment signal', pattern:'RIASEC pattern', footer:'ViaNova Career Discovery Report • Confidential', coverNote:'This report is a guidance tool and should be read with academic performance, real behaviour and counselor discussion.', motto:'Discover • Decide • Design',
      p2:'Executive Snapshot', p2sub:'The most important decision signals from all completed assessments, presented in a parent and counselor friendly format.', stream:'STREAM', topApt:'TOP APTITUDE', topTrait:'TOP TRAIT', topValue:'TOP VALUE', profileConf:'Profile confidence', profileConfText:'How complete and coherent the available assessment evidence looks right now.', stands:'What stands out for', use:'How to use this report', useText:'Use these insights to shortlist streams and careers, then validate them with subject comfort, marks trend, entrance exam readiness, budget, location and family context.',
      p3:'Interest & Aptitude Analysis', p3sub:'Interests show what energises the student; aptitude shows where problem-solving confidence is currently stronger.', interestProfile:'Interest profile — RIASEC', riasecReading:'RIASEC reading', riasecText:'The top RIASEC codes point to learning environments and career tasks that may feel naturally motivating for the student.', aptProfile:'Aptitude profile',
      p4:'Personality & Work Values', p4sub:'These dimensions explain the kind of work environment, motivation and routine that may suit the student.', personality:'Personality — Big Five', personalityReading:'Personality reading', personalityText:'Higher traits are not “good” or “bad”; they indicate preferred ways of learning, collaborating, handling structure and responding to challenge.', workValues:'Work values',
      p5:'Stream Fit Recommendation', p5sub:'A practical decision page designed for student-parent-counselor discussion.', recStream:'RECOMMENDED STREAM', streamPara:'This recommendation combines interests, aptitude strengths, personality signals, work values and visible career alignment. It should be validated with marks and subject comfort before final selection.', whyFit:'Why this may fit', whyText:'Your strongest evidence areas currently point toward this stream. The final choice should also consider subject enjoyment and preparation discipline.', verify:'What to verify next', verifyText:'Compare exam requirements, school subject availability, coaching needs, budget, and the student’s willingness to study the core subjects daily.', counselor:'Counselor note', counselorText:'Do not use the stream recommendation as a label. Use it as a conversation starter to compare the top-fit direction against realistic academic and family constraints.',
      p6:'Top Career Clusters to Explore', p6sub:'Broad career directions first; then compare related careers in Career Explorer.', field:'Field', streamLabel:'Stream', match:'match', skills:'Key skills',
      p7:'Action Plan & Discussion Guide', p7sub:'Move from report reading to real decisions with structured next steps.', week:['WEEK 1','WEEK 2','WEEK 3','WEEK 4'], weekText:['Review the report with parents. Mark the top 3 stream or career options that feel worth exploring.','Open the career cards and check courses, entrance exams, colleges and daily work reality.','Compare subject difficulty, marks trend, preparation demand and backup options.','Finalize a preliminary direction and plan a counselor/mentor review.'], prompts:'Parent & Counselor Discussion Prompts', qs:['What evidence supports this stream beyond marks alone?','Which careers are exciting and realistic at the same time?','What exam, subject or budget constraints may affect the choice?','What skills should the student start building in the next 90 days?','Which options are primary choices and which are safe backups?'], important:'IMPORTANT NOTE', final:'This report is a decision-support tool, not a fixed verdict. Final stream and career decisions should combine assessment evidence with marks, subject comfort, parent context and informed exploration.', print:'Print / Save as PDF', close:'Close'
    };
  }
  function bar(label, value, colorClass){
    var p = pct(value);
    return '<div class="vn-bar '+(colorClass||'orange')+'"><div class="vn-bar-label">'+esc(label)+'</div><div class="vn-bar-track"><div class="vn-bar-fill" style="width:'+p+'%"></div></div><div class="vn-bar-pct">'+p+'%</div></div>';
  }
  function page(no, title, sub, body){
    return '<section class="vn-report-page"><div class="vn-page-inner"><header class="vn-head"><span class="vn-num">'+no+'</span><div><h2>'+esc(title)+'</h2><p>'+esc(sub||'')+'</p></div></header><div class="vn-rule"></div>'+body+'</div><footer>'+esc(copy().footer)+'<span>Page '+parseInt(no,10)+' of 7 • '+esc(dateNow())+'</span></footer></section>';
  }
  function dateNow(){ return new Date().toLocaleDateString(isHi()?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric'}); }
  function windowDoc(){
    var st = safeState(), L = copy();
    var profile = st.assessmentProfile || {}, results = st.assessmentResults || {};
    var interest = (results.interest && results.interest.result) || {}, aptitude = (results.aptitude && results.aptitude.result) || {}, personality = (results.personality && results.personality.result) || {}, values = (results.values && results.values.result) || {};
    var riasecPct = objPct(interest.pct || profile.riasec || profile.riasecPct || interest);
    var aptPct = objPct(aptitude.pct || profile.aptitudePct || profile.aptitude || aptitude);
    var traitPct = objPct(personality.pct || profile.personalityPct || profile.traits || personality);
    var valPct = objPct(values.pct || profile.valuesPct || profile.values || values);
    var topR = (profile.topRiasec && profile.topRiasec.length ? profile.topRiasec : byValue(riasecPct).slice(0,3));
    var topA = (profile.topAptitude && profile.topAptitude.length ? profile.topAptitude : byValue(aptPct).slice(0,3));
    var topT = (profile.topTraits && profile.topTraits.length ? profile.topTraits : byValue(traitPct).slice(0,1));
    var topV = (profile.topValues && profile.topValues.length ? profile.topValues : byValue(valPct).slice(0,1));
    var clusters = topCareers(5);
    var topScore = clusters[0] && clusters[0].score ? Number(clusters[0].score) : 80;
    var confidence = Math.max(68, Math.min(96, 62 + ((st.completedTests||[]).length*6) + Math.round(topScore/10)));
    var streamRaw = profile.recommendedStream || profile.stream || val(st,['recommendedStream','stream']) || (isHi()?'काउंसलर से चर्चा करें':'To be discussed');
    var stream = tr(streamRaw);
    var name = st.name || (isHi()?'विद्यार्थी':'Student');
    var cls = st.cls || st.class || '—', board = st.board || '—', city = st.city || '—';
    var interestCode = topR.join('-') || '—';
    var stands = (isHi() ? 'Interest pattern: ' : 'Interest pattern: ') + topR.map(tr).join(', ') + '. ' + (isHi()?'Aptitude strengths: ':'Aptitude strengths: ') + topA.map(tr).join(', ') + '.';
    var riasecNames = {R:'Realistic (R)',I:'Investigative (I)',A:'Artistic (A)',S:'Social (S)',E:'Enterprising (E)',C:'Conventional (C)',realistic:'Realistic (R)',investigative:'Investigative (I)',artistic:'Artistic (A)',social:'Social (S)',enterprising:'Enterprising (E)',conventional:'Conventional (C)'};
    var traitNames = {O:'Openness',C:'Conscientiousness',E:'Extraversion',A:'Agreeableness',N:'Emotional Sensitivity',openness:'Openness',conscientiousness:'Conscientiousness',extraversion:'Extraversion',agreeableness:'Agreeableness',neuroticism:'Emotional Sensitivity'};
    var riasecBars = ['R','I','A','S','E','C'].map(function(k){ var key = riasecPct[k] != null ? k : k.toLowerCase(); return bar(tr(riasecNames[key]||riasecNames[k]||k), riasecPct[key] || 0, 'orange'); }).join('');
    if(!Object.keys(riasecPct).length) riasecBars = '<p class="muted">'+esc(isHi()?'Data assessments के बाद दिखाई देगा।':'Data will appear after assessments.')+'</p>';
    var aptBars = byValue(aptPct).slice(0,5).map(function(k){ return bar(tr(k), aptPct[k], 'blue'); }).join('') || '<p class="muted">'+esc(isHi()?'Data assessments के बाद दिखाई देगा।':'Data will appear after assessments.')+'</p>';
    var traitBars = byValue(traitPct).slice(0,5).map(function(k){ return bar(tr(traitNames[k]||k), traitPct[k], 'purple'); }).join('') || '<p class="muted">'+esc(isHi()?'Data assessments के बाद दिखाई देगा।':'Data will appear after assessments.')+'</p>';
    var valBars = byValue(valPct).slice(0,8).map(function(k){ return bar(tr(k), valPct[k], 'green'); }).join('') || '<p class="muted">'+esc(isHi()?'Data assessments के बाद दिखाई देगा।':'Data will appear after assessments.')+'</p>';
    var careerRows = clusters.length ? clusters.slice(0,5).map(function(c,i){
      var score = pct(c.score || c.match || c.fit || 67);
      var samples = (c.sampleCareerTitles || []).slice(0,6).map(function(s){return '<span>'+esc(s)+'</span>';}).join('');
      return '<div class="career-card c'+(i%6)+'"><div class="career-stripe"></div><div class="career-rank">'+(i+1)+'</div><div class="career-main"><div class="career-top"><h3>'+esc(c.cluster || c.title || ('Career cluster '+(i+1)))+'</h3><b>'+score+'% '+esc(L.match)+'</b></div><div class="career-meta">'+esc(c.careerCount || 0)+' related careers &bull; RIASEC: '+esc((c.dominantRiasec||[]).join('-') || '—')+'</div><p>'+esc(c.description || '')+'</p><div class="skill-tags"><strong>'+esc(isHi()?'Explore careers':'Explore careers')+':</strong> '+samples+'</div></div></div>';
    }).join('') : '<div class="softbox">'+esc(isHi()?'Career Explorer data load होने के बाद cluster recommendations दिखाई देंगी।':'Career cluster recommendations will appear after Career Explorer data loads.')+'</div>';
    var weeks = L.weekText.map(function(w,i){ return '<div class="week-card w'+i+'"><b>'+esc(L.week[i])+'</b><p>'+esc(w)+'</p></div>'; }).join('');
    var qs = L.qs.map(function(q){ return '<li>'+esc(q)+'</li>'; }).join('');

    var dateStr = new Date().toLocaleDateString(isHi()?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric'});
    var safeName = name.replace(/[^a-zA-Z0-9\u0900-\u097F]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')||'Student';

    var css = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;500;600;700;800&display=swap');
      @page{size:A4 portrait;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{background:#CBD5E1;font-family:'Inter',system-ui,sans-serif;color:#0F172A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{display:flex;flex-direction:column;align-items:center;padding:32px 0 100px}

      /* ── Page shell ── */
      .page{width:794px;min-height:1123px;background:#F8FAFC;position:relative;overflow:hidden;margin-bottom:20px;page-break-after:always;display:flex;flex-direction:column}
      .page-inner{padding:52px 52px 80px;flex:1}
      .page-footer{position:absolute;bottom:0;left:0;right:0;height:52px;background:#0F172A;display:flex;align-items:center;justify-content:space-between;padding:0 52px}
      .page-footer-l{color:rgba(255,255,255,.45);font-size:11px;font-weight:600;letter-spacing:.06em}
      .page-footer-r{color:rgba(255,255,255,.3);font-size:11px}
      .page-accent{position:absolute;top:0;left:0;width:6px;height:100%;background:#E85D0A}
      .page-accent.blue{background:#1D4ED8}
      .page-accent.green{background:#059669}
      .page-accent.purple{background:#7C3AED}
      .page-accent.amber{background:#D97706}
      .page-accent.teal{background:#0891B2}

      /* ── Cover page ── */
      .cover-bg{position:absolute;inset:0;background:#0A1628}
      .cover-glow1{position:absolute;top:-60px;right:-60px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,.55) 0%,transparent 65%)}
      .cover-glow2{position:absolute;bottom:-80px;left:-40px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(232,93,10,.45) 0%,transparent 65%)}
      .cover-glow3{position:absolute;bottom:100px;right:80px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.3) 0%,transparent 65%)}
      .cover-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.07) 1px,transparent 1px);background-size:28px 28px}
      .cover-inner{position:relative;z-index:2;padding:52px 56px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
      .cover-brand-row{display:flex;align-items:center;gap:12px}
      .cover-logo{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#E85D0A,#B84508);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px;flex-shrink:0}
      .cover-brand-name{font-size:15px;font-weight:800;color:rgba(255,255,255,.95);letter-spacing:.03em}
      .cover-brand-sub{font-size:10px;color:rgba(255,255,255,.38);letter-spacing:.16em;text-transform:uppercase;margin-top:2px}
      .cover-date{font-size:11px;color:rgba(255,255,255,.38);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:999px}
      .cover-hero{margin:0}
      .cover-eyebrow{font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.38);display:flex;align-items:center;gap:8px;margin-bottom:18px}
      .cover-eyebrow::before{content:'';display:block;width:22px;height:2px;background:#E85D0A;border-radius:2px}
      .cover-headline{font-family:'Playfair Display',Georgia,serif;font-size:58px;font-weight:700;color:white;line-height:1.04;margin-bottom:8px}
      .cover-student{font-family:'Playfair Display',Georgia,serif;font-size:58px;font-weight:400;font-style:italic;color:#FDBA74;line-height:1.04;margin-bottom:18px}
      .cover-desc{font-size:14px;line-height:1.75;color:rgba(255,255,255,.5);max-width:480px}
      .cover-divider{height:1px;background:linear-gradient(90deg,rgba(255,255,255,.16),transparent);margin:32px 0}
      .cover-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      .cover-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px 20px;backdrop-filter:blur(6px)}
      .cover-stat-label{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.36);margin-bottom:8px}
      .cover-stat-value{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:white;line-height:1.15;margin-bottom:4px}
      .cover-stat-sub{font-size:11px;color:rgba(255,255,255,.36)}
      .cover-conf-bar{height:3px;background:rgba(255,255,255,.12);border-radius:99px;margin-top:10px;overflow:hidden}
      .cover-conf-fill{height:100%;background:#22C55E;border-radius:99px}
      .cover-footnote{font-size:11px;color:rgba(255,255,255,.3);line-height:1.6;max-width:500px}

      /* ── Page header ── */
      .pg-header{display:flex;align-items:flex-start;gap:18px;margin-bottom:28px}
      .pg-num{background:#0F172A;color:white;border-radius:14px;min-width:56px;height:56px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;letter-spacing:.04em;flex-shrink:0}
      .pg-titles{}
      .pg-title{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;color:#0F172A;line-height:1.1;margin-bottom:5px}
      .pg-sub{font-size:13px;color:#64748B;line-height:1.55;max-width:580px}
      .pg-rule{height:1px;background:#E2E8F0;margin-bottom:26px}

      /* ── KPI grid ── */
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
      .kpi{background:white;border:1px solid #E2E8F0;border-radius:18px;padding:18px 16px;border-top:4px solid #E85D0A;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .kpi:nth-child(2){border-top-color:#1D4ED8}
      .kpi:nth-child(3){border-top-color:#7C3AED}
      .kpi:nth-child(4){border-top-color:#059669}
      .kpi-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px}
      .kpi-value{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#0F172A;line-height:1.2}

      /* ── Confidence box ── */
      .conf-box{background:white;border:1px solid #E2E8F0;border-radius:18px;padding:22px 26px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .conf-box-title{font-size:15px;font-weight:700;color:#0F172A;margin-bottom:4px}
      .conf-box-sub{font-size:12px;color:#64748B;margin-bottom:16px}
      .conf-row{display:grid;grid-template-columns:1fr 72px;gap:16px;align-items:center}
      .conf-track{height:16px;background:#F1F5F9;border-radius:999px;overflow:hidden;border:1px solid #E2E8F0}
      .conf-fill{height:100%;background:linear-gradient(90deg,#059669,#34D399);border-radius:999px}
      .conf-pct{font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:700;color:#059669;line-height:1;text-align:right}

      /* ── Softboxes ── */
      .softbox{border:1px solid #E2E8F0;border-radius:16px;padding:18px 22px;margin:14px 0;background:#FFFBF5}
      .softbox.blue{background:#EFF6FF;border-color:#BFDBFE}
      .softbox.purple{background:#F5F3FF;border-color:#DDD6FE}
      .softbox.green{background:#F0FDF4;border-color:#BBF7D0}
      .dot-title{display:flex;align-items:center;gap:10px;font-weight:700;color:#0F172A;font-size:14px;margin-bottom:8px}
      .dot{width:12px;height:12px;border-radius:50%;background:#E85D0A;flex-shrink:0}
      .dot.blue{background:#1D4ED8}
      .dot.purple{background:#7C3AED}
      .dot.green{background:#059669}
      .softbox p{font-size:13px;line-height:1.65;color:#475569}

      /* ── Score bars ── */
      .vn-bar{display:grid;grid-template-columns:200px 1fr 52px;gap:14px;align-items:center;padding:10px 14px;border-radius:12px;margin:5px 0;background:#FFF7F0}
      .vn-bar.blue{background:#EFF6FF}
      .vn-bar.purple{background:#F5F3FF}
      .vn-bar.green{background:#F0FDF4}
      .vn-bar-label{font-size:13px;font-weight:500;color:#334155}
      .vn-bar-track{height:10px;background:#E2E8F0;border-radius:999px;overflow:hidden}
      .vn-bar-fill{height:100%;background:#E85D0A;border-radius:999px}
      .vn-bar.blue .vn-bar-fill{background:#1D4ED8}
      .vn-bar.purple .vn-bar-fill{background:#7C3AED}
      .vn-bar.green .vn-bar-fill{background:#059669}
      .vn-bar-pct{font-size:13px;font-weight:800;color:#0F172A;text-align:right}

      /* ── Stream hero ── */
      .stream-hero{background:#0A1628;border-radius:20px;padding:30px 36px;margin-top:16px;position:relative;overflow:hidden}
      .stream-hero::after{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,.4) 0%,transparent 65%)}
      .stream-label{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#E85D0A;margin-bottom:12px}
      .stream-value{font-family:'Playfair Display',Georgia,serif;font-size:40px;font-weight:700;color:white;margin-bottom:16px;line-height:1.1;position:relative;z-index:1}
      .stream-desc{font-size:13px;line-height:1.65;color:rgba(255,255,255,.55);max-width:520px;position:relative;z-index:1}
      .two-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}
      .info-card{background:white;border:1px solid #E2E8F0;border-radius:18px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .info-card h3{font-size:14px;font-weight:700;color:#0F172A;margin-bottom:10px}
      .info-card p{font-size:13px;line-height:1.65;color:#475569}

      /* ── Career cards ── */
      .career-card{display:flex;position:relative;background:white;border:1px solid #E2E8F0;border-radius:18px;margin:12px 0;padding:18px 18px 18px 72px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
      .career-stripe{position:absolute;left:0;top:0;bottom:0;width:6px;background:#E85D0A;border-radius:18px 0 0 18px}
      .career-card.c1 .career-stripe{background:#1D4ED8}
      .career-card.c2 .career-stripe{background:#059669}
      .career-card.c3 .career-stripe{background:#7C3AED}
      .career-card.c4 .career-stripe{background:#D97706}
      .career-card.c5 .career-stripe{background:#0891B2}
      .career-rank{position:absolute;left:16px;top:18px;width:36px;height:36px;background:#E85D0A;color:white;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px}
      .career-card.c1 .career-rank{background:#1D4ED8}
      .career-card.c2 .career-rank{background:#059669}
      .career-card.c3 .career-rank{background:#7C3AED}
      .career-card.c4 .career-rank{background:#D97706}
      .career-card.c5 .career-rank{background:#0891B2}
      .career-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:4px}
      .career-top h3{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#0F172A;margin:0}
      .career-badge{background:#0F172A;color:white;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0}
      .career-meta{font-size:11px;color:#94A3B8;font-weight:600;letter-spacing:.04em;margin-bottom:8px;text-transform:uppercase}
      .career-main p{font-size:12.5px;line-height:1.55;color:#475569}
      .skill-tags{font-size:11px;color:#64748B;margin-top:8px}
      .skill-tags span{display:inline-block;background:#F1F5F9;border-radius:999px;padding:3px 9px;margin:2px;font-weight:500}

      /* ── Action plan ── */
      .week-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}
      .week-card{background:white;border:1px solid #E2E8F0;border-radius:18px;padding:22px;border-top:4px solid #E85D0A;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .week-card.w1{border-top-color:#1D4ED8}
      .week-card.w2{border-top-color:#059669}
      .week-card.w3{border-top-color:#7C3AED}
      .week-card b{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E85D0A;margin-bottom:12px}
      .week-card.w1 b{color:#1D4ED8}
      .week-card.w2 b{color:#059669}
      .week-card.w3 b{color:#7C3AED}
      .week-card p{font-size:13px;line-height:1.65;color:#475569}
      .prompt-box{background:#FFFBEB;border:1px solid #FDE68A;border-radius:18px;margin-top:24px;padding:22px 28px}
      .prompt-box h3{font-size:15px;font-weight:700;color:#92400E;margin-bottom:14px}
      .prompt-box li{font-size:13px;line-height:1.65;color:#44403C;margin:10px 0}
      .important{background:#0A1628;color:#CBD5E1;border-radius:18px;padding:22px 28px;margin-top:20px}
      .important b{display:block;color:#E85D0A;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
      .important p{font-size:13px;line-height:1.65}
      .muted{color:#94A3B8;font-size:13px;padding:8px 0}

      /* ── Section title ── */
      .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin:24px 0 12px;display:flex;align-items:center;gap:8px}
      .section-title::before{content:'';display:block;width:14px;height:3px;border-radius:2px;background:#E85D0A}

      /* ── Sticky action bar ── */
      .actions{position:fixed;bottom:0;left:0;right:0;z-index:99;background:rgba(15,23,42,.92);backdrop-filter:blur(12px);padding:14px;display:flex;justify-content:center;gap:12px}
      .actions button{border:0;border-radius:999px;padding:12px 28px;font-weight:800;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:.02em}
      .actions .primary{background:linear-gradient(135deg,#E85D0A,#B84508);color:white;box-shadow:0 4px 14px rgba(232,93,10,.35)}
      .actions .secondary{background:white;color:#0F172A;border:1px solid #E2E8F0}

      /* ── Print ── */
      @media print{
        html,body{background:white;display:block;padding:0}
        .page{margin:0;box-shadow:none}
        .actions{display:none}
        .cover-bg,.cover-glow1,.cover-glow2,.cover-glow3{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
      @media (max-width:850px){
        body{padding:0}
        .page{width:100%;min-height:auto;transform:none}
        .cover-headline,.cover-student{font-size:40px}
        .cover-inner{padding:32px 28px}
        .cover-stats,.kpi-grid,.two-cards,.week-grid{grid-template-columns:1fr}
        .page-inner{padding:32px 24px 70px}
      }
    `;

    function pg(numStr, title, sub, body, accentClass) {
      var ac = accentClass || '';
      return '<div class="page"><div class="page-accent '+ac+'"></div><div class="page-inner">'
        +'<div class="pg-header"><div class="pg-num">'+numStr+'</div><div class="pg-titles"><div class="pg-title">'+esc(title)+'</div><div class="pg-sub">'+esc(sub)+'</div></div></div>'
        +'<div class="pg-rule"></div>'
        +body
        +'</div><div class="page-footer"><div class="page-footer-l">ViaNova &nbsp;·&nbsp; NEP Career Companion &nbsp;·&nbsp; Confidential</div><div class="page-footer-r">'+esc(name)+' &nbsp;·&nbsp; '+dateStr+'</div></div></div>';
    }

    var coverHtml = '<div class="page" style="background:#0A1628">'
      +'<div class="cover-bg"></div><div class="cover-glow1"></div><div class="cover-glow2"></div><div class="cover-glow3"></div><div class="cover-dots"></div>'
      +'<div class="cover-inner">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div class="cover-brand-row"><div class="cover-logo">V</div><div><div class="cover-brand-name">ViaNova</div><div class="cover-brand-sub">NEP Career Companion</div></div></div>'
      +'<div class="cover-date">'+dateStr+'</div>'
      +'</div>'
      +'<div class="cover-hero">'
      +'<div class="cover-eyebrow">Comprehensive Career Guidance Report</div>'
      +'<div class="cover-headline">'+esc(L.title)+'</div>'
      +'<div class="cover-student">'+esc(name)+'</div>'
      +'<div class="cover-desc">'+esc(L.sub)+'</div>'
      +'</div>'
      +'<div>'
      +'<div class="cover-divider"></div>'
      +'<div class="cover-stats">'
      +'<div class="cover-stat"><div class="cover-stat-label">'+esc(L.recommended)+'</div><div class="cover-stat-value" style="font-size:20px">'+esc(stream)+'</div><div class="cover-stat-sub">'+esc(L.bestFit)+'</div></div>'
      +'<div class="cover-stat"><div class="cover-stat-label">'+esc(L.confidence)+'</div><div class="cover-stat-value">'+confidence+'%</div><div class="cover-conf-bar"><div class="cover-conf-fill" style="width:'+confidence+'%"></div></div></div>'
      +'<div class="cover-stat"><div class="cover-stat-label">'+esc(L.interestCode)+'</div><div class="cover-stat-value">'+esc(interestCode)+'</div><div class="cover-stat-sub">'+esc(L.pattern)+'</div></div>'
      +'</div>'
      +'<div style="margin-top:20px"><div class="cover-footnote">'+esc(L.coverNote)+'</div></div>'
      +'</div>'
      +'</div>'
      +'</div>';

    var p2Html = pg('02', L.p2, L.p2sub,
      '<div class="kpi-grid">'
      +'<div class="kpi"><div class="kpi-label">'+esc(L.stream)+'</div><div class="kpi-value" style="font-size:18px">'+esc(stream)+'</div></div>'
      +'<div class="kpi"><div class="kpi-label">'+esc(L.topApt)+'</div><div class="kpi-value">'+esc(tr(topA[0]||'—'))+'</div></div>'
      +'<div class="kpi"><div class="kpi-label">'+esc(L.topTrait)+'</div><div class="kpi-value">'+esc(tr(topT[0]||'—'))+'</div></div>'
      +'<div class="kpi"><div class="kpi-label">'+esc(L.topValue)+'</div><div class="kpi-value">'+esc(tr(topV[0]||'—'))+'</div></div>'
      +'</div>'
      +'<div class="conf-box"><div class="conf-box-title">'+esc(L.profileConf)+'</div><div class="conf-box-sub">'+esc(L.profileConfText)+'</div>'
      +'<div class="conf-row"><div class="conf-track"><div class="conf-fill" style="width:'+confidence+'%"></div></div><div class="conf-pct">'+confidence+'%</div></div>'
      +'</div>'
      +'<div class="softbox"><div class="dot-title"><span class="dot"></span>'+esc(L.stands+' '+name)+'</div><p>'+esc(stands)+'</p></div>'
      +'<div class="softbox blue"><div class="dot-title"><span class="dot blue"></span>'+esc(L.use)+'</div><p>'+esc(L.useText)+'</p></div>'
    );

    var p3Html = pg('03', L.p3, L.p3sub,
      '<div class="section-title">'+esc(L.interestProfile)+'</div>'+riasecBars
      +'<div class="softbox" style="margin-top:18px"><div class="dot-title"><span class="dot"></span>'+esc(L.riasecReading)+'</div><p>'+esc(L.riasecText)+'</p></div>'
      +'<div class="section-title">'+esc(L.aptProfile)+'</div>'+aptBars
    , 'blue');

    var p4Html = pg('04', L.p4, L.p4sub,
      '<div class="section-title">'+esc(L.personality)+'</div>'+traitBars
      +'<div class="softbox purple" style="margin-top:18px"><div class="dot-title"><span class="dot purple"></span>'+esc(L.personalityReading)+'</div><p>'+esc(L.personalityText)+'</p></div>'
      +'<div class="section-title">'+esc(L.workValues)+'</div>'+valBars
    , 'purple');

    var p5Html = pg('05', L.p5, L.p5sub,
      '<div class="stream-hero"><div class="stream-label">'+esc(L.recStream)+'</div><div class="stream-value">'+esc(stream)+'</div><div class="stream-desc">'+esc(L.streamPara)+'</div></div>'
      +'<div class="two-cards">'
      +'<div class="info-card"><h3>'+esc(L.whyFit)+'</h3><p>'+esc(L.whyText)+'</p></div>'
      +'<div class="info-card"><h3>'+esc(L.verify)+'</h3><p>'+esc(L.verifyText)+'</p></div>'
      +'</div>'
      +'<div class="softbox green" style="margin-top:20px"><div class="dot-title"><span class="dot green"></span>'+esc(L.counselor)+'</div><p>'+esc(L.counselorText)+'</p></div>'
    , 'green');

    var p6Html = pg('06', L.p6, L.p6sub, careerRows, 'amber');

    var p7Html = pg('07', L.p7, L.p7sub,
      '<div class="week-grid">'+weeks+'</div>'
      +'<div class="prompt-box"><h3>'+esc(L.prompts)+'</h3><ul>'+qs+'</ul></div>'
      +'<div class="important"><b>'+esc(L.important)+'</b><p>'+esc(L.final)+'</p></div>'
    , 'teal');

    var langScript = `<script>
(function(){
  function lang(){try{return localStorage.getItem('vianova_lang')||'en';}catch(e){return 'en';}}
  function setStored(v){try{localStorage.setItem('vianova_lang',v==='hi'?'hi':'en');}catch(e){}}
  function ensureSelector(){
    var sw=document.getElementById('vn-lang-switcher');
    if(!sw){sw=document.createElement('div');sw.id='vn-lang-switcher';sw.setAttribute('aria-label','Language selector');sw.innerHTML='<label for="vn-lang-select">Language<\\/label><select id="vn-lang-select"><option value="en">English<\\/option><option value="hi">\u0939\u093f\u0928\u094d\u0926\u0940<\\/option><\\/select>';document.body.appendChild(sw);}
    sw.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important;position:fixed!important;right:18px!important;top:18px!important;z-index:2147483647!important;pointer-events:auto!important;align-items:center;gap:8px;background:white;padding:6px 12px;border-radius:999px;border:1px solid #E2E8F0;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.1)';
    var sel=document.getElementById('vn-lang-select');if(sel)sel.value=lang();
  }
  function sync(){ensureSelector();var l=lang();document.documentElement.lang=l==='hi'?'hi':'en';document.querySelectorAll('#vn-lang-select').forEach(function(s){s.value=l;});}
  function applyLang(v){v=v==='hi'?'hi':'en';setStored(v);sync();}
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='vn-lang-select')applyLang(e.target.value);},true);
  document.addEventListener('DOMContentLoaded',function(){sync();setTimeout(sync,300);});
  window.addEventListener('load',function(){sync();});
})();
<\/script>`;

    return '<!doctype html><html lang="'+(isHi()?'hi':'en')+'"><head>'
      +'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      +'<title>'+esc(L.title)+' — '+esc(name)+'</title>'
      +'<link rel="preconnect" href="https://fonts.googleapis.com">'
      +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
      +'<style>'+css+'</style>'
      +'</head><body>'
      +coverHtml+p2Html+p3Html+p4Html+p5Html+p6Html+p7Html
      +'<div class="actions">'
      +'<button class="primary" onclick="window.print()">'+esc(L.print)+'</button>'
      +'<button class="secondary" onclick="window.close()">'+esc(L.close)+'</button>'
      +'</div>'
      +langScript
      +'</body></html>';
  }
  window.generateUnifiedHtmlReportDocument = windowDoc;
  window.generateHtmlBasedReport = function(){
    var st = safeState();
    if ((st.completedTests||[]).length < 4) { alert(isHi()?'कृपया पहले चारों assessments complete करें।':'Complete all 4 assessments first.'); return; }
    var reportHtml = window.generateUnifiedHtmlReportDocument ? window.generateUnifiedHtmlReportDocument() : generateHtmlReportDocument();
    var w = window.open('', '_blank');
    if(!w){ alert(isHi()?'Popup blocked. कृपया popups allow करें।':'Popup blocked. Please allow popups to open the report.'); return; }
    w.document.open(); w.document.write(reportHtml); w.document.close();
  };
  // Removed HTML-report override: keep original jsPDF generateCompiledPdf().
  // Removed preview override: keep original previewCompiledPdf().
  // Robust sidebar + shell translation. Stores English originals and swaps only text nodes, preserving badges/spans.
  var shellMap = {
    en:{workspace:'Workspace',account:'Account',progress:'Profile progress',dashboard:'Dashboard',assess:'Assessments',streams:'Roadmap',careers:'Career Explorer',report:'My Report',admin:'Admin Panel',logout:'Sign out',nepTitle:'NEP-aligned',nepText:'Interest-first, multi-pathway career guidance for Indian students.'},
    hi:{workspace:'वर्कस्पेस',account:'अकाउंट',progress:'प्रोफ़ाइल प्रगति',dashboard:'डैशबोर्ड',assess:'असेसमेंट',streams:'रोडमैप',careers:'करियर एक्सप्लोरर',report:'मेरी रिपोर्ट',admin:'एडमिन पैनल',logout:'साइन आउट',nepTitle:'NEP-अलाइन',nepText:'भारतीय विद्यार्थियों के लिए interest-first, multi-pathway career guidance.'}
  };
  function setButtonText(btn, text){
    if(!btn) return;
    var done=false;
    for(var i=0;i<btn.childNodes.length;i++){
      var n=btn.childNodes[i];
      if(n.nodeType===3 && n.nodeValue.trim()) { n.nodeValue = text + ' '; done=true; break; }
    }
    if(!done) btn.insertBefore(document.createTextNode(text+' '), btn.firstChild);
  }
  function syncShell(){
    var M = shellMap[isHi()?'hi':'en'];
    var labels = document.querySelectorAll('.nav-section-label');
    if(labels[0]) labels[0].textContent = M.workspace;
    if(labels[1]) labels[1].textContent = M.account;
    var prog = document.querySelector('.progress-label span:first-child'); if(prog) prog.textContent = M.progress;
    document.querySelectorAll('.nav-item').forEach(function(btn){
      var oc = btn.getAttribute('onclick') || '';
      if(oc.indexOf("dashboard")>-1) setButtonText(btn,M.dashboard);
      else if(oc.indexOf("assess")>-1) setButtonText(btn,M.assess);
      else if(oc.indexOf("streams")>-1) setButtonText(btn,M.streams);
      else if(oc.indexOf("careers")>-1) setButtonText(btn,M.careers);
      else if(oc.indexOf("report")>-1) setButtonText(btn,M.report);
      else if(oc.indexOf("admin")>-1) setButtonText(btn,M.admin);
      else if(oc.indexOf("logOut")>-1) setButtonText(btn,M.logout);
    });
    var nep = document.querySelector('.nep-badge');
    if(nep) nep.innerHTML = '<strong>'+esc(M.nepTitle)+'</strong><br>'+esc(M.nepText);
    document.querySelectorAll('.mobile-nav .mnav-btn').forEach(function(btn){
      var oc=btn.getAttribute('onclick')||'', label='';
      if(oc.indexOf('dashboard')>-1) label=M.dashboard; else if(oc.indexOf('assess')>-1) label=M.assess; else if(oc.indexOf('careers')>-1) label=M.careers; else if(oc.indexOf('report')>-1) label=M.report; else if(oc.indexOf('streams')>-1) label=M.streams;
      if(label){ var txt = Array.prototype.find.call(btn.childNodes,function(n){return n.nodeType===3 && n.nodeValue.trim();}); if(txt) txt.nodeValue=' '+label; else btn.appendChild(document.createTextNode(label)); }
    });
  }
  // Preserve existing handlers while ensuring shell language reapplies after dynamic renders.
  var oldShow = window.showScreen;
  if(typeof oldShow === 'function') window.showScreen = function(){ var r = oldShow.apply(this, arguments); setTimeout(syncShell, 50); return r; };
  var oldSet = window.setLanguage;
  if(typeof oldSet === 'function') window.setLanguage = function(lang){ var r = oldSet.apply(this, arguments); setTimeout(syncShell, 50); setTimeout(syncShell, 300); return r; };
  var oldApply = window.applyLanguage;
  if(typeof oldApply === 'function') window.applyLanguage = function(){ var r = oldApply.apply(this, arguments); setTimeout(syncShell, 50); return r; };
  document.addEventListener('DOMContentLoaded', function(){ syncShell(); setTimeout(syncShell,300); });
  try { new MutationObserver(function(){ clearTimeout(window.__vnShellSyncTimer); window.__vnShellSyncTimer=setTimeout(syncShell,80); }).observe(document.body,{childList:true,subtree:true}); } catch(e){}
  setTimeout(syncShell,100);
})();
