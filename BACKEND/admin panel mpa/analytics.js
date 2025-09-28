// Unified Analytics Dashboard Script (deduplicated & enhanced)
(function(){
  const api = window.apiBase ? window.apiBase() : '';
  const token = () => window.getToken ? window.getToken() : (localStorage.getItem('accessToken') || localStorage.getItem('token'));
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });
  const qs = (id) => document.getElementById(id);

  // Core DOM refs
  const statTotal = qs('stat-total');
  const statAvg = qs('stat-avg');
  const stat2xx = qs('stat-2xx');
  const statErr = qs('stat-err');
  const recentPre = qs('recent');
  const pathsDiv = qs('paths-table');
  const latencySpan = qs('latency');
  const statusSpan = qs('status');
  const outputPre = qs('output');
  const runBtn = qs('run');
  const methodSel = qs('method');
  const endpointInp = qs('endpoint');
  const bodyInp = qs('body');
  const pathsLimitInp = qs('paths-limit');
  const pathsRefreshBtn = qs('paths-refresh');
  const tsRefreshBtn = qs('ts-refresh');

  // Integration helpers
  const integOutput = qs('integration-output'); // scenario quick buttons removed
  const apiSearchInp = qs('api-search');
  const apiSearchBtn = qs('api-search-btn');
  // Removed standalone api-lookup-results container; reuse suggestion dropdown (#lookup-suggest-box)
  const apiLookupResults = null;
  // Dynamic suggestion dropdown container (created lazily)
  let suggestBox = null; let suggestActiveIndex = -1; let suggestItems = []; let suggestLastValue = ''; let suggestDebounceTimer = null;
  const apiTranslateOutput = qs('api-translate-output');
  const apiTranslateClearBtn = qs('api-translate-clear');
  const apiMappedList = qs('api-mapped-list');
  const mappedFilterSel = qs('mapped-filter');
  const logoutBtn = qs('logout-button');

  // Map DOM
  const mapEl = qs('india-map');
  const sysSel = qs('map-system');
  const fromInp = qs('map-from');
  const toInp = qs('map-to');
  const mapRefresh = qs('map-refresh');
  const mapDetails = qs('map-details');

  if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('accessToken'); localStorage.removeItem('token'); window.location.href='index.html'; });

  // State
  let tsChart = null;
  let map = null; let markersLayer = null;
  let lastPathsLimit = 25;

  // Fetch Helpers
  async function fetchJSON(path){ const res = await fetch(`${api}/api/admin${path}`, { headers: headers() }); if(res.status===401){ window.location.href='index.html'; return null;} return res.json(); }
  async function fetchPublic(path){ const url = path.startsWith('http')?path:`${api}${path}`; const res = await fetch(url,{headers:headers()}); if(res.status===401){ window.location.href='index.html'; return null;} return res.json(); }

  // Paths/Table
  function renderPaths(paths){
    if(!paths){ pathsDiv.textContent='No data'; return; }
    const limit = Number(pathsLimitInp?.value)||25; lastPathsLimit = limit;
    const arr = Array.isArray(paths)?paths:Object.entries(paths).map(([path,data])=>({ path, ...(data||{}) }));
    arr.sort((a,b)=>(b.count||0)-(a.count||0));
    const top = arr.slice(0, limit);
    const rows = top.map(p=>{ const total=p.count||0; const sb=p.status_breakdown||p.status||{}; const sum=(pref)=>Object.entries(sb).reduce((acc,[k,v])=>acc+(String(k).startsWith(pref)?(v||0):0),0); const s2=sum('2'); const s4=sum('4'); const s5=sum('5'); const avg=Math.round(p.avg_latency_ms||0); return `<tr class="border-b"><td class="px-2 py-1">${p.path}</td><td class="px-2 py-1 text-right">${total}</td><td class="px-2 py-1 text-right">${s2}</td><td class="px-2 py-1 text-right">${s4+s5}</td><td class="px-2 py-1 text-right">${avg}</td></tr>`; }).join('');
    pathsDiv.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="px-2 py-1">Path</th><th class="px-2 py-1 text-right">Count</th><th class="px-2 py-1 text-right">2xx</th><th class="px-2 py-1 text-right">4xx/5xx</th><th class="px-2 py-1 text-right">Avg ms</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function buildChartConfig(labels, counts, avgs, dark){
    const gridColor = dark? 'rgba(148,163,184,0.25)':'rgba(100,116,139,0.15)';
    const tickColor = dark? '#e2e8f0':'#1e293b';
    return {
      type:'line',
      data:{ labels, datasets:[
        { label:'Requests', data:counts, borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,0.10)', tension:.15, yAxisID:'y' },
        { label:'Avg ms', data:avgs, borderColor:'#059669', backgroundColor:'rgba(5,150,105,0.10)', tension:.15, yAxisID:'y1' }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index', intersect:false}, stacked:false,
        plugins:{ legend:{ labels:{ color:tickColor } } },
        scales:{
          y:{ position:'left', beginAtZero:true, grid:{ color:gridColor }, ticks:{ color:tickColor } },
          y1:{ position:'right', beginAtZero:true, grid:{ drawOnChartArea:false }, ticks:{ color:tickColor } },
          x:{ ticks:{ color:tickColor }, grid:{ color:gridColor } }
        }
      }
    };
  }

  function renderTimeseries(ts){
    const labels = ts.map(b=>b.bucket);
    const counts = ts.map(b=>b.count);
    const avgs = ts.map(b=>Math.round(b.avg_latency_ms||0));
    const canvas = qs('tsChart');
    if(!canvas) return;
    if(tsChart){ try{ tsChart.destroy(); }catch{} }
    const dark = document.documentElement.classList.contains('dark-mode');
    tsChart = new Chart(canvas.getContext('2d'), buildChartConfig(labels, counts, avgs, dark));
  }

  // React to theme changes for chart recolor
  window.addEventListener('app:theme-change', (e)=>{
    if(!tsChart) return; const { dark } = e.detail||{};
    const cfg = tsChart.config;
    const gridColor = dark? 'rgba(148,163,184,0.25)':'rgba(100,116,139,0.15)';
    const tickColor = dark? '#e2e8f0':'#1e293b';
    ['x','y','y1'].forEach(axis=>{
      if(cfg.options.scales[axis]){
        if(cfg.options.scales[axis].grid && axis!=='y1') cfg.options.scales[axis].grid.color = gridColor;
        if(cfg.options.scales[axis].ticks) cfg.options.scales[axis].ticks.color = tickColor;
      }
    });
    if(cfg.options.plugins?.legend?.labels) cfg.options.plugins.legend.labels.color = tickColor;
    tsChart.update();
  });

  async function refreshSummaryAndTimeseries(){
    const [summary, timeseries] = await Promise.all([
      fetchJSON('/analytics/summary'),
      fetchJSON('/analytics/timeseries?bucket=minute&limit=60')
    ]);
    if(summary){
      statTotal.textContent = summary.total||0;
      statAvg.textContent = Math.round(summary.avg_latency_ms||0);
      const by = summary.by_status||{}; const sum=(p)=>Object.entries(by).reduce((a,[k,v])=>a+(k.startsWith(p)?(v||0):0),0);
      stat2xx.textContent = sum('2'); statErr.textContent = sum('4')+sum('5');
    }
    if(timeseries) renderTimeseries(timeseries.buckets || timeseries);
  }

  async function refreshPaths(){
    const limit = Number(pathsLimitInp?.value)||25; const data = await fetchJSON(`/analytics/paths?limit=${limit}`); if(data) renderPaths(data.top||data);
  }

  async function refreshRecent(){
    const recent = await fetchJSON('/analytics/recent?limit=50');
    if(recent){
      const list = Array.isArray(recent) ? recent : (Array.isArray(recent.entries)?recent.entries:[]);
      recentPre.textContent = list.map(e=>JSON.stringify(e)).join('\n') || 'No recent entries';
    }
  }

  async function refreshAll(){
    try { await Promise.all([refreshSummaryAndTimeseries(), refreshPaths(), refreshRecent()]); }
    catch(e){ console.error('refreshAll failed', e); }
  }

  // Map clustering
  async function fetchClusters(){ if(!map) return; const b=map.getBounds(); const bbox=`${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)}`; const zoom=map.getZoom(); const params=new URLSearchParams({bbox,zoom:String(zoom)}); if(sysSel?.value) params.set('system', sysSel.value); if(fromInp?.value) params.set('date_from', fromInp.value); if(toInp?.value) params.set('date_to', toInp.value); const url=`${api}/api/admin/analytics/map/clusters?${params.toString()}`; const res= await fetch(url,{headers:headers()}); if(res.status===401){ window.location.href='index.html'; return; } const data = await res.json(); renderClusters(data.clusters||[]); }
  function renderClusters(clusters){ if(!markersLayer) return; markersLayer.clearLayers(); clusters.forEach(c=>{ const m=L.circleMarker([c.lat,c.lng],{ radius:Math.max(6, Math.min(18, Math.round(4+Math.log2((c.count||1)+1)))), color:'#1d4ed8', fillColor:'#60a5fa', fillOpacity:.5, weight:1 }); const top=(c.top||[]).map(t=>`${t.name} (${t.count})`).join('<br/>'); m.bindTooltip(`<div class="text-xs"><div><b>${c.count}</b> events</div>${top?`<div class='mt-1 text-gray-700'>${top}</div>`:''}</div>`); m.on('click', ()=>fetchDetails(c.lat,c.lng)); m.addTo(markersLayer); }); }
  async function fetchDetails(lat,lng){ const params=new URLSearchParams({lat:String(lat), lng:String(lng), tolerance:'0.01'}); if(sysSel?.value) params.set('system', sysSel.value); if(fromInp?.value) params.set('date_from', fromInp.value); if(toInp?.value) params.set('date_to', toInp.value); const url=`${api}/api/admin/analytics/map/details?${params.toString()}`; const res= await fetch(url,{headers:headers()}); const data= await res.json(); renderDetails(data); }
  function renderDetails(data){ const { total=0, topDiagnoses=[], doctors=[] } = data||{}; const topList = topDiagnoses.map(t=>`<li class='flex justify-between'><span>${t.name}</span><span class='text-gray-600'>${t.count}</span></li>`).join(''); const docList = doctors.map(d=>{ const evs=(d.events||[]).slice(0,10).map(e=>`<li class='border-b py-1'><div class='text-sm font-medium'>${e.icd_name}</div><div class='text-xs text-gray-600'>${e.system}${e.code?' • '+e.code:''}${e.term_name?' • '+e.term_name:''}</div><div class='text-[11px] text-gray-500'>${e.city||''}${e.state?', '+e.state:''} • ${e.ts||''}</div></li>`).join(''); return `<div class='mb-3'><div class='font-semibold'>Doctor: ${d.doctor_id}</div><ul class='mt-1'>${evs}</ul></div>`; }).join(''); mapDetails.innerHTML = `<div class='text-sm'><div class='mb-2'><b>${total}</b> events in this area</div><div class='mb-2'>Top diagnoses:</div><ul class='mb-3 space-y-1'>${topList}</ul><div class='mb-1 font-semibold'>Doctors</div><div>${docList || '<div class="text-gray-500">No doctor info available.</div>'}</div></div>`; }

  // Scenarios
  // Removed scenario quick-run event listeners

  // Lookup helpers
  async function renderLookup(q, opts={}){
    const { fallbackTranslate=false } = opts;
    // We no longer display lookup results in any dropdown – clear existing suggestions
    clearSuggest();
    try{
      const data = await fetchPublic(`/api/public/lookup?query=${encodeURIComponent(q)}`);
      let items=[]; (data||[]).forEach(g=>{
        const icdName=g.icd_name||g.icdName||'Unknown';
        // New shape support: g.system_mappings = [{system, primary_term, aliases:[]}]
        if(Array.isArray(g.system_mappings)){
          g.system_mappings.forEach(sm=>{
            const sys = sm.system;
            if(sm.primary_term){
              const pt = sm.primary_term; const code=pt.code||''; const label=`${sys.toUpperCase()} • ${pt.term||''}${code?' • '+code:''}`;
              items.push(`<div class="py-0.5"><button class="text-gray-800 hover:underline text-[12px]" data-sys="${sys}" data-code="${code}">${label}</button></div>`);
            }
            (sm.aliases||[]).forEach(al=>{ if(!al) return; const code=al.code||''; const label=`${sys.toUpperCase()} • ${al.term||''}${code?' • '+code:''}`; items.push(`<div class="pl-4 py-0.5"><button class="text-gray-600 hover:underline text-[11px]" data-sys="${sys}" data-code="${code}">${label}</button></div>`); });
          });
        } else {
          // Legacy shape fallback
            ['ayurveda','siddha','unani'].forEach(sys=>{ const section=g[sys]||{}; const primary= section.primary? [section.primary]:[]; const aliases= Array.isArray(section.aliases)? section.aliases:[]; [...primary,...aliases].forEach(t=>{ if(!t) return; const code=t.code||''; const label=`${sys.toUpperCase()} • ${t.term||''}${code?' • '+code:''}`; items.push(`<div class="py-0.5"><button class="text-gray-700 hover:underline text-[12px]" data-sys="${sys}" data-code="${code}">${label}</button></div>`); }); });
        }
        // We intentionally removed the top-level ICD anchor row per request.
      });

      // If lookup endpoint returned nothing, fallback to mapping-search (same as Guided Test Step 2)
      if(items.length===0){
        try {
          const ms = await fetchPublic(`/api/public/mapping-search?q=${encodeURIComponent(q)}`);
          const suggestions = (ms && (ms.suggestions||ms.results||ms.items)) || [];
          suggestions.forEach(s=>{
            const icd = s.icd_name || s.icdName || '';
            const system = s.system || '';
            const term = s.code || s.term || '';
            // ICD line (click translates by ICD)
            if(icd){ items.push(`<div class="py-1"><button class="text-indigo-700 hover:underline" data-icd-name="${icd}">${icd}</button></div>`); }
            // System term (click translates by system/code)
            const label = `${(system||'').toUpperCase()} • ${s.term || term}${s.code? ' • '+s.code: ''}`;
            if(system && term){ items.push(`<div class="pl-3 text-[12px]"><button class="text-gray-700 hover:underline" data-sys="${system}" data-code="${s.code||term}">${label}</button></div>`); }
          });
          if(items.length){
            // Prepend a subtle note indicating fallback used
            items.unshift('<div class="text-[10px] text-amber-600 mb-1">(Used mapping-search fallback)</div>');
          }
        } catch(msErr){ /* ignore mapping-search failure, we'll try translate fallback if requested */ }
      }

      if(items.length===0){
        if(fallbackTranslate){
          apiTranslateOutput.textContent = 'Lookup empty – attempting direct translation…';
          await runTranslateByIcd(q);
        }
      } else {
        // Intentionally do nothing (user requested removal of results container). Could optionally log.
      }
    }catch(e){
      // Silent UI: surface error only in translate output if fallback enabled
      if(fallbackTranslate){
        apiTranslateOutput.textContent='Lookup failed – attempting direct translation…';
        try{ await runTranslateByIcd(q);}catch(_){ /* ignore */ }
      }
    }
  }
  async function runTranslateByIcd(name){ apiTranslateOutput.textContent='Translating…'; try{ const d=await fetchPublic(`/api/public/translate?icd_name=${encodeURIComponent(name)}`); apiTranslateOutput.textContent=JSON.stringify(d,null,2);}catch(e){ apiTranslateOutput.textContent=String(e);} }
  async function runTranslateByTerm(system, code){ apiTranslateOutput.textContent='Translating…'; try{ const d=await fetchPublic(`/api/public/translate?system=${encodeURIComponent(system)}&code=${encodeURIComponent(code)}&target=icd11`); apiTranslateOutput.textContent=JSON.stringify(d,null,2);}catch(e){ apiTranslateOutput.textContent=String(e);} }
  apiSearchBtn?.addEventListener('click', ()=>{ const q=apiSearchInp.value.trim(); if(q) renderLookup(q); });
  apiSearchInp?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); apiSearchBtn.click(); } });
  // Clear translation output
  apiTranslateClearBtn?.addEventListener('click', ()=>{ if(apiTranslateOutput){ apiTranslateOutput.textContent='// Translation output will appear here'; } });
  // Typeahead suggestion logic using /lookup/suggest
  function ensureSuggestBox(){ if(suggestBox) return; const wrap = document.getElementById('api-search-wrap') || apiSearchInp.parentElement; suggestBox = document.createElement('div'); suggestBox.id='lookup-suggest-box'; wrap.appendChild(suggestBox); }
  function clearSuggest(){ if(suggestBox){ suggestBox.innerHTML=''; suggestBox.style.display='none'; } suggestItems=[]; suggestActiveIndex=-1; }
  function highlightSuggest(){ if(!suggestBox) return; [...suggestBox.querySelectorAll('button[data-sg-idx]')].forEach(btn=>{ const idx=Number(btn.dataset.sgIdx); btn.dataset.active = (idx===suggestActiveIndex)? 'true':'false'; }); }
  function renderSuggest(data){
    ensureSuggestBox();
    if(!data.length){
      suggestBox.innerHTML = `<div class="px-3 py-3 text-[11px] text-slate-600"><span class="font-medium">Term not found</span><br/><span class="text-slate-500">Maybe not verified yet – please enter a verified disease / mapped term.</span></div>`;
      suggestBox.style.display='block';
      suggestItems=[]; suggestActiveIndex=-1;
      return;
    }
    const rows = data.map((s,idx)=>{
      const kindBadge = s.kind==='icd'? 'ICD' : (s.kind==='snapshot'?'SNAP':'TM');
      const sys = s.system? s.system.toUpperCase():'';
      const primaryStar = s.is_primary? '<span class="primary-star" title="Primary">★</span>':'';
      const isSnap = s.kind==='snapshot';
      let main, trail='';
      if(s.kind==='icd'){
        main = `<span class="term-frag font-medium">${s.icd_name}</span>`;
      } else {
        const termPart = `${s.term||''}${s.code? ' • '+s.code:''}`;
        main = `<span class="term-frag">${sys? sys+' • ':''}${termPart}</span>`;
        trail = s.icd_name? `<span class="trail">→ ${s.icd_name}</span>`:'';
      }
      return `<div><button type="button" data-sg-idx="${idx}" data-kind="${s.kind}" data-icd="${s.icd_name||''}" data-system="${s.system||''}" data-code="${s.code||''}" class="w-full text-left flex items-center gap-2 ${isSnap?'snapshot-note':''}"><span class="badge-kind">${kindBadge}</span>${main}${trail}${primaryStar}</button></div>`;
    }).join('');
    suggestBox.innerHTML = rows; suggestBox.style.display='block'; suggestItems=data; highlightSuggest(); }
  async function fetchSuggest(q){ try{ const res = await fetchPublic(`/api/public/lookup/suggest?q=${encodeURIComponent(q)}`); if(Array.isArray(res)) renderSuggest(res); }catch{ /* ignore */ } }
  function scheduleSuggest(){ const val = apiSearchInp.value.trim(); if(val.length<2){ clearSuggest(); return; } if(val===suggestLastValue) return; suggestLastValue=val; clearTimeout(suggestDebounceTimer); suggestDebounceTimer = setTimeout(()=>fetchSuggest(val), 160); }
  apiSearchInp?.addEventListener('input', scheduleSuggest);
  apiSearchInp?.addEventListener('keydown', e=>{ if(!suggestBox || suggestBox.style.display==='none') return; if(['ArrowDown','ArrowUp','Enter','Escape','Tab'].includes(e.key)){ if(e.key==='ArrowDown'){ e.preventDefault(); suggestActiveIndex = (suggestActiveIndex+1) % suggestItems.length; highlightSuggest(); } else if(e.key==='ArrowUp'){ e.preventDefault(); suggestActiveIndex = (suggestActiveIndex-1+suggestItems.length) % suggestItems.length; highlightSuggest(); } else if(e.key==='Escape'){ clearSuggest(); } else if(e.key==='Enter' || e.key==='Tab'){ if(suggestActiveIndex>=0 && suggestItems[suggestActiveIndex]){ e.preventDefault(); applySuggestion(suggestItems[suggestActiveIndex]); } } } });
  document.addEventListener('click', e=>{ if(!suggestBox) return; if(e.target===apiSearchInp || suggestBox.contains(e.target)) return; clearSuggest(); });
  function applySuggestion(s){ clearSuggest(); if(!s) return; // If ICD anchor chosen => run lookup + auto translate
    if(s.kind==='icd'){ apiSearchInp.value = s.icd_name; renderLookup(s.icd_name,{fallbackTranslate:true}); return; }
    // Traditional or snapshot term: set input to term/code and perform lookup then translation towards ICD
    const q = s.code || s.term || s.icd_name; apiSearchInp.value = q; renderLookup(q,{fallbackTranslate:false}); if(s.system && (s.code || s.term)){ runTranslateByTerm(s.system, s.code || s.term); } else if(s.icd_name){ runTranslateByIcd(s.icd_name); }
  }
  // Click handler for suggestions
  document.addEventListener('click', e=>{ const btn = e.target.closest && e.target.closest('button[data-sg-idx]'); if(!btn) return; const idx = Number(btn.dataset.sgIdx); if(!isNaN(idx) && suggestItems[idx]) applySuggestion(suggestItems[idx]); });
  apiLookupResults?.addEventListener('click', e=>{ const t=e.target; if(!t?.dataset) return; if(t.dataset.icdName) runTranslateByIcd(t.dataset.icdName); else if(t.dataset.sys && t.dataset.code!==undefined) runTranslateByTerm(t.dataset.sys, t.dataset.code); });

  // Verified mapped diseases tree
  async function loadMappedList(){
    if(!apiMappedList) return;
    apiMappedList.innerHTML = '<div class="text-gray-500 text-xs">Loading…</div>';
    try {
      const data = await fetchJSON('/master-map-data');
      const nodes=[];
      (data||[]).forEach(row=>{
        const status=(row.row_status||'').toString();
        if(!status.toLowerCase().startsWith('verified')) return;
        const icd=row.suggested_icd_name;
        const sysData={};
        ['ayurveda','siddha','unani'].forEach(sys=>{
          try {
            const raw=row[`${sys}_mapping`];
            if(!raw) return;
            const obj= typeof raw==='string'? JSON.parse(raw): raw;
            const primary = obj?.primary || null;
            const aliases = Array.isArray(obj?.aliases)? obj.aliases:[];
            if(primary || aliases.length) sysData[sys]={ primary, aliases };
          } catch {}
        });
        nodes.push({ icd, systems: sysData });
      });

      // Insert filter bar
      const filterBarId='mapped-filter-text';
      const container=document.createElement('div');
      container.className='mapped-accordion';
      const filterBar = document.createElement('div');
      filterBar.className='mapped-filter-bar';
      filterBar.innerHTML = `<input id="${filterBarId}" type="text" placeholder="Filter ICD name..." />`;
      apiMappedList.innerHTML='';
      apiMappedList.appendChild(filterBar);
      apiMappedList.appendChild(container);

      function buildItem(node, idx){
        const systems = Object.keys(node.systems);
        // system pills summarizing counts
        const pills = systems.map(s=>{
          const block=node.systems[s];
          const total = (block.aliases||[]).length + (block.primary?1:0);
            return `<span class="sys-pill ${s}">${s.charAt(0).toUpperCase()+s.slice(1)}<span style="margin-left:4px; font-weight:600;">${total}</span></span>`;
        }).join('');
        const item=document.createElement('div'); item.className='mapped-item';
        const header=document.createElement('button'); header.type='button'; header.className='mapped-header'; header.setAttribute('aria-expanded','false'); header.dataset.idx=String(idx);
        header.innerHTML=`<span class="chevron">▶</span><span class="icd-text" data-icd-click="${encodeURIComponent(node.icd)}">ICD‑11 • ${node.icd}</span><span class="flex gap-1">${pills}</span>`;
        const body=document.createElement('div'); body.className='mapped-body';
        systems.forEach(s=>{
          const block=node.systems[s];
          const sb=document.createElement('div'); sb.className='sys-block';
          const aliasCount = (block.aliases||[]).length;
          sb.innerHTML=`<div class="sys-title">${s.toUpperCase()}<span class="count-badge">${aliasCount + (block.primary?1:0)}</span></div>`;
          if(block.primary){
            const p=block.primary; const code = p.code? `<span class="code">${p.code}</span>`:'';
            sb.innerHTML += `<div class="primary-term">${p.term||''}${code} <span class="primary-badge">PRIMARY</span></div>`;
          }
            if(aliasCount){
              const chips=block.aliases.map(a=>{
                const code=a.code? `<span class=\"code\">${a.code}</span>`:'';
                return `<span class="chip" data-sys="${s}" data-code="${a.code||''}" data-term="${a.term||''}"><span class="alias-badge">ALIAS</span> ${a.term||''}${code}</span>`;
              }).join('');
              sb.innerHTML += `<div class="alias-chips">${chips}</div>`;
            } else if(!block.primary){
              sb.innerHTML += `<div class="empty-alias">No terms</div>`;
            }
          body.appendChild(sb);
        });
        item.appendChild(header); item.appendChild(body); return item;
      }

      function render(filterValue){
        container.innerHTML='';
        const f = (filterValue||'').toLowerCase().trim();
        const selectedSys=(mappedFilterSel?.value||'all');
        nodes.filter(n=>!f || (n.icd||'').toLowerCase().includes(f)).forEach((n,idx)=>{
          // system filter: remove systems not selected
          if(selectedSys!=='all' && selectedSys!=='icd'){
            if(!n.systems[selectedSys]) return; // skip if no that system
          }
          container.appendChild(buildItem(n, idx));
        });
        if(!container.children.length){
          container.innerHTML='<div class="text-[11px] text-slate-500">No verified mappings.</div>';
        }
      }

      render('');
      const filterInput=document.getElementById(filterBarId);
      filterInput?.addEventListener('input', ()=>render(filterInput.value));
      mappedFilterSel?.addEventListener('change', ()=>render(filterInput?.value||''));

      // Delegated events
  apiMappedList.addEventListener('click', async e=>{
        const header = e.target.closest && e.target.closest('.mapped-header');
        if(header){
          const expanded = header.getAttribute('aria-expanded')==='true';
          const body = header.nextElementSibling;
          header.setAttribute('aria-expanded', String(!expanded));
          if(body){
            if(!expanded){
              // Close any other open panels first (single-open behavior)
              const openHeaders = apiMappedList.querySelectorAll('.mapped-header[aria-expanded="true"]');
              openHeaders.forEach(h=>{
                if(h===header) return;
                h.setAttribute('aria-expanded','false');
                const ob = h.nextElementSibling;
                if(ob && ob.classList.contains('open')){
                  ob.addEventListener('transitionend', function h2(ev){ if(ev.propertyName==='max-height'){ ob.classList.remove('open'); ob.removeEventListener('transitionend', h2); } }, { once:true });
                  ob.classList.remove('open');
                }
              });
              // Now expand this one
              body.classList.add('open');
            } else {
              // collapsing current
              body.addEventListener('transitionend', function h(ev){ if(ev.propertyName==='max-height'){ body.classList.remove('open'); body.removeEventListener('transitionend', h); } }, { once:true });
              body.classList.remove('open');
            }
          }
          // If the click target was the ICD text itself, trigger lookup immediately
          const icdSpan = e.target.closest && e.target.closest('[data-icd-click]');
          if(icdSpan){
            const rawIcd = decodeURIComponent(icdSpan.getAttribute('data-icd-click')||'');
            if(apiSearchInp){ apiSearchInp.value = rawIcd; }
            // Run lookup against the ICD anchoring term (fallbackTranslate true)
            await renderLookup(rawIcd, { fallbackTranslate:true });
            // If still no visible results (e.g. zero verified mappings yet) ensure translate attempt
            // No results container now; always attempt translate fallback only if output empty
            if(!apiTranslateOutput.textContent.trim()) runTranslateByIcd(rawIcd);
          }
          return;
        }
        const chip = e.target.closest && e.target.closest('.chip');
        if(chip){
          const sys = chip.getAttribute('data-sys');
            const code = chip.getAttribute('data-code');
            const term = chip.getAttribute('data-term');
          if(sys && (code||term)){
            const q = code || term;
            if(apiSearchInp) apiSearchInp.value=q;
            renderLookup(q,{fallbackTranslate:false});
            runTranslateByTerm(sys, code||term);
          }
        }
      });
    } catch(e){
      apiMappedList.innerHTML = `<div class="text-red-600 text-xs">${String(e)}</div>`;
    }
  }

  // Raw request runner
  runBtn?.addEventListener('click', async ()=>{
    const method=methodSel.value; const ep=endpointInp.value.trim(); const url= ep.startsWith('http')?ep:`${api}${ep}`; const init={ method, headers:headers() };
    if(['POST','PUT','PATCH'].includes(method)){ try{ init.body = bodyInp.value? JSON.stringify(JSON.parse(bodyInp.value)):'{}'; }catch{ init.body = bodyInp.value; } }
    const t0=performance.now();
    try{ const res=await fetch(url, init); const t1=performance.now(); latencySpan.textContent = String(Math.round(t1-t0)); statusSpan.textContent = String(res.status); const text= await res.text(); try{ outputPre.textContent= JSON.stringify(JSON.parse(text), null, 2);}catch{ outputPre.textContent=text; } }catch(e){ latencySpan.textContent='-'; statusSpan.textContent='ERR'; outputPre.textContent=String(e); }
    setTimeout(refreshAll, 500);
  });

  function initMap(){ if(!mapEl || typeof L==='undefined') return; if(mapEl._leaflet_id) return; map=L.map('india-map'); map.setView([22.3511148,78.6677428],5); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:18, attribution:'&copy; OpenStreetMap contributors' }).addTo(map); markersLayer=L.layerGroup().addTo(map); map.on('moveend', fetchClusters); mapRefresh?.addEventListener('click', fetchClusters); sysSel?.addEventListener('change', fetchClusters); fromInp?.addEventListener('change', fetchClusters); toInp?.addEventListener('change', fetchClusters); fetchClusters(); }

  // Manual refresh controls
  pathsRefreshBtn?.addEventListener('click', refreshPaths);
  pathsLimitInp?.addEventListener('change', refreshPaths);
  tsRefreshBtn?.addEventListener('click', refreshSummaryAndTimeseries);

  // Initial load & polling
  refreshAll();
  setInterval(refreshAll, 15000);
  initMap();
  loadMappedList();
  // --- Provenance & FHIR Bundle composer formatting ---
  (function(){
    const provBtn = document.getElementById('pg-load-provenance');
    const provInput = document.getElementById('pg-prov-icd');
    const provOut = document.querySelector('#pg-provenance-output pre');
    const bundleBtn = document.getElementById('pg-compose-bundle');
    const bundleOut = document.querySelector('#pg-bundle-output pre');
    const dlBtn = document.getElementById('pg-download-bundle');
    // Custom formatter to add blank lines between top-level keys and keep compact inner leaf objects
    function formatFHIR(obj){
      // Always attempt to pretty print JSON with vertical spacing.
      try {
        const rawObj = (typeof obj === 'string') ? JSON.parse(obj) : obj;
        if(typeof rawObj !== 'object' || rawObj === null) return String(obj);
        let pretty = JSON.stringify(rawObj, null, 2);
        // Insert an extra blank line between top-level members for readability
        // Matches newline followed by two spaces and a quote (a top-level key in the root object)
        pretty = pretty.replace(/\n(?=  ")/g, '\n\n');
        return pretty;
      } catch { return String(obj); }
    }
    function ensureFormatted(data){
      if(typeof data === 'string'){
        const trimmed = data.trim();
        if(trimmed.startsWith('{') || trimmed.startsWith('[')) return formatFHIR(trimmed);
        return data; // not JSON
      }
      return formatFHIR(data);
    }
    function setBtnLoading(btn, loading){ if(!btn) return; const txt=btn.getAttribute('data-loading')||'Working'; if(loading){ btn.dataset.prevText=btn.textContent; btn.textContent = txt; btn.disabled=true; } else { btn.textContent = btn.dataset.prevText||btn.textContent; btn.disabled=false; } }
    async function safeFetch(url){ const res = await fetch(url,{headers:headers()}); const text = await res.text(); try{ return JSON.parse(text); }catch{ return text; } }
    provBtn?.addEventListener('click', async ()=>{
      const icd = (provInput?.value||'').trim(); if(!icd){ provOut.textContent='// Enter ICD name first'; return; }
      setBtnLoading(provBtn,true); provOut.textContent='// Fetching provenance...';
      try {
        const data = await safeFetch(`${api}/api/admin/provenance?icd_name=${encodeURIComponent(icd)}`);
        provOut.textContent = ensureFormatted(data);
      } catch(e){ provOut.textContent='// Error: '+e; }
      setBtnLoading(provBtn,false);
    });
    bundleBtn?.addEventListener('click', async ()=>{
      setBtnLoading(bundleBtn,true); bundleOut.textContent='// Composing...';
      try {
        const cm = document.getElementById('pg-bundle-cm')?.checked; const cs=document.getElementById('pg-bundle-cs')?.checked; const vs=document.getElementById('pg-bundle-vs')?.checked; const prov=document.getElementById('pg-bundle-prov')?.checked;
        const parts=[]; if(cm) parts.push('conceptmap'); if(cs) parts.push('codesystems'); if(vs) parts.push('valuesets'); if(prov) parts.push('provenance');
        const query = parts.length? `?parts=${parts.join(',')}`:'';
        const data = await safeFetch(`${api}/api/admin/fhir-bundle${query}`);
        bundleOut.textContent = ensureFormatted(data);
        if(typeof data==='object') { dlBtn && (dlBtn.disabled=false); dlBtn.dataset.bundleJson = JSON.stringify(data,null,2); }
      } catch(e){ bundleOut.textContent='// Error: '+e; }
      setBtnLoading(bundleBtn,false);
    });
    dlBtn?.addEventListener('click', ()=>{
      if(!dlBtn.dataset.bundleJson) return; const blob=new Blob([dlBtn.dataset.bundleJson],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fhir_bundle.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500); });
  })();
})();
