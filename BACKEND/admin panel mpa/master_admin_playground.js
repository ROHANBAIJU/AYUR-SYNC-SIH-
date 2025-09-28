(function(){
  const API_BASE = (typeof window!=='undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://127.0.0.1:8000/api';
  const log = (...a)=>console.log('[PLAYGROUND]',...a);
  const state = { activeRelease:null, bundle:null, currentBatch:null, selectedRows:new Set() };

  function headers(){
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization':'Bearer '+token } : {};
  }
  function btnLoading(btn, on){
    if(!btn) return; if(on){ btn.dataset._inner = btn.innerHTML; btn.disabled=true; btn.innerHTML = `<span class='animate-spin inline-block w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full mr-1'></span>${btn.dataset.loading||'Working'}`; }
    else { if(btn.dataset._inner){ btn.innerHTML = btn.dataset._inner; delete btn.dataset._inner; } btn.disabled=false; }
  }
  async function api(path){
    const url = path.startsWith('http')? path : API_BASE + path;
    const res = await fetch(url,{ headers: headers() });
    if(!res.ok) throw new Error(res.status+' '+url);
    return res.json();
  }

  async function loadOverview(){
    const btn = document.getElementById('refresh-overview'); btnLoading(btn,true);
    try {
      const st = await api('/status');
      state.activeRelease = st.current_release;
      const metrics = [
        ['Total', st.total_mappings],
        ['Verified', st.verified_mappings],
        ['Verified %', st.total_mappings? st.verified_pct.toFixed(1)+'%':'0%'],
        ['Active Release', st.current_release||'—'],
        ['Elements', st.release_elements],
        ['Audits', st.audit_events],
        ['Batches', st.ingest_batches||0],
        ['Rows Pending', st.ingest_rows_pending||0],
        ['Rows Promoted', st.ingest_rows_promoted||0],
        ['Rows Rejected', st.ingest_rows_rejected||0]
      ];
      const wrap = document.getElementById('snapshot-metrics');
      wrap.innerHTML = metrics.map(m=>`<div class='p-4 rounded-lg border bg-slate-50'><div class='text-[12px] uppercase tracking-wide text-slate-500 font-medium mb-1'>${m[0]}</div><div class='text-base font-semibold text-slate-800'>${m[1]}</div></div>`).join('');
    } catch(e){ console.warn(e); }
    finally { btnLoading(btn,false); }
  }
  // --- Ingestion Logic (adapted from analytics) ---
  async function ingestUpload(){
    const btn=document.getElementById('pg-ingest-upload'); btnLoading(btn,true);
    const fileInput=document.getElementById('pg-ingest-file'); const logEl=document.getElementById('pg-ingest-log');
    if(!fileInput.files.length){ btnLoading(btn,false); return; }
    const f=fileInput.files[0]; const fd=new FormData(); fd.append('file',f); fd.append('enrich_missing','true'); fd.append('ai_infer_missing','true');
    const t0=performance.now();
    try {
      const r = await fetch(API_BASE+'/admin/ingest/upload',{ method:'POST', headers: headers(), body: fd });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();
      const dur=(performance.now()-t0).toFixed(0);
      logEl.innerHTML = `<pre class='m-0 p-2'>Batch #${data.batch_id} uploaded (${data.rows} rows) in ${dur}ms</pre>`;
      await loadBatches();
      await loadOverview();
    } catch(e){ logEl.innerHTML = `<pre class='m-0 p-2 text-rose-600'>Upload failed: ${e.message}</pre>`; }
    finally { btnLoading(btn,false); fileInput.value=''; }
  }

  async function loadBatches(){
    const btn=document.getElementById('pg-load-batches'); btnLoading(btn,true);
    const list=document.getElementById('pg-batch-list'); list.innerHTML='Loading...';
    try {
      const data=await api('/admin/ingest/batches');
      if(!data.batches.length){ list.innerHTML='<div class="p-3 text-slate-500">No batches yet.</div>'; return; }
      list.innerHTML = `<table class='w-full table-mini'><thead><tr class='border-b'><th class='py-2 pr-2'>ID</th><th class='py-2 pr-2'>File</th><th class='py-2 pr-2'>Rows</th><th class='py-2 pr-2'>Status</th></tr></thead><tbody>`+
        data.batches.map(b=>`<tr class='border-b cursor-pointer hover:bg-slate-50' data-batch='${b.id}'><td class='py-1 pr-2 text-[12px]'>${b.id}</td><td class='py-1 pr-2 text-[12px] truncate max-w-[160px]'>${escapeHtml(b.filename)}</td><td class='py-1 pr-2 text-[12px]'>${b.processed_rows}/${b.total_rows}</td><td class='py-1 pr-2 text-[12px]'>${b.status}</td></tr>`).join('')+`</tbody></table>`;
    } catch(e){ list.innerHTML='<div class="p-3 text-rose-600">Error loading batches</div>'; }
    finally { btnLoading(btn,false); }
  }

  async function loadBatchRows(batchId){
    if(!batchId) return; state.currentBatch=batchId; state.selectedRows.clear(); updateBulkButtons();
    const body=document.getElementById('pg-batch-rows'); body.innerHTML='Loading rows...';
    try {
      const data=await api(`/admin/ingest/batches/${batchId}/rows?limit=500`);
      if(!data.rows.length){ body.innerHTML='<div class="p-3 text-slate-500">No rows in batch.</div>'; return; }
      body.innerHTML = `<table class='w-full table-mini'><thead><tr class='border-b bg-slate-50'>
        <th class='py-2 pr-2'><input type='checkbox' id='pg-row-select-all' /></th>
        <th class='py-2 pr-2'>System</th>
        <th class='py-2 pr-2'>Term</th>
        <th class='py-2 pr-2'>Suggested ICD</th>
        <th class='py-2 pr-2'>Conf</th>
        <th class='py-2 pr-2'>Status</th>
        <th class='py-2 pr-2'>Action</th>
      </tr></thead><tbody>`+
        data.rows.map(r=>{
          const statusBadge = r.status==='promoted' ? `<span class='status-badge'><svg class='w-3 h-3' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 8l3 3 7-7'/></svg> promoted</span>` :
            r.status==='rejected' ? `<span class='status-badge rejected'><svg class='w-3 h-3' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4l8 8M12 4l-8 8'/></svg> rejected</span>` : `<span class='inline-block px-2 py-[2px] rounded-full text-[10px] font-medium bg-slate-100 text-slate-600'>${r.status}</span>`;
          const actions = (r.status==='promoted'||r.status==='rejected') ? '' : `
            <div class='flex gap-1'>
              <button data-promote='${r.id}' class='action-btn action-btn-promote' title='Promote this row'>
                <svg class='w-3.5 h-3.5' viewBox='0 0 20 20' fill='currentColor'><path d='M10 2l6 6h-4v8h-4V8H4l6-6z'/></svg>
                <span>Promote</span>
              </button>
              <button data-reject='${r.id}' class='action-btn action-btn-reject' title='Reject this row'>
                <svg class='w-3.5 h-3.5' viewBox='0 0 20 20' fill='currentColor'><path d='M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm2 4v8l6-4-6-4z'/></svg>
                <span>Reject</span>
              </button>
            </div>`;
          return `<tr class='border-b last:border-0' data-row-id='${r.id}'>
            <td class='py-1 pr-2 text-center'><input type='checkbox' data-row='${r.id}' /></td>
            <td class='py-1 pr-2 text-[12px]'>${escapeHtml(r.system)}</td>
            <td class='py-1 pr-2 text-[12px] truncate max-w-[180px]' title='${escapeHtml(r.source_term)}'>${escapeHtml(r.source_term)}</td>
            <td class='py-1 pr-2 text-[12px]'>${escapeHtml(r.suggested_icd_name||'')}</td>
            <td class='py-1 pr-2 text-[12px]'>${r.ai_confidence??''}</td>
            <td class='py-1 pr-2 text-[12px]'>${statusBadge}</td>
            <td class='py-1 pr-2 text-[12px]'>${actions}</td>
          </tr>`;
        }).join('')+`</tbody></table>`;
    } catch(e){ body.innerHTML='<div class="p-3 text-rose-600">Error loading rows</div>'; }
  }

  function updateBulkButtons(){
    const any= state.selectedRows.size>0; ['pg-bulk-promote','pg-bulk-reject','pg-clear-selection'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.disabled=!any; }});
  }

  async function promoteRowsBulk(ids){
    const btn=document.getElementById('pg-bulk-promote'); btnLoading(btn,true);
    try { await fetch(API_BASE+'/admin/ingest/rows/bulk_promote',{ method:'POST', headers:{...headers(),'Content-Type':'application/json'}, body: JSON.stringify({row_ids:[...ids]}) }); await loadBatchRows(state.currentBatch); await loadOverview(); if(window.clearSuggestionsCache) await clearSuggestionsCache(); if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate(); }
    catch(e){ console.warn(e);} finally { btnLoading(btn,false); }
  }
  async function rejectRowsBulk(ids){
    const btn=document.getElementById('pg-bulk-reject'); btnLoading(btn,true);
    try { await fetch(API_BASE+'/admin/ingest/rows/bulk_reject',{ method:'POST', headers:{...headers(),'Content-Type':'application/json'}, body: JSON.stringify({row_ids:[...ids]}) }); await loadBatchRows(state.currentBatch); await loadOverview(); if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate(); }
    catch(e){ console.warn(e);} finally { btnLoading(btn,false); }
  }
  async function promoteSingle(id){
    const btn=document.querySelector(`[data-promote='${id}']`);
    if(btn){ btn.disabled=true; const original=btn.innerHTML; btn.dataset._inner=original; btn.innerHTML=`<span class='mini-spinner'></span><span>Promoting</span>`; }
    const fd=new FormData(); fd.append('primary','false');
    try {
      const resp = await fetch(API_BASE+`/admin/ingest/rows/${id}/promote`,{method:'POST', headers: headers(), body: fd});
      if(!resp.ok){ throw new Error('HTTP '+resp.status); }
      toast('Row promoted','success');
      await loadBatchRows(state.currentBatch); await loadOverview(); if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate();
    } catch(e){ toast('Promote failed: '+e.message,'error'); if(btn){ btn.classList.add('shake'); setTimeout(()=>btn.classList.remove('shake'),400);} }
    finally { if(btn){ btn.disabled=false; if(btn.dataset._inner){ btn.innerHTML=btn.dataset._inner; delete btn.dataset._inner; }} }
  }
  async function rejectSingle(id){
    const btn=document.querySelector(`[data-reject='${id}']`);
    if(btn){ btn.disabled=true; const original=btn.innerHTML; btn.dataset._inner=original; btn.innerHTML=`<span class='mini-spinner'></span><span>Rejecting</span>`; }
    try {
      const resp = await fetch(API_BASE+`/admin/ingest/rows/${id}/reject`,{method:'POST', headers: headers()});
      if(!resp.ok) throw new Error('HTTP '+resp.status);
      toast('Row rejected','warn');
      await loadBatchRows(state.currentBatch); await loadOverview(); if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate();
    } catch(e){ toast('Reject failed: '+e.message,'error'); }
    finally { if(btn){ btn.disabled=false; if(btn.dataset._inner){ btn.innerHTML=btn.dataset._inner; delete btn.dataset._inner; }} }
  }

  function toggleIngestHelp(){
    const btn=document.getElementById('pg-toggle-ingest-help'); const wrap=document.getElementById('ingestion-instructions');
    const open = btn.getAttribute('aria-expanded')==='true';
    if(open){ btn.setAttribute('aria-expanded','false'); wrap.style.display='none'; }
    else { btn.setAttribute('aria-expanded','true'); wrap.style.display='block'; }
  }

  async function rebuildSnapshot(){
    const btn = document.getElementById('rebuild-release'); btnLoading(btn,true);
    try {
      const rel = state.activeRelease || 'v1-submission';
      await fetch(API_BASE+`/admin/conceptmap/releases/${rel}/refresh`, { method:'POST', headers: headers() });
      await loadOverview();
      await loadReleases();
    } catch(e){ console.warn(e); }
    finally { btnLoading(btn,false); }
  }

  async function exportConceptMap(){
    if(!state.activeRelease){ alert('No active release.'); return; }
    try {
      const data = await api(`/admin/conceptmap/releases/${state.activeRelease}/fhir?summary=false`);
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`conceptmap-${state.activeRelease}.json`; document.body.appendChild(a); a.click(); a.remove();
    } catch(e){ console.warn(e); }
  }

  async function fetchProvenance(){
    const btn = document.getElementById('load-provenance'); btnLoading(btn,true);
    const icd = document.getElementById('prov-icd').value.trim();
    const out = document.getElementById('provenance-output');
    if(!icd){ out.textContent='// Provide an ICD name.'; btnLoading(btn,false); return; }
    try {
      const data = await api(`/fhir/provenance/conceptmap?icd_name=${encodeURIComponent(icd)}`);
      out.textContent = JSON.stringify(data,null,2);
    } catch(e){ out.textContent = '// Error fetching provenance: '+e.message; }
    finally { btnLoading(btn,false); }
  }

  function composeBundle(){
    const includeConceptMap = document.getElementById('bundle-include-conceptmap').checked;
    const includeCS = document.getElementById('bundle-include-codesystems').checked;
    const includeVS = document.getElementById('bundle-include-valuesets').checked;
    const includeProv = document.getElementById('bundle-include-provenance').checked;
    const bundle = {
      resourceType:'Bundle', type:'collection', meta:{ generated:new Date().toISOString() }, entry:[]
    };
    if(includeConceptMap){ bundle.entry.push({ resource:{ resourceType:'ConceptMap', version: state.activeRelease||'v1-submission', status:'active' } }); }
    if(includeCS){ bundle.entry.push({ resource:{ resourceType:'CodeSystem', status:'active', id:'ayurveda' } }); }
    if(includeVS){ bundle.entry.push({ resource:{ resourceType:'ValueSet', status:'active', id:'ayurveda-vs' } }); }
    if(includeProv){ bundle.entry.push({ resource:{ resourceType:'Provenance', recorded:new Date().toISOString() } }); }
    state.bundle = bundle;
    document.getElementById('bundle-output').textContent = JSON.stringify(bundle,null,2);
    document.getElementById('download-bundle').disabled = false;
  }

  function downloadBundle(){
    if(!state.bundle) return; const blob = new Blob([JSON.stringify(state.bundle,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='bundle-preview.json'; document.body.appendChild(a); a.click(); a.remove();
  }

  function escapeHtml(str){ return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  // Toast system
  function toast(msg,type='info',timeout=3200){
    let host=document.getElementById('toast-host');
    if(!host){ host=document.createElement('div'); host.id='toast-host'; document.body.appendChild(host); }
    const el=document.createElement('div'); el.className='toast '+(type||'');
    const icon = type==='success' ? `<svg class='w-4 h-4 text-emerald-600' viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 11l4 4 8-10'/></svg>` : type==='error' ? `<svg class='w-4 h-4 text-rose-600' viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 6l8 8M14 6l-8 8'/></svg>` : type==='warn' ? `<svg class='w-4 h-4 text-amber-600' viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='2'><path d='M10 4l8 14H2L10 4zm0 5v3m0 3h.01'/></svg>` : `<svg class='w-4 h-4 text-slate-500' viewBox='0 0 20 20' fill='currentColor'><circle cx='10' cy='10' r='3'/></svg>`;
    el.innerHTML = icon+`<div class='flex-1'>${escapeHtml(msg)}</div>`+`<button class='text-[11px] font-medium text-slate-500 hover:text-slate-800'>×</button>`;
    host.appendChild(el);
    const close=()=>{ el.style.opacity='0'; el.style.transform='translateY(-4px)'; setTimeout(()=>{ el.remove(); },220); };
    el.querySelector('button').addEventListener('click', close);
    if(timeout){ setTimeout(close, timeout); }
  }

  function wire(){
    document.getElementById('refresh-overview').addEventListener('click', loadOverview);
    document.getElementById('rebuild-release').addEventListener('click', rebuildSnapshot);
    document.getElementById('download-conceptmap').addEventListener('click', exportConceptMap);
    document.getElementById('load-provenance').addEventListener('click', fetchProvenance);
    document.getElementById('compose-bundle').addEventListener('click', composeBundle);
    document.getElementById('download-bundle').addEventListener('click', downloadBundle);
    document.getElementById('pg-ingest-upload').addEventListener('click', ingestUpload);
    document.getElementById('pg-load-batches').addEventListener('click', loadBatches);
    document.getElementById('pg-toggle-ingest-help').addEventListener('click', toggleIngestHelp);
    document.getElementById('pg-batch-list').addEventListener('click', e=>{ const tr=e.target.closest('[data-batch]'); if(tr){ loadBatchRows(tr.getAttribute('data-batch')); }});
    document.getElementById('pg-batch-rows').addEventListener('click', e=>{
      const pr=e.target.closest('[data-promote]'); if(pr){ promoteSingle(pr.getAttribute('data-promote')); return; }
      const rj=e.target.closest('[data-reject]'); if(rj){ rejectSingle(rj.getAttribute('data-reject')); return; }
      if(e.target.matches('[data-row]')){ return; }
    });
    document.getElementById('pg-batch-rows').addEventListener('change', e=>{
      if(e.target.id==='pg-row-select-all'){
        const all = document.querySelectorAll('#pg-batch-rows [data-row]'); state.selectedRows.clear();
        all.forEach(cb=>{ cb.checked = e.target.checked; if(cb.checked) state.selectedRows.add(Number(cb.getAttribute('data-row'))); });
        updateBulkButtons();
      } else if(e.target.hasAttribute('data-row')){
        const id=Number(e.target.getAttribute('data-row'));
        if(e.target.checked) state.selectedRows.add(id); else state.selectedRows.delete(id);
        updateBulkButtons();
      }
    });
    document.getElementById('pg-bulk-promote').addEventListener('click', ()=> promoteRowsBulk(state.selectedRows));
    document.getElementById('pg-bulk-reject').addEventListener('click', ()=> rejectRowsBulk(state.selectedRows));
    document.getElementById('pg-clear-selection').addEventListener('click', ()=>{ state.selectedRows.clear(); const boxes=document.querySelectorAll('#pg-batch-rows [data-row]'); boxes.forEach(b=> b.checked=false); updateBulkButtons(); });
    loadOverview();
  }

  document.addEventListener('DOMContentLoaded', wire);
})();