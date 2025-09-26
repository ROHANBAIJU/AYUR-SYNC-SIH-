// Enhanced accordion examples with single-open behavior, arrow indicator & smooth animation.
(function(){
  const EXAMPLE_MAP = [
    { match: '/api/public/lookup', json: { query: 'abd', results: [{ icd_name: 'Abdominal distension', system: 'ayurveda', term: 'AdhmAnam', is_primary: true }] } },
    { match: '/api/public/translate?icd_name', json: { icd: { name: 'Abdominal distension', code: null }, ayurveda: { primary: { name: 'AdhmAnam', code: 'SM31(AAC-12)' }, aliases: [] }, siddha: null, unani: null, release_version: 'v1-submission' } },
    { match: '/api/public/translate?system', json: { result: true, icd: { code: '—', display: 'Abdominal distension' }, releaseVersion: 'v1-submission', direction: 'forward' } },
    { match: '/api/public/translate/reverse', json: { ayurveda: { primary: { name: 'AdhmAnam' } }, icd: null, release_version: 'v1-submission', direction: 'reverse' } },
    { match: '/api/public/verified-icd', json: { icd_names: ['Abdominal distension', 'Test ICD'] } },
    { match: '/api/public/mapping-search', json: { query: 'abd', count: 2, suggestions: [{ icd_name: 'Abdominal distension', system: 'ayurveda', term: 'AdhmAnam', code: 'SM31(AAC-12)', is_primary: true }] } },
    { match: '/api/public/translate/cache/stats', json: { entries: 8, hits: 24, misses: 2, hitRate: 0.92 } },
    { match: '/api/fhir/metadata', json: { resourceType: 'CapabilityStatement', extension: [{ url: '.../currentConceptMapRelease', valueString: 'v1-submission' }] } },
    { match: '/api/fhir/CodeSystem/$lookup', json: { resourceType: 'Parameters', parameter: [{ name: 'name', valueString: 'AdhmAnam' }, { name: 'property', part: [{ name: 'code', valueCode: 'short' }, { name: 'valueString', valueString: 'Short def' }] }] } },
    { match: '/api/fhir/ValueSet/$expand', json: { resourceType: 'ValueSet', expansion: { total: 3, contains: [{ code: 'SM31(AAC-12)', display: 'AdhmAnam' }] } } },
    { match: '/api/fhir/ConceptMap/$translate', json: { resourceType: 'Parameters', parameter: [{ name: 'result', valueBoolean: true }, { name: 'match', part: [{ name: 'equivalence', valueCode: 'equivalent' }] }] } },
    { match: '/api/fhir/ConceptMap/translate', json: { resourceType: 'Parameters', parameter: [{ name: 'result', valueBoolean: true }] } },
    { match: '/api/admin/conceptmap/releases/v1-submission/fhir', json: { resourceType: 'ConceptMap', version: 'v1-submission', group: [{ element: [], extension: [{ url: '.../elementCount', valueInteger: 8 }] }] } },
    { match: '/api/fhir/provenance/conceptmap', json: { resourceType: 'Provenance', target: [{ reference: 'ConceptMap/namaste-to-icd11' }] } },
    { match: '/api/fhir/provenance/release', json: { resourceType: 'Bundle', type: 'collection', entry: [{ resource: { resourceType: 'Provenance', activity: { code: { text: 'snapshot-build' } } } }] } },
    { match: '/api/fhir/Bundle', json: { summary: { resourceType: 'OperationOutcome', issue: [{ severity: 'information', code: 'informational' }] }, details: [{ status: 'valid', namaste_code: 'SM31(AAC-12)', icd: 'Abdominal distension' }] } },
    { match: '/api/admin/conceptmap/releases', json: { releases: [{ version: 'v1-submission', elements: 8 }] } },
    { match: '/api/admin/conceptmap/releases/v1-submission/elements', json: { version: 'v1-submission', count: 8, elements: [{ icd_name: 'Abdominal distension', system: 'ayurveda', term: 'AdhmAnam', is_primary: true }] } },
    { match: '/api/admin/conceptmap/releases/v1-submission/refresh', json: { version: 'v1-submission', elements: 8, status: 'refreshed' } },
    { match: '/api/admin/analytics/summary', json: { total_requests: 540, verified_mappings: 1200, latency_ms_p95: 180 } },
    { match: '/api/admin/analytics/paths', json: { paths: [{ path: '/api/public/translate', count: 140, p99_ms: 190 }] } },
    { match: 'OperationOutcome (not found)', json: { resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', details: { text: 'Unknown release version' } }] } }
  ];

  function createAccordion(exampleObj){
    const wrap = document.createElement('div');
    wrap.className = 'ex-acc';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'ex-acc-header';
    header.setAttribute('aria-expanded', 'false');

    const arrow = document.createElement('span');
    arrow.className = 'ex-acc-arrow';
    arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8l4 4 4-4"/></svg>';

    const label = document.createElement('span');
    label.textContent = 'Example';
    label.className = 'ex-acc-label';

    const badge = document.createElement('span');
    badge.textContent = 'JSON';
    badge.className = 'ex-acc-badge';

    header.appendChild(arrow);
    header.appendChild(label);
    header.appendChild(badge);

    const panel = document.createElement('div');
    panel.className = 'ex-acc-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-hidden', 'true');

    const toolbar = document.createElement('div');
    toolbar.className = 'ex-acc-toolbar';
    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.textContent = 'Download JSON';
    dlBtn.className = 'ex-download-btn';
    dlBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const blob = new Blob([JSON.stringify(exampleObj, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'example-response.json';
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 400);
    });
    toolbar.appendChild(dlBtn);

    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(exampleObj, null, 2);

    panel.appendChild(toolbar);
    panel.appendChild(pre);

    wrap.appendChild(header);
    wrap.appendChild(panel);

    header.addEventListener('click', ()=>toggleAccordion(wrap));
    return wrap;
  }

  function closeAll(except){
    document.querySelectorAll('.ex-acc.open').forEach(acc => {
      if(acc === except) return;
      acc.classList.remove('open');
      const header = acc.querySelector('.ex-acc-header');
      const panel = acc.querySelector('.ex-acc-panel');
      header.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
      panel.style.maxHeight = '0px';
      panel.style.opacity = '0';
    });
  }

  function toggleAccordion(acc){
    const isOpen = acc.classList.contains('open');
    if(isOpen){
      acc.classList.remove('open');
      const header = acc.querySelector('.ex-acc-header');
      const panel = acc.querySelector('.ex-acc-panel');
      header.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
      panel.style.maxHeight = '0px';
      panel.style.opacity = '0';
    } else {
      closeAll(acc);
      acc.classList.add('open');
      const header = acc.querySelector('.ex-acc-header');
      const panel = acc.querySelector('.ex-acc-panel');
      header.setAttribute('aria-expanded','true');
      panel.setAttribute('aria-hidden','false');
      // Measure scrollHeight for smooth expansion
      panel.style.maxHeight = panel.scrollHeight + 'px';
      panel.style.opacity = '1';
    }
  }

  function attachExamples(){
    const listItems = document.querySelectorAll('.endpoint-group li');
    listItems.forEach(li => {
      if(li.querySelector('.ex-acc')) return;
      const text = li.innerText.trim();
      const match = EXAMPLE_MAP.find(e => text.includes(e.match));
      if(!match) return;
      const acc = createAccordion(match.json);
      acc.style.marginTop = '4px';
      li.appendChild(acc);
    });
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive') attachExamples();
  else document.addEventListener('DOMContentLoaded', attachExamples);
})();
