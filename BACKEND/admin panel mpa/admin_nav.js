(function(){
  const containerId = 'admin-nav';
  const THEME_KEY = 'app_dark_mode_v1';

  function ensureStyle(){
    if(document.getElementById('global-admin-nav-style')) return;
    const style = document.createElement('style');
    style.id='global-admin-nav-style';
    style.textContent = `
      .tab-button { position:relative; transition:color .15s, border-color .15s; border-bottom:3px solid transparent; color:#64748b; }
      .tab-button.tab-active { color:#3b82f6; border-bottom-color:#3b82f6; font-weight:600; }
      .tab-button:not(.tab-active):hover { color:#1e293b; }
      .no-scrollbar::-webkit-scrollbar { display:none; }
      .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      /* --- Global Dark Mode Palette --- */
      .dark-mode { background:#0f172a; color:#e2e8f0; }
      .dark-mode body { background:#0f172a; }
      .dark-mode .bg-white, .dark-mode .card, .dark-mode header, .dark-mode .tab-surface { background:#1e293b !important; }
      .dark-mode .border, .dark-mode .border-gray-200, .dark-mode .border-gray-100 { border-color:#334155 !important; }
      .dark-mode .text-gray-900, .dark-mode .text-gray-800, .dark-mode .text-slate-800 { color:#e2e8f0 !important; }
      .dark-mode .text-gray-700, .dark-mode .text-slate-700 { color:#cbd5e1 !important; }
      .dark-mode .text-gray-600, .dark-mode .text-slate-600 { color:#94a3b8 !important; }
      .dark-mode .text-gray-500, .dark-mode .text-slate-500 { color:#64748b !important; }
      .dark-mode .bg-gray-50, .dark-mode .bg-slate-50 { background:#162132 !important; }
      .dark-mode pre, .dark-mode code, .dark-mode .code-block { background:#0f1a28 !important; color:#e2e8f0; }
      .dark-mode .tab-button { color:#94a3b8; }
      .dark-mode .tab-button.tab-active { color:#60a5fa; border-bottom-color:#60a5fa; }
      /* JSON highlight colours */
      .json-key { color:#60a5fa; }
      .json-string { color:#34d399; }
      .json-number { color:#fbbf24; }
      .json-boolean { color:#f472b6; }
      .json-null { color:#a78bfa; }
      /* Generic inverted button */
      .btn-invert { background:#1e293b; color:#e2e8f0; border:1px solid #334155; }
      .btn-invert:hover { background:#334155; }
      .dark-mode .btn-invert { background:#334155; }
      .dark-mode .btn-invert:hover { background:#475569; }
      /* Table & borders */
      .dark-mode table { color:#e2e8f0; }
      .dark-mode tr.border-b { border-color:#334155 !important; }
      /* Leaflet map tweak */
      .dark-mode #india-map { filter: brightness(.85) contrast(1.05); }
        /* Modals & overlays */
        .dark-mode .modal-backdrop { background:rgba(0,0,0,0.65); }
        .dark-mode .modal-backdrop .bg-white { background:#1d2a3f !important; }
        .dark-mode .bg-gray-50 { background:#132033 !important; }
        .dark-mode .border-t { border-color:#2b3a52 !important; }
        /* Stat cards */
        .dark-mode .bg-white.p-4.rounded-lg.shadow-sm.border { background:#192538 !important; }
        /* Popovers */
        .dark-mode .suggestions-popover { background:#1d2a3f; border-color:#2b3a52; }
        /* Buttons inside warning blocks */
        .dark-mode button.hover\:bg-gray-100:hover { background:#243246 !important; }
        /* Inputs inside modals */
        .dark-mode .modal-backdrop input, .dark-mode .modal-backdrop textarea { background:#0f1b2b; border-color:#32435a; }
        /* Loader ring (reuse existing class) */
        .dark-mode .loader { border-color:#1e293b; border-top-color:#60a5fa; }
    `;
    document.head.appendChild(style);
  }

  function applyTheme(){
    const on = localStorage.getItem(THEME_KEY)==='1';
    const root = document.documentElement;
    if(on) root.classList.add('dark-mode'); else root.classList.remove('dark-mode');
    const btn = document.getElementById('global-dark-toggle');
    if(btn) btn.textContent = on ? 'Light Mode' : 'Dark Mode';
    // Broadcast so page-specific scripts (charts etc) can react
    window.dispatchEvent(new CustomEvent('app:theme-change', { detail:{ dark:on } }));
  }
  function toggleTheme(){
    const on = localStorage.getItem(THEME_KEY)==='1';
    localStorage.setItem(THEME_KEY, on?'0':'1');
    applyTheme();
  }

  function buildNav(){
    const el = document.getElementById(containerId); if(!el) return;
    const current = location.pathname.split('/').pop();
    const links = [
      {href:'instructions.html', label:'Instructions'},
      {href:'docs.html', label:'Docs'},
      {href:'overall_tester.html', label:'Guided API Test'},
      {href:'analytics.html', label:'Analytics'},
      {href:'new_suggestions.html', label:'New Suggestions'},
      {href:'master_map.html', label:'Master Map'},
      {href:'rejections.html', label:'Rejected Mappings'},
      {href:'icd11.html', label:'ICD-11 Disease List'}
    ];
    const inner = links.map(l => {
      const base = `<span>${l.label}</span>`;
      const withBadge = l.label==='New Suggestions' ? `<span class='relative inline-flex items-center'>${l.label}<span id='nav-suggestions-badge' class='ml-2 hidden text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700'>0</span></span>` : base;
      return `<a href="${l.href}" class="tab-button whitespace-nowrap px-4 py-2 text-sm font-medium ${l.href===current?'tab-active text-gray-900':'text-gray-500 hover:text-gray-700'}">${withBadge}</a>`;
    }).join('');
    // Include dark mode toggle on the right
    el.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 md:px-6 mt-2 tab-surface rounded-lg shadow-sm border">
        <div class="bg-white rounded-lg shadow-sm border tab-surface">
          <div class="p-4 border-b border-gray-200">
            <div class="flex items-center justify-between gap-4">
              <div class="flex overflow-x-auto no-scrollbar border-b border-gray-200 flex-1">${inner}</div>
              <div class="flex items-center gap-2 pl-4">
                <button id="global-dark-toggle" class="px-3 py-1.5 text-xs rounded btn-invert">...</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    const toggleBtn = document.getElementById('global-dark-toggle');
    if(toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
    applyTheme();
    // After nav built, fetch suggestions metrics to update badge
    try {
      const token = localStorage.getItem('accessToken');
      if(token){
        fetch(((window.API_BASE_URL)||'http://127.0.0.1:8000/api')+'/admin/suggestions/metrics', { headers:{ 'Authorization':'Bearer '+token }})
          .then(r=> r.ok? r.json(): null)
          .then(data=>{ if(!data) return; const badge=document.getElementById('nav-suggestions-badge'); if(badge){ badge.textContent = data.total_icds; badge.classList.remove('hidden'); }}).catch(()=>{});
      }
    } catch(_){ }
    // Listen for invalidate events
    window.addEventListener('storage', e=>{ if(e.key==='suggestionsInvalidate'){ refreshNavSuggestionsBadge(); }});
  }

  function refreshNavSuggestionsBadge(){
    const badge=document.getElementById('nav-suggestions-badge'); if(!badge) return;
    const token = localStorage.getItem('accessToken'); if(!token) return;
    fetch(((window.API_BASE_URL)||'http://127.0.0.1:8000/api')+'/admin/suggestions/metrics', { headers:{ 'Authorization':'Bearer '+token }})
      .then(r=> r.ok? r.json(): null)
      .then(data=>{ if(!data) return; badge.textContent=data.total_icds; badge.classList.remove('hidden'); })
      .catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded', ()=>{ ensureStyle(); buildNav(); });
})();