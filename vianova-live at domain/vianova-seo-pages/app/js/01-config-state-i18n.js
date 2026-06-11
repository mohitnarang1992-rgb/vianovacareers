/*
 * ViaNova split JS: 01-config-state-i18n.js
 * Configuration, state, multilingual dictionary, language helpers
 * Extracted from 01-app-core.js without changing logic.
 */

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
  adminToken: '', adminUser: '',
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
