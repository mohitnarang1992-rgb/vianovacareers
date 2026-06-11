'use strict';

// ── SHEETS URL (read from meta tag) ──────────────────────
const SHEETS_URL = (function(){
  const metaEl = document.querySelector('meta[name="vianova-sheets-url"]');
  const meta   = metaEl ? String(metaEl.content || '').trim() : '';
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/(exec|dev)/.test(meta) ? meta : '';
})();

// ── App state ─────────────────────────────────────────────
const state = {
  name:'', cls:'', board:'', city:'', selectedStream:'',
  phone:'', email:'', coupon:'', loggedIn:false,
  completedTests: [],
  assessmentResults: {},
  assessmentProfile: null,
  questProgress: { xp: 0, level: 1, badges: [], lastReward: '' },
  isAdmin: false,
  adminData: { students: [], tests: [], logs: [] }
};


// ─────────────────────────────────────────────────────────
//  PERMANENT MULTILINGUAL ARCHITECTURE
//  Central AppState.lang + I18N + localized quiz/report/career helpers
// ─────────────────────────────────────────────────────────
const AppState = {
  get lang() { return localStorage.getItem('vianova_lang') || 'en'; },
  set lang(value) { localStorage.setItem('vianova_lang', value === 'hi' ? 'hi' : 'en'); }
};
state.lang = AppState.lang;
const I18N = {
  en: {
    'language.label':'Language','pdf.ready':'Ready to generate','pdf.locked':'Locked until all 4 assessments are completed','pdf.status.ready':'All four assessments are complete. Generate the premium counselling report with cover summary, story-based insights, stream comparison, and recommended careers.','pdf.status.locked':'Completed {{done}}/4 assessments. Finish all four tests to unlock the compiled report.','pdf.generate':'Generate PDF report','pdf.generating':'Generating premium report…','pdf.preview':'Preview summary','pdf.preview.title':'Premium report preview','pdf.cover':'Cover summary','pdf.confidence':'Decision confidence','pdf.confidence.note':'Raised by multi-assessment evidence, not just one score.','pdf.stream':'Recommended stream','pdf.interest':'Top interest code','pdf.topCareers':'Top clusters','pdf.adds':'What this report adds','pdf.adds.text':'story-based interpretation, stream comparison, top-fit careers, action plan, and counselor discussion prompts.',
    'quiz.challenge':'Career Quest challenge','quiz.exit':'Exit challenge','quiz.activeMission':'Active mission','quiz.timeLeft':'Time left','quiz.questionsSolved':'Questions solved','quiz.reward':'Reward rhythm: answer steadily, build momentum, and finish the full challenge to lock in your profile signal.','quiz.startStrong':'Start strong — your first few answers shape the momentum.','quiz.nextUnlock':'Next unlock at {{pct}}% completion','quiz.allUnlocks':'All milestone unlocks claimed','quiz.stage':'Stage {{n}} of 5','quiz.xp':'{{xp}} XP','quiz.momentum':'Momentum x{{n}}','quiz.speed':'Speed bonus: {{n}}','quiz.level':'Level {{n}}','quiz.complete':'{{pct}}% complete','quiz.inLevel':'Level {{level}} • {{xp}}/250 XP in current level','quiz.questionOf':'Question {{cur}} of {{total}}','quiz.choose':'Choose the answer that fits you best.','quiz.speedLocked':'⚡ Speed bonus locked','quiz.speedOffer':'+ {{bonus}} bonus XP if answered quickly','quiz.guide':'Guide','quiz.potentialXp':'Potential XP','quiz.currentReward':'Current reward','quiz.saved':'Answer saved instantly as you click.','quiz.previous':'← Previous','quiz.pause':'Pause','quiz.finish':'Finish challenge →','quiz.lock':'Lock answer →','quiz.return':'← Return to ViaNova',
    'alert.completeFirst':'Complete all 4 assessments first.','alert.doneOnce':'You have already completed the {{title}}. Each assessment can only be taken once.','alert.doneOnceLogout':'You have already completed the {{title}}. Each assessment can only be taken once, even after logging out.',
    'career.why':'Why this fits you','career.noFound':'No careers found','career.noBackend':'Please make sure the backend can read the career sheet.','career.noAvailable':'No careers available','career.noMatched':'No records matched the selected filters.','career.tryAnother':'Try another combination','career.viewCard':'View card','career.match':'{{score}}% match','career.highFit':'High-fit path','career.worth':'Worth exploring','career.care':'Explore with care','career.option':'Career Option','career.cluster':'Career Cluster','career.noDesc':'No description available yet.','career.educationFallback':'Please refer to the detailed career pathway.','career.degreeFallback':'Relevant degree or certification pathway','career.examsFallback':'Varies by institution and pathway','career.salaryFallback':'Salary varies by employer and role level.','career.employersFallback':'Private companies, public sector organisations, and specialist institutions','career.workEnvFallback':'Office, field, lab, studio, or hybrid settings depending on the role','career.pathFallback':'Entry role → specialist → senior or leadership pathway','career.schemeFallback':'Check current government schemes for this domain'
  },
  hi: {
    'language.label':'भाषा','pdf.ready':'रिपोर्ट बनाने के लिए तैयार','pdf.locked':'चारों असेसमेंट पूरे होने तक लॉक','pdf.status.ready':'चारों असेसमेंट पूरे हो चुके हैं। अब कवर सारांश, insights, स्ट्रीम तुलना और सुझाए गए करियर के साथ काउंसलिंग रिपोर्ट बनाएं।','pdf.status.locked':'{{done}}/4 असेसमेंट पूरे हुए हैं। पूरी रिपोर्ट खोलने के लिए चारों टेस्ट पूरे करें।','pdf.generate':'रिपोर्ट बनाएं','pdf.generating':'प्रीमियम रिपोर्ट बन रही है…','pdf.preview':'सारांश देखें','pdf.preview.title':'प्रीमियम रिपोर्ट पूर्वावलोकन','pdf.cover':'कवर सारांश','pdf.confidence':'निर्णय आत्मविश्वास','pdf.confidence.note':'यह एक स्कोर नहीं, बल्कि कई असेसमेंट के प्रमाण पर आधारित है।','pdf.stream':'सुझाई गई स्ट्रीम','pdf.interest':'मुख्य रुचि कोड','pdf.topCareers':'मुख्य करियर क्लस्टर','pdf.adds':'इस रिपोर्ट में क्या मिलेगा','pdf.adds.text':'व्याख्या, स्ट्रीम तुलना, उपयुक्त करियर, कार्य योजना और काउंसलर discussion prompts।',
    'quiz.challenge':'करियर क्वेस्ट चुनौती','quiz.exit':'चुनौती से बाहर निकलें','quiz.activeMission':'सक्रिय मिशन','quiz.timeLeft':'बचा समय','quiz.questionsSolved':'हल किए गए प्रश्न','quiz.reward':'लगातार उत्तर दें, momentum बनाएं और पूरा challenge पूरा करके अपनी profile signal लॉक करें।','quiz.startStrong':'मजबूत शुरुआत करें — शुरुआती उत्तर आपके momentum को shape देते हैं।','quiz.nextUnlock':'अगला unlock {{pct}}% completion पर','quiz.allUnlocks':'सभी milestone unlock पूरे','quiz.stage':'स्टेज {{n}}/5','quiz.xp':'{{xp}} XP','quiz.momentum':'मोमेंटम x{{n}}','quiz.speed':'स्पीड बोनस: {{n}}','quiz.level':'लेवल {{n}}','quiz.complete':'{{pct}}% पूरा','quiz.inLevel':'लेवल {{level}} • इस लेवल में {{xp}}/250 XP','quiz.questionOf':'प्रश्न {{cur}}/{{total}}','quiz.choose':'अपने लिए सबसे उपयुक्त उत्तर चुनें।','quiz.speedLocked':'⚡ स्पीड बोनस लॉक','quiz.speedOffer':'जल्दी उत्तर देने पर + {{bonus}} बोनस XP','quiz.guide':'मार्गदर्शन','quiz.potentialXp':'संभावित XP','quiz.currentReward':'वर्तमान reward','quiz.saved':'क्लिक करते ही उत्तर सेव हो जाता है।','quiz.previous':'← पिछला','quiz.pause':'रोकें','quiz.finish':'चुनौती पूरी करें →','quiz.lock':'उत्तर लॉक करें →','quiz.return':'← ViaNova पर वापस जाएं',
    'alert.completeFirst':'पहले चारों असेसमेंट पूरे करें।','alert.doneOnce':'आप {{title}} पहले ही पूरा कर चुके हैं। हर असेसमेंट केवल एक बार दिया जा सकता है।','alert.doneOnceLogout':'आप {{title}} पहले ही पूरा कर चुके हैं। लॉगआउट के बाद भी हर असेसमेंट केवल एक बार दिया जा सकता है।',
    'career.why':'यह आपके लिए क्यों उपयुक्त है','career.noFound':'कोई करियर नहीं मिला','career.noBackend':'कृपया सुनिश्चित करें कि backend career sheet पढ़ पा रहा है।','career.noAvailable':'कोई करियर उपलब्ध नहीं','career.noMatched':'चुने गए filters से कोई रिकॉर्ड match नहीं हुआ।','career.tryAnother':'दूसरा combination आज़माएं','career.viewCard':'कार्ड देखें','career.match':'{{score}}% match','career.highFit':'High-fit path','career.worth':'Explore करने योग्य','career.care':'सावधानी से explore करें','career.option':'करियर विकल्प','career.cluster':'करियर क्लस्टर','career.noDesc':'विवरण अभी उपलब्ध नहीं है।','career.educationFallback':'कृपया विस्तृत करियर pathway देखें।','career.degreeFallback':'उपयुक्त डिग्री या सर्टिफिकेशन pathway','career.examsFallback':'संस्थान और pathway के अनुसार exams अलग-अलग हो सकते हैं।','career.salaryFallback':'शुरुआती आय employer, शहर, कौशल और role level के अनुसार अलग-अलग होती है।','career.employersFallback':'निजी कंपनियाँ, सरकारी संस्थान और specialist organisations','career.workEnvFallback':'भूमिका के अनुसार ऑफिस, फील्ड, लैब, स्टूडियो या हाइब्रिड माहौल','career.pathFallback':'प्रारंभिक भूमिका → विशेषज्ञता → वरिष्ठ या नेतृत्व स्तर','career.schemeFallback':'इस domain की current government schemes चेक करें'
  }
};
const STATIC_TEXT_HI = {'Dashboard':'डैशबोर्ड','Assessments':'असेसमेंट','Roadmap':'रोडमैप','Career Explorer':'करियर एक्सप्लोरर','My Report':'मेरी रिपोर्ट','Admin Panel':'एडमिन पैनल','Home':'होम','Tests':'टेस्ट','Careers':'करियर','Report':'रिपोर्ट','Continue':'आगे बढ़ें','Continue your journey →':'अपनी यात्रा जारी रखें →','View roadmap':'रोडमैप देखें','Discover careers':'करियर खोजें','Complete assessments':'असेसमेंट पूरे करें','Open my report':'मेरी रिपोर्ट खोलें','Browse all careers':'सभी करियर देखें','Generate PDF report':'रिपोर्ट बनाएं','Preview summary':'सारांश देखें','Locked until all 4 assessments are completed':'चारों असेसमेंट पूरे होने तक लॉक','Ready to generate':'रिपोर्ट बनाने के लिए तैयार','Validate & create account':'Validate करके account बनाएं','Login':'लॉगिन','Signup':'साइन अप','Logout':'लॉगआउट','Start Assessment':'असेसमेंट शुरू करें','Complete':'पूरा','In progress':'चल रहा है','Recommended for you':'आपके लिए सुझाए गए','All careers':'सभी करियर','Science':'साइंस','Arts':'आर्ट्स','Commerce':'कॉमर्स','Humanities':'ह्यूमैनिटीज','Stream':'स्ट्रीम','Entrance Exam':'एंट्रेंस एग्जाम','Degree / Diploma':'डिग्री / डिप्लोमा','Clear filters':'फिल्टर हटाएं','Search':'खोजें'};
const QUIZ_HI = {"interest": {"title": "RIASEC रुचि सूची", "subtitle": "हर गतिविधि को इस आधार पर रेट करें कि आपको वह कितनी पसंद आएगी।", "labels": ["बिल्कुल पसंद नहीं", "पसंद नहीं", "तटस्थ", "पसंद", "बहुत पसंद"], "prompts": {"R1": "साइकिल या मशीन की मरम्मत करना", "R2": "लंबे समय तक बाहर काम करना", "R3": "हथौड़ा या ड्रिल जैसे औज़ार इस्तेमाल करना", "R4": "लकड़ी, धातु या पुर्जों से कुछ बनाना", "R5": "घर की बिजली से जुड़ी चीज़ें ठीक करना", "R6": "इंजन या वाहनों के साथ काम करना", "R7": "फर्नीचर या उपकरण जोड़ना", "R8": "हाथों से किया जाने वाला व्यावहारिक काम करना", "R9": "वायरिंग या फिटिंग लगाना/ठीक करना", "R10": "सिर्फ पढ़ने के बजाय करके सीखना", "R11": "विज्ञान आधारित समस्याएँ हल करना", "R12": "विचारों को परखने के लिए प्रयोग करना", "R13": "ग्राफ, संख्याएँ या पैटर्न समझना", "R14": "मशीनें या सिस्टम कैसे काम करते हैं यह पढ़ना", "R15": "निर्णय लेने से पहले विषयों पर गहराई से रिसर्च करना", "R16": "कठिन गणित पहेलियाँ हल करना", "R17": "नई तकनीकों के बारे में सीखना", "R18": "डेटा या प्रकृति में पैटर्न देखना", "R19": "जीवविज्ञान, रसायन या भौतिकी की अवधारणाएँ पसंद करना", "R20": "जटिल प्रश्नों पर गहराई से सोचना", "R21": "ड्रॉइंग, स्केचिंग या पेंटिंग करना", "R22": "कहानियाँ, कविताएँ या स्क्रिप्ट लिखना", "R23": "पोस्टर, ग्राफिक्स या लेआउट डिजाइन करना", "R24": "वाद्य यंत्र बजाना या गाना", "R25": "अभिनय, प्रदर्शन या रचनात्मक बोलना", "R26": "वीडियो या डिजिटल कंटेंट बनाना", "R27": "नए और मौलिक विचार सोचना", "R28": "कमरों को सजाना या जगहों का डिजाइन बनाना", "R29": "कला या संगीत से भावनाएँ व्यक्त करना", "R30": "कड़ी दिनचर्या के बजाय खुले प्रकार के काम पसंद करना", "R31": "दोस्तों की व्यक्तिगत समस्याएँ सुलझाने में मदद करना", "R32": "किसी को धैर्य से कोई अवधारणा समझाना", "R33": "सामाजिक कारण के लिए स्वयंसेवा करना", "R34": "टीम में मिलकर काम करना", "R35": "किसी के परेशान होने पर ध्यान से सुनना", "R36": "बच्चों, बुजुर्गों या जानवरों की देखभाल करना", "R37": "किसी छोटे/जूनियर को मार्गदर्शन देना", "R38": "समूह चर्चा में सम्मानपूर्वक भाग लेना", "R39": "दूसरों को नई कौशल सीखने में मदद करना", "R40": "ऐसा काम चुनना जिससे लोगों को सीधे लाभ हो", "R41": "समूह या टीम गतिविधि का नेतृत्व करना", "R42": "दूसरों को अपने विचार का समर्थन करने के लिए मनाना", "R43": "उत्पाद, सेवा या विचार बेचना", "R44": "छोटा प्रोजेक्ट या व्यवसाय शुरू करना", "R45": "बिना कहे पहल करना", "R46": "इवेंट या समूह प्रोजेक्ट मैनेज करना", "R47": "बड़े लक्ष्यों को पाने के लिए प्रतिस्पर्धा करना", "R48": "विकास के लिए सोच-समझकर जोखिम लेना", "R49": "बेहतर परिणाम के लिए बातचीत/नेगोशिएशन करना", "R50": "कैंपेन या ड्राइव आयोजित करना", "R51": "फाइलें, फोल्डर या रिकॉर्ड व्यवस्थित करना", "R52": "संख्याओं और डेटा के साथ सावधानी से काम करना", "R53": "समय-सारणी का सख्ती से पालन करना", "R54": "रिकॉर्ड या लॉग सही तरीके से बनाए रखना", "R55": "स्प्रेडशीट या टेबल साफ-सुथरे ढंग से इस्तेमाल करना", "R56": "संरचित दोहराए जाने वाले काम अच्छी तरह करना", "R57": "चीज़ों को साफ क्रम में लगाना", "R58": "स्पष्ट नियम और सिस्टम पसंद करना", "R59": "बिना गलती डेटा दर्ज करना", "R60": "बजट, खाते या इन्वेंट्री मैनेज करना"}}, "aptitude": {"title": "एप्टीट्यूड असेसमेंट", "subtitle": "ध्यान से सोचें और सबसे सही उत्तर चुनें।", "prompts": {"A1": "यदि x + 1/x = 5 है, तो x² + 1/x² कितना होगा?", "A2": "120 मीटर लंबी ट्रेन एक खंभे को 6 सेकंड में पार करती है। उसकी गति क्या है?", "A3": "A और B की वर्तमान आयु का अनुपात 3:5 है। 10 साल बाद यह 5:7 हो जाता है। B की वर्तमान आयु क्या है?", "A4": "किसी संख्या का 15% = 45 है। उसी संख्या का 35% क्या होगा?", "A5": "एक दुकानदार लागत मूल्य से 40% अधिक अंकित मूल्य रखता है और फिर अंकित मूल्य पर 10% छूट देता है। लाभ प्रतिशत क्या है?", "A6": "हल करें: (3x - 2)/2 + (x + 1)/3 = 5", "A7": "10% वार्षिक चक्रवृद्धि ब्याज पर 3 साल में राशि ₹1331 हो जाती है। मूलधन कितना था?", "A8": "यदि a:b = 2:3 और b:c = 4:5 है, तो a:c = ?", "A9": "5 संख्याओं का औसत 28 है। एक संख्या हटाने पर बाकी 4 का औसत 26 हो जाता है। कौन-सी संख्या हटाई गई?", "A10": "एक पाइप टैंक को 6 घंटे में भर सकता है और दूसरा 8 घंटे में खाली कर सकता है। दोनों साथ खुलें तो टैंक कितने घंटे में भरेगा?", "A11": "‘Meticulous’ का समानार्थी शब्द चुनें।", "A12": "‘Obscure’ का विलोम शब्द चुनें।", "A13": "रिक्त स्थान भरें: “No sooner ___ he reached the station than the train started moving.”", "A14": "सही व्याकरण वाला वाक्य पहचानें।", "A15": "सबसे सही समानता चुनें: Pen : Write :: Knife : ?", "A16": "‘Alleviate’ का सही अर्थ चुनें।", "A17": "सही वाक्य चुनें।", "A18": "शब्दों को सही वाक्य में व्यवस्थित करें: always / she / on time / is", "A19": "सही preposition चुनें: “He is capable ___ solving this problem.”", "A20": "मुहावरे “break the ice” का अर्थ क्या है?", "A21": "अगला पद ज्ञात करें: 2, 6, 7, 21, 22, 66, ?", "A22": "कौन-सी संख्या अलग है?", "A23": "यदि CAT को DBU लिखा जाता है, तो DOG कैसे लिखा जाएगा?", "A24": "कथन: सभी गुलाब फूल हैं। कुछ फूल जल्दी मुरझाते हैं। कौन-सा निष्कर्ष तार्किक रूप से सही है?", "A25": "A, B का पिता है। C, A की माँ है। C का B से क्या संबंध है?", "A26": "एक व्यक्ति 10 मीटर उत्तर, फिर 5 मीटर पूर्व, फिर 10 मीटर दक्षिण चलता है। आरंभ बिंदु की तुलना में वह कहाँ है?", "A27": "अगला पद ज्ञात करें: 4, 6, 9, 13, 18, ?", "A28": "सभी वर्ग आयत हैं। सभी आयत आकृतियाँ हैं। कौन-सा निष्कर्ष निश्चित रूप से सही है?", "A29": "4:20 बजे घंटे और मिनट की सुई के बीच कोण कितना होगा?", "A30": "श्रृंखला में अगली जोड़ी चुनें: AZ, BY, CX, DW, ?", "A31": "चित्र देखकर MAP की सही दर्पण छवि चुनें।", "A32": "विकल्पों को देखें और वह नेट चुनें जो मोड़ने पर घन बन सके।", "A33": "कागज़ को दो बार मोड़कर एक छेद किया गया है। खोलने पर कितने छेद दिखेंगे?", "A34": "मूल त्रिभुज ऊपर की ओर है। 180° घुमाने के बाद कौन-सा विकल्प सही होगा?", "A35": "किस विकल्प में लक्ष्य त्रिभुज बिल्कुल उसी रूप में छिपा है?", "A36": "एक घन की सभी 6 सतहों पर रंग किया गया और उसे 64 छोटे बराबर घनों में काटा गया। ठीक 3 सतहों पर रंग वाले छोटे घन कितने होंगे?", "A37": "3 × 3 ग्रिड में कुल कितने आयत हैं?", "A38": "यदि घन की ऊपर वाली सतह 2 और नीचे वाली सतह 5 है, तो सामने वाली 3 के विपरीत सतह कौन-सी होगी?", "A39": "यदि उत्तर दिशा को पश्चिम मान लिया जाए, तो पूर्व दिशा किस दिशा के रूप में मानी जाएगी?", "A40": "एक व्यक्ति 12 मीटर पश्चिम, फिर 5 मीटर दक्षिण, फिर 12 मीटर पूर्व चलता है। आरंभ बिंदु से वह किस दिशा में है?", "A41": "गियर A घड़ी की दिशा में घूमता है। चित्र के आधार पर गियर C किस दिशा में घूमेगा?", "A42": "चार पुली व्यवस्थाओं में से किसमें भार उठाने के लिए सबसे कम प्रयास लगेगा?", "A43": "किस लीवर व्यवस्था में समान भार उठाने के लिए सबसे कम प्रयास लगेगा?", "A44": "ब्लॉक को ऊपर धकेलने के लिए किस झुके हुए तल पर सबसे कम बल लगेगा?", "A45": "यदि सभी पहिए समान दर से घूमें, तो एक चक्कर में कौन-सा सबसे अधिक दूरी तय करेगा?", "A46": "गियर A में 10 दाँत हैं और वह 20 दाँत वाले गियर B को चलाता है। कौन-सा गियर तेज़ घूमेगा?", "A47": "यदि मशीन में घर्षण बढ़ता है, तो सामान्यतः दक्षता पर क्या असर पड़ता है?", "A48": "कार्य = बल × दूरी। यदि बल समान रहे और दूरी दोगुनी हो जाए, तो कार्य कितना होगा?", "A49": "कौन-सा उपकरण विद्युत ऊर्जा को यांत्रिक गति में बदलता है?", "A50": "दाब = बल ÷ क्षेत्रफल। यदि बल समान रहे और क्षेत्रफल बढ़ जाए, तो दाब क्या होगा?"}, "options": {"A2": ["54 किमी/घंटा", "60 किमी/घंटा", "72 किमी/घंटा", "80 किमी/घंटा"], "A3": ["15 साल", "20 साल", "25 साल", "30 साल"], "A10": ["18 घंटे", "20 घंटे", "24 घंटे", "28 घंटे"], "A11": ["लापरवाह", "सटीक", "आवेगी", "शोरगुल वाला"], "A12": ["छिपा हुआ", "भ्रमित करने वाला", "स्पष्ट", "अंधेरा"], "A14": ["वह अपनी बहन से अधिक समझदार है।", "वह अपनी बहन से समझदार है।", "वह अपनी बहन से सबसे समझदार है।", "वह अपनी बहन से समझदार है।"], "A15": ["तेज़", "काटना", "स्टील", "ब्लेड"], "A16": ["बढ़ाना", "कम करना", "छिपाना", "देरी करना"], "A17": ["उसे उत्तर नहीं पता।", "उसे उत्तर नहीं पता।", "उसे उत्तर नहीं पता।", "उसे उत्तर नहीं पता।"], "A18": ["वह हमेशा समय पर होती है।", "हमेशा वह समय पर होती है।", "वह हमेशा समय पर होती है।", "समय पर वह हमेशा होती है।"], "A20": ["जमी हुई बर्फ तोड़ना", "मित्रतापूर्ण बातचीत शुरू करना", "बहस अचानक समाप्त करना", "बात करने से बचना"], "A24": ["सभी गुलाब जल्दी मुरझाते हैं।", "कुछ गुलाब जल्दी मुरझा सकते हैं।", "कोई फूल जल्दी नहीं मुरझाता।", "सभी फूल गुलाब हैं।"], "A25": ["माँ", "दादी/नानी", "चाची/मौसी", "बहन"], "A26": ["आरंभ बिंदु पर", "5 मीटर पूर्व", "5 मीटर पश्चिम", "10 मीटर उत्तर"], "A28": ["सभी आकृतियाँ आयत हैं।", "कुछ आकृतियाँ आयत नहीं हैं।", "सभी वर्ग आकृतियाँ हैं।", "कोई आयत वर्ग नहीं है।"], "A31": ["PAM", "दर्पण में उल्टा MAP", "MAP", "W∀Ԁ"], "A38": ["2", "3", "5", "निर्धारित नहीं किया जा सकता"], "A39": ["उत्तर", "दक्षिण", "पश्चिम", "पूर्व"], "A40": ["उत्तर", "दक्षिण", "पूर्व", "पश्चिम"], "A41": ["घड़ी की दिशा में", "घड़ी की उल्टी दिशा में", "A जैसा ही", "निर्धारित नहीं किया जा सकता"], "A46": ["गियर A", "गियर B", "दोनों समान गति से घूमेंगे", "निर्धारित नहीं किया जा सकता"], "A47": ["यह बढ़ती है", "यह घटती है", "यह समान रहती है", "यह दोगुनी हो जाती है"], "A48": ["आधा", "दोगुना", "अपरिवर्तित", "शून्य"], "A49": ["जनरेटर", "मोटर", "बैटरी", "स्विच"], "A50": ["बढ़ेगा", "घटेगा", "समान रहेगा", "शून्य हो जाएगा"]}}, "personality": {"title": "बिग फाइव व्यक्तित्व", "subtitle": "हर कथन पर ईमानदारी से उत्तर दें। कोई सही या गलत व्यक्तित्व नहीं होता।", "labels": ["बिल्कुल असहमत", "असहमत", "तटस्थ", "सहमत", "पूरी तरह सहमत"], "prompts": {"P1": "मुझे नए विचार और अनुभव आज़माना पसंद है।", "P2": "मुझे कला, कल्पना और रचनात्मकता पसंद है।", "P3": "मुझे विविधता के बजाय दिनचर्या पसंद है।", "P4": "मैं कई अलग-अलग विषयों के बारे में जिज्ञासु रहता/रहती हूँ।", "P5": "मैं काम समय पर पूरा करता/करती हूँ।", "P6": "मैं अपना काम और सामग्री व्यवस्थित रखता/रखती हूँ।", "P7": "मैं अक्सर काम अधूरा छोड़ देता/देती हूँ।", "P8": "मैं काम शुरू करने से पहले योजना बनाता/बनाती हूँ।", "P9": "मुझे कई लोगों से मिलना और बात करना पसंद है।", "P10": "सामाजिक परिस्थितियों में मुझे ऊर्जा महसूस होती है।", "P11": "मैं समूहों में शांत रहना पसंद करता/करती हूँ।", "P12": "मुझे बातचीत में नेतृत्व लेना पसंद है।", "P13": "मैं दूसरों की भावनाओं का ध्यान रखता/रखती हूँ।", "P14": "मैं अनावश्यक विवादों से बचता/बचती हूँ।", "P15": "चिढ़ने पर मैं रूखा/रूखी हो सकता/सकती हूँ।", "P16": "मैं टीमों में आसानी से सहयोग करता/करती हूँ।", "P17": "मैं ज़्यादातर लोगों से अधिक चीज़ों की चिंता करता/करती हूँ।", "P18": "दबाव में मैं जल्दी तनाव महसूस करता/करती हूँ।", "P19": "कठिन परिस्थितियों में मैं शांत रहता/रहती हूँ।", "P20": "चीज़ें गलत होने पर मेरा मूड जल्दी बदल जाता है।"}}, "values": {"title": "वर्क वैल्यूज़ सूची", "subtitle": "बताइए कि काम/करियर में ये बातें आपके लिए कितनी महत्वपूर्ण हैं।", "labels": ["महत्वपूर्ण नहीं", "थोड़ा महत्वपूर्ण", "मध्यम महत्वपूर्ण", "महत्वपूर्ण", "बहुत महत्वपूर्ण"], "prompts": {"W1": "मैं ऐसा काम चाहता/चाहती हूँ जहाँ कठिन लक्ष्य पूरे कर सकूँ।", "W2": "मैं अपनी उपलब्धियों पर गर्व महसूस करना चाहता/चाहती हूँ।", "W3": "मैं काम करने का तरीका तय करने की स्वतंत्रता चाहता/चाहती हूँ।", "W4": "मुझे स्वायत्तता और लचीलापन देने वाले करियर पसंद हैं।", "W5": "मैं चाहता/चाहती हूँ कि मेरे काम को पहचाना और सराहा जाए।", "W6": "पुरस्कार और प्रतिष्ठा मेरे लिए मायने रखते हैं।", "W7": "मैं ऐसा काम चाहता/चाहती हूँ जहाँ लोगों की सीधे मदद कर सकूँ।", "W8": "मित्रवत सहकर्मी मेरे लिए महत्वपूर्ण हैं।", "W9": "मैं वरिष्ठों से मार्गदर्शन और मेंटरिंग को महत्व देता/देती हूँ।", "W10": "मुझे ऐसे कार्यस्थल पसंद हैं जहाँ लोग एक-दूसरे की मदद करते हैं।", "W11": "नौकरी की स्थिरता मेरे लिए बहुत मायने रखती है।", "W12": "मुझे सुरक्षित और आरामदायक कार्य वातावरण पसंद है।", "W13": "मैं करियर और व्यक्तिगत जीवन के बीच संतुलन चाहता/चाहती हूँ।", "W14": "लचीला समय मेरे लिए महत्वपूर्ण है।", "W15": "मैं ऐसा करियर चाहता/चाहती हूँ जिसमें लगातार सीखना हो।", "W16": "मुझे ऐसे कार्यस्थल पसंद हैं जो मुझे बढ़ने की चुनौती देते हैं।"}}};
function tx(key, vars) { let s = (I18N[currentLang()] && I18N[currentLang()][key]) || (I18N.en && I18N.en[key]) || key; vars = vars || {}; Object.keys(vars).forEach(function(k){ s = s.replace(new RegExp('\{\{'+k+'\}\}','g'), vars[k]); }); return s; }
function currentLang() { return AppState.lang; }
function isHindi() { return currentLang() === 'hi'; }
function getQuizHiKey(type, q) { const id = String(q && q.id != null ? q.id : ''); if (type === 'aptitude') return id.charAt(0) === 'A' ? id : 'A' + id; if (type === 'personality') return id.charAt(0) === 'B' ? 'P' + id.slice(1) : id; return id; }
function getLocalizedQuiz(type) { const base = QUIZ_DATA[type]; if (!base) return base; if (!isHindi()) return base; const hi = QUIZ_HI[type] || {}; const cloned = Object.assign({}, base); cloned.title = hi.title || base.title; cloned.subtitle = hi.subtitle || base.subtitle; cloned.labels = hi.labels || base.labels; cloned.questions = (base.questions || []).map(function(q) { const copy = Object.assign({}, q); const key = getQuizHiKey(type, q); if (hi.prompts && hi.prompts[key]) copy.prompt = hi.prompts[key]; if (hi.options && hi.options[key]) copy.options = hi.options[key]; if (hi.explanations && hi.explanations[key]) copy.explanation = hi.explanations[key]; return copy; }); return cloned; }
function getChallengeMeta(type, meta) { if (!isHindi()) return meta; const map = { interest:{badge:'🧭 पैशन फाइंडर',headline:'जो आपको ऊर्जा देता है, उसे पहचानें।',tone:'आप उन क्षेत्रों को map कर रहे हैं जो आपको स्वाभाविक रूप से exciting लगते हैं।'}, aptitude:{badge:'🧠 ब्रेन चैलेंज',headline:'Logic, patterns और focus को परखें।',tone:'यह round शांत सोच और problem-solving stamina को reward करता है।'}, personality:{badge:'🎭 व्यक्तित्व डिकोड',headline:'देखें कि आप naturally कैसे operate करते हैं।',tone:'ईमानदारी से उत्तर दें — कोई perfect personality type नहीं होता।'}, values:{badge:'🎯 लाइफ कम्पास',headline:'जानें कि आपके लिए सबसे महत्वपूर्ण क्या है।',tone:'यह ViaNova को career match आपके deeper priorities से जोड़ने में मदद करता है।'} }; return Object.assign({}, meta, map[type] || {}); }
function setAppLanguage(lang) { AppState.lang = lang === 'hi' ? 'hi' : 'en'; state.lang = AppState.lang; document.documentElement.lang = isHindi() ? 'hi' : 'en'; const sel = document.getElementById('vn-lang-select'); if (sel) sel.value = AppState.lang; applyStaticI18n(document.body); try { renderPdfControls(); } catch(e) {} try { renderCareerContent(); } catch(e) {} try { updateRoadmapUI(); } catch(e) {} }
function applyStaticI18n(root) { root = root || document.body; const label = document.querySelector('#vn-lang-switcher label'); if (label) label.textContent = tx('language.label'); if (!isHindi()) return; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode:function(node){ const parent=node.parentElement; if(!parent || ['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT; const text=String(node.nodeValue||'').replace(/\s+/g,' ').trim(); return text && STATIC_TEXT_HI[text] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } }); const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(function(n){ const key=String(n.nodeValue||'').replace(/\s+/g,' ').trim(); n.nodeValue=n.nodeValue.replace(key, STATIC_TEXT_HI[key]); }); }
function careerField(career, field, fallback) { if(!career) return fallback||''; const lang=currentLang(); return career[field+'_'+lang] || career[field+(lang==='hi'?'Hi':'En')] || career[field] || fallback || ''; }
function localizedCareerTitle(career) { return careerField(career,'title',tx('career.option')); }
function localizedCareerCluster(career) { return careerField(career,'cluster',tx('career.cluster')); }
function localizedCareerDescription(career) { return careerField(career,'description',tx('career.noDesc')); }

// Career Explorer language helpers: details must be localized at click/render time,
// not frozen when the careers are first loaded from Google Sheets.
function firstAvailable() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (Array.isArray(v) && v.length) return v;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v !== null && v !== undefined && typeof v !== 'string' && !Array.isArray(v)) return v;
  }
  return '';
}
function rawCareerField(career, base, lang) {
  if (!career) return '';
  lang = lang || currentLang();
  var suffix = lang === 'hi' ? ['_hi','Hi',' Hindi','Hindi'] : ['_en','En',' English','English'];
  var candidates = [base + suffix[0], base + suffix[1], base + suffix[2], base + suffix[3], base];
  for (var i=0;i<candidates.length;i++) {
    var key = candidates[i];
    if (career[key] !== undefined && career[key] !== null && String(career[key]).trim()) return career[key];
  }
  return '';
}
function splitLocalizedList(value, limit) { return splitList(value || '', limit || 12).filter(Boolean); }
function localizeCareerTerm(term) {
  if (!isHindi()) return term || '';
  var map = {
    'Science':'साइंस','Commerce':'कॉमर्स','Arts':'आर्ट्स','Humanities':'ह्यूमैनिटीज','Medical':'मेडिकल','Non-Medical':'नॉन-मेडिकल',
    'Engineering':'इंजीनियरिंग','Technology':'टेक्नोलॉजी','Healthcare':'हेल्थकेयर','Medicine':'मेडिसिन','Design':'डिज़ाइन','Business':'बिज़नेस','Finance':'फाइनेंस','Management':'मैनेजमेंट','Law':'लॉ','Education':'एजुकेशन','Media':'मीडिया','Communication':'कम्युनिकेशन','Psychology':'साइकोलॉजी','Social Sciences':'सोशल साइंसेज़','Data':'डेटा','Research':'रिसर्च','Analytics':'एनालिटिक्स','Architecture':'आर्किटेक्चर','Aviation':'एविएशन','Hospitality':'हॉस्पिटैलिटी','Agriculture':'एग्रीकल्चर','Government':'सरकारी क्षेत्र','Civil Services':'सिविल सर्विसेज',
    'Communication':'संचार कौशल','Problem solving':'समस्या समाधान','Leadership':'लीडरशिप','Creativity':'रचनात्मकता','Analysis':'विश्लेषण','Analytical thinking':'विश्लेषणात्मक सोच','Teamwork':'टीमवर्क','Technical skills':'तकनीकी कौशल','Research skills':'रिसर्च कौशल','Writing':'लेखन','Public speaking':'पब्लिक स्पीकिंग','Critical thinking':'आलोचनात्मक सोच',
    'Office':'ऑफिस','Field':'फील्ड','Lab':'लैब','Studio':'स्टूडियो','Hybrid':'हाइब्रिड'
  };
  var t = String(term || '').trim();
  return map[t] || t;
}
function localizeCareerList(career, base, fallbackList) {
  var raw = rawCareerField(career, base, currentLang());
  var arr = Array.isArray(raw) ? raw : splitLocalizedList(raw, 20);
  if (!arr.length && Array.isArray(career && career[base])) arr = career[base];
  if (!arr.length && fallbackList) arr = fallbackList;
  return (arr || []).map(localizeCareerTerm).filter(Boolean);
}
function localizedCareerGenericDescription(career) {
  var title = localizedCareerTitle(career);
  var cluster = localizedCareerCluster(career);
  if (!isHindi()) return careerField(career, 'description', tx('career.noDesc'));
  return title + ' एक ' + cluster + ' से जुड़ा करियर विकल्प है। इसमें विषय-ज्ञान, सही skills, entrance pathway और practical exposure को समझना ज़रूरी होता है। इस कार्ड को stream fit, assessment report और counselor discussion के साथ देखकर निर्णय लें।';
}
function localizedCareerLongField(career, base, fallbackKey) {
  var v = rawCareerField(career, base, currentLang());
  if (isHindi() && (!v || /[A-Za-z]{4,}/.test(String(v)))) {
    if (base === 'description') return localizedCareerGenericDescription(career);
    if (base === 'workEnvironment') return tx('career.workEnvFallback');
    if (base === 'careerPath') return tx('career.pathFallback');
    if (base === 'employers') return tx('career.employersFallback');
    if (base === 'education' || base === 'minimumEducation') return tx('career.educationFallback');
    if (base === 'degree') return tx('career.degreeFallback');
    if (base === 'exams') return tx('career.examsFallback');
  }
  return v || tx(fallbackKey || 'career.noDesc');
}
function localizedCareerSubtitle(career) {
  var pieces = [localizedCareerCluster(career)];
  var streams = (career && career.streams || []).map(localizeCareerTerm);
  if (streams[0]) pieces.push(streams[0]);
  return pieces.filter(Boolean).join(' • ');
}
function localizedCareerTags(career) {
  var tags = [];
  var streams = (career && career.streams || []).map(localizeCareerTerm);
  if (streams[0]) tags.push(streams[0]);
  if (career && career.hollandCode) tags.push(career.hollandCode);
  var skills = localizeCareerList(career, 'skills', career && career.skills);
  if (skills[0]) tags.push(skills[0]);
  return tags.filter(Boolean).slice(0,3);
}
function setCareerModalSectionLabels() {
  var overlay = document.getElementById('career-modal-overlay');
  if (!overlay) return;
  var labels = isHindi() ? ['वे क्या करते हैं?','मुख्य कौशल','शिक्षा pathway','शुरुआती salary','काम का माहौल','सामान्य employers','करियर path','यह आपके लिए क्यों उपयुक्त है','सबसे अच्छा next action'] : ['What do they do?','Key skills','Education pathway','Entry salary','Work environment','Typical employers','Career path','Why this may fit you','Best next action'];
  overlay.querySelectorAll('.modal-section-title').forEach(function(el, idx){ if (labels[idx]) el.textContent = labels[idx]; });
}
function getLocalizedCareerWhyFit(career) {
  if (!isHindi()) return getCareerWhyFit(career);
  var score = Number(career && career.score || 0);
  if (score >= 85) return 'यह करियर आपके assessment profile से strong match दिखाता है। इसे priority option की तरह explore करें और subjects, entrance exams तथा तैयारी की demand ज़रूर compare करें।';
  if (score >= 70) return 'यह करियर आपके profile से अच्छा match रखता है। इसे 2–3 similar careers के साथ shortlist करके skills, exams और study path compare करें।';
  return 'यह career explore करने योग्य है। Final decision से पहले pathway, subjects और stronger-fit roles के साथ तुलना करें।';
}
function getLocalizedCareerNextAction(career) {
  if (!isHindi()) return getCareerNextAction(career);
  var score = Number(career && career.score || 0);
  if (score >= 85) return 'इसे priority option मानकर stream fit, required subjects और entrance pathway के साथ compare करें।';
  if (score >= 70) return 'इसे 2–3 similar careers के साथ shortlist करें और skills, entrance exams तथा study demand compare करें।';
  return 'इसे explore option रखें। Pathway पढ़ें और stronger-fit careers से compare करके decision लें।';
}
function detectEnglishLeak(text) { if(!isHindi()) return []; const allowed=['ViaNova','NEP','CBSE','ICSE','CUET','JEE','NEET','AI','UX','UI','XP','RIASEC','PDF','HTML','Google','STEM','IT','MBA','CA','CS','BBA','BCA','NDA']; const found=String(text||'').match(/[A-Za-z]{3,}/g)||[]; return found.filter(function(w){ return allowed.indexOf(w)===-1; }).slice(0,80); }
function initLanguageControls() { const sel=document.getElementById('vn-lang-select'); if(sel){ sel.value=AppState.lang; sel.addEventListener('change',function(){ setAppLanguage(sel.value); }); } setAppLanguage(AppState.lang); const obs=new MutationObserver(function(muts){ if(!isHindi()) return; muts.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes||[],function(n){ if(n.nodeType===1) applyStaticI18n(n); }); }); }); obs.observe(document.body,{childList:true,subtree:true}); }
const REPORT_TEMPLATES = { en:{title:'Career Direction Report',subtitle:'Counselor-ready guidance based on interest, aptitude, personality and work values.',preparedFor:'Prepared for',classLabel:'Class',generated:'Generated on',stream:'Recommended Stream',confidence:'Profile Confidence',interest:'Interest Code',snapshot:'Executive Snapshot',careers:'Top Career Clusters to Explore',action:'Action Plan',note:'This report is a decision-support tool, not a fixed verdict. Final decisions should combine assessment evidence with marks, subject comfort, parent context and informed exploration.',print:'Print / Save as PDF',close:'Close',week1:'Review the report with parents and shortlist 3 clusters to explore.',week2:'Check subjects, entrance exams, colleges and daily work reality.',week3:'Compare marks trend, preparation demand, budget and backup options.'}, hi:{title:'करियर दिशा रिपोर्ट',subtitle:'रुचि, एप्टीट्यूड, व्यक्तित्व और work values पर आधारित counselor-ready guidance.',preparedFor:'रिपोर्ट किसके लिए',classLabel:'कक्षा',generated:'तारीख',stream:'सुझाई गई स्ट्रीम',confidence:'प्रोफ़ाइल आत्मविश्वास',interest:'रुचि कोड',snapshot:'मुख्य सारांश',careers:'मुख्य करियर क्लस्टर',action:'कार्य योजना',note:'यह रिपोर्ट decision-support tool है, fixed verdict नहीं। अंतिम निर्णय में marks, subject comfort, parent context और informed exploration भी शामिल करें।',print:'Print / PDF सेव करें',close:'बंद करें',week1:'Parents के साथ रिपोर्ट देखें और 3 clusters shortlist करें।',week2:'Subjects, entrance exams, colleges और daily work reality चेक करें।',week3:'Marks trend, preparation demand, budget और backup options compare करें।'} };
function rt(key) { return (REPORT_TEMPLATES[currentLang()] && REPORT_TEMPLATES[currentLang()][key]) || REPORT_TEMPLATES.en[key] || key; }
function generateHtmlReportDocument() {
  const profile = state.assessmentProfile || {}, results = state.assessmentResults || {}, clusters = buildCareerClusterRecommendationsForPdf(5) || [];
  const name = escapeHtml(state.name || (isHindi() ? 'विद्यार्थी' : 'Student'));
  const cls = escapeHtml(state.cls || '—'), board = escapeHtml(state.board || '—'), city = escapeHtml(state.city || '—');
  const dateStr = new Date().toLocaleDateString(isHindi() ? 'hi-IN' : 'en-IN', { day:'numeric', month:'long', year:'numeric' });
  const confidence = Math.max(68, Math.min(96, 62 + (state.completedTests || []).length * 6 + Math.round(((clusters[0] && clusters[0].score) || 0) / 10)));
  const interest = (results.interest && results.interest.result) || {}, aptitude = (results.aptitude && results.aptitude.result) || {}, personality = (results.personality && results.personality.result) || {}, values = (results.values && results.values.result) || {};
  function top(obj,n){ return Object.keys(obj||{}).sort(function(a,b){ return Number(obj[b]||0)-Number(obj[a]||0); }).slice(0,n||3); }
  const topRiasec = profile.topRiasec && profile.topRiasec.length ? profile.topRiasec : top(interest.pct || profile.riasec || {}, 3);
  const topApt = profile.topAptitude && profile.topAptitude.length ? profile.topAptitude : top(aptitude.pct || profile.aptitudePct || {}, 3);
  const topTraits = profile.topTraits && profile.topTraits.length ? profile.topTraits : top(personality.pct || profile.personalityPct || {}, 3);
  const topVals = profile.topValues && profile.topValues.length ? profile.topValues : top(values.pct || profile.valuesPct || {}, 3);
  const recommendedStream = escapeHtml(profile.recommendedStream || (isHindi() ? 'काउंसलर के साथ चर्चा करें' : 'To be discussed with counselor'));
  const careerRows = clusters.length ? clusters.slice(0,5).map(function(c,i){
    return '<div class="hr-card"><div class="rank">'+(i+1)+'</div><div><h3>'+escapeHtml(c.cluster)+'</h3><p>'+escapeHtml(c.description)+'</p><small>'+(c.score||'—')+'% match • '+escapeHtml(c.careerCount+' related careers')+' • '+escapeHtml(clusterSampleCareerText(c, 6))+'</small></div></div>';
  }).join('') : '<p>'+(isHindi()?'Career Explorer data load होने के बाद cluster suggestions दिखाई देंगे।':'Career cluster suggestions will appear after Career Explorer data loads.')+'</p>';
  return '<!doctype html><html lang="'+(isHindi()?'hi':'en')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+rt('title')+'</title><style>body{margin:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#20304a}.page{max-width:980px;margin:0 auto;padding:28px}.cover{background:linear-gradient(135deg,#26354d,#3e577c);color:white;border-radius:28px;padding:40px;margin-bottom:22px;box-shadow:0 20px 60px rgba(28,41,61,.18)}.brand{font-weight:800;letter-spacing:.16em;color:#f2b07a;font-size:12px}h1{font-family:Georgia,serif;font-size:46px;margin:22px 0 10px}h2{font-family:Georgia,serif;font-size:28px;margin:26px 0 12px}.sub{font-size:16px;line-height:1.75;opacity:.86;max-width:720px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.tile,.section,.hr-card{background:white;border:1px solid #dce4ee;border-radius:20px;padding:18px;box-shadow:0 10px 28px rgba(28,41,61,.10)}.tile b{display:block;color:#e47b2d;font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.tile strong{font-size:22px}.section{margin-bottom:18px}.pill{display:inline-block;padding:8px 12px;border-radius:999px;background:#fff0e3;color:#c85f18;font-weight:700;margin:4px}.hr-card{display:flex;gap:14px;margin-bottom:12px}.rank{width:34px;height:34px;border-radius:12px;background:#e47b2d;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none}.hr-card h3{margin:0 0 6px;font-size:18px}.hr-card p{margin:0 0 8px;color:#55657f;line-height:1.55}.note{background:#fff5e2;color:#6f4510;border-radius:18px;padding:16px;line-height:1.65}.actions{position:sticky;bottom:0;background:rgba(238,242,247,.96);padding:14px;display:flex;gap:10px;justify-content:center}button{padding:12px 18px;border-radius:999px;border:0;background:#e47b2d;color:white;font-weight:800;cursor:pointer}button.secondary{background:white;color:#20304a;border:1px solid #dce4ee}@media print{.actions{display:none}body{background:white}.page{padding:0}.section,.tile,.hr-card{box-shadow:none}}@media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:34px}}</style></head><body><div class="page"><section class="cover"><div class="brand">VIANOVA • NEP CAREER COMPANION</div><h1>'+rt('title')+'</h1><p class="sub">'+rt('subtitle')+'</p><div class="grid"><div class="tile"><b>'+rt('preparedFor')+'</b><strong>'+name+'</strong><p>'+rt('classLabel')+' '+cls+' • '+board+' • '+city+'</p></div><div class="tile"><b>'+rt('stream')+'</b><strong>'+recommendedStream+'</strong></div><div class="tile"><b>'+rt('confidence')+'</b><strong>'+confidence+'%</strong><p>'+rt('generated')+' '+dateStr+'</p></div></div></section><section class="section"><h2>'+rt('snapshot')+'</h2><span class="pill">'+rt('interest')+': '+escapeHtml(topRiasec.slice(0,3).join('-')||'—')+'</span><span class="pill">Aptitude: '+escapeHtml(topApt.join(', ')||'—')+'</span><span class="pill">Personality: '+escapeHtml(topTraits.join(', ')||'—')+'</span><span class="pill">Values: '+escapeHtml(topVals.join(', ')||'—')+'</span></section><section class="section"><h2>'+rt('careers')+'</h2>'+careerRows+'</section><section class="section"><h2>'+rt('action')+'</h2><div class="grid"><div class="tile"><b>1</b><p>'+rt('week1')+'</p></div><div class="tile"><b>2</b><p>'+rt('week2')+'</p></div><div class="tile"><b>3</b><p>'+rt('week3')+'</p></div></div><div class="note">'+rt('note')+'</div></section></div><div class="actions"><button onclick="window.print()">'+rt('print')+'</button><button class="secondary" onclick="window.close()">'+rt('close')+'</button></div></body></html>';
}
function generateHtmlBasedReport() {
  const reportHtml = generateHtmlReportDocument();
  const leaks = detectEnglishLeak(reportHtml.replace(/<[^>]+>/g,' '));
  if (leaks.length) console.warn('Possible untranslated English text in Hindi report:', leaks);
  const w = window.open('', '_blank');
  if (!w) { alert(isHindi() ? 'Popup blocked. कृपया popups allow करें।' : 'Popup blocked. Please allow popups to open the report.'); return; }
  w.document.open(); w.document.write(reportHtml); w.document.close();
}




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
const QUIZ_DATA = {"interest": {"title": "RIASEC Interest Inventory", "subtitle": "Rate how much you would enjoy each activity.", "type": "likert5", "labels": ["Strongly dislike", "Dislike", "Neutral", "Like", "Strongly like"], "questions": [{"id": "R1", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Repair a bicycle or machine"}, {"id": "R2", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Work outdoors for long hours"}, {"id": "R3", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Use tools like a hammer or drill"}, {"id": "R4", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Build something with wood, metal, or parts"}, {"id": "R5", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Fix electrical items at home"}, {"id": "R6", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Work with engines or vehicles"}, {"id": "R7", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Assemble furniture or equipment"}, {"id": "R8", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Do hands-on practical work"}, {"id": "R9", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Install or repair wiring or fittings"}, {"id": "R10", "test": "riasec", "scale": "likert5", "category": "R", "section": "Realistic", "prompt": "Learn by doing rather than only reading"}, {"id": "R11", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Solve science-based problems"}, {"id": "R12", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Conduct experiments to test ideas"}, {"id": "R13", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Analyze graphs, numbers, or patterns"}, {"id": "R14", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Study how machines or systems work"}, {"id": "R15", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Research topics in detail before deciding"}, {"id": "R16", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Solve difficult math puzzles"}, {"id": "R17", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Learn about new technologies"}, {"id": "R18", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Observe patterns in data or nature"}, {"id": "R19", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Enjoy biology, chemistry, or physics concepts"}, {"id": "R20", "test": "riasec", "scale": "likert5", "category": "I", "section": "Investigative", "prompt": "Think deeply about complex questions"}, {"id": "R21", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Draw, sketch, or paint"}, {"id": "R22", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Write stories, poems, or scripts"}, {"id": "R23", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Design posters, graphics, or layouts"}, {"id": "R24", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Play a musical instrument or sing"}, {"id": "R25", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Act, perform, or speak creatively"}, {"id": "R26", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Create videos or digital content"}, {"id": "R27", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Imagine original ideas or concepts"}, {"id": "R28", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Decorate rooms or design spaces"}, {"id": "R29", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Express feelings through art or music"}, {"id": "R30", "test": "riasec", "scale": "likert5", "category": "A", "section": "Artistic", "prompt": "Prefer open-ended tasks over rigid routines"}, {"id": "R31", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Help friends solve personal problems"}, {"id": "R32", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Teach someone a concept patiently"}, {"id": "R33", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Volunteer for a social cause"}, {"id": "R34", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Work cooperatively in a team"}, {"id": "R35", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Listen carefully when someone is upset"}, {"id": "R36", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Care for children, elderly people, or animals"}, {"id": "R37", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "'+tx('quiz.guide')+' or mentor someone younger"}, {"id": "R38", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Participate in group discussion respectfully"}, {"id": "R39", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Help others learn new skills"}, {"id": "R40", "test": "riasec", "scale": "likert5", "category": "S", "section": "Social", "prompt": "Choose work that benefits people directly"}, {"id": "R41", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Lead a group or team activity"}, {"id": "R42", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Convince others to support your idea"}, {"id": "R43", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Sell a product, service, or idea"}, {"id": "R44", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Start a small project or business"}, {"id": "R45", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Take initiative without being told"}, {"id": "R46", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Manage events or group projects"}, {"id": "R47", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Compete to achieve ambitious goals"}, {"id": "R48", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Take calculated risks to grow"}, {"id": "R49", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Negotiate to get a better result"}, {"id": "R50", "test": "riasec", "scale": "likert5", "category": "E", "section": "Enterprising", "prompt": "Organize campaigns or drives"}, {"id": "R51", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Organize files, folders, or records"}, {"id": "R52", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Work carefully with numbers and data"}, {"id": "R53", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Follow a schedule strictly"}, {"id": "R54", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Maintain records or logs accurately"}, {"id": "R55", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Use spreadsheets or tables neatly"}, {"id": "R56", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Do structured repetitive work well"}, {"id": "R57", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Arrange things in a neat order"}, {"id": "R58", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Prefer clear rules and systems"}, {"id": "R59", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Enter data without mistakes"}, {"id": "R60", "test": "riasec", "scale": "likert5", "category": "C", "section": "Conventional", "prompt": "Manage budgets, accounts, or inventories"}]}, "aptitude": {"title": "Aptitude Assessment", "subtitle": "Choose the best answer. Some questions are image-based.", "type": "mcq", "questions": [{"id": 1, "section": "Numerical", "type": "statement", "prompt": "If x + 1/x = 5, what is x² + 1/x² ?", "options": ["21", "23", "25", "27"], "answer": 1, "explanation": "(x + 1/x)^2 = x^2 + 2 + 1/x^2 = 25, so x^2 + 1/x^2 = 23.", "test": "aptitude", "scale": "mcq"}, {"id": 2, "section": "Numerical", "type": "statement", "prompt": "A train 120 m long crosses a pole in 6 seconds. What is its speed?", "options": ["54 km/h", "60 km/h", "72 km/h", "80 km/h"], "answer": 2, "explanation": "Speed = 120/6 = 20 m/s = 72 km/h.", "test": "aptitude", "scale": "mcq"}, {"id": 3, "section": "Numerical", "type": "statement", "prompt": "The ratio of present ages of A and B is 3:5. After 10 years it becomes 5:7. What is B's present age?", "options": ["15 years", "20 years", "25 years", "30 years"], "answer": 1, "explanation": "Let ages be 3x and 5x. (3x+10)/(5x+10)=5/7 gives x=4, so B=20.", "test": "aptitude", "scale": "mcq"}, {"id": 4, "section": "Numerical", "type": "statement", "prompt": "15% of a number is 45. What is 35% of that number?", "options": ["95", "100", "105", "110"], "answer": 2, "explanation": "Number = 45/0.15 = 300; 35% = 105.", "test": "aptitude", "scale": "mcq"}, {"id": 5, "section": "Numerical", "type": "statement", "prompt": "A shopkeeper marks a product 40% above cost price and then gives a 10% discount on marked price. What is the profit percentage?", "options": ["20%", "24%", "26%", "30%"], "answer": 2, "explanation": "Selling price = 1.4 × 0.9 = 1.26 times cost. Profit = 26%.", "test": "aptitude", "scale": "mcq"}, {"id": 6, "section": "Numerical", "type": "statement", "prompt": "Solve: (3x - 2)/2 + (x + 1)/3 = 5", "options": ["x = 2", "x = 3", "x = 34/11", "x = 16/11"], "answer": 2, "explanation": "Multiply by 6: 9x-6 + 2x+2 = 30 → 11x = 34 → x = 34/11.", "test": "aptitude", "scale": "mcq"}, {"id": 7, "section": "Numerical", "type": "statement", "prompt": "A sum becomes ₹1331 in 3 years at compound interest of 10% per annum. What was the principal?", "options": ["₹1000", "₹1050", "₹1100", "₹1210"], "answer": 0, "explanation": "Principal = 1331 / (1.1)^3 = 1331 / 1.331 = 1000.", "test": "aptitude", "scale": "mcq"}, {"id": 8, "section": "Numerical", "type": "statement", "prompt": "If a:b = 2:3 and b:c = 4:5, then a:c = ?", "options": ["8:15", "2:5", "4:15", "6:5"], "answer": 0, "explanation": "Make b same: 2:3 = 8:12 and 4:5 = 12:15, so a:c = 8:15.", "test": "aptitude", "scale": "mcq"}, {"id": 9, "section": "Numerical", "type": "statement", "prompt": "The average of 5 numbers is 28. If one number is removed, the average of the remaining 4 becomes 26. Which number was removed?", "options": ["28", "30", "34", "36"], "answer": 3, "explanation": "Total = 5×28=140. Remaining total = 4×26=104. Removed number = 36.", "test": "aptitude", "scale": "mcq"}, {"id": 10, "section": "Numerical", "type": "statement", "prompt": "One pipe can fill a tank in 6 hours and another empties it in 8 hours. If both are opened together, in how many hours will the tank be filled?", "options": ["18 hours", "20 hours", "24 hours", "28 hours"], "answer": 2, "explanation": "Net rate = 1/6 - 1/8 = 1/24, so tank fills in 24 hours.", "test": "aptitude", "scale": "mcq"}, {"id": 11, "section": "Verbal", "type": "statement", "prompt": "Choose the synonym of 'Meticulous'.", "options": ["Careless", "Precise", "Impulsive", "Noisy"], "answer": 1, "explanation": "Meticulous means very careful and precise.", "test": "aptitude", "scale": "mcq"}, {"id": 12, "section": "Verbal", "type": "statement", "prompt": "Choose the antonym of 'Obscure'.", "options": ["Hidden", "Confusing", "Clear", "Dark"], "answer": 2, "explanation": "Obscure means unclear or hidden; antonym is clear.", "test": "aptitude", "scale": "mcq"}, {"id": 13, "section": "Verbal", "type": "statement", "prompt": "Fill in the blank: 'No sooner ___ he reached the station than the train started moving.'", "options": ["had", "has", "have", "was"], "answer": 0, "explanation": "The standard expression is 'No sooner had ... than ...'.", "test": "aptitude", "scale": "mcq"}, {"id": 14, "section": "Verbal", "type": "statement", "prompt": "Identify the sentence with the correct grammar.", "options": ["She is more smarter than her sister.", "She is smarter than her sister.", "She is smartest than her sister.", "She is smart than her sister."], "answer": 1, "explanation": "Do not use 'more' with the comparative form 'smarter'.", "test": "aptitude", "scale": "mcq"}, {"id": 15, "section": "Verbal", "type": "statement", "prompt": "Choose the best analogy: Pen : Write :: Knife : ?", "options": ["Sharp", "Cut", "Steel", "Blade"], "answer": 1, "explanation": "A pen is used to write; a knife is used to cut.", "test": "aptitude", "scale": "mcq"}, {"id": 16, "section": "Verbal", "type": "statement", "prompt": "Choose the correct meaning of 'Alleviate'.", "options": ["Increase", "Reduce", "Hide", "Delay"], "answer": 1, "explanation": "Alleviate means make less severe or reduce.", "test": "aptitude", "scale": "mcq"}, {"id": 17, "section": "Verbal", "type": "statement", "prompt": "Choose the correct sentence.", "options": ["He don't know the answer.", "He doesn't knows the answer.", "He doesn't know the answer.", "He not know the answer."], "answer": 2, "explanation": "Third-person singular with auxiliary is 'doesn't know'.", "test": "aptitude", "scale": "mcq"}, {"id": 18, "section": "Verbal", "type": "statement", "prompt": "Rearrange the words into a correct sentence: always / she / on time / is", "options": ["She always is on time.", "Always she is on time.", "She is always on time.", "On time she is always."], "answer": 2, "explanation": "The natural sentence is 'She is always on time.'", "test": "aptitude", "scale": "mcq"}, {"id": 19, "section": "Verbal", "type": "statement", "prompt": "Choose the correct preposition: 'He is capable ___ solving this problem.'", "options": ["to", "for", "of", "with"], "answer": 2, "explanation": "The correct phrase is 'capable of'.", "test": "aptitude", "scale": "mcq"}, {"id": 20, "section": "Verbal", "type": "statement", "prompt": "What does the idiom 'break the ice' mean?", "options": ["To crack frozen water", "To begin a friendly conversation", "To end an argument suddenly", "To avoid talking"], "answer": 1, "explanation": "It means to make people feel more relaxed and start interaction.", "test": "aptitude", "scale": "mcq"}, {"id": 21, "section": "Logical", "type": "statement", "prompt": "Find the next term: 2, 6, 7, 21, 22, 66, ?", "options": ["67", "68", "132", "198"], "answer": 0, "explanation": "Pattern alternates ×3, +1. So 66 + 1 = 67.", "test": "aptitude", "scale": "mcq"}, {"id": 22, "section": "Logical", "type": "statement", "prompt": "Which number is the odd one out?", "options": ["3", "5", "11", "14"], "answer": 3, "explanation": "14 is even; the others are odd primes.", "test": "aptitude", "scale": "mcq"}, {"id": 23, "section": "Logical", "type": "statement", "prompt": "If CAT is coded as DBU, how will DOG be coded?", "options": ["EPH", "EPI", "FQI", "CPH"], "answer": 0, "explanation": "Each letter shifts forward by 1: D→E, O→P, G→H.", "test": "aptitude", "scale": "mcq"}, {"id": 24, "section": "Logical", "type": "statement", "prompt": "Statement: All roses are flowers. Some flowers fade quickly. Which conclusion logically follows?", "options": ["All roses fade quickly.", "Some roses may fade quickly.", "No flowers fade quickly.", "All flowers are roses."], "answer": 1, "explanation": "Only a possibility about some roses can be inferred, not all.", "test": "aptitude", "scale": "mcq"}, {"id": 25, "section": "Logical", "type": "statement", "prompt": "A is the father of B. C is the mother of A. How is C related to B?", "options": ["Mother", "Grandmother", "Aunt", "Sister"], "answer": 1, "explanation": "C is A's mother, so C is B's grandmother.", "test": "aptitude", "scale": "mcq"}, {"id": 26, "section": "Logical", "type": "statement", "prompt": "A person walks 10 m north, then 5 m east, then 10 m south. Where is the person now relative to the starting point?", "options": ["At the starting point", "5 m east", "5 m west", "10 m north"], "answer": 1, "explanation": "North and south movements cancel; final position is 5 m east.", "test": "aptitude", "scale": "mcq"}, {"id": 27, "section": "Logical", "type": "statement", "prompt": "Find the next term: 4, 6, 9, 13, 18, ?", "options": ["22", "23", "24", "25"], "answer": 2, "explanation": "Differences are +2, +3, +4, +5, so next is +6 → 24.", "test": "aptitude", "scale": "mcq"}, {"id": 28, "section": "Logical", "type": "statement", "prompt": "All squares are rectangles. All rectangles are shapes. Which conclusion is definitely true?", "options": ["All shapes are rectangles.", "Some shapes are not rectangles.", "All squares are shapes.", "No rectangle is a square."], "answer": 2, "explanation": "If all squares are rectangles and all rectangles are shapes, then all squares are shapes.", "test": "aptitude", "scale": "mcq"}, {"id": 29, "section": "Logical", "type": "statement", "prompt": "What is the angle between the hour hand and minute hand at 4:20?", "options": ["10°", "20°", "30°", "40°"], "answer": 0, "explanation": "Hour hand at 4:20 is 130°. Minute hand is at 120°. Difference = 10°.", "test": "aptitude", "scale": "mcq"}, {"id": 30, "section": "Logical", "type": "statement", "prompt": "Find the next pair in the series: AZ, BY, CX, DW, ?", "options": ["EV", "FU", "EW", "DU"], "answer": 0, "explanation": "First letter increases, second decreases: A-Z, B-Y, C-X, D-W, E-V.", "test": "aptitude", "scale": "mcq"}, {"id": 31, "section": "Spatial", "type": "pictorial", "prompt": "Look at the diagram and choose the correct mirror image of MAP.", "options": ["PAM", "Mirror-reversed MAP", "MAP", "W∀Ԁ"], "answer": 1, "explanation": "A proper mirror image reverses the left-right orientation of the whole word.", "image": "images/q31_mirror_map.png", "test": "aptitude", "scale": "mcq"}, {"id": 32, "section": "Spatial", "type": "pictorial", "prompt": "Study the options and choose the net that can be folded into a cube.", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0, "explanation": "The cross-shaped arrangement in A is a standard valid cube net.", "image": "images/q32_cube_net.png", "test": "aptitude", "scale": "mcq"}, {"id": 33, "section": "Spatial", "type": "pictorial", "prompt": "A paper is folded twice and punched once, as shown. After unfolding, how many holes will appear?", "options": ["2", "4", "6", "8"], "answer": 1, "explanation": "Each fold doubles the layers. After two folds there are 4 layers, so one punch creates 4 holes when unfolded.", "image": "images/q33_paper_fold.png", "test": "aptitude", "scale": "mcq"}, {"id": 34, "section": "Spatial", "type": "pictorial", "prompt": "The original triangle points upward. Which option shows the figure after a 180° rotation?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "A 180° rotation turns an upward triangle upside down. In the diagram that is option B.", "image": "images/q34_triangle_rotation.png", "test": "aptitude", "scale": "mcq"}, {"id": 35, "section": "Spatial", "type": "pictorial", "prompt": "In which option is the target triangle hidden exactly as shown?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "Option B contains the same triangular shape embedded inside the figure.", "image": "images/q35_embedded_triangle.png", "test": "aptitude", "scale": "mcq"}, {"id": 36, "section": "Spatial", "type": "statement", "prompt": "A cube is painted on all six faces and cut into 64 equal smaller cubes. How many smaller cubes have exactly 3 faces painted?", "options": ["4", "8", "12", "16"], "answer": 1, "explanation": "Only the 8 corner cubes have 3 faces painted.", "test": "aptitude", "scale": "mcq"}, {"id": 37, "section": "Spatial", "type": "statement", "prompt": "How many rectangles are there in a 3 × 3 grid?", "options": ["18", "24", "30", "36"], "answer": 3, "explanation": "Number of rectangles = C(4,2) × C(4,2) = 6 × 6 = 36.", "test": "aptitude", "scale": "mcq"}, {"id": 38, "section": "Spatial", "type": "statement", "prompt": "If the top face of a cube is 2 and the bottom face is 5, what is the face opposite the front face numbered 3?", "options": ["2", "3", "5", "Cannot be determined"], "answer": 3, "explanation": "Knowing only top-bottom and front is not enough to identify the back face number.", "test": "aptitude", "scale": "mcq"}, {"id": 39, "section": "Spatial", "type": "statement", "prompt": "If North is redefined as West, then East will be redefined as which direction?", "options": ["North", "South", "West", "East"], "answer": 1, "explanation": "This is a 90° anti-clockwise remapping: East becomes South.", "test": "aptitude", "scale": "mcq"}, {"id": 40, "section": "Spatial", "type": "statement", "prompt": "A person walks 12 m west, then 5 m south, then 12 m east. In which direction is the person from the starting point?", "options": ["North", "South", "East", "West"], "answer": 1, "explanation": "West and east cancel, leaving 5 m south.", "test": "aptitude", "scale": "mcq"}, {"id": 41, "section": "Mechanical", "type": "pictorial", "prompt": "Gear A rotates clockwise. Based on the diagram, what is the direction of rotation of Gear C?", "options": ["Clockwise", "Anti-clockwise", "Same as A", "Cannot be determined"], "answer": 0, "explanation": "Adjacent gears rotate in opposite directions. With three gears, the first and third rotate in the same direction.", "image": "images/q41_gears.png", "test": "aptitude", "scale": "mcq"}, {"id": 42, "section": "Mechanical", "type": "pictorial", "prompt": "Looking at the four pulley setups, which arrangement needs the least effort to lift the load?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "The multiple-pulley arrangement in B gives the greatest mechanical advantage.", "image": "images/q42_pulleys.png", "test": "aptitude", "scale": "mcq"}, {"id": 43, "section": "Mechanical", "type": "pictorial", "prompt": "In which lever arrangement is the least effort needed to lift the same load?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "Placing the fulcrum closest to the load gives the greatest mechanical advantage; in the diagram that is B.", "image": "images/q43_lever.png", "test": "aptitude", "scale": "mcq"}, {"id": 44, "section": "Mechanical", "type": "pictorial", "prompt": "Which inclined plane requires the least force to push the block to the top?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "A gentler slope reduces the force needed. In the figure that is B.", "image": "images/q44_inclined_planes.png", "test": "aptitude", "scale": "mcq"}, {"id": 45, "section": "Mechanical", "type": "pictorial", "prompt": "If all wheels turn at the same rate, which one covers the greatest distance in one rotation?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "A larger wheel has a greater circumference, so it covers more distance in one full turn.", "image": "images/q45_wheels.png", "test": "aptitude", "scale": "mcq"}, {"id": 46, "section": "Mechanical", "type": "statement", "prompt": "Gear A has 10 teeth and drives Gear B with 20 teeth. Which gear rotates faster?", "options": ["Gear A", "Gear B", "Both rotate at same speed", "Cannot be determined"], "answer": 0, "explanation": "The smaller gear rotates faster.", "test": "aptitude", "scale": "mcq"}, {"id": 47, "section": "Mechanical", "type": "statement", "prompt": "If friction in a machine increases, what usually happens to its efficiency?", "options": ["It increases", "It decreases", "It stays the same", "It doubles"], "answer": 1, "explanation": "More energy is lost as heat, so efficiency drops.", "test": "aptitude", "scale": "mcq"}, {"id": 48, "section": "Mechanical", "type": "statement", "prompt": "Work = Force × Distance. If the force remains the same and the distance doubles, the work done becomes:", "options": ["Half", "Double", "Unchanged", "Zero"], "answer": 1, "explanation": "Doubling distance with the same force doubles work.", "test": "aptitude", "scale": "mcq"}, {"id": 49, "section": "Mechanical", "type": "statement", "prompt": "Which device converts electrical energy into mechanical motion?", "options": ["Generator", "Motor", "Battery", "Switch"], "answer": 1, "explanation": "An electric motor converts electrical energy into motion.", "test": "aptitude", "scale": "mcq"}, {"id": 50, "section": "Mechanical", "type": "statement", "prompt": "Pressure = Force ÷ Area. If the area increases while force stays the same, pressure will:", "options": ["Increase", "Decrease", "Stay the same", "Become zero"], "answer": 1, "explanation": "Pressure decreases when the same force is spread over a larger area.", "test": "aptitude", "scale": "mcq"}], "timeLimitMin": 50}, "personality": {"title": "Big Five Personality", "subtitle": "Answer honestly based on what feels natural to you.", "type": "likert5", "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], "questions": [{"id": "B1", "test": "bigfive", "scale": "likert5", "category": "O", "reverse": false, "prompt": "I enjoy trying new ideas and experiences."}, {"id": "B2", "test": "bigfive", "scale": "likert5", "category": "O", "reverse": false, "prompt": "I like art, imagination, and creativity."}, {"id": "B3", "test": "bigfive", "scale": "likert5", "category": "O", "reverse": true, "prompt": "I prefer routine over variety."}, {"id": "B4", "test": "bigfive", "scale": "likert5", "category": "O", "reverse": false, "prompt": "I am curious about many different topics."}, {"id": "B5", "test": "bigfive", "scale": "likert5", "category": "C", "reverse": false, "prompt": "I finish tasks on time."}, {"id": "B6", "test": "bigfive", "scale": "likert5", "category": "C", "reverse": false, "prompt": "I keep my work and materials organized."}, {"id": "B7", "test": "bigfive", "scale": "likert5", "category": "C", "reverse": true, "prompt": "I often leave work incomplete."}, {"id": "B8", "test": "bigfive", "scale": "likert5", "category": "C", "reverse": false, "prompt": "I plan before I start a task."}, {"id": "B9", "test": "bigfive", "scale": "likert5", "category": "E", "reverse": false, "prompt": "I enjoy meeting and talking to many people."}, {"id": "B10", "test": "bigfive", "scale": "likert5", "category": "E", "reverse": false, "prompt": "I feel energized in social situations."}, {"id": "B11", "test": "bigfive", "scale": "likert5", "category": "E", "reverse": true, "prompt": "I prefer to stay quiet in groups."}, {"id": "B12", "test": "bigfive", "scale": "likert5", "category": "E", "reverse": false, "prompt": "I like taking the lead in conversations."}, {"id": "B13", "test": "bigfive", "scale": "likert5", "category": "A", "reverse": false, "prompt": "I am considerate of other people’s feelings."}, {"id": "B14", "test": "bigfive", "scale": "likert5", "category": "A", "reverse": false, "prompt": "I avoid unnecessary conflicts."}, {"id": "B15", "test": "bigfive", "scale": "likert5", "category": "A", "reverse": true, "prompt": "I can be rude when annoyed."}, {"id": "B16", "test": "bigfive", "scale": "likert5", "category": "A", "reverse": false, "prompt": "I cooperate easily in teams."}, {"id": "B17", "test": "bigfive", "scale": "likert5", "category": "N", "reverse": false, "prompt": "I worry about things more than most people."}, {"id": "B18", "test": "bigfive", "scale": "likert5", "category": "N", "reverse": false, "prompt": "I get stressed easily under pressure."}, {"id": "B19", "test": "bigfive", "scale": "likert5", "category": "N", "reverse": true, "prompt": "I stay calm in difficult situations."}, {"id": "B20", "test": "bigfive", "scale": "likert5", "category": "N", "reverse": false, "prompt": "My mood changes quickly when things go wrong."}]}, "values": {"title": "Work Values Inventory", "subtitle": "Rate how important each statement is for your future career.", "type": "likert5", "labels": ["Not important", "Slightly important", "Moderately important", "Important", "Very important"], "questions": [{"id": "W1", "test": "workvalues", "scale": "likert5", "category": "Achievement", "prompt": "I want work where I can accomplish difficult goals."}, {"id": "W2", "test": "workvalues", "scale": "likert5", "category": "Achievement", "prompt": "I want to feel proud of what I achieve."}, {"id": "W3", "test": "workvalues", "scale": "likert5", "category": "Independence", "prompt": "I want freedom to decide how to work."}, {"id": "W4", "test": "workvalues", "scale": "likert5", "category": "Independence", "prompt": "I prefer careers with autonomy and flexibility."}, {"id": "W5", "test": "workvalues", "scale": "likert5", "category": "Recognition", "prompt": "I want my work to be noticed and appreciated."}, {"id": "W6", "test": "workvalues", "scale": "likert5", "category": "Recognition", "prompt": "Awards and status matter to me."}, {"id": "W7", "test": "workvalues", "scale": "likert5", "category": "Relationships", "prompt": "I want work where I help people directly."}, {"id": "W8", "test": "workvalues", "scale": "likert5", "category": "Relationships", "prompt": "Friendly colleagues are important to me."}, {"id": "W9", "test": "workvalues", "scale": "likert5", "category": "Support", "prompt": "I value guidance and mentoring from seniors."}, {"id": "W10", "test": "workvalues", "scale": "likert5", "category": "Support", "prompt": "I prefer workplaces where people help each other."}, {"id": "W11", "test": "workvalues", "scale": "likert5", "category": "Working Conditions", "prompt": "Job stability matters a lot to me."}, {"id": "W12", "test": "workvalues", "scale": "likert5", "category": "Working Conditions", "prompt": "I prefer a safe and comfortable work environment."}, {"id": "W13", "test": "workvalues", "scale": "likert5", "category": "Lifestyle", "prompt": "I want time balance between career and personal life."}, {"id": "W14", "test": "workvalues", "scale": "likert5", "category": "Lifestyle", "prompt": "Flexible schedules are important to me."}, {"id": "W15", "test": "workvalues", "scale": "likert5", "category": "Learning", "prompt": "I want a career with constant learning."}, {"id": "W16", "test": "workvalues", "scale": "likert5", "category": "Learning", "prompt": "I enjoy workplaces that challenge me to grow."}]}};

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────
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
    if (!promptAdminAccess()) return;
    setTimeout(function(){ loadAdminDashboard(); }, 0);
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
  return 'PATHSAATHI_ADMIN_2026';
}
function ensureAdminVisibility() {
  const show = !!state.isAdmin;
  const desktop = document.getElementById('admin-nav-btn');
  const mobile = document.getElementById('mnav-admin-btn');
  if (desktop) desktop.style.display = show ? '' : 'none';
  if (mobile) mobile.style.display = show ? '' : 'none';
}
function promptAdminAccess() {
  const code = window.prompt('Enter admin access code');
  if (!code) return false;
  if (code !== getAdminCode()) {
    alert('Invalid admin access code.');
    return false;
  }
  state.isAdmin = true;
  ensureAdminVisibility();
  try {
    const saved = JSON.parse(localStorage.getItem('ps_session') || '{}');
    saved.isAdmin = true;
    localStorage.setItem('ps_session', JSON.stringify(saved));
  } catch(e) {}
  return true;
}
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

async function loadAdminDashboard() {
  if (!state.isAdmin && !promptAdminAccess()) return;
  const studentsWrap = document.getElementById('admin-students-wrap');
  const testsWrap = document.getElementById('admin-tests-wrap');
  const logWrap = document.getElementById('admin-log-wrap');
  if (studentsWrap) studentsWrap.innerHTML = '<div class="admin-empty">Loading admin data…</div>';
  try {
    const data = await sendToSheets({ action:'getAdminDashboard', access_code:getAdminCode() });
    state.adminData = data || { students:[], tests:[], logs:[] };
    renderAdminDashboard();
    showScreen('admin');
  } catch(err) {
    if (studentsWrap) studentsWrap.innerHTML = '<div class="admin-empty">Could not load admin data: ' + escapeHtml(err.message || 'Unknown error') + '</div>';
  }
}
function renderAdminTable(containerId, columns, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="admin-empty">No rows found.</div>';
    return;
  }
  const html = '<table class="admin-table"><thead><tr>' + columns.map(function(c){ return '<th>' + escapeHtml(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function(row){
      return '<tr>' + columns.map(function(c){ return '<td>' + escapeHtml(row[c.key] == null ? '' : row[c.key]) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  el.innerHTML = html;
}
function renderAdminDashboard() {
  const data = state.adminData || { students:[], tests:[], logs:[] };
  const students = data.students || [];
  const tests = data.tests || [];
  const logs = data.logs || [];
  const fullyComplete = students.filter(function(s){ return Number(s.completed_count || 0) >= 4; }).length;
  const setText = function(id, value){ var el = document.getElementById(id); if (el) el.textContent = value; };
  setText('admin-kpi-students', students.length);
  setText('admin-kpi-complete', fullyComplete);
  setText('admin-kpi-submissions', tests.length);
  setText('admin-kpi-activity', logs.length);
  renderAdminTable('admin-students-wrap', [
    {key:'name', label:'Name'}, {key:'phone', label:'Phone'}, {key:'class', label:'Class'},
    {key:'board', label:'Board'}, {key:'city', label:'City'}, {key:'completed_count', label:'Completed'},
    {key:'completed_tests', label:'Tests'}
  ], students);
  renderAdminTable('admin-tests-wrap', [
    {key:'timestamp', label:'Timestamp'}, {key:'phone', label:'Phone'}, {key:'name', label:'Name'},
    {key:'test_id', label:'Test'}, {key:'score', label:'Score'}
  ], tests);
  renderAdminTable('admin-log-wrap', [
    {key:'timestamp', label:'Timestamp'}, {key:'phone', label:'Phone'}, {key:'action', label:'Action'}, {key:'detail', label:'Detail'}
  ], logs);
  filterAdminTables();
}
function filterAdminTables() {
  const q = String((document.getElementById('admin-search-input') || {}).value || '').toLowerCase().trim();
  document.querySelectorAll('.admin-table tbody tr').forEach(function(tr){
    const txt = String(tr.textContent || '').toLowerCase();
    tr.style.display = !q || txt.indexOf(q) !== -1 ? '' : 'none';
  });
}

function selectOpt(el) {
  el.parentElement.querySelectorAll('.likert-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}
function toggleStreamCareers(id) {
  const list = document.getElementById('list-' + id);
  const icon = document.getElementById('toggle-' + id);
  if (!list) return;
  const open = list.style.display === 'flex';
  list.style.display = open ? 'none' : 'flex';
  if (icon) icon.classList.toggle('open', !open);
}

// ─────────────────────────────────────────────────────────
//  PROGRESS TRACKING
// ─────────────────────────────────────────────────────────
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
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:linear-gradient(180deg,#120f0d 0%,#191310 35%,#FAF6F1 35%,#FAF6F1 100%);display:flex;flex-direction:column;font-family:-apple-system,system-ui,sans-serif;overflow-y:auto;';
  overlay.innerHTML = '<div style="padding:18px 20px 10px;flex-shrink:0;">'
    + '<div style="max-width:1120px;margin:0 auto;display:flex;justify-content:space-between;gap:16px;align-items:center;">'
    +   '<div style="display:flex;align-items:center;gap:14px;min-width:0;">'
    +     '<div style="width:44px;height:44px;border-radius:14px;background:'+meta.accent+';display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 12px 28px rgba(0,0,0,.24);">'+meta.icon+'</div>'
    +     '<div style="min-width:0;">'
    +       '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.58);margin-bottom:5px;">'+tx('quiz.challenge')+'</div>'
    +       '<div style="font-family:Georgia,serif;font-size:28px;line-height:1.1;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+meta.badge+'</div>'
    +     '</div>'
    +   '</div>'
    +   '<button onclick="closeQuizOverlay()" style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12);color:white;padding:10px 16px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:600;">'+tx('quiz.exit')+'</button>'
    + '</div>'
    + '</div>'
    + '<div style="max-width:1120px;margin:0 auto;width:100%;padding:0 20px 32px;">'
    +   '<div style="display:grid;grid-template-columns:1.15fr .85fr;gap:20px;align-items:stretch;">'
    +     '<div style="background:linear-gradient(135deg,#201812 0%,#302118 100%);border:1px solid rgba(255,255,255,.08);box-shadow:0 16px 46px rgba(0,0,0,.22);border-radius:28px;padding:24px;position:relative;overflow:hidden;">'
    +       '<div style="position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:'+meta.soft+';"></div>'
    +       '<div style="position:relative;z-index:1;">'
    +         '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px;">'
    +           '<div><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.56);margin-bottom:8px;">'+tx('quiz.activeMission')+'</div><div style="font-family:Georgia,serif;font-size:34px;line-height:1.08;color:white;">'+meta.headline+'</div></div>'
    +           '<div style="padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:12px;color:white;">⏳ '+durationMin+' min challenge</div>'
    +         '</div>'
    +         '<div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,.76);max-width:700px;margin-bottom:18px;">'+escapeHtml(quiz.subtitle || meta.tone)+'</div>'
    +         '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    +            '<div id="qz-chip-stage" style="padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:white;">Stage 1</div>'
    +            '<div id="qz-chip-xp" style="padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:white;">0 XP</div>'
    +            '<div id="qz-chip-streak" style="padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:white;">Momentum x0</div>'
    +            '<div id="qz-chip-speed" style="padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:white;">Speed bonus: 0</div>'
    +            '<div id="qz-chip-level" style="padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:13px;color:white;">Level 1</div>'
    +         '</div>'
    +       '</div>'
    +     '</div>'
    +     '<div style="background:white;border:1px solid #D7E5FA;box-shadow:0 16px 42px rgba(26,20,16,.12);border-radius:28px;padding:22px;">'
    +       '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
    +         '<div style="padding:14px;border-radius:18px;background:'+meta.soft+';border:1px solid rgba(0,0,0,.04);">'
    +           '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.timeLeft')+'</div>'
    +           '<div id="qz-timer-box" style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#EAF2FF;">'+String(durationMin).padStart(2,'0')+':00</div>'
    +         '</div>'
    +         '<div style="padding:14px;border-radius:18px;background:#EEF5FF;border:1px solid #D7E5FA;">'
    +           '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:6px;">'+tx('quiz.questionsSolved')+'</div>'
    +           '<div id="qz-solved-box" style="font-family:Georgia,serif;font-size:32px;line-height:1;color:#EAF2FF;">0/'+quiz.questions.length+'</div>'
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
      toast.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10002;padding:14px 16px;border-radius:18px;background:#1A1410;color:white;box-shadow:0 18px 36px rgba(0,0,0,.22);font-size:13px;font-weight:700;opacity:0;transform:translateY(10px);transition:all .2s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = tone === 'accent' ? meta.accent : '#1A1410';
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
            return '<button onclick="qzPick('+i+')" style="width:100%;padding:16px 18px;border:'+(sel?'2px solid '+meta.accent:'1.5px solid #E8DED3')+';border-radius:18px;cursor:pointer;text-align:left;background:'+(sel?meta.soft:'white')+';color:#EAF2FF;transition:all .16s;box-shadow:'+(sel?'0 10px 26px rgba(26,20,16,.08)':'none')+';">'
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
      +   '<div style="font-family:Georgia,serif;font-size:34px;font-weight:300;margin-bottom:10px;color:#EAF2FF;">Challenge complete!</div>'
      +   '<div style="font-size:15px;color:#7184A3;line-height:1.8;max-width:640px;margin:0 auto 26px;">Your answers have been saved. The strongest signal from this challenge is <strong>'+escapeHtml(String(scoreDisplay))+'</strong>. This now feeds into your report and recommendation engine.</div>'
      +   '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;max-width:920px;margin:0 auto 20px;">'
      +     '<div style="padding:18px;border-radius:22px;background:#EEF5FF;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Challenge score</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#EAF2FF;">'+result.score+'%</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:'+meta.soft+';border:1px solid rgba(0,0,0,.04);"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">XP earned</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:'+meta.accent+';">'+totalXp+'</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:#F7F3EE;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Speed hits</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#EAF2FF;">'+speedHits()+'</div></div>'
      +     '<div style="padding:18px;border-radius:22px;background:#FCFBF8;border:1px solid #D7E5FA;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7184A3;margin-bottom:8px;">Quest level</div><div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#EAF2FF;">'+reward.level+(reward.levelUp ? '↑' : '')+'</div></div>'
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
  var names = ['clearCareerFilters','closeCareerModal','dismissStudentHook','generateCompiledPdf','handleCounselorCta','loadAdminDashboard','logOut','openAuthScreen','openModal','openQuiz','previewCompiledPdf','roadmapJump','showLandingPage','showScreen','switchRoadmapTab','switchTab','testConnection'];
  names.forEach(function(name){
    try {
      if (typeof window[name] !== 'function' && typeof eval(name) === 'function') {
        window[name] = eval(name);
      }
    } catch(e) {}
  });
})();
