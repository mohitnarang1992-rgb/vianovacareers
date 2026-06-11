(function(){
  function lang(){ try { return localStorage.getItem('vianova_lang') || 'en'; } catch(e){ return 'en'; } }
  function isHi(){ return lang() === 'hi'; }
  function setStored(v){ try { localStorage.setItem('vianova_lang', v === 'hi' ? 'hi' : 'en'); } catch(e){} }
  function ensureFloatingSelector(){
    var sw = document.getElementById('vn-lang-switcher');
    if(!sw){
      sw = document.createElement('div');
      sw.id = 'vn-lang-switcher';
      sw.setAttribute('aria-label','Language selector');
      sw.innerHTML = '<label for="vn-lang-select">Language</label><select id="vn-lang-select"><option value="en">English</option><option value="hi">हिन्दी</option></select>';
      document.body.appendChild(sw);
    }
    sw.style.setProperty('display','flex','important');
    sw.style.setProperty('visibility','visible','important');
    sw.style.setProperty('opacity','1','important');
    sw.style.setProperty('position','fixed','important');
    sw.style.setProperty('right','18px','important');
    sw.style.setProperty('top','18px','important');
    sw.style.setProperty('z-index','2147483647','important');
    sw.style.setProperty('pointer-events','auto','important');
    var sel = document.getElementById('vn-lang-select');
    if(sel) sel.value = lang();
  }
  function syncLangControls(){
    ensureFloatingSelector();
    var l = lang();
    document.documentElement.lang = l === 'hi' ? 'hi' : 'en';
    document.querySelectorAll('#vn-lang-select,.vn-lang-select-mirror').forEach(function(sel){ sel.value = l; });
    document.querySelectorAll('[data-lang-label],#vn-lang-switcher label').forEach(function(el){ el.textContent = l === 'hi' ? 'भाषा' : 'Language'; });
  }
  function applyLang(v){
    v = v === 'hi' ? 'hi' : 'en';
    setStored(v);
    if(window.AppState){ try { window.AppState.lang = v; } catch(e){} }
    if(typeof window.setAppLanguage === 'function' && !window.__vnLangApplying){
      try { window.__vnLangApplying = true; window.setAppLanguage(v); } catch(e){} finally { window.__vnLangApplying = false; }
    }
    syncLangControls();
    if(typeof window.syncShell === 'function') { try { window.syncShell(); } catch(e){} }
  }
  document.addEventListener('change', function(e){
    if(e.target && (e.target.id === 'vn-lang-select' || e.target.classList.contains('vn-lang-select-mirror'))){
      applyLang(e.target.value);
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function(){ syncLangControls(); setTimeout(syncLangControls,250); setTimeout(syncLangControls,1000); });
  window.addEventListener('load', function(){ syncLangControls(); setTimeout(syncLangControls,500); });
  window.__vianovaEnsureLanguageSelector = syncLangControls;
})();
