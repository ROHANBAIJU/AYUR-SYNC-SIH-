// Analytics Dashboard Script
// Requires shared.js (for getToken(), apiBase(), and auth helpers)

(function () {
  const api = window.apiBase ? window.apiBase() : '';
  const token = () => (window.getToken ? window.getToken() : localStorage.getItem('token'));
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const qs = (id) => document.getElementById(id);
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
  const integOutput = qs('integration-output');
  const scenarioLookupBtn = qs('scenario-lookup-dengue');
  const scenarioTranslateBtn = qs('scenario-translate-sample');
  const apiSearchInp = qs('api-search');
  const apiSearchBtn = qs('api-search-btn');
  const apiLookupResults = qs('api-lookup-results');
  const apiTranslateOutput = qs('api-translate-output');
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }

  let tsChart = null;
  let map = null;
  let markersLayer = null;

  async function fetchJSON(path) {
    const res = await fetch(`${api}/api/admin${path}`, { headers: headers() });
    if (res.status === 401) { window.location.href = 'index.html'; return null; }
    return res.json();
  }
  async function fetchPublic(path) {
    const url = path.startsWith('http') ? path : `${api}${path}`;
    const res = await fetch(url, { headers: headers() });
    if (res.status === 401) { window.location.href = 'index.html'; return null; }
    return res.json();
  }

  function renderPaths(paths) {
    if (!paths) { pathsDiv.textContent = 'No data'; return; }
    const arr = Array.isArray(paths) ? paths : Object.entries(paths).map(([path, data]) => ({ path, ...(data || {}) }));
    arr.sort((a, b) => (b.count || 0) - (a.count || 0));
    const top = arr.slice(0, 25);
    const rows = top.map(p => {
      const total = p.count || 0;
      const sb = p.status_breakdown || p.status || {};
      const sumPrefix = (pref) => Object.entries(sb).reduce((acc, [k, v]) => acc + (String(k).startsWith(pref) ? (v || 0) : 0), 0);
      const s2 = sumPrefix('2');
      const s4 = sumPrefix('4');
      const s5 = sumPrefix('5');
      const avg = Math.round(p.avg_latency_ms || 0);
      return `<tr class="border-b"><td class="px-2 py-1">${p.path}</td><td class="px-2 py-1 text-right">${total}</td><td class="px-2 py-1 text-right">${s2}</td><td class="px-2 py-1 text-right">${s4+s5}</td><td class="px-2 py-1 text-right">${avg}</td></tr>`;
    }).join('');
    pathsDiv.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="px-2 py-1">Path</th><th class="px-2 py-1 text-right">Count</th><th class="px-2 py-1 text-right">2xx</th><th class="px-2 py-1 text-right">4xx/5xx</th><th class="px-2 py-1 text-right">Avg ms</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function destroyChartIfAny(canvas) {
    try {
      if (window.Chart && Chart.getChart) {
        const ex = Chart.getChart(canvas) || Chart.getChart(canvas?.id || '');
        if (ex) ex.destroy();
      }
    } catch {}
    if (tsChart) { try { tsChart.destroy(); } catch {} tsChart = null; }
  }

  function renderTimeseries(ts) {
    const labels = ts.map(b => b.bucket);
    const counts = ts.map(b => b.count);
    const avgs = ts.map(b => Math.round(b.avg_latency_ms || 0));
    const ctx = document.getElementById('tsChart');
    destroyChartIfAny(ctx);
    tsChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Requests', data: counts, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', yAxisID: 'y' },
        { label: 'Avg ms', data: avgs, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', yAxisID: 'y1' }
      ]},
      options: { responsive: true, interaction: { mode: 'index', intersect: false }, stacked: false,
        scales: { y: { type: 'linear', position: 'left', beginAtZero: true }, y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } }
      }
    });
  }

  async function refreshAll() {
    try {
      const [summary, timeseries, paths, recent] = await Promise.all([
        fetchJSON('/analytics/summary'),
        fetchJSON('/analytics/timeseries?bucket=minute&limit=60'),
        fetchJSON('/analytics/paths?limit=25'),
        fetchJSON('/analytics/recent?limit=50')
      ]);

      if (summary) {
        statTotal.textContent = summary.total || 0;
        statAvg.textContent = Math.round(summary.avg_latency_ms || 0);
        const by = summary.by_status || {};
        const sumKeys = (prefix) => Object.entries(by).reduce((acc, [k, v]) => acc + (k.startsWith(prefix) ? (v || 0) : 0), 0);
        stat2xx.textContent = sumKeys('2');
        statErr.textContent = sumKeys('4') + sumKeys('5');
      }
      if (timeseries) renderTimeseries(timeseries.buckets || timeseries);
      if (paths) renderPaths(paths.top || paths);
      if (recent) {
        const list = Array.isArray(recent) ? recent : (Array.isArray(recent.entries) ? recent.entries : []);
        const lines = list.map(e => JSON.stringify(e)).join('\n');
        recentPre.textContent = lines || 'No recent entries';
      }
    } catch (e) { console.error('Refresh failed', e); }
  }

  async function fetchClusters() {
    if (!map) return;
    const b = map.getBounds();
    const bbox = `${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)}`;
    const zoom = map.getZoom();
    const params = new URLSearchParams({ bbox, zoom: String(zoom) });
    if (sysSel && sysSel.value) params.set('system', sysSel.value);
    if (fromInp && fromInp.value) params.set('date_from', fromInp.value);
    if (toInp && toInp.value) params.set('date_to', toInp.value);
    const url = `${api}/api/admin/analytics/map/clusters?${params.toString()}`;
    const res = await fetch(url, { headers: headers() });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    renderClusters(data.clusters || []);
  }

  function renderClusters(clusters) {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    clusters.forEach(c => {
      const m = L.circleMarker([c.lat, c.lng], {
        radius: Math.max(6, Math.min(18, Math.round(4 + Math.log2((c.count || 1) + 1)))) ,
        color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.5, weight: 1
      });
      const top = (c.top || []).map(t => `${t.name} (${t.count})`).join('<br/>');
      m.bindTooltip(`<div class="text-xs"><div><b>${c.count}</b> events</div>${top ? `<div class='mt-1 text-gray-700'>${top}</div>` : ''}</div>`);
      m.on('click', () => fetchDetails(c.lat, c.lng));
      m.addTo(markersLayer);
    });
  }

  async function fetchDetails(lat, lng) {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), tolerance: '0.01' });
    if (sysSel && sysSel.value) params.set('system', sysSel.value);
    if (fromInp && fromInp.value) params.set('date_from', fromInp.value);
    if (toInp && toInp.value) params.set('date_to', toInp.value);
    const url = `${api}/api/admin/analytics/map/details?${params.toString()}`;
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();
    renderDetails(data);
  }

  function renderDetails(data) {
    const { total = 0, topDiagnoses = [], doctors = [] } = data || {};
    const topList = topDiagnoses.map(t => `<li class='flex justify-between'><span>${t.name}</span><span class='text-gray-600'>${t.count}</span></li>`).join('');
    const docList = doctors.map(d => {
      const evs = (d.events || []).slice(0, 10).map(e => `<li class='border-b py-1'><div class='text-sm font-medium'>${e.icd_name}</div><div class='text-xs text-gray-600'>${e.system}${e.code ? ' • ' + e.code : ''}${e.term_name ? ' • ' + e.term_name : ''}</div><div class='text-[11px] text-gray-500'>${e.city || ''}${e.state ? ', ' + e.state : ''} • ${e.ts || ''}</div></li>`).join('');
      return `<div class='mb-3'><div class='font-semibold'>Doctor: ${d.doctor_id}</div><ul class='mt-1'>${evs}</ul></div>`;
    }).join('');
    mapDetails.innerHTML = `
      <div class='text-sm'>
        <div class='mb-2'><b>${total}</b> events in this area</div>
        <div class='mb-2'>Top diagnoses:</div>
        <ul class='mb-3 space-y-1'>${topList}</ul>
        <div class='mb-1 font-semibold'>Doctors</div>
        <div>${docList || '<div class=\"text-gray-500\">No doctor info available.</div>'}</div>
      </div>
    `;
  }

  // ----- After Integration scenarios -----
  if (scenarioLookupBtn) {
    scenarioLookupBtn.addEventListener('click', async () => {
      try { const data = await fetchPublic('/api/public/lookup?query=Dengue'); integOutput.textContent = JSON.stringify(data, null, 2); }
      catch (e) { integOutput.textContent = String(e); }
    });
  }
  if (scenarioTranslateBtn) {
    scenarioTranslateBtn.addEventListener('click', async () => {
      try { const data = await fetchPublic('/api/public/translate?system=ayurveda&code=AKK-12&target=icd11'); integOutput.textContent = JSON.stringify(data, null, 2); }
      catch (e) { integOutput.textContent = String(e); }
    });
  }

  // ----- Lookup/Translate helpers -----
  async function renderLookup(query) {
    apiLookupResults.innerHTML = '<div class="text-gray-500">Searching…</div>';
    try {
      const data = await fetchPublic(`/api/public/lookup?query=${encodeURIComponent(query)}`);
      const items = [];
      (data || []).forEach(g => {
        const icdName = g.icd_name || g.icdName || 'Unknown';
        items.push(`<div class="py-1"><button class="text-indigo-700 hover:underline" data-icd-name="${icdName}">${icdName}</button></div>`);
        ['ayurveda','siddha','unani'].forEach(sys => {
          const section = g[sys] || {};
          const primary = section.primary ? [section.primary] : [];
          const aliases = Array.isArray(section.aliases) ? section.aliases : [];
          [...primary, ...aliases].forEach(t => {
            if (!t) return;
            const code = t.code || '';
            const label = `${sys.toUpperCase()} • ${t.term || ''}${code ? ' • ' + code : ''}`;
            items.push(`<div class="pl-3 text-[12px]"><button class="text-gray-700 hover:underline" data-sys="${sys}" data-code="${code}">${label}</button></div>`);
          });
        });
      });
      apiLookupResults.innerHTML = items.join('') || '<div class="text-gray-500">No results</div>';
    } catch (e) {
      apiLookupResults.innerHTML = `<div class="text-red-600 text-xs">${String(e)}</div>`;
    }
  }

  async function runTranslateByIcd(icdName) {
    apiTranslateOutput.textContent = 'Translating…';
    try { const data = await fetchPublic(`/api/public/translate?icd_name=${encodeURIComponent(icdName)}`); apiTranslateOutput.textContent = JSON.stringify(data, null, 2); }
    catch (e) { apiTranslateOutput.textContent = String(e); }
  }
  async function runTranslateByTerm(system, code) {
    apiTranslateOutput.textContent = 'Translating…';
    try { const data = await fetchPublic(`/api/public/translate?system=${encodeURIComponent(system)}&code=${encodeURIComponent(code)}&target=icd11`); apiTranslateOutput.textContent = JSON.stringify(data, null, 2); }
    catch (e) { apiTranslateOutput.textContent = String(e); }
  }

  if (apiSearchBtn && apiSearchInp) {
    apiSearchBtn.addEventListener('click', () => { const q = apiSearchInp.value.trim(); if (!q) return; renderLookup(q); });
    apiSearchInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apiSearchBtn.click(); } });
    apiLookupResults?.addEventListener('click', (e) => {
      const tgt = e.target;
      if (tgt && tgt.dataset && tgt.dataset.icdName) {
        runTranslateByIcd(tgt.dataset.icdName);
      } else if (tgt && tgt.dataset && tgt.dataset.sys && tgt.dataset.code) {
        runTranslateByTerm(tgt.dataset.sys, tgt.dataset.code);
      }
    });
  }

  // ----- Tree-structured verified mapped diseases -----
  async function loadMappedList() {
    if (!apiMappedList) return;
    apiMappedList.innerHTML = '<div class="text-gray-500 text-xs">Loading…</div>';
    try {
      const data = await fetchJSON('/master-map-data');
      const nodes = [];
      (data || []).forEach(row => {
        const status = (row.row_status || '').toString();
        if (!status.toLowerCase().startsWith('verified')) return;
        const icd = row.suggested_icd_name;
        const groups = { ayurveda: [], siddha: [], unani: [] };
        ['ayurveda','siddha','unani'].forEach(sys => {
          try {
            const raw = row[`${sys}_mapping`];
            if (!raw) return;
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const primary = obj?.primary ? [obj.primary] : [];
            const aliases = Array.isArray(obj?.aliases) ? obj.aliases : [];
            const list = [...primary, ...aliases].filter(Boolean).map(t => ({ term: t.term || '', code: t.code || '', system: sys }));
            groups[sys] = list;
          } catch {}
        });
        nodes.push({ icd, groups });
      });

      function sysLabel(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
      function render(filter) {
        const html = nodes.map((node, idx) => {
          const wanted = ['ayurveda','siddha','unani'].filter(sys => {
            if (filter === 'all') return (node.groups[sys] && node.groups[sys].length);
            if (filter === 'icd') return false;
            return sys === filter && node.groups[sys] && node.groups[sys].length;
          });
          if (filter !== 'all' && filter !== 'icd') { if (!wanted.length) return ''; }
          const chevron = '<span class="inline-block text-[10px] align-middle">▶</span>';
          const childId = `children-i${idx}`;
          const icdHeader = `
            <div class="flex items-center gap-2">
              ${filter === 'icd' ? '' : `<button class="toggle text-xs text-gray-600" data-target="${childId}" aria-expanded="false">${chevron}</button>`}
              <button class="icd-link text-indigo-700 hover:underline" data-icd="${node.icd}">ICD‑11 • ${node.icd}</button>
            </div>`;
          let groupsHTML = '';
          if (filter !== 'icd') {
            wanted.forEach(sys => {
              const items = (node.groups[sys] || []).map(t => {
                const label = `${t.term}${t.code ? ' • ' + t.code : ''}`;
                const q = t.code || t.term;
                return `<div class="pl-3 py-0.5"><button class="text-gray-800 hover:underline text-sm" data-q="${q}" data-system="${sys}">${sys.toUpperCase()} • ${label}</button></div>`;
              }).join('');
              if (items) { groupsHTML += `<div class="mb-1"><div class="text-[11px] text-gray-600 font-semibold">${sysLabel(sys)}</div>${items}</div>`; }
            });
          }
          const childrenBlock = filter === 'icd' ? '' : `<div class="ml-5 mt-1 hidden" id="${childId}">${groupsHTML || '<div class=\"text-[11px] text-gray-500\">No items</div>'}</div>`;
          return `<div class="py-1 border-b border-gray-100">${icdHeader}${childrenBlock}</div>`;
        }).filter(Boolean).join('');
        apiMappedList.innerHTML = html || '<div class="text-gray-500 text-xs">No verified mappings.</div>';
      }

      render(mappedFilterSel?.value || 'all');

      apiMappedList.addEventListener('click', (e) => {
        const tgt = e.target;
        if (!tgt) return;
        if (tgt.matches('button.toggle')) {
          const id = tgt.getAttribute('data-target');
          const el = id ? document.getElementById(id) : null;
          if (el) {
            const isHidden = el.classList.contains('hidden');
            el.classList.toggle('hidden');
            tgt.setAttribute('aria-expanded', String(isHidden));
            tgt.innerHTML = isHidden ? '<span class="inline-block text-[10px] align-middle">▼</span>' : '<span class="inline-block text-[10px] align-middle">▶</span>';
          }
          return;
        }
        if (tgt.matches('button.icd-link')) {
          const icd = tgt.getAttribute('data-icd') || '';
          if (apiSearchInp) apiSearchInp.value = icd;
          if (icd) renderLookup(icd);
          return;
        }
        if (tgt.dataset && (tgt.dataset.q || tgt.dataset.system)) {
          const q = tgt.dataset.q || '';
          if (apiSearchInp) apiSearchInp.value = q;
          if (q) renderLookup(q);
          return;
        }
      });
      mappedFilterSel?.addEventListener('change', () => render(mappedFilterSel.value));
    } catch (e) {
      apiMappedList.innerHTML = `<div class=\"text-red-600 text-xs\">${String(e)}</div>`;
    }
  }

  // ----- Raw request runner -----
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const method = methodSel.value;
      const ep = endpointInp.value.trim();
      const url = ep.startsWith('http') ? ep : `${api}${ep}`;
      const init = { method, headers: headers() };
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        try { init.body = bodyInp.value ? JSON.stringify(JSON.parse(bodyInp.value)) : '{}'; }
        catch { init.body = bodyInp.value; }
      }
      const t0 = performance.now();
      try {
        const res = await fetch(url, init);
        const t1 = performance.now();
        latencySpan.textContent = Math.round(t1 - t0).toString();
        statusSpan.textContent = `${res.status}`;
        const text = await res.text();
        try { outputPre.textContent = JSON.stringify(JSON.parse(text), null, 2); }
        catch { outputPre.textContent = text; }
      } catch (e) {
        latencySpan.textContent = '-';
        statusSpan.textContent = 'ERR';
        outputPre.textContent = String(e);
      }
      setTimeout(refreshAll, 500);
    });
  }

  function initMap() {
    if (!mapEl || typeof L === 'undefined') return;
    if (map) return; // already initialized
    const el = document.getElementById('india-map');
    if (!el) return;
    if (el._leaflet_id) return; // guard against duplicate Leaflet init
    map = L.map('india-map');
    map.setView([22.3511148, 78.6677428], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    map.on('moveend', fetchClusters);
    if (mapRefresh) mapRefresh.addEventListener('click', fetchClusters);
    if (sysSel) sysSel.addEventListener('change', fetchClusters);
    if (fromInp) fromInp.addEventListener('change', fetchClusters);
    if (toInp) toInp.addEventListener('change', fetchClusters);
    fetchClusters();
  }

  // initial load + polling
  try { refreshAll(); } catch (e) { console.warn('refreshAll failed (initial)', e); }
  try { setInterval(refreshAll, 15000); } catch {}
  try { initMap(); } catch (e) { console.warn('initMap failed', e); }
  try { loadMappedList(); } catch (e) { console.warn('loadMappedList failed', e); }
})();
// Analytics Dashboard Script
// Requires shared.js (for getToken(), apiBase(), and auth helpers)

(function () {
  const api = window.apiBase ? window.apiBase() : '';
  const token = () => (window.getToken ? window.getToken() : localStorage.getItem('token'));
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  const qs = (id) => document.getElementById(id);
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
  // Added: After Integration + Direct API helpers
  const integOutput = qs('integration-output');
  const scenarioLookupBtn = qs('scenario-lookup-dengue');
  const scenarioTranslateBtn = qs('scenario-translate-sample');
  const apiSearchInp = qs('api-search');
  const apiSearchBtn = qs('api-search-btn');
  const apiLookupResults = qs('api-lookup-results');
  const apiTranslateOutput = qs('api-translate-output');
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }

  let tsChart;
  let map;
  let markersLayer;

  async function fetchJSON(path) {
    const res = await fetch(`${api}/api/admin${path}`, { headers: headers() });
    if (res.status === 401) {
      // Unauth -> go to login
      window.location.href = 'index.html';
      return null;
    }
    return res.json();
  }

  async function fetchPublic(path) {
    const url = path.startsWith('http') ? path : `${api}${path}`;
    const res = await fetch(url, { headers: headers() });
    if (res.status === 401) { window.location.href = 'index.html'; return null; }
    return res.json();
  }

  function renderPaths(paths) {
    if (!paths) { pathsDiv.textContent = 'No data'; return; }
    // Accept either an array or an object map { path: stats }
    const arr = Array.isArray(paths)
      ? paths
      : Object.entries(paths).map(([path, data]) => ({ path, ...(data || {}) }));
    // Sort by count desc and take top 25
    arr.sort((a, b) => (b.count || 0) - (a.count || 0));
    const top = arr.slice(0, 25);
    const rows = top.map(p => {
      const total = p.count || 0;
      // Support both legacy `status_breakdown` and current `status` map with raw codes
      const sb = p.status_breakdown || p.status || {};
      const sumPrefix = (pref) => Object.entries(sb).reduce((acc, [k, v]) => acc + (String(k).startsWith(pref) ? (v || 0) : 0), 0);
      const s2 = sumPrefix('2');
      const s4 = sumPrefix('4');
      const s5 = sumPrefix('5');
      const avg = Math.round(p.avg_latency_ms || 0);
      return `<tr class="border-b"><td class="px-2 py-1">${p.path}</td><td class="px-2 py-1 text-right">${total}</td><td class="px-2 py-1 text-right">${s2}</td><td class="px-2 py-1 text-right">${s4+s5}</td><td class="px-2 py-1 text-right">${avg}</td></tr>`;
    }).join('');
    pathsDiv.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="px-2 py-1">Path</th><th class="px-2 py-1 text-right">Count</th><th class="px-2 py-1 text-right">2xx</th><th class="px-2 py-1 text-right">4xx/5xx</th><th class="px-2 py-1 text-right">Avg ms</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderTimeseries(ts) {
    const labels = ts.map(b => b.bucket);
    const counts = ts.map(b => b.count);
    const avgs = ts.map(b => Math.round(b.avg_latency_ms || 0));
    const ctx = document.getElementById('tsChart');
    if (tsChart) tsChart.destroy();
    tsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Requests', data: counts, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', yAxisID: 'y' },
          { label: 'Avg ms', data: avgs, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        scales: {
          y: { type: 'linear', position: 'left', beginAtZero: true },
          y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  async function refreshAll() {
    try {
      const [summary, timeseries, paths, recent] = await Promise.all([
        fetchJSON('/analytics/summary'),
        fetchJSON('/analytics/timeseries?bucket=minute&limit=60'),
        fetchJSON('/analytics/paths?limit=25'),
        fetchJSON('/analytics/recent?limit=50')
      ]);

      if (summary) {
        statTotal.textContent = summary.total || 0;
        statAvg.textContent = Math.round(summary.avg_latency_ms || 0);
        const by = summary.by_status || {};
        const sumKeys = (prefix) => Object.entries(by).reduce((acc, [k, v]) => acc + (k.startsWith(prefix) ? (v || 0) : 0), 0);
        const two = sumKeys('2');
        const four = sumKeys('4');
        const five = sumKeys('5');
        stat2xx.textContent = two;
        statErr.textContent = four + five;
      }
      if (timeseries) renderTimeseries(timeseries.buckets || timeseries);
      if (paths) renderPaths(paths.top || paths);
      if (recent) {
        // Avoid Array.prototype.entries() collision by using Array.isArray
        const list = Array.isArray(recent) ? recent : (Array.isArray(recent.entries) ? recent.entries : []);
        const lines = list.map(e => JSON.stringify(e)).join('\n');
        recentPre.textContent = lines || 'No recent entries';
      }
    // Analytics Dashboard Script
    // Requires shared.js (for getToken(), apiBase(), and auth helpers)

    (function () {
      const api = window.apiBase ? window.apiBase() : '';
      const token = () => (window.getToken ? window.getToken() : localStorage.getItem('token'));
      const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

      const qs = (id) => document.getElementById(id);
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
      // After Integration + helpers
      const integOutput = qs('integration-output');
      const scenarioLookupBtn = qs('scenario-lookup-dengue');
      const scenarioTranslateBtn = qs('scenario-translate-sample');
      const apiSearchInp = qs('api-search');
      const apiSearchBtn = qs('api-search-btn');
      const apiLookupResults = qs('api-lookup-results');
      const apiTranslateOutput = qs('api-translate-output');
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

      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('token');
          window.location.href = 'index.html';
        });
      }

      let tsChart;
      let map;
      let markersLayer;

      async function fetchJSON(path) {
        const res = await fetch(`${api}/api/admin${path}`, { headers: headers() });
        if (res.status === 401) { window.location.href = 'index.html'; return null; }
        return res.json();
      }

      async function fetchPublic(path) {
        const url = path.startsWith('http') ? path : `${api}${path}`;
        const res = await fetch(url, { headers: headers() });
        if (res.status === 401) { window.location.href = 'index.html'; return null; }
        return res.json();
      }

      function renderPaths(paths) {
        if (!paths) { pathsDiv.textContent = 'No data'; return; }
        const arr = Array.isArray(paths) ? paths : Object.entries(paths).map(([path, data]) => ({ path, ...(data || {}) }));
        arr.sort((a, b) => (b.count || 0) - (a.count || 0));
        const top = arr.slice(0, 25);
        const rows = top.map(p => {
          const total = p.count || 0;
          const sb = p.status_breakdown || p.status || {};
          const sumPrefix = (pref) => Object.entries(sb).reduce((acc, [k, v]) => acc + (String(k).startsWith(pref) ? (v || 0) : 0), 0);
          const s2 = sumPrefix('2');
          const s4 = sumPrefix('4');
          const s5 = sumPrefix('5');
          const avg = Math.round(p.avg_latency_ms || 0);
          return `<tr class="border-b"><td class="px-2 py-1">${p.path}</td><td class="px-2 py-1 text-right">${total}</td><td class="px-2 py-1 text-right">${s2}</td><td class="px-2 py-1 text-right">${s4+s5}</td><td class="px-2 py-1 text-right">${avg}</td></tr>`;
        }).join('');
        pathsDiv.innerHTML = `<table class="w-full text-sm"><thead><tr class="text-left border-b"><th class="px-2 py-1">Path</th><th class="px-2 py-1 text-right">Count</th><th class="px-2 py-1 text-right">2xx</th><th class="px-2 py-1 text-right">4xx/5xx</th><th class="px-2 py-1 text-right">Avg ms</th></tr></thead><tbody>${rows}</tbody></table>`;
      }

      function renderTimeseries(ts) {
        const labels = ts.map(b => b.bucket);
        const counts = ts.map(b => b.count);
        const avgs = ts.map(b => Math.round(b.avg_latency_ms || 0));
        const ctx = document.getElementById('tsChart');
        // Destroy any existing chart bound to this canvas (defensive against double init)
        try {
          const existing = (window.Chart && Chart.getChart) ? (Chart.getChart(ctx) || Chart.getChart('tsChart')) : null;
          if (existing) existing.destroy();
        } catch {}
        if (tsChart) { try { tsChart.destroy(); } catch {} }
        tsChart = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets: [
            { label: 'Requests', data: counts, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', yAxisID: 'y' },
            { label: 'Avg ms', data: avgs, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', yAxisID: 'y1' }
          ]},
          options: { responsive: true, interaction: { mode: 'index', intersect: false }, stacked: false,
            scales: { y: { type: 'linear', position: 'left', beginAtZero: true }, y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } } }
          }
        });
      }

      async function refreshAll() {
        try {
          const [summary, timeseries, paths, recent] = await Promise.all([
            fetchJSON('/analytics/summary'),
            fetchJSON('/analytics/timeseries?bucket=minute&limit=60'),
            fetchJSON('/analytics/paths?limit=25'),
            fetchJSON('/analytics/recent?limit=50')
          ]);

          if (summary) {
            statTotal.textContent = summary.total || 0;
            statAvg.textContent = Math.round(summary.avg_latency_ms || 0);
            const by = summary.by_status || {};
            const sumKeys = (prefix) => Object.entries(by).reduce((acc, [k, v]) => acc + (k.startsWith(prefix) ? (v || 0) : 0), 0);
            stat2xx.textContent = sumKeys('2');
            statErr.textContent = sumKeys('4') + sumKeys('5');
          }
          if (timeseries) renderTimeseries(timeseries.buckets || timeseries);
          if (paths) renderPaths(paths.top || paths);
          if (recent) {
            const list = Array.isArray(recent) ? recent : (Array.isArray(recent.entries) ? recent.entries : []);
            const lines = list.map(e => JSON.stringify(e)).join('\n');
            recentPre.textContent = lines || 'No recent entries';
          }
        } catch (e) { console.error('Refresh failed', e); }
      }

      async function fetchClusters() {
        if (!map) return;
        const b = map.getBounds();
        const bbox = `${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)}`;
        const zoom = map.getZoom();
        const params = new URLSearchParams({ bbox, zoom: String(zoom) });
        if (sysSel && sysSel.value) params.set('system', sysSel.value);
        if (fromInp && fromInp.value) params.set('date_from', fromInp.value);
        if (toInp && toInp.value) params.set('date_to', toInp.value);
        const url = `${api}/api/admin/analytics/map/clusters?${params.toString()}`;
        const res = await fetch(url, { headers: headers() });
        if (res.status === 401) { window.location.href = 'index.html'; return; }
        const data = await res.json();
        renderClusters(data.clusters || []);
      }

      function renderClusters(clusters) {
        if (!markersLayer) return;
        markersLayer.clearLayers();
        clusters.forEach(c => {
          const m = L.circleMarker([c.lat, c.lng], {
            radius: Math.max(6, Math.min(18, Math.round(4 + Math.log2((c.count || 1) + 1)))) ,
            color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.5, weight: 1
          });
          const top = (c.top || []).map(t => `${t.name} (${t.count})`).join('<br/>');
          m.bindTooltip(`<div class="text-xs"><div><b>${c.count}</b> events</div>${top ? `<div class='mt-1 text-gray-700'>${top}</div>` : ''}</div>`);
          m.on('click', () => fetchDetails(c.lat, c.lng));
          m.addTo(markersLayer);
        });
      }

      async function fetchDetails(lat, lng) {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng), tolerance: '0.01' });
        if (sysSel && sysSel.value) params.set('system', sysSel.value);
        if (fromInp && fromInp.value) params.set('date_from', fromInp.value);
        if (toInp && toInp.value) params.set('date_to', toInp.value);
        const url = `${api}/api/admin/analytics/map/details?${params.toString()}`;
        const res = await fetch(url, { headers: headers() });
        const data = await res.json();
        renderDetails(data);
      }

      function renderDetails(data) {
        const { total = 0, topDiagnoses = [], doctors = [] } = data || {};
        const topList = topDiagnoses.map(t => `<li class='flex justify-between'><span>${t.name}</span><span class='text-gray-600'>${t.count}</span></li>`).join('');
        const docList = doctors.map(d => {
          const evs = (d.events || []).slice(0, 10).map(e => `<li class='border-b py-1'><div class='text-sm font-medium'>${e.icd_name}</div><div class='text-xs text-gray-600'>${e.system}${e.code ? ' • ' + e.code : ''}${e.term_name ? ' • ' + e.term_name : ''}</div><div class='text-[11px] text-gray-500'>${e.city || ''}${e.state ? ', ' + e.state : ''} • ${e.ts || ''}</div></li>`).join('');
          return `<div class='mb-3'><div class='font-semibold'>Doctor: ${d.doctor_id}</div><ul class='mt-1'>${evs}</ul></div>`;
        }).join('');
        mapDetails.innerHTML = `
          <div class='text-sm'>
            <div class='mb-2'><b>${total}</b> events in this area</div>
            <div class='mb-2'>Top diagnoses:</div>
            <ul class='mb-3 space-y-1'>${topList}</ul>
            <div class='mb-1 font-semibold'>Doctors</div>
            <div>${docList || '<div class=\"text-gray-500\">No doctor info available.</div>'}</div>
          </div>
        `;
      }

      // ----- After Integration scenarios -----
      if (scenarioLookupBtn) {
        scenarioLookupBtn.addEventListener('click', async () => {
          try {
            const data = await fetchPublic('/api/public/lookup?query=Dengue');
            integOutput.textContent = JSON.stringify(data, null, 2);
          } catch (e) { integOutput.textContent = String(e); }
        });
      }
      if (scenarioTranslateBtn) {
        scenarioTranslateBtn.addEventListener('click', async () => {
          try {
            const data = await fetchPublic('/api/public/translate?system=ayurveda&code=AKK-12&target=icd11');
            integOutput.textContent = JSON.stringify(data, null, 2);
          } catch (e) { integOutput.textContent = String(e); }
        });
      }

      // ----- Lookup/Translate helpers -----
      async function renderLookup(query) {
        apiLookupResults.innerHTML = '<div class="text-gray-500">Searching…</div>';
        try {
          const data = await fetchPublic(`/api/public/lookup?query=${encodeURIComponent(query)}`);
          const items = [];
          (data || []).forEach(g => {
            const icdName = g.icd_name || g.icdName || 'Unknown';
            items.push(`<div class="py-1"><button class="text-indigo-700 hover:underline" data-icd-name="${icdName}">${icdName}</button></div>`);
            ['ayurveda','siddha','unani'].forEach(sys => {
              const section = g[sys] || {};
              const primary = section.primary ? [section.primary] : [];
              const aliases = Array.isArray(section.aliases) ? section.aliases : [];
              [...primary, ...aliases].forEach(t => {
                if (!t) return;
                const code = t.code || '';
                const label = `${sys.toUpperCase()} • ${t.term || ''}${code ? ' • ' + code : ''}`;
                items.push(`<div class="pl-3 text-[12px]"><button class="text-gray-700 hover:underline" data-sys="${sys}" data-code="${code}">${label}</button></div>`);
              });
            });
          });
          apiLookupResults.innerHTML = items.join('') || '<div class="text-gray-500">No results</div>';
        } catch (e) {
          apiLookupResults.innerHTML = `<div class="text-red-600 text-xs">${String(e)}</div>`;
        }
      }

      async function runTranslateByIcd(icdName) {
        apiTranslateOutput.textContent = 'Translating…';
        try {
          const data = await fetchPublic(`/api/public/translate?icd_name=${encodeURIComponent(icdName)}`);
          apiTranslateOutput.textContent = JSON.stringify(data, null, 2);
        } catch (e) { apiTranslateOutput.textContent = String(e); }
      }
      async function runTranslateByTerm(system, code) {
        apiTranslateOutput.textContent = 'Translating…';
        try {
          const data = await fetchPublic(`/api/public/translate?system=${encodeURIComponent(system)}&code=${encodeURIComponent(code)}&target=icd11`);
          apiTranslateOutput.textContent = JSON.stringify(data, null, 2);
        } catch (e) { apiTranslateOutput.textContent = String(e); }
      }

      if (apiSearchBtn && apiSearchInp) {
        apiSearchBtn.addEventListener('click', () => { const q = apiSearchInp.value.trim(); if (!q) return; renderLookup(q); });
        apiSearchInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apiSearchBtn.click(); } });
        apiLookupResults?.addEventListener('click', (e) => {
          const tgt = e.target;
          if (tgt && tgt.dataset && tgt.dataset.icdName) {
            runTranslateByIcd(tgt.dataset.icdName);
          } else if (tgt && tgt.dataset && tgt.dataset.sys && tgt.dataset.code) {
            runTranslateByTerm(tgt.dataset.sys, tgt.dataset.code);
          }
        });
      }

      // ----- Tree-structured verified mapped diseases -----
      async function loadMappedList() {
        if (!apiMappedList) return;
        apiMappedList.innerHTML = '<div class="text-gray-500 text-xs">Loading…</div>';
        try {
          const data = await fetchJSON('/master-map-data');
          const nodes = [];
          (data || []).forEach(row => {
            const status = (row.row_status || '').toString();
            if (!status.toLowerCase().startsWith('verified')) return;
            const icd = row.suggested_icd_name;
            const groups = { ayurveda: [], siddha: [], unani: [] };
            ['ayurveda','siddha','unani'].forEach(sys => {
              try {
                const raw = row[`${sys}_mapping`];
                if (!raw) return;
                const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
                const primary = obj?.primary ? [obj.primary] : [];
                const aliases = Array.isArray(obj?.aliases) ? obj.aliases : [];
                const list = [...primary, ...aliases].filter(Boolean).map(t => ({ term: t.term || '', code: t.code || '', system: sys }));
                groups[sys] = list;
              } catch {}
            });
            nodes.push({ icd, groups });
          });

          function sysLabel(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
          function render(filter) {
            const html = nodes.map((node, idx) => {
              const wanted = ['ayurveda','siddha','unani'].filter(sys => {
                if (filter === 'all') return (node.groups[sys] && node.groups[sys].length);
                if (filter === 'icd') return false;
                return sys === filter && node.groups[sys] && node.groups[sys].length;
              });
              if (filter !== 'all' && filter !== 'icd') { if (!wanted.length) return ''; }
              const chevron = '<span class="inline-block text-[10px] align-middle">▶</span>';
              const childId = `children-i${idx}`;
              const icdHeader = `
                <div class="flex items-center gap-2">
                  ${filter === 'icd' ? '' : `<button class="toggle text-xs text-gray-600" data-target="${childId}" aria-expanded="false">${chevron}</button>`}
                  <button class="icd-link text-indigo-700 hover:underline" data-icd="${node.icd}">ICD‑11 • ${node.icd}</button>
                </div>`;
              let groupsHTML = '';
              if (filter !== 'icd') {
                wanted.forEach(sys => {
                  const items = (node.groups[sys] || []).map(t => {
                    const label = `${t.term}${t.code ? ' • ' + t.code : ''}`;
                    const q = t.code || t.term;
                    return `<div class="pl-3 py-0.5"><button class="text-gray-800 hover:underline text-sm" data-q="${q}" data-system="${sys}">${sys.toUpperCase()} • ${label}</button></div>`;
                  }).join('');
                  if (items) { groupsHTML += `<div class="mb-1"><div class="text-[11px] text-gray-600 font-semibold">${sysLabel(sys)}</div>${items}</div>`; }
                });
              }
              const childrenBlock = filter === 'icd' ? '' : `<div class="ml-5 mt-1 hidden" id="${childId}">${groupsHTML || '<div class=\"text-[11px] text-gray-500\">No items</div>'}</div>`;
              return `<div class="py-1 border-b border-gray-100">${icdHeader}${childrenBlock}</div>`;
            }).filter(Boolean).join('');
            apiMappedList.innerHTML = html || '<div class="text-gray-500 text-xs">No verified mappings.</div>';
          }

          render(mappedFilterSel?.value || 'all');

          apiMappedList.addEventListener('click', (e) => {
            const tgt = e.target;
            if (!tgt) return;
            if (tgt.matches('button.toggle')) {
              const id = tgt.getAttribute('data-target');
              const el = id ? document.getElementById(id) : null;
              if (el) {
                const isHidden = el.classList.contains('hidden');
                el.classList.toggle('hidden');
                tgt.setAttribute('aria-expanded', String(isHidden));
                tgt.innerHTML = isHidden ? '<span class="inline-block text-[10px] align-middle">▼</span>' : '<span class="inline-block text-[10px] align-middle">▶</span>';
              }
              return;
            }
            if (tgt.matches('button.icd-link')) {
              const icd = tgt.getAttribute('data-icd') || '';
              if (apiSearchInp) apiSearchInp.value = icd;
              if (icd) renderLookup(icd);
              return;
            }
            if (tgt.dataset && (tgt.dataset.q || tgt.dataset.system)) {
              const q = tgt.dataset.q || '';
              if (apiSearchInp) apiSearchInp.value = q;
              if (q) renderLookup(q);
              return;
            }
          });
          mappedFilterSel?.addEventListener('change', () => render(mappedFilterSel.value));
        } catch (e) {
          apiMappedList.innerHTML = `<div class=\"text-red-600 text-xs\">${String(e)}</div>`;
        }
      }

      // ----- Raw request runner -----
      if (runBtn) {
        runBtn.addEventListener('click', async () => {
          const method = methodSel.value;
          const ep = endpointInp.value.trim();
          const url = ep.startsWith('http') ? ep : `${api}${ep}`;
          const init = { method, headers: headers() };
          if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            try { init.body = bodyInp.value ? JSON.stringify(JSON.parse(bodyInp.value)) : '{}'; }
            catch { init.body = bodyInp.value; }
          }
          const t0 = performance.now();
          try {
            const res = await fetch(url, init);
            const t1 = performance.now();
            latencySpan.textContent = Math.round(t1 - t0).toString();
            statusSpan.textContent = `${res.status}`;
            const text = await res.text();
            try { outputPre.textContent = JSON.stringify(JSON.parse(text), null, 2); }
            catch { outputPre.textContent = text; }
          } catch (e) {
            latencySpan.textContent = '-';
            statusSpan.textContent = 'ERR';
            outputPre.textContent = String(e);
          }
          setTimeout(refreshAll, 500);
        });
      }

      function initMap() {
        if (!mapEl || typeof L === 'undefined') return;
        if (map) return; // already initialized
        const el = document.getElementById('india-map');
        if (!el) return;
        if (el._leaflet_id) return; // guard against duplicate Leaflet init
        map = L.map('india-map');
        map.setView([22.3511148, 78.6677428], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        map.on('moveend', fetchClusters);
        if (mapRefresh) mapRefresh.addEventListener('click', fetchClusters);
        if (sysSel) sysSel.addEventListener('change', fetchClusters);
        if (fromInp) fromInp.addEventListener('change', fetchClusters);
        if (toInp) toInp.addEventListener('change', fetchClusters);
        fetchClusters();
      }

      // initial load + polling
      try { refreshAll(); } catch (e) { console.warn('refreshAll failed (initial)', e); }
      try { setInterval(refreshAll, 15000); } catch {}
      try { initMap(); } catch (e) { console.warn('initMap failed', e); }
      try { loadMappedList(); } catch (e) { console.warn('loadMappedList failed', e); }
    })();

      function render(filter) {
        const filtered = entries.filter(e => filter === 'all' ? true : (filter === 'icd' ? e.type === 'icd' : e.type === filter));
        const html = filtered.map(e => {
          if (e.type === 'icd') {
            return `<div class="py-1"><button class="text-indigo-700 hover:underline" data-icd-name="${e.icd}">ICD‑11 • ${e.label}</button></div>`;
          } else {
            return `<div class="py-1"><button class="text-gray-800 hover:underline" data-sys="${e.system}" data-code="${e.code}">${e.type.toUpperCase()} • ${e.label}</button></div>`;
          }
        }).join('');
        apiMappedList.innerHTML = html || '<div class="text-gray-500 text-xs">No verified mappings.</div>';
      }
      render(mappedFilterSel?.value || 'all');

      apiMappedList.addEventListener('click', (e) => {
        const tgt = e.target;
        if (tgt && tgt.dataset && tgt.dataset.icdName) {
          runTranslateByIcd(tgt.dataset.icdName);
        } else if (tgt && tgt.dataset && tgt.dataset.sys && tgt.dataset.code) {
          runTranslateByTerm(tgt.dataset.sys, tgt.dataset.code);
        }
      });
      mappedFilterSel?.addEventListener('change', () => render(mappedFilterSel.value));
    } catch (e) {
      apiMappedList.innerHTML = `<div class="text-red-600 text-xs">${String(e)}</div>`;
    }
  }

  // initial load + polling
  refreshAll();
  setInterval(refreshAll, 15000);
  // map init
  initMap();
  // load mapped list once
  loadMappedList();
})();
