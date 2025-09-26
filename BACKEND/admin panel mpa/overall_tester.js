(function(){
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://127.0.0.1:8000/api';
  // Per-step output store
  const stepOutputs = {}; // { step: { entries:[{msg,data,ts}], lastData } }
  const outputWrapper = () => document.getElementById('step-output-wrapper');
  const pill = () => document.getElementById('api-base-pill');
  let token = localStorage.getItem('accessToken') || '';
  let searchTimer = null;
  const totalSteps = 9;
  const progressBar = () => document.getElementById('progress-bar');
  const globalOverlay = () => document.getElementById('global-loading');
  const stepStatus = (n)=> document.getElementById(`status-${n}`);
  let completed = 0;

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
  }
  function advanceStep(current){
    if(stepStatus(current).textContent!=='DONE'){ completed++; markStep(current,'done'); setProgress(); }
    const next = current+1; if(stepStatus(next)) markStep(next,'active');
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
    (list.icd_names||[]).forEach(name => {
      const opt = document.createElement('option'); opt.value=opt.textContent=name; sel.appendChild(opt);
    });
    log('Loaded verified ICD list', { count: (list.icd_names||[]).length },2);
    advanceStep(2);
  }

  // --- Search suggestions --- (new endpoint under /public)
  async function runSearch(q){
    if(!q){ document.getElementById('search-suggestions').innerHTML=''; return; }
    let res;
    try {
      res = await api(`/public/mapping-search?q=${encodeURIComponent(q)}`, { step:2 });
    } catch(e){
      try {
        // Possible alternate path if router prefix mismatch
        res = await api(`/mapping-search?q=${encodeURIComponent(q)}`, { step:2 });
      } catch(inner){
        log('Mapping search endpoint not found. Ensure translate router mounted under /public.', { attempted: q },2);
        return;
      }
    }
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
  }

  function applySuggestion(el){
    const icd = el.dataset.icd; const system = el.dataset.system; const term = el.dataset.code || el.dataset.term;
    document.getElementById('icd-name').value = icd;
    document.getElementById('map-system').value = system;
    document.getElementById('source-code').value = term;
    log('Suggestion applied', { icd, system, term },2);
  }

  // --- Translation / FHIR Ops ---
  async function forwardTranslate(){ const icd = grab('icd-name'); if(!icd){ log('Need ICD name',{},3); return; } const r= await api(`/public/translate?icd_name=${encodeURIComponent(icd)}`, { step:3 }); advanceStep(3); return r; }
  async function reverseTranslate(){ const icd = grab('icd-name'); if(!icd){ log('Need ICD name',{},4); return; } const r=await api(`/public/translate/reverse?icd_name=${encodeURIComponent(icd)}`, { step:4 }); advanceStep(4); return r; }
  async function codesystem(){ const sys = grab('map-system'); const r=await api(`/fhir/CodeSystem/${sys}`, { step:5 }); advanceStep(5); return r; }
  async function lookup(){ const sys=grab('map-system'); const code=grab('source-code'); if(!code){ log('Need code/term',{},5); return; } const r=await api(`/fhir/CodeSystem/$lookup?system=${sys}&code=${encodeURIComponent(code)}`, { step:5 }); advanceStep(5); return r; }
  async function expand(){ const sys=grab('map-system'); const r=await api(`/fhir/ValueSet/$expand?system=${sys}&count=10`, { step:6 }); advanceStep(6); return r; }
  async function conceptTranslate(){ const sys=grab('map-system'); const code=grab('source-code'); if(!code){ log('Need code/term',{},7); return; } const r=await api(`/fhir/ConceptMap/$translate?system=${sys}&code=${encodeURIComponent(code)}`, { step:7 }); advanceStep(7); return r; }
  async function provenance(){ const icd=grab('icd-name'); if(!icd){ log('Need ICD name',{},8); return; } const r=await api(`/fhir/provenance/conceptmap?icd_name=${encodeURIComponent(icd)}`, { step:8 }); advanceStep(8); return r; }
  async function capability(){ const r=await api('/fhir/metadata', { step:8 }); advanceStep(8); return r; }
  async function cacheStats(){ const r=await api('/public/translate/cache/stats', { step:9 }); advanceStep(9); return r; }

  function hookButton(id, handler){ const btn=document.getElementById(id); if(!btn) return; btn.addEventListener('click', ()=> withButtonLoading(btn, handler)); }

  function initCollapsibles(){
    document.querySelectorAll('.step').forEach(stepEl => {
      const header = stepEl.querySelector('.step-header');
      header.addEventListener('click', ()=>{
        stepEl.classList.toggle('step-collapsed');
        const chev = header.querySelector('[data-chevron]');
        if(chev){ chev.style.transform = stepEl.classList.contains('step-collapsed')? 'rotate(-90deg)':'rotate(0deg)'; }
      });
    });
  }

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
    document.getElementById('verified-icd-select').addEventListener('change', e=>{
      const val = e.target.value; if(val){ document.getElementById('icd-name').value = val; log('ICD selected', { icd: val },2); }
    });
    document.getElementById('search-box').addEventListener('input', e=>{
      const q = e.target.value.trim();
      if(searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(()=> runSearch(q), 220);
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
    markStep(1,'active'); for(let i=2;i<=totalSteps;i++) markStep(i,'locked'); setProgress();
    log('Guided mapping flow ready. Start with Step 1 (Login).', {}, 1);
    // Global theme handled elsewhere
  }

  document.addEventListener('DOMContentLoaded', attach);
})();
