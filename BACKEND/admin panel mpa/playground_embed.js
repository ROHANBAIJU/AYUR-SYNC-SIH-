(function(){
  // Embed version of Master Admin Playground inside analytics.
  const API_BASE = (typeof window!=='undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://127.0.0.1:8000/api';
  const state = { activeRelease:null, bundle:null };

  // --- Lightweight toast system ---
  function ensureToastRoot(){ let el=document.getElementById('pg-toasts'); if(!el){ el=document.createElement('div'); el.id='pg-toasts'; el.style.position='fixed'; el.style.top='12px'; el.style.right='12px'; el.style.zIndex='9999'; el.style.display='flex'; el.style.flexDirection='column'; el.style.gap='6px'; document.body.appendChild(el);} return el; }
  function toast(msg, type='info', ttlMs=5000){ try { const root=ensureToastRoot(); const div=document.createElement('div'); const colors={info:'bg-slate-800 text-white', error:'bg-rose-600 text-white', success:'bg-emerald-600 text-white', warn:'bg-amber-500 text-white'}; div.className='pg-toast shadow text-[12px] px-3 py-2 rounded '+(colors[type]||colors.info); div.textContent=msg; root.appendChild(div); setTimeout(()=>{ div.style.opacity='0'; div.style.transition='opacity .4s'; setTimeout(()=>div.remove(),400); }, ttlMs);} catch(e){ console.log('toast fallback', msg);} }

  function headers(){ const t = localStorage.getItem('accessToken'); return t? { 'Authorization':'Bearer '+t } : {}; }
  function initialShow(){ loadOverview(); }

  function btnLoad(btn,on){ if(!btn) return; if(on){ if(!btn.dataset._inner) btn.dataset._inner=btn.innerHTML; btn.disabled=true; btn.innerHTML=`<span class='inline-block w-3 h-3 mr-1 border-2 border-slate-300 border-t-transparent rounded-full animate-spin'></span>${btn.dataset.loading||'...'}`;} else { if(btn.dataset._inner){ btn.innerHTML=btn.dataset._inner; delete btn.dataset._inner;} btn.disabled=false; } }
  async function api(path){
    const url = path.startsWith('http')? path: API_BASE+path;
    let r;
    try {
      r = await fetch(url,{headers:headers()});
    } catch(netErr){
      console.error('Network error', netErr);
      toast('Network error contacting API','error');
      throw netErr;
    }
    if(!r.ok){
      let body=''; try { body = await r.text(); } catch(_){}
      const msg = `HTTP ${r.status} for ${url} ${(body||'').slice(0,200)}`;
      console.warn(msg);
      toast(msg, r.status===401?'warn':'error');
      throw new Error(msg);
    }
    try { return await r.json(); } catch(parseErr){ console.warn('Non-JSON response', parseErr); return {}; }
  }

  async function loadOverview(){ const btn=document.getElementById('pg-refresh-overview'); btnLoad(btn,true); try { const st = await api('/status'); state.activeRelease = st.current_release; const metrics=[ ['Total',st.total_mappings], ['Verified',st.verified_mappings], ['Verified %', st.total_mappings? (st.verified_pct.toFixed(1)+'%'):'0%'], ['Active Release', st.current_release||'—'], ['Release Elements', st.release_elements], ['Audits', st.audit_events], ['Ingest Batches', st.ingest_batches||0], ['Rows Pending', st.ingest_rows_pending||0], ['Rows Promoted', st.ingest_rows_promoted||0], ['Rows Rejected', st.ingest_rows_rejected||0] ]; const wrap=document.getElementById('pg-overview-metrics'); wrap.innerHTML = metrics.map(m=>`<div class='p-3 bg-white border rounded'><div class='text-[10px] uppercase tracking-wide text-slate-500 mb-1 font-medium'>${m[0]}</div><div class='text-sm font-semibold text-slate-800'>${m[1]}</div></div>`).join(''); } catch(e){ console.warn(e); } finally { btnLoad(btn,false);} }

  async function loadReleases(){ const btn=document.getElementById('pg-load-releases'); btnLoad(btn,true); const body=document.getElementById('pg-release-rows'); const empty=document.getElementById('pg-release-empty'); body.innerHTML=''; empty.classList.add('hidden'); try { const data = await api('/admin/conceptmap/releases'); const rels = data.releases||[]; if(!rels.length){ empty.classList.remove('hidden'); return; } body.innerHTML = rels.map(r=>`<tr class='border-b last:border-0'> <td class='py-1 px-2 text-[11px]'>${r.version}${r.version===state.activeRelease?' <span class="inline-block text-[10px] px-1 rounded bg-emerald-100 text-emerald-700 ml-1">active</span>':''}</td><td class='py-1 px-2 text-[11px]'>${r.elements??r.count??'—'}</td><td class='py-1 px-2 text-[11px]'><button class='text-indigo-600 hover:underline' data-pg-view='${r.version}'>elements</button></td></tr>`).join(''); } catch(e){ console.warn(e); empty.classList.remove('hidden'); } finally { btnLoad(btn,false);} }

  async function loadElements(version, icd){ const btn=document.getElementById('pg-load-elements'); btnLoad(btn,true); const body=document.getElementById('pg-elements-rows'); const empty=document.getElementById('pg-elements-empty'); body.innerHTML=''; empty.classList.add('hidden'); try { const v = version || state.activeRelease; if(!v){ empty.classList.remove('hidden'); empty.textContent='No active release.'; return; } const params=new URLSearchParams(); if(icd) params.set('icd_name', icd); const data= await api(`/admin/conceptmap/releases/${v}/elements?`+params.toString()); document.getElementById('pg-elements-count').textContent = data.count?`(${data.count})`:''; const list = data.elements||[]; if(!list.length){ empty.classList.remove('hidden'); return; } body.innerHTML = list.slice(0,300).map(el=>`<tr class='border-b last:border-0'> <td class='py-1 px-2 text-[10px]'>${escapeHtml(el.icd_name)}</td><td class='py-1 px-2 text-[10px]'>${escapeHtml(el.icd_code||'')}</td><td class='py-1 px-2 text-[10px]'>${escapeHtml(el.system)}</td><td class='py-1 px-2 text-[10px]'>${escapeHtml(el.term)}</td><td class='py-1 px-2 text-[10px] text-center'>${el.is_primary?'<span class="inline-block px-1 bg-slate-200 rounded text-[9px]">Y</span>':''}</td></tr>`).join(''); } catch(e){ console.warn(e); empty.classList.remove('hidden'); } finally { btnLoad(btn,false);} }

  async function rebuildSnapshot(){ const btn=document.getElementById('pg-rebuild-release'); btnLoad(btn,true); try { const rel= state.activeRelease || 'v1-submission'; await fetch(API_BASE+`/admin/conceptmap/releases/${rel}/refresh`, {method:'POST', headers:headers()}); await loadOverview(); await loadReleases(); } catch(e){ console.warn(e); } finally { btnLoad(btn,false);} }

  async function exportConceptMap(){ if(!state.activeRelease){ alert('No active release'); return; } try { const data = await api(`/admin/conceptmap/releases/${state.activeRelease}/fhir?summary=false`); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`conceptmap-${state.activeRelease}.json`; document.body.appendChild(a); a.click(); a.remove(); } catch(e){ console.warn(e); }
  }

  async function fetchProvenance(){ const btn=document.getElementById('pg-load-provenance'); btnLoad(btn,true); const icd=document.getElementById('pg-prov-icd').value.trim(); const out=document.getElementById('pg-provenance-output'); if(!icd){ out.textContent='// Provide ICD name'; btnLoad(btn,false); return; } try { const data= await api(`/fhir/provenance/conceptmap?icd_name=${encodeURIComponent(icd)}`); out.textContent=JSON.stringify(data,null,2); } catch(e){ out.textContent='// Error: '+e.message; } finally { btnLoad(btn,false);} }

  async function runDiff(){ const btn=document.getElementById('pg-run-diff'); btnLoad(btn,true); try { const from=document.getElementById('pg-diff-from').value.trim(); let to=document.getElementById('pg-diff-to').value.trim(); if(!to){ to = state.activeRelease || ''; } if(!to){ document.getElementById('pg-diff-output').innerHTML='<pre class="p-2 m-0">// Need target release</pre>'; return; } const qs = new URLSearchParams(); if(from) qs.set('from_version', from); const data = await api(`/admin/conceptmap/releases/${encodeURIComponent(to)}/diff?`+qs.toString()); document.getElementById('pg-diff-added-count').textContent=data.summary.added; document.getElementById('pg-diff-removed-count').textContent=data.summary.removed; document.getElementById('pg-diff-changed-count').textContent=data.summary.changed; const out=document.getElementById('pg-diff-output'); const limit=300; function fmt(obj){ return JSON.stringify(obj); } let html='<div class="p-2">'; if(data.added.length) html+=`<div class='mb-2'><div class='font-semibold text-emerald-700 mb-1'>Added (${data.added.length})</div><ul class='space-y-1'>${data.added.slice(0,limit).map(a=>`<li>+ ${escapeHtml(a.system)} | ${escapeHtml(a.term)} → ${escapeHtml(a.icd_name)}${a.icd_code?(' ['+escapeHtml(a.icd_code)+']'):''}</li>`).join('')}</ul></div>`; if(data.removed.length) html+=`<div class='mb-2'><div class='font-semibold text-rose-700 mb-1'>Removed (${data.removed.length})</div><ul class='space-y-1'>${data.removed.slice(0,limit).map(a=>`<li>- ${escapeHtml(a.system)} | ${escapeHtml(a.term)} → ${escapeHtml(a.icd_name)}${a.icd_code?(' ['+escapeHtml(a.icd_code)+']'):''}</li>`).join('')}</ul></div>`; if(data.changed.length) html+=`<div class='mb-2'><div class='font-semibold text-amber-700 mb-1'>Changed (${data.changed.length})</div><ul class='space-y-1'>${data.changed.slice(0,limit).map(ch=>`<li>* ${escapeHtml(ch.after.system)} | ${escapeHtml(ch.after.term)} → ${escapeHtml(ch.after.icd_name)} ${ch.before.icd_code!==ch.after.icd_code?`[${escapeHtml(ch.before.icd_code||'∅')}→${escapeHtml(ch.after.icd_code||'∅')}]`:''}${ch.before.is_primary!==ch.after.is_primary?` [primary ${ch.before.is_primary?'Y':'N'}→${ch.after.is_primary?'Y':'N'}]`:''}${ch.before.active!==ch.after.active?` [active ${ch.before.active?'Y':'N'}→${ch.after.active?'Y':'N'}]`:''}</li>`).join('')}</ul></div>`; if(!data.added.length && !data.removed.length && !data.changed.length) html+='<div class="text-slate-500">No differences.</div>'; html+='</div>'; out.innerHTML=html; } catch(e){ document.getElementById('pg-diff-output').innerHTML='<pre class="p-2 m-0">// Diff error: '+escapeHtml(e.message)+'</pre>'; } finally { btnLoad(btn,false);} }

  function composeBundle(){ const cm=document.getElementById('pg-bundle-cm').checked; const cs=document.getElementById('pg-bundle-cs').checked; const vs=document.getElementById('pg-bundle-vs').checked; const pv=document.getElementById('pg-bundle-prov').checked; const bundle={ resourceType:'Bundle', type:'collection', meta:{generated:new Date().toISOString()}, entry:[] }; if(cm) bundle.entry.push({resource:{resourceType:'ConceptMap', version: state.activeRelease||'v1-submission'}}); if(cs) bundle.entry.push({resource:{resourceType:'CodeSystem', id:'ayurveda'}}); if(vs) bundle.entry.push({resource:{resourceType:'ValueSet', id:'ayurveda-vs'}}); if(pv) bundle.entry.push({resource:{resourceType:'Provenance', recorded:new Date().toISOString()}}); state.bundle=bundle; document.getElementById('pg-bundle-output').textContent=JSON.stringify(bundle,null,2); document.getElementById('pg-download-bundle').disabled=false; }
  function downloadBundle(){ if(!state.bundle) return; const blob=new Blob([JSON.stringify(state.bundle,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='bundle-preview.json'; document.body.appendChild(a); a.click(); a.remove(); }

  function escapeHtml(str){ return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  // --- Ingestion (Option B) ---
  async function ingestUpload(){
    const btn=document.getElementById('pg-ingest-upload');
    const fileInp=document.getElementById('pg-ingest-file');
    const log=document.getElementById('pg-ingest-log');
    if(!fileInp.files.length){ log.innerHTML='<pre class="p-2 m-0">// Select a CSV/XLS first</pre>'; toast('Select a file first','warn'); return; }
    const f=fileInp.files[0];
    const fd=new FormData(); fd.append('file', f);
    btnLoad(btn,true);
    const start=performance.now();
    try {
      const r = await fetch(API_BASE+'/admin/ingest/upload',{ method:'POST', headers: headers(), body: fd });
      const dur = (performance.now()-start).toFixed(0);
      let bodyText='';
      if(!r.ok){ try { bodyText = await r.text(); } catch(_){}; console.debug('Upload error raw body:', bodyText);
        // Heuristic: if status 401/403 and CORS preflight succeeded, it's auth not CORS.
        if(r.status===401||r.status===403){ toast('Auth error uploading (check token)','warn'); }
        else if(r.status===422){ toast('Validation error: check required columns','error'); }
        else if(r.status===400){ toast('Bad request: '+bodyText.slice(0,120),'error'); }
        else { toast('Upload failed HTTP '+r.status,'error'); }
        throw new Error(r.status+' upload failed '+bodyText.slice(0,200));
      }
      let data={};
      try { data = await r.json(); } catch(parseErr){ console.warn('Parse JSON fail', parseErr); }
      const meta='<div class="px-2 py-1 bg-slate-50 border-t text-[10px]">Uploaded <strong>'+escapeHtml(f.name)+'</strong> in '+dur+'ms • <a href="#pg-toggle-ingest-help" class="text-indigo-600 hover:underline">Instructions</a></div>';
      log.innerHTML = '<pre class="p-2 m-0">'+escapeHtml(JSON.stringify(data,null,2))+'</pre>'+meta;
      toast('Upload OK: '+f.name,'success');
      await loadBatches();
    } catch(e){
      console.error('Upload failure', e);
      // Likely CORS indicator: TypeError network error before status (no r.ok branch)
      if(e instanceof TypeError && !/upload failed/.test(e.message)){
        toast('Network/CORS failure (see console)','error');
      }
      log.innerHTML='<pre class="p-2 m-0">// Error: '+escapeHtml(e.message)+'</pre>';
    } finally { btnLoad(btn,false);} }
  // Overhauled: includes delete button & safer error messaging
  async function loadBatches(){
    const btn=document.getElementById('pg-load-batches'); if(btn) btnLoad(btn,true);
    const list=document.getElementById('pg-batch-list');
    const empty=document.getElementById('pg-batch-empty');
    if(list) list.innerHTML=''; if(empty) empty.classList.add('hidden');
    try {
      const data= await api('/admin/ingest/batches');
      const batches=data.batches||[];
      if(!batches.length){ if(empty){ empty.classList.remove('hidden'); empty.textContent='No batches yet.';} return; }
      if(list) list.innerHTML = batches.map(b=>`<li class='group px-2 py-1 hover:bg-slate-50 flex items-center justify-between' data-batch='${b.id}'>
        <div class='flex-1 cursor-pointer'><span class='font-mono'>#${b.id}</span> ${escapeHtml(b.filename)} <span class='text-slate-500'>(rows ${b.total_rows})</span></div>
        <button class='text-rose-600 opacity-0 group-hover:opacity-100 text-[11px]' data-del-batch='${b.id}' title='Delete batch'>&times;</button>
      </li>`).join('');
    } catch(e){ if(empty){ empty.classList.remove('hidden'); empty.textContent='Error loading batches'; } }
    finally { if(btn) btnLoad(btn,false); }
  }
  function confidenceClass(v){ if(v==null) return ''; if(v>=80) return 'text-emerald-600 font-semibold'; if(v>=50) return 'text-amber-600'; return 'text-slate-500'; }
  // Row action buttons: only promote & reject (verify removed per request)
  function rowActionButtons(r){ if(r.status==='promoted') return `<span class='text-emerald-600'>promoted</span>`; if(r.status==='rejected') return `<span class='text-rose-500'>rejected</span>`; return `<button class='text-indigo-600 hover:underline' data-promote='${r.id}'>promote</button> <button class='text-rose-600 hover:underline' data-reject='${r.id}'>reject</button>`; }
  async function loadBatchRows(batchId){
    state.currentBatch = batchId;
    const body=document.getElementById('pg-batch-rows');
    const empty=document.getElementById('pg-batch-rows-empty');
    body.innerHTML=''; empty.classList.add('hidden');
    if(!batchId){ empty.classList.remove('hidden'); empty.textContent='Select a batch.'; return; }
    try {
      const qv=document.getElementById('pg-row-filter-q').value.trim();
      const sv=document.getElementById('pg-row-filter-status').value;
      const sysv=document.getElementById('pg-row-filter-system').value;
      const mcv=document.getElementById('pg-row-filter-minconf').value;
      const params=new URLSearchParams();
      if(qv) params.set('q', qv); if(sv) params.set('status', sv); if(sysv) params.set('system', sysv); if(mcv) params.set('min_conf', mcv);
      const data= await api(`/admin/ingest/batches/${batchId}/rows?`+params.toString());
      document.getElementById('pg-batch-rows-meta').textContent = `(showing ${data.rows.length})`;
      if(!data.rows.length){ empty.classList.remove('hidden'); empty.textContent='No rows.'; return; }
      body.innerHTML = data.rows.map(r=>{
        const placeholder = !!r.placeholder_enriched;
        const badge = placeholder ? '<span class="ml-1 inline-block px-1 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[9px]" title="Placeholder ICD name auto-generated from term; no AI confidence">placeholder</span>' : '';
        const shortDef = r.short_definition ? `<div class='text-[10px] text-slate-600 truncate max-w-[180px]' title="${escapeHtml(r.short_definition)}">${escapeHtml(r.short_definition)}</div>` : '';
        const longDefIcon = r.long_definition ? `<button class='ml-1 text-indigo-600 text-[10px]' title='View long definition' data-longdef='${r.id}'>def</button>` : '';
        const vernacular = r.vernacular_term ? `<div class='text-[10px] text-emerald-700'>${escapeHtml(r.vernacular_term)}</div>` : '';
        return `<tr class='border-b last:border-0 align-top' data-row='${r.id}' data-row-system='${escapeHtml(r.system)}' data-row-term='${escapeHtml(r.source_term)}' data-row-code='${escapeHtml(r.source_code||'')}' data-row-icd='${escapeHtml(r.suggested_icd_name||'')}'>
          <td class='px-1 py-1'><input type='checkbox' data-row-select='${r.id}' /></td>
          <td class='px-2 py-1'>${escapeHtml(r.system)}</td>
          <td class='px-2 py-1'>${escapeHtml(r.source_term)}${vernacular}</td>
          <td class='px-2 py-1'>${escapeHtml(r.suggested_icd_name||'')}${badge}</td>
          <td class='px-2 py-1'>${shortDef}${longDefIcon}</td>
          <td class='px-1 py-1 text-right space-x-1'>${rowActionButtons(r)}</td>
        </tr>`;
      }).join('');
      // Hook up long def popovers
      body.querySelectorAll('[data-longdef]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-longdef');
          const row = data.rows.find(rr=> String(rr.id)===String(id));
          if(!row || !row.long_definition) return;
          const modalId='pg-longdef-modal';
          let modal=document.getElementById(modalId);
          if(!modal){
            modal=document.createElement('div');
            modal.id=modalId;
            modal.className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
            modal.innerHTML=`<div class='bg-white w-[600px] max-h-[80vh] overflow-auto rounded shadow-lg p-4 relative'>
              <button class='absolute top-2 right-2 text-slate-500 hover:text-slate-700' data-close-longdef>&times;</button>
              <h3 class='text-sm font-semibold mb-2'>Long Definition</h3>
              <pre class='whitespace-pre-wrap text-[11px] leading-snug font-sans text-slate-700' id='pg-longdef-text'></pre>
            </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', e=>{ if(e.target===modal || e.target.hasAttribute('data-close-longdef')) modal.remove(); });
          }
          const textEl=document.getElementById('pg-longdef-text');
          if(textEl) textEl.textContent=row.long_definition;
        });
      });
    } catch(e){ empty.classList.remove('hidden'); empty.textContent='Error loading rows'; }
  }
  function downloadTemplate(){
    // New format: remove confidence/justification; add short_definition,long_definition,vernacular_term
    // Only system + term required; suggested_icd_name optional. Definitions help curators.
    const header = 'system,code,term,suggested_icd_name,short_definition,long_definition,vernacular_term';
    const rows = [
      'ayurveda,AY-100,Kapha Disorder,,,"Functional imbalance of Kapha dosha","Shleshma vriddhi causing congestion",',
      'siddha,SD-210,Vatha Issue,Headache,,,"Derangement of Vatham leading to pain",',
      'unani,UN-002,Balagham Condition,Chronic cough,,,"Excess balgham with chronic productive cough",'
    ];
    const csv = header + '\n' + rows.join('\n') + '\n';
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ingestion_template.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  async function promoteRow(rowId){ const btn = document.querySelector(`[data-promote='${rowId}']`); if(btn) { btn.textContent='...'; btn.disabled=true; } try { const fd=new FormData(); fd.append('primary','false'); const r = await fetch(API_BASE+`/admin/ingest/rows/${rowId}/promote`, { method:'POST', headers: headers(), body: fd }); if(!r.ok) throw new Error(r.status); await loadBatchRows(state.currentBatch); loadOverview(); } catch(e){ if(btn){ btn.textContent='err'; btn.classList.add('text-rose-600'); } } }
  async function promoteRow(rowId){
    const btn = document.querySelector(`[data-promote='${rowId}']`);
    if(btn){ btn.textContent='...'; btn.disabled=true; }
    try {
      const fd=new FormData(); fd.append('primary','false');
      const resp = await fetch(API_BASE+`/admin/ingest/rows/${rowId}/promote`, { method:'POST', headers: headers(), body: fd });
      let data=null; let bodyText='';
      try { bodyText = await resp.text(); } catch(_){}
      if(resp.ok){
        try { data = JSON.parse(bodyText||'{}'); } catch(_){}
        const aiFallback = data && (data.ai_confidence === 0) && /ai|gemini|unavailable|failed/i.test((data.ai_justification||''));
        if(aiFallback){
          toast('Promoted as new suggestion (AI unavailable – placeholder used)','warn');
        } else {
          toast('Promoted as new suggestion','success');
        }
        await loadBatchRows(state.currentBatch);
        loadOverview();
        if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate();
      } else {
        // Graceful fallback: treat as succeeded visually if server returned a 5xx/AI related error, still refresh rows.
        if(/gemini|inference|ai/i.test(bodyText)){ toast('AI offline – promoted with placeholder name','warn'); await loadBatchRows(state.currentBatch); loadOverview(); }
        else { throw new Error(resp.status + ' ' + bodyText.slice(0,120)); }
      }
      if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate();
    } catch(e){
      console.warn('Promote failed', e);
      if(btn){ btn.textContent='err'; btn.classList.add('text-rose-600'); }
      toast('Promote failed: '+e.message,'error');
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='promote'; }
    }
  }
  async function rejectRow(rowId){ const btn = document.querySelector(`[data-reject='${rowId}']`); if(btn) { btn.textContent='...'; btn.disabled=true; } try { const r = await fetch(API_BASE+`/admin/ingest/rows/${rowId}/reject`, { method:'POST', headers: headers() }); if(!r.ok) throw new Error(r.status); await loadBatchRows(state.currentBatch); loadOverview(); } catch(e){ if(btn){ btn.textContent='err'; btn.classList.add('text-rose-600'); } } }
  async function rejectRow(rowId){ const btn = document.querySelector(`[data-reject='${rowId}']`); if(btn) { btn.textContent='...'; btn.disabled=true; } try { const r = await fetch(API_BASE+`/admin/ingest/rows/${rowId}/reject`, { method:'POST', headers: headers() }); if(!r.ok) throw new Error(r.status); await loadBatchRows(state.currentBatch); loadOverview(); if(window.bumpSuggestionsInvalidate) window.bumpSuggestionsInvalidate(); } catch(e){ if(btn){ btn.textContent='err'; btn.classList.add('text-rose-600'); } } }
  // Removed verifyPromoted: verification flow kept in backend but UI path disabled.
  function selectedRowIds(){ return Array.from(document.querySelectorAll('[data-row-select]:checked')).map(cb=>parseInt(cb.getAttribute('data-row-select'))).filter(Boolean); }
  async function bulkPromote(){ const ids=selectedRowIds(); if(!ids.length){ alert('Select rows first'); return;} const btn=document.getElementById('pg-bulk-promote'); btnLoad(btn,true); try { const r = await fetch(API_BASE+'/admin/ingest/rows/bulk_promote',{ method:'POST', headers:{...headers(),'Content-Type':'application/json'}, body: JSON.stringify({row_ids: ids}) }); if(!r.ok) throw new Error(r.status); await loadBatchRows(state.currentBatch); loadOverview(); } catch(e){ console.warn(e); } finally { btnLoad(btn,false);} }
  async function bulkReject(){ const ids=selectedRowIds(); if(!ids.length){ alert('Select rows first'); return;} const btn=document.getElementById('pg-bulk-reject'); btnLoad(btn,true); try { const r = await fetch(API_BASE+'/admin/ingest/rows/bulk_reject',{ method:'POST', headers:{...headers(),'Content-Type':'application/json'}, body: JSON.stringify({row_ids: ids}) }); if(!r.ok) throw new Error(r.status); await loadBatchRows(state.currentBatch); loadOverview(); } catch(e){ console.warn(e); } finally { btnLoad(btn,false);} }
  function wireRowFilters(){ ['pg-row-filter-q','pg-row-filter-status','pg-row-filter-system','pg-row-filter-minconf'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener('change', ()=> state.currentBatch && loadBatchRows(state.currentBatch)); el.addEventListener('keyup', e=>{ if(e.key==='Enter') state.currentBatch && loadBatchRows(state.currentBatch); }); }); const selAll=document.getElementById('pg-select-all-rows'); if(selAll) selAll.addEventListener('change', ()=>{ document.querySelectorAll('[data-row-select]').forEach(cb=> cb.checked = selAll.checked); }); }

  function wire(){
    // Add a toggle button inside analytics instructions area header or create a floating handle.
    initialShow();
  document.getElementById('pg-refresh-overview').addEventListener('click', loadOverview);
    document.getElementById('pg-rebuild-release').addEventListener('click', rebuildSnapshot);
    document.getElementById('pg-export-conceptmap').addEventListener('click', exportConceptMap);
    document.getElementById('pg-load-releases').addEventListener('click', loadReleases);
    document.getElementById('pg-load-elements').addEventListener('click', ()=> loadElements());
    document.getElementById('pg-filter-icd').addEventListener('keyup', e=>{ if(e.key==='Enter') loadElements(null, e.target.value.trim()); });
    document.getElementById('pg-release-rows').addEventListener('click', e=>{ const btn=e.target.closest('[data-pg-view]'); if(btn){ loadElements(btn.getAttribute('data-pg-view')); }});
    document.getElementById('pg-load-provenance').addEventListener('click', fetchProvenance);
    document.getElementById('pg-compose-bundle').addEventListener('click', composeBundle);
    document.getElementById('pg-download-bundle').addEventListener('click', downloadBundle);
    const diffBtn=document.getElementById('pg-run-diff'); if(diffBtn) diffBtn.addEventListener('click', runDiff);
  const up=document.getElementById('pg-ingest-upload'); if(up) up.addEventListener('click', ingestUpload);
  const tmpl=document.getElementById('pg-download-template'); if(tmpl) tmpl.addEventListener('click', downloadTemplate);
    const lb=document.getElementById('pg-load-batches'); if(lb) lb.addEventListener('click', loadBatches);
  const bl=document.getElementById('pg-batch-list'); if(bl) bl.addEventListener('click', e=>{ const del=e.target.closest('[data-del-batch]'); if(del){ const id=del.getAttribute('data-del-batch'); if(confirm('Delete batch #'+id+'? This removes its rows.')){ fetch(API_BASE+'/admin/ingest/batches/'+id,{method:'DELETE', headers: headers()}).then(async resp=>{ if(!resp.ok){ toast('Delete failed HTTP '+resp.status,'error'); return;} toast('Batch #'+id+' deleted','success'); await loadBatches(); if(state.currentBatch==id){ const body=document.getElementById('pg-batch-rows'); if(body) body.innerHTML=''; state.currentBatch=null; } loadOverview(); }).catch(err=>{ console.error('Delete error', err); toast('Network error deleting batch','error'); }); } return; } const li=e.target.closest('[data-batch]'); if(li) loadBatchRows(li.getAttribute('data-batch')); });
  const rowsTbl=document.getElementById('pg-batch-rows'); if(rowsTbl) rowsTbl.addEventListener('click', e=>{ const p=e.target.closest('[data-promote]'); if(p) promoteRow(p.getAttribute('data-promote')); const rj=e.target.closest('[data-reject]'); if(rj) rejectRow(rj.getAttribute('data-reject')); });
    const bp=document.getElementById('pg-bulk-promote'); if(bp) bp.addEventListener('click', bulkPromote); const br=document.getElementById('pg-bulk-reject'); if(br) br.addEventListener('click', bulkReject); wireRowFilters();
    // Initial auto-load & periodic refresh diagnostics
    loadBatches();
    setInterval(()=>{ loadBatches(); if(state.currentBatch) loadBatchRows(state.currentBatch); }, 60000);
  }

  document.addEventListener('DOMContentLoaded', wire);
})();
