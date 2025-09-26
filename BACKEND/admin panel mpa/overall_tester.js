(function(){
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://127.0.0.1:8000/api';
  // Per-step output store
  const stepOutputs = {}; // { step: { entries:[{msg,data,ts}], lastData } }
  const outputWrapper = () => document.getElementById('step-output-wrapper');
  const pill = () => document.getElementById('api-base-pill');
  let token = localStorage.getItem('accessToken') || '';
  let searchTimer = null;
  const totalSteps = 9;
  const OPEN_STATE_KEY = 'guided_open_step_v1';
  const progressBar = () => document.getElementById('progress-bar');
  const globalOverlay = () => document.getElementById('global-loading');
  const stepStatus = (n)=> document.getElementById(`status-${n}`);
  let completed = 0;
  // track done states
  const stepDone = {}; // step -> boolean
  // Step 2 readiness + search abort control
  let step2Ready = false;
  let mappingSearchAbort = null;

  // --- Helpers ---
  function escapeHtml(str){ return String(str).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  function ensureStepPanel(step){
    if(!outputWrapper()) return null;
    let panel = outputWrapper().querySelector(`[data-step-panel='${step}']`);
    if(!panel){
      panel = document.createElement('div');
      panel.dataset.stepPanel = step;
      panel.className = 'border-b last:border-b-0';
      panel.innerHTML = `
        <button data-show-btn='${step}' class='w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100'>
          <span class='flex items-center gap-1'>
            <svg data-panel-chevron='${step}' class='w-3 h-3 text-slate-500 transition-transform duration-200 -rotate-90' viewBox='0 0 20 20' fill='currentColor'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z' clip-rule='evenodd'/></svg>
            <span class='text-[11px] font-medium text-slate-700'>Step ${step} Output</span>
            <span data-multi-indicator='${step}' class='hidden text-[10px] px-1 rounded bg-indigo-100 text-indigo-700'></span>
          </span>
          <span class='text-[10px] text-slate-500 hidden' data-done-pill='${step}'>DONE</span>
        </button>
        <div data-step-content='${step}' class='hidden bg-white border-t px-3 py-2 max-h-64 overflow-auto'>
          <div class='flex items-center justify-end gap-2 mb-1'>
            <button data-dl='${step}' class='px-2 py-0.5 border rounded text-[10px] hover:bg-slate-100'>Download</button>
            <button data-copy='${step}' class='px-2 py-0.5 border rounded text-[10px] hover:bg-slate-100'>Copy</button>
          </div>
          <div data-step-nav='${step}' class='hidden mb-2 items-center justify-between text-[10px]'>
            <button data-prev='${step}' class='px-2 py-0.5 border rounded hover:bg-slate-100 disabled:opacity-40'>&lt;</button>
            <span data-counter='${step}' class='text-slate-600'></span>
            <button data-next='${step}' class='px-2 py-0.5 border rounded hover:bg-slate-100 disabled:opacity-40'>&gt;</button>
          </div>
          <div data-step-latest='${step}' class='font-mono text-[11px] whitespace-pre-wrap break-words text-slate-800'></div>
        </div>`;
      outputWrapper().appendChild(panel);
      const btn = panel.querySelector(`[data-show-btn='${step}']`);
      btn.addEventListener('click', ()=>{
        const content = panel.querySelector(`[data-step-content='${step}']`);
        const chev = panel.querySelector(`[data-panel-chevron='${step}']`);
        const isHidden = content.classList.contains('hidden');
        if(isHidden){
          content.classList.remove('hidden');
          chev.classList.remove('-rotate-90');
          persistPanelState(step, true);
        } else {
          content.classList.add('hidden');
          chev.classList.add('-rotate-90');
          persistPanelState(step, false);
        }
      });
      // Attach prev/next handlers (delegated later when outputs exist)
      const prevBtn = panel.querySelector(`[data-prev='${step}']`);
      const nextBtn = panel.querySelector(`[data-next='${step}']`);
      prevBtn.addEventListener('click', ()=> navigateEntry(step,-1));
      nextBtn.addEventListener('click', ()=> navigateEntry(step,1));
      panel.querySelector(`[data-dl='${step}']`).addEventListener('click', ()=> downloadStep(step));
      panel.querySelector(`[data-copy='${step}']`).addEventListener('click', ()=> copyStep(step));
      // Restore persisted open state
      if(loadPanelState(step)){
        const content = panel.querySelector(`[data-step-content='${step}']`);
        const chev = panel.querySelector(`[data-panel-chevron='${step}']`);
        content.classList.remove('hidden'); chev.classList.remove('-rotate-90');
      }
    }
    return panel;
  }
  function navigateEntry(step, delta){
    const obj = stepOutputs[step]; if(!obj) return;
    if(typeof obj.currentIndex !== 'number') obj.currentIndex = obj.entries.length-1;
    obj.currentIndex = Math.min(obj.entries.length-1, Math.max(0, obj.currentIndex + delta));
    updateStepPanel(step);
  }
  function updateStepPanel(step){
    const obj = stepOutputs[step]; if(!obj) return;
    const panel = ensureStepPanel(step); if(!panel) return;
    const entries = obj.entries || [];
    if(typeof obj.currentIndex !== 'number' || obj.currentIndex > entries.length-1){ obj.currentIndex = entries.length-1; }
    const current = entries[obj.currentIndex];
    const latest = panel.querySelector(`[data-step-latest='${step}']`);
    const nav = panel.querySelector(`[data-step-nav='${step}']`);
    const ctr = panel.querySelector(`[data-counter='${step}']`);
    const prevBtn = panel.querySelector(`[data-prev='${step}']`);
    const nextBtn = panel.querySelector(`[data-next='${step}']`);
    const multiInd = panel.querySelector(`[data-multi-indicator='${step}']`);
    if(latest && current){
      latest.textContent = JSON.stringify({ message: current.msg, response: current.data, index: obj.currentIndex+1 }, null, 2);
    }
    if(entries.length > 1){
      nav.classList.remove('hidden');
      nav.classList.add('flex');
      ctr.textContent = `${obj.currentIndex+1} / ${entries.length}`;
      prevBtn.disabled = obj.currentIndex === 0;
      nextBtn.disabled = obj.currentIndex === entries.length-1;
    } else {
      nav.classList.add('hidden');
      nav.classList.remove('flex');
    }
    if(multiInd){
      if(entries.length > 1){
        multiInd.textContent = `${entries.length} outputs`;
        multiInd.classList.remove('hidden');
      } else {
        multiInd.classList.add('hidden');
      }
    }
    const donePill = panel.querySelector(`[data-done-pill='${step}']`);
    if(donePill) donePill.classList.remove('hidden');
  }
  function storeStepOutput(step, msg, data){
    stepOutputs[step] = stepOutputs[step] || { entries:[] };
    const ts = new Date();
    stepOutputs[step].entries.push({msg,data,ts});
    stepOutputs[step].lastData = data;
    // Set currentIndex to newest entry
    stepOutputs[step].currentIndex = stepOutputs[step].entries.length - 1;
    updateStepPanel(step);
    autoScrollToPanel(step);
  }
  function log(msg, data, step){ if(step){ storeStepOutput(step, msg, data); } }
  function setToken(t){ token = t; if(t) localStorage.setItem('accessToken', t); log('Token set',{},1); }
  function clearToken(){ token=''; localStorage.removeItem('accessToken'); log('Token cleared',{},1); }
  function headers(){ return token ? { 'Authorization': 'Bearer '+token } : {}; }
  function grab(id){ const el = document.getElementById(id); return el ? el.value.trim():''; }

  function setProgress(){
    const pct = Math.min(100, Math.round((completed/totalSteps)*100));
    const bar = progressBar(); if(bar) bar.style.width = pct+'%';
  }

  function markStep(n, state){
    const badge = stepStatus(n); if(!badge) return;
    if(state==='active'){
      badge.textContent='ACTIVE'; badge.className='text-[10px] px-2 py-1 rounded bg-indigo-100 text-indigo-700';
    }else if(state==='done'){
      badge.textContent='DONE'; badge.className='text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700';
    }else if(state==='locked'){
      badge.textContent='LOCKED'; badge.className='text-[10px] px-2 py-1 rounded bg-slate-200 text-slate-600';
    }else{
      badge.textContent='PENDING'; badge.className='text-[10px] px-2 py-1 rounded bg-slate-200 text-slate-600';
    }
    syncDotState(n, state);
  }
  function setStepInteractivity(step, enabled){
    const section = document.querySelector(`.step[data-step='${step}']`); if(!section) return;
    section.querySelectorAll('button, select, input, textarea').forEach(el=>{
      if(el.id === 'login-btn' || el.id === 'logout-btn'){
        // Step 1 always active when its state is active
      }
      if(el.closest('header')) return; // don't disable header toggle
      el.disabled = !enabled;
      if(!enabled) el.setAttribute('data-locked','true'); else el.removeAttribute('data-locked');
    });
    if(!enabled) section.classList.add('step-locked'); else section.classList.remove('step-locked');
  }
  function canRun(step){
    if(step===1) return true;
    return !!stepDone[step-1];
  }
  function advanceStep(current){
    if(!stepDone[current]){ completed++; markStep(current,'done'); stepDone[current]=true; setProgress(); }
    const next = current+1; if(stepStatus(next)){ markStep(next,'active'); setStepInteractivity(next,true); }
    updateDotsActive();
  }

  function withButtonLoading(btn, fn){
    if(!btn) return fn();
    const labelSpan = btn.querySelector('.btn-label');
    const originalHtml = labelSpan ? labelSpan.innerHTML : btn.innerHTML;
    const loadingText = btn.dataset.loading || 'Loading';
    btn.disabled = true;
    if(labelSpan) labelSpan.innerHTML = `<span class="btn-spinner"></span>`; else btn.innerHTML = `<span class="btn-spinner"></span>`;
    const p = Promise.resolve().then(fn);
    p.finally(()=>{
      if(labelSpan) labelSpan.innerHTML = originalHtml; else btn.innerHTML = originalHtml;
      btn.disabled = false;
    });
    return p;
  }
  let overlayTimer = null;
  function showGlobalOverlay(){
    const ov = globalOverlay(); if(!ov) return; ov.classList.remove('hidden'); ov.classList.add('flex');
  }
  function hideGlobalOverlay(){ const ov=globalOverlay(); if(!ov) return; ov.classList.add('hidden'); ov.classList.remove('flex'); }

  async function api(path, opts={}){
    const url = path.startsWith('http') ? path : API_BASE + path;
    const method = opts.method || 'GET';
    let body = null; let hdrs = headers();
    if(opts.form){
      body = new URLSearchParams(opts.form).toString();
      hdrs = Object.assign({ 'Content-Type':'application/x-www-form-urlencoded' }, hdrs);
    } else if(opts.body){
      body = JSON.stringify(opts.body);
      hdrs = Object.assign({ 'Content-Type':'application/json' }, hdrs);
    }
    hdrs = Object.assign({}, hdrs, opts.headers||{});
    const started = performance.now();
    try {
      overlayTimer = setTimeout(showGlobalOverlay, 300); // show overlay if >300ms
      const res = await fetch(url,{method,body,headers:hdrs});
      const ct = res.headers.get('content-type')||''; let payload = ct.includes('application/json')? await res.json(): await res.text();
      if(opts.step){ log(`${method} ${url} [${res.status}] ${(performance.now()-started).toFixed(0)}ms`, payload, opts.step); }
      if(!res.ok) throw new Error((payload && payload.detail)||res.statusText);
      return payload;
    } catch(e){ if(opts.step){ log(`ERR ${method} ${url}`, {error:e.message}, opts.step); } throw e; }
    finally { clearTimeout(overlayTimer); hideGlobalOverlay(); }
  }

  // --- Download / Copy utilities ---
  function downloadStep(step){
    const obj = stepOutputs[step]; if(!obj) return;
    const blob = new Blob([JSON.stringify(obj.entries, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `step-${step}-outputs.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function copyStep(step){
    const obj = stepOutputs[step]; if(!obj) return;
    navigator.clipboard.writeText(JSON.stringify(obj.entries, null, 2)).catch(()=>{});
  }

  // --- Auto-scroll when new output arrives (if panel open) ---
  function autoScrollToPanel(step){
    const panel = outputWrapper().querySelector(`[data-step-panel='${step}']`); if(!panel) return;
    const content = panel.querySelector(`[data-step-content='${step}']`);
    if(content && !content.classList.contains('hidden')){
      // smooth scroll latest
      content.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
  }

  // --- Panel state persistence ---
  const PANEL_STATE_KEY = 'guided_panel_state_v1';
  function loadPanelStateMap(){ try { return JSON.parse(localStorage.getItem(PANEL_STATE_KEY)||'{}'); } catch{ return {}; } }
  function savePanelStateMap(map){ localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(map)); }
  function persistPanelState(step, open){ const map=loadPanelStateMap(); map[step]=open; savePanelStateMap(map); }
  function loadPanelState(step){ const map=loadPanelStateMap(); return !!map[step]; }

  // --- Simple syntax highlighting for JSON (post-render) ---
  function highlightJSON(raw){
    if(typeof raw !== 'string') raw = String(raw);
    return raw
      .replace(/(&)/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"(\\.|[^\"])*\"(?=\s*:)/g, m=>`<span class="json-key">${m}</span>`) // keys
      .replace(/:\s*\"(\\.|[^\"])*\"/g, m=> m.replace(/\"(\\.|[^\"])*\"/g, s=>`<span class="json-string">${s}</span>`))
      .replace(/\b(true|false)\b/g,'<span class="json-boolean">$1</span>')
      .replace(/\bnull\b/g,'<span class="json-null">null</span>')
      .replace(/(-?\b\d+(?:\.\d+)?\b)/g,'<span class="json-number">$1</span>');
  }
  // Enhance updateStepPanel to apply highlighting (monkey patch after definition)
  const _updateStepPanelOrig = updateStepPanel;
  updateStepPanel = function(step){
    _updateStepPanelOrig(step);
    const panel = outputWrapper().querySelector(`[data-step-panel='${step}']`); if(!panel) return;
    const latest = panel.querySelector(`[data-step-latest='${step}']`);
    if(latest){
      // try parse to pretty again then highlight
      try{
        const obj = stepOutputs[step];
        const current = obj.entries[obj.currentIndex];
        const rendered = JSON.stringify({ message: current.msg, response: current.data, index: obj.currentIndex+1 }, null, 2);
        latest.innerHTML = '<pre>' + highlightJSON(rendered) + '</pre>';
      }catch{}
    }
  };

  // (Dark mode now global via admin_nav.js)

  // --- Auth ---
  async function login(){
    const resp = await api('/auth/token', { method:'POST', form:{ username:'admin', password:'sih2024' }, step:1 });
    if(resp && resp.access_token){ setToken(resp.access_token); document.getElementById('token-input').value = resp.access_token; advanceStep(1); }
  }
  function logout(){ clearToken(); document.getElementById('token-input').value=''; }

  // --- Verified ICD list --- (new endpoint under /public)
  async function fetchVerifiedList(){
    let list;
    try {
  list = await api('/public/verified-icd', { step:2 });
    } catch(e){
      // Fallback: older admin endpoint listing names
      try {
  const alt = await api('/admin/verified-icd-names', { step:2 });
        list = { icd_names: alt.icd_names || alt.names || [] };
      } catch(inner){
        log('Could not load verified ICD list (both public & admin endpoints 404).', { error: e.message },2);
        return;
      }
    }
    const sel = document.getElementById('verified-icd-select'); sel.innerHTML='';
    const names = (list.icd_names||[]);
    names.forEach(name => { const opt=document.createElement('option'); opt.value=opt.textContent=name; sel.appendChild(opt); });
    const alertBox = document.getElementById('no-verified-alert');
    if(names.length===0){
      if(alertBox){ alertBox.classList.remove('hidden'); alertBox.classList.add('flex'); }
      log('No verified mappings present. Need at least one verified row.', { count:0 },2);
      // DO NOT mark step done; remains locked until at least one verified mapping exists
    } else {
      if(alertBox){ alertBox.classList.add('hidden'); alertBox.classList.remove('flex'); }
      log('Loaded verified ICD list', { count: names.length },2);
      // Step 2 considered complete only after user selects ICD or applies suggestion
    }
  }

  // --- Search suggestions --- (new endpoint under /public)
  async function runSearch(q){
    if(!q){ document.getElementById('search-suggestions').innerHTML=''; return; }
    // Abort any in-flight
    if(mappingSearchAbort){ mappingSearchAbort.abort(); }
    mappingSearchAbort = new AbortController();
    const signal = mappingSearchAbort.signal;
    let res;
    try {
      res = await api(`/public/mapping-search?q=${encodeURIComponent(q)}`, { step:2, signal });
    } catch(e){
      if(e.name === 'AbortError') return; // ignore
      try {
        res = await api(`/mapping-search?q=${encodeURIComponent(q)}`, { step:2, signal });
      } catch(inner){
        if(inner.name === 'AbortError') return;
        log('Mapping search endpoint not found. Ensure translate router mounted under /public.', { attempted: q },2);
        return;
      }
    }
    if(signal.aborted) return; // stale result
    const box = document.getElementById('search-suggestions'); box.innerHTML='';
    (res.suggestions||[]).forEach(s => {
      const div = document.createElement('div');
      div.className='cursor-pointer px-2 py-1 rounded hover:bg-indigo-50 border bg-white';
      div.dataset.icd = s.icd_name;
      div.dataset.system = s.system;
      div.dataset.term = s.term;
      div.dataset.code = s.code||'';
      div.innerHTML = `<span class='font-medium'>${escapeHtml(s.term)}</span> <span class='text-gray-500'>(${escapeHtml(s.system)})</span><br><span class='text-[10px] text-gray-600'>ICD: ${escapeHtml(s.icd_name)}${s.is_primary?' · primary':''}</span>`;
      div.addEventListener('click', ()=> applySuggestion(div));
      box.appendChild(div);
    });
    log('Search results', { query: q, count: res.count },2);
    return res.suggestions || [];
  }

  function checkStep2Completion(){
    const icd = grab('icd-name');
    const sys = grab('map-system');
    const term = grab('source-code');
    const indicator = document.getElementById('step2-complete-indicator');
    const ready = !!icd && !!sys && !!term;
    if(ready){
      if(!stepDone[2]){
        advanceStep(2);
        log('Step 2 completed (ICD + system + term ready).', { icd, system: sys, term },2);
      }
      step2Ready = true;
      if(indicator) indicator.classList.remove('hidden');
      enableForwardTranslate();
    } else {
      step2Ready = false;
      if(indicator) indicator.classList.add('hidden');
      disableForwardTranslate();
    }
  }
  function applySuggestion(el){
    const icd = el.dataset.icd; const system = el.dataset.system; const term = el.dataset.code || el.dataset.term;
    const searchBox = document.getElementById('search-box');
    // For suggestions, surface the system term (Ayurveda/Siddha/Unani) to demonstrate reverse path
    if(searchBox) searchBox.value = term;
    document.getElementById('icd-name').value = icd;
    document.getElementById('map-system').value = system;
    document.getElementById('source-code').value = term;
    log('Suggestion applied', { icd, system, term },2);
    checkStep2Completion();
  }

  // --- Translation / FHIR Ops ---
  function guard(step){
    if(!canRun(step)) { log('Step locked. Complete previous step first.', { step }, step); return false; }
    return true;
  }
  async function forwardTranslate(){ if(!guard(3)) return; const icd = grab('icd-name'); if(!icd){ log('Need ICD name',{},3); return; } const r= await api(`/public/translate?icd_name=${encodeURIComponent(icd)}`, { step:3 }); advanceStep(3); return r; }
  async function reverseTranslate(){ if(!guard(4)) return; const icd = grab('icd-name'); if(!icd){ log('Need ICD name',{},4); return; } const r=await api(`/public/translate/reverse?icd_name=${encodeURIComponent(icd)}`, { step:4 }); advanceStep(4); return r; }
  async function codesystem(){ if(!guard(5)) return; const sys = grab('map-system'); const r=await api(`/fhir/CodeSystem/${sys}`, { step:5 }); advanceStep(5); return r; }
  async function lookup(){ if(!guard(5)) return; const sys=grab('map-system'); const code=grab('source-code'); if(!code){ log('Need code/term',{},5); return; } const r=await api(`/fhir/CodeSystem/$lookup?system=${sys}&code=${encodeURIComponent(code)}`, { step:5 }); advanceStep(5); return r; }
  async function expand(){ if(!guard(6)) return; const sys=grab('map-system'); const r=await api(`/fhir/ValueSet/$expand?system=${sys}&count=10`, { step:6 }); advanceStep(6); return r; }
  async function conceptTranslate(){ if(!guard(7)) return; const sys=grab('map-system'); const code=grab('source-code'); if(!code){ log('Need code/term',{},7); return; } const r=await api(`/fhir/ConceptMap/$translate?system=${sys}&code=${encodeURIComponent(code)}`, { step:7 }); advanceStep(7); return r; }
  async function provenance(){ if(!guard(8)) return; const icd=grab('icd-name'); if(!icd){ log('Need ICD name',{},8); return; } const r=await api(`/fhir/provenance/conceptmap?icd_name=${encodeURIComponent(icd)}`, { step:8 }); advanceStep(8); return r; }
  async function capability(){ if(!guard(8)) return; const r=await api('/fhir/metadata', { step:8 }); advanceStep(8); return r; }
  async function cacheStats(){ if(!guard(9)) return; const r=await api('/public/translate/cache/stats', { step:9 }); advanceStep(9); return r; }

  function hookButton(id, handler){ const btn=document.getElementById(id); if(!btn) return; btn.addEventListener('click', ()=> withButtonLoading(btn, handler)); }

  function initCollapsibles(){
    const steps = Array.from(document.querySelectorAll('.step'));
    steps.forEach(stepEl => {
      const header = stepEl.querySelector('.step-header');
      const body = stepEl.querySelector('.step-body');
      // initialize collapsed heights
      if(stepEl.classList.contains('step-collapsed')){
        body.style.maxHeight = '0px';
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
      }
      header.addEventListener('click', (e)=>{
        // prevent toggling if clicking buttons inside header (future proof)
        if(e.target.closest('button')) return;
        const isCollapsed = stepEl.classList.contains('step-collapsed');
        if(isCollapsed){
          // close others (single-open)
          steps.forEach(other => {
            if(other!==stepEl && !other.classList.contains('step-collapsed')){
              const ob = other.querySelector('.step-body');
              ob.style.maxHeight = ob.scrollHeight + 'px'; // force current height
              requestAnimationFrame(()=>{
                ob.style.maxHeight = '0px';
                other.classList.add('step-collapsed');
              });
            }
          });
          // open this
          stepEl.classList.remove('step-collapsed');
          body.style.maxHeight = body.scrollHeight + 'px';
          persistOpen(stepEl.dataset.step);
          autoScrollStep(stepEl);
        } else {
          // collapse this
            body.style.maxHeight = body.scrollHeight + 'px';
            requestAnimationFrame(()=>{ body.style.maxHeight = '0px'; });
            stepEl.classList.add('step-collapsed');
            persistOpen(null);
        }
      });
      // Transition end cleanup to allow dynamic content height recalculation
      body.addEventListener('transitionend', (ev)=>{
        if(ev.propertyName==='max-height'){
          if(stepEl.classList.contains('step-collapsed')){
            body.style.maxHeight = '0px';
          } else {
            body.style.maxHeight = body.scrollHeight + 'px';
          }
        }
      });
    });
    // Recalculate open panel height when window resizes or content changes
    window.addEventListener('resize', ()=>{
      document.querySelectorAll('.step:not(.step-collapsed) .step-body').forEach(b=>{ b.style.maxHeight = b.scrollHeight + 'px'; });
    });
  }

  // --- Auto scroll to opened step ---
  function autoScrollStep(stepEl){
    const rect = stepEl.getBoundingClientRect();
    const offset = window.scrollY + rect.top - 70;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }
  function persistOpen(step){ if(step) localStorage.setItem(OPEN_STATE_KEY, step); else localStorage.removeItem(OPEN_STATE_KEY); }
  function loadOpen(){ return localStorage.getItem(OPEN_STATE_KEY); }
  // Mini map dots
  function buildDots(){ const container = document.getElementById('progress-dots'); if(!container) return; container.innerHTML=''; for(let i=1;i<=totalSteps;i++){ const b=document.createElement('button'); b.type='button'; b.dataset.step=i; b.title='Step '+i; b.addEventListener('click', ()=>{ if(i===1 || stepDone[i-1]) openStep(i); }); container.appendChild(b);} updateDotsActive(); }
  function syncDotState(step,state){ const cont=document.getElementById('progress-dots'); if(!cont) return; const b=cont.querySelector(`button[data-step='${step}']`); if(!b) return; b.classList.remove('dot-active','dot-done','dot-locked'); if(state==='done') b.classList.add('dot-done'); else if(state==='active') b.classList.add('dot-active'); else if(state==='locked') b.classList.add('dot-locked'); }
  function updateDotsActive(){ const open=document.querySelector('.step:not(.step-collapsed)'); const openNum=open?open.dataset.step:null; const cont=document.getElementById('progress-dots'); if(!cont) return; cont.querySelectorAll('button').forEach(b=>{ b.classList.remove('dot-active'); if(b.dataset.step===openNum) b.classList.add('dot-active'); }); }
  function openStep(step){ const el=document.querySelector(`.step[data-step='${step}']`); if(!el) return; if(el.classList.contains('step-collapsed')) el.querySelector('.step-header').click(); else autoScrollStep(el); }

  // --- Event binding ---
  function attach(){
    pill().textContent = API_BASE;
    document.getElementById('token-input').value = token;
    document.getElementById('save-token-btn').addEventListener('click', ()=> setToken(document.getElementById('token-input').value.trim()));
    const clearBtn = document.getElementById('clear-log-btn');
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        Object.keys(stepOutputs).forEach(k=> delete stepOutputs[k]);
        if(outputWrapper()) outputWrapper().innerHTML='';
      });
    }
    hookButton('login-btn', login);
    hookButton('logout-btn', logout);
    hookButton('load-verified-btn', fetchVerifiedList);
    hookButton('refresh-release-btn', async ()=>{
      // Correct admin path: router has prefix '/conceptmap' and is included under '/admin'
      let rels;
      try {
        rels = await api('/admin/conceptmap/releases');
      } catch(e){
        log('ConceptMap releases endpoint not found at /admin/conceptmap/releases', { error: e.message });
        return;
      }
      const version = (rels.releases&&rels.releases[0]&&rels.releases[0].version)||'v1-submission';
      await api(`/admin/conceptmap/releases/${version}/refresh`,{method:'POST'});
    });
    document.getElementById('verified-icd-select').addEventListener('change', async e=>{
      const val = e.target.value; if(!val) return;
      document.getElementById('icd-name').value = val;
      log('ICD selected', { icd: val },2);
      // Auto-fetch suggestions for this ICD and auto-apply first Ayurveda (or first) to populate system & term
      const suggestions = await runSearch(val) || [];
      let pick = suggestions.find(s=> s.system === 'ayurveda') || suggestions[0];
      if(pick){
        // Build a temporary element-like object for applySuggestion expectations
        const temp = document.createElement('div');
        temp.dataset.icd = pick.icd_name;
        temp.dataset.system = pick.system;
        temp.dataset.term = pick.term;
        temp.dataset.code = pick.code || pick.term;
        applySuggestion(temp);
        log('Auto-applied first mapping suggestion for selected ICD', { autoAppliedSystem: pick.system, term: pick.term },2);
      } else {
        // No suggestion; place ICD into search box for manual path but do NOT claim completion
        const searchBox=document.getElementById('search-box'); if(searchBox) searchBox.value = val;
        log('No suggestions found for ICD selection; awaiting manual system + term input.', { icd: val },2);
        checkStep2Completion();
      }
    });
    document.getElementById('search-box').addEventListener('input', e=>{
      const q = e.target.value.trim();
      if(searchTimer) clearTimeout(searchTimer);
      if(mappingSearchAbort){ mappingSearchAbort.abort(); }
      searchTimer = setTimeout(()=> runSearch(q), 320); // extended debounce to reduce network calls
    });
    const useTypedBtn = document.getElementById('use-typed-search-btn');
    if(useTypedBtn){
      hookButton('use-typed-search-btn', async ()=>{
        const val = document.getElementById('search-box').value.trim();
        if(!val){ log('Nothing typed to apply.',{},2); return; }
        // If matches an ICD in select, treat as ICD; else still allow as ICD name input for testing forward translate
        document.getElementById('icd-name').value = val;
        log('Typed value applied as ICD name.', { icd: val },2);
        checkStep2Completion();
      });
    }
    // Manual edits of fields involved in readiness
    ['icd-name','map-system','source-code'].forEach(id=>{
      const el = document.getElementById(id); if(el){ el.addEventListener('input', checkStep2Completion); }
    });
    hookButton('forward-translate-btn', forwardTranslate);
    hookButton('reverse-translate-btn', reverseTranslate);
    hookButton('lookup-btn', lookup);
    hookButton('expand-btn', expand);
    hookButton('concept-translate-btn', conceptTranslate);
    hookButton('codesystem-btn', codesystem);
    hookButton('provenance-btn', provenance);
    hookButton('capability-btn', capability);
    hookButton('cache-btn', cacheStats);
    initCollapsibles();
    // initial step states
  markStep(1,'active');
    for(let i=2;i<=totalSteps;i++){ markStep(i,'locked'); setStepInteractivity(i,false); }
    setStepInteractivity(1,true);
    setProgress();
    log('Guided mapping flow ready. Start with Step 1 (Login).', {}, 1);
    const firstBody = document.querySelector('.step[data-step="1"] .step-body');
    if(firstBody){ firstBody.style.maxHeight = firstBody.scrollHeight + 'px'; }
    buildDots();
    const lastOpen = loadOpen();
    if(lastOpen && lastOpen!=='1'){ const idx=parseInt(lastOpen,10); if(idx===1 || stepDone[idx-1]) openStep(idx); }
    // Global theme handled elsewhere
    disableForwardTranslate();
  }

  document.addEventListener('DOMContentLoaded', attach);
  function disableForwardTranslate(){ const btn=document.getElementById('forward-translate-btn'); if(btn){ btn.disabled=true; btn.classList.add('opacity-50','cursor-not-allowed','waiting-step2'); } }
  function enableForwardTranslate(){ if(!step2Ready) return; const btn=document.getElementById('forward-translate-btn'); if(btn){ btn.disabled=false; btn.classList.remove('opacity-50','cursor-not-allowed','waiting-step2'); } }
})();
