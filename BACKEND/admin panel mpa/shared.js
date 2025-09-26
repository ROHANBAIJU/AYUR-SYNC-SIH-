// This file contains shared state, API functions, and utilities used across all pages.

// Prefer runtime-configured API base URL if provided by config.js; fallback to localhost for dev.
const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : 'http://127.0.0.1:8000/api';

// Expose helpers for other pages (avoid duplicating constants)
window.apiBase = function () {
    try {
        // Strip trailing '/api' to get host base
        return API_BASE_URL.replace(/\/?api$/, '');
    } catch { return 'http://127.0.0.1:8000'; }
}
window.getToken = function () {
    return state.token || localStorage.getItem('accessToken');
}

// Global state object. Each page will populate the parts it needs.
const state = {
    token: null,
    allSuggestionsCache: [],
    filteredSuggestions: [],
    data: {
        master: [],
        rejected: { needs_correction: [], no_mapping: [] },
        icdMasterList: []
    },
    curationDecisions: {},
    pagination: { new: { page: 1, limit: 20, total: 0 } },
    stats: { review: 0, master_map: 0, rejected: 0, completeness: {} },
    rejectionContext: { icdName: null, system: null, suggestion: null, isPrimary: null },
    popoverContext: { button: null, icdName: null, system: null },
    editorContext: { icdName: null, system: null },
    searchTerm: '',
    searchTimeout: null
};

// Global DOM elements cache
const dom = {};

// This runs on every page load for authenticated pages.
document.addEventListener('DOMContentLoaded', () => {
    state.token = localStorage.getItem('accessToken');
    if (!state.token) {
        window.location.href = 'index.html'; // Redirect to login if not authenticated
        return;
    }
    initializeApp();
});

// Initializes common elements and fetches data needed on all pages.
async function initializeApp() {
    // Show the main app screen
    document.getElementById('app-screen').classList.remove('hidden');

    // Populate the DOM cache
    Object.assign(dom, {
        appScreen: document.getElementById('app-screen'),
        contentArea: document.getElementById('content-area'),
        mainLoader: document.getElementById('main-loader'),
        logoutButton: document.getElementById('logout-button'),
        resetButton: document.getElementById('reset-button'),
        // Stats
        statReview: document.getElementById('stat-review'),
    statMasterMap: document.getElementById('stat-master-map'),
    statMasterMapVerified: document.getElementById('stat-master-map-verified'),
        statRejected: document.getElementById('stat-rejected'),
        statThreeSystems: document.getElementById('stat-three-systems'),
        statTwoSystems: document.getElementById('stat-two-systems'),
        statOneSystem: document.getElementById('stat-one-system'),
        // Modals & Popovers (might not exist on all pages, so check for null)
        suggestionsPopover: document.getElementById('suggestions-popover'),
    });

    // Attach common event listeners
    if (dom.logoutButton) dom.logoutButton.addEventListener('click', handleLogout);
    if (dom.resetButton) dom.resetButton.addEventListener('click', () => handleResetCuration(dom.resetButton));
    const deepResetBtn = document.getElementById('deep-reset-button');
    if (deepResetBtn) deepResetBtn.addEventListener('click', () => openDeepResetModal(deepResetBtn));
    
    // Add scroll listener for popover positioning if it exists
    const mainContentArea = document.querySelector('main');
    if (mainContentArea) {
        mainContentArea.addEventListener('scroll', updatePopoverPositionOnScroll);
    }
    
    await fetchSharedData();

    // Call the specific initializer for the current page (must be defined in the page's JS file)
    if (typeof initializePage === 'function') {
        try { initializePage(); } catch (e) { console.error('initializePage failed:', e); }
    } else {
        if (dom.mainLoader) dom.mainLoader.classList.add('hidden');
        if (dom.contentArea) dom.contentArea.innerHTML = `<p class="p-8 text-red-500">Page-specific initializer function not found.</p>`;
    }
}

// Fetches data that is displayed on all pages (like stats).
async function fetchSharedData() {
    try {
        const [statsRes, completenessStatsRes] = await Promise.all([
            fetchAPI('/admin/stats'),
            fetchAPI('/admin/completeness-stats'),
        ]);
        state.stats = { ...statsRes, completeness: completenessStatsRes };
        updateStats();
    } catch (error) {
        console.error("Error fetching shared data:", error);
    }
}

// --- COMMON FUNCTIONS ---

function handleLogout() {
    localStorage.removeItem('accessToken');
    window.location.href = 'index.html';
}

/* Legacy reset handler kept for reference (old double-click + embedded deep reset code). */

/*
async function handleResetCuration_OLD(button) {
    if (!confirm("This will delete all curated data and regenerate suggestions. This may take a moment. Continue?")) return;
    
     // --- ADD THIS LINE ---
    // Invalidate the cache because we are about to fetch fresh data.
    localStorage.removeItem('allSuggestionsCache');
    // --- END OF ADDITION ---
    
    toggleButtonLoading(button, true, 'Resetting...');
    dom.mainLoader.classList.remove('hidden');
    dom.contentArea.innerHTML = '';
    try {
        const result = await fetchAPI('/admin/reset-curation', 'POST');
        alert(result.message);
        // After reset, redirect to the suggestions page as it's the primary workflow start.
        window.location.href = 'new_suggestions.html';
    } catch (error) {
        alert(`Failed to reset: ${error.message}`);
        dom.mainLoader.classList.add('hidden');
    } finally {
        toggleButtonLoading(button, false, 'Reset Curation');
    }
*/

// Replace the old handleResetCuration function in shared.js

async function handleResetCuration(button) {
    if (!confirm("This will delete all curated data and regenerate suggestions. This may take a moment. Continue?")) return;

    // Clear suggestions cache so the next visit to New Suggestions fetches fresh data
    await clearSuggestionsCache();

    // Mark reset start time so pages can adapt UI/poll until data appears
    try { localStorage.setItem('curationResetAt', String(Date.now())); } catch {}

    toggleButtonLoading(button, true, 'Resetting...');
    dom.mainLoader.classList.remove('hidden');
    dom.contentArea.innerHTML = '';
    try {
        const result = await fetchAPI('/admin/reset-curation', 'POST');
        alert(result.message);
        window.location.href = 'new_suggestions.html';
    } catch (error) {
        alert(`Failed to reset: ${error.message}`);
        dom.mainLoader.classList.add('hidden');
    } finally {
        toggleButtonLoading(button, false, 'Reset Curation');
    }
}

// Shared helper: clear the IndexedDB suggestions cache used by New Suggestions page
async function clearSuggestionsCache() {
    try {
        console.log("Clearing IndexedDB suggestions cache...");
        const DB_NAME = 'NamasteICD_DB';
        const SUGGESTIONS_STORE_NAME = 'suggestions_cache';
        const db = await idb.openDB(DB_NAME, 2);
        await db.clear(SUGGESTIONS_STORE_NAME);
        console.log("... Suggestions cache cleared.");
    } catch (err) {
        console.error("Failed to clear IndexedDB cache:", err);
    }
}

function updateStats() {
    if (dom.statReview && state.stats) dom.statReview.textContent = state.stats.review ?? 0;
    if (dom.statMasterMap && state.stats) dom.statMasterMap.textContent = state.stats.master_map ?? 0;
    if (dom.statMasterMapVerified && state.stats) dom.statMasterMapVerified.textContent = state.stats.master_map_verified ?? 0;
    if (dom.statRejected && state.stats) dom.statRejected.textContent = state.stats.rejected ?? 0;
    if (dom.statThreeSystems && state.stats.completeness) dom.statThreeSystems.textContent = state.stats.completeness.three_systems ?? 0;
    if (dom.statTwoSystems && state.stats.completeness) dom.statTwoSystems.textContent = state.stats.completeness.two_systems ?? 0;
    if (dom.statOneSystem && state.stats.completeness) dom.statOneSystem.textContent = state.stats.completeness.one_system ?? 0;
}

// ================================
// Deep Reset (Overall Reset) New Implementation
// ================================
function openDeepResetModal(triggerBtn) {
    let modal = document.getElementById('deep-reset-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deep-reset-modal';
        modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white w-full max-w-md rounded-lg shadow-xl p-6 relative">
             <h3 class="text-lg font-bold text-red-700 mb-3">Confirm Deep Reset</h3>
             <p class="text-sm text-gray-700 mb-4">This will <span class="font-semibold">WIPE ALL</span> ICD codes, traditional terms, mappings, audits and regenerate everything from the discovery pipeline. This action cannot be undone.</p>
             <div class="bg-red-50 border border-red-200 p-3 rounded text-xs text-red-800 mb-4">Expect several steps: truncation, cleanup, discovery, validation. You can monitor progress live at the bottom of the screen once started.</div>
             <label class="block text-xs font-medium text-gray-600 mb-1">Type <span class="font-mono bg-gray-100 px-1 py-0.5 rounded">RESET ALL</span> to enable the button:</label>
             <input id="deep-reset-confirm-input" type="text" class="w-full border rounded px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="RESET ALL" />
             <div class="flex justify-end space-x-3">
                <button id="deep-reset-cancel" class="text-sm px-4 py-2 rounded-md border hover:bg-gray-100">Cancel</button>
                <button id="deep-reset-confirm" disabled class="text-sm px-4 py-2 rounded-md bg-red-600 text-white opacity-60 cursor-not-allowed flex items-center">
                    <span class="btn-text">Start Deep Reset</span>
                    <div class="loader hidden ml-2"></div>
                </button>
             </div>
          </div>`;
        document.body.appendChild(modal);
        // Wiring
        modal.querySelector('#deep-reset-cancel').addEventListener('click', () => modal.remove());
        const input = modal.querySelector('#deep-reset-confirm-input');
        const confirmBtn = modal.querySelector('#deep-reset-confirm');
        input.addEventListener('input', () => {
            if (input.value.trim().toUpperCase() === 'RESET ALL') {
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('opacity-60','cursor-not-allowed');
            } else {
                confirmBtn.disabled = true;
                confirmBtn.classList.add('opacity-60','cursor-not-allowed');
            }
        });
        confirmBtn.addEventListener('click', async () => {
            if (confirmBtn.disabled) return;
            await handleDeepReset(confirmBtn, modal, triggerBtn);
        });
    }
}

async function handleDeepReset(workingBtn, modal, triggerBtn) {
    toggleButtonLoading(workingBtn, true, 'Starting...');
    try {
        const resp = await fetchAPI('/admin/deep-reset', 'POST');
        if (resp.status !== 'accepted') throw new Error('Unexpected response starting deep reset');
        alert('Deep reset started. Progress will appear at the bottom. You can keep browsing.');
        if (modal) modal.remove();
        if (triggerBtn) triggerBtn.disabled = true;
        startDeepResetPolling(triggerBtn || workingBtn);
    } catch (e) {
        alert('Failed to start deep reset: ' + e.message);
        toggleButtonLoading(workingBtn, false, 'Start Deep Reset');
    }
}

function startDeepResetPolling(button) {
    const statusBar = ensureDeepResetStatusBar();
    const pollInterval = 2500;
    (async function poll(){
        try {
            const data = await fetchAPI('/admin/deep-reset-status');
            updateDeepResetStatus(statusBar, data);
            if (data.state === 'completed') {
                toggleButtonLoading(button, false, 'Overall Reset');
                button.disabled = false;
                setTimeout(()=> window.location.href='new_suggestions.html', 1200);
                return;
            } else if (data.state === 'error') {
                toggleButtonLoading(button, false, 'Overall Reset');
                alert('Deep reset error: ' + (data.error || 'Unknown'));
                button.disabled = false;
                return;
            }
        } catch (err) {
            console.error('Deep reset poll failed', err);
        }
        setTimeout(poll, pollInterval);
    })();
}

function ensureDeepResetStatusBar() {
    let bar = document.getElementById('deep-reset-status-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'deep-reset-status-bar';
        bar.className = 'fixed bottom-2 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded px-4 py-3 z-50 w-[90%] max-w-3xl';
        bar.innerHTML = `
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-gray-800 text-sm">Overall Reset Progress</h4>
              <button class="text-xs text-gray-500 hover:text-gray-700" onclick="document.getElementById('deep-reset-status-bar').remove()">Hide</button>
            </div>
            <div class="w-full bg-gray-200 h-2 rounded overflow-hidden mb-2">
              <div class="h-2 bg-gradient-to-r from-red-500 to-orange-400 transition-all" style="width:0%" id="deep-reset-progress"></div>
            </div>
            <div id="deep-reset-steps" class="text-[11px] leading-snug font-mono max-h-40 overflow-y-auto bg-gray-50 border rounded p-2"></div>`;
        document.body.appendChild(bar);
    }
    return bar;
}

function updateDeepResetStatus(bar, status) {
    const progEl = document.getElementById('deep-reset-progress');
    if (progEl) progEl.style.width = `${Math.min(100,(status.progress||0)*100)}%`;
    const stepsEl = document.getElementById('deep-reset-steps');
    if (stepsEl && Array.isArray(status.steps)) {
        stepsEl.innerHTML = status.steps.map(s=>`<div>${escapeHtml((s.ts||'').split('T')[1]||'') } - ${escapeHtml(s.msg)}</div>`).join('');
        stepsEl.scrollTop = stepsEl.scrollHeight;
    }
    if (status.state === 'completed') {
        stepsEl.innerHTML += '<div class="text-green-700 font-semibold mt-1">DONE ✅</div>';
    } else if (status.state === 'error') {
        stepsEl.innerHTML += `<div class="text-red-600 font-semibold mt-1">ERROR: ${escapeHtml(status.error || 'Unknown')}</div>`;
    }
}

function escapeHtml(str){
    return String(str||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c]));
}

// Expose (if other modules need)
window.openDeepResetModal = openDeepResetModal;


function getSuggestionId(suggestion) {
    return `${suggestion.term}-${suggestion.code}`.replace(/[^a-zA-Z0-9]/g, '-');
}

// --- API WRAPPER ---
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Authorization': `Bearer ${state.token}`, 'Cache-Control': 'no-cache' },
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (response.status === 401) {
        handleLogout();
        throw new Error('401 Unauthorized. Logging out.');
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `An unknown error occurred (${response.status})` }));
        throw new Error(errorData.detail);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
}

// --- UTILITIES ---
function toggleButtonLoading(button, isLoading, loadingText = '') {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    if (!btnText) {
        button.disabled = isLoading;
        return;
    }
    const originalText = btnText.dataset.originalText || btnText.textContent;
    if (!btnText.dataset.originalText) btnText.dataset.originalText = originalText;
    const loader = button.querySelector('.loader');
    button.disabled = isLoading;
    if (isLoading) {
        btnText.textContent = loadingText || originalText;
        if (loader) loader.classList.remove('hidden');
    } else {
        btnText.textContent = originalText;
        if (loader) loader.classList.add('hidden');
    }
}

function highlightMatches(text, searchTerm) {
    if (!text || !searchTerm || searchTerm.length < 3) {
        return text;
    }
    const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, `<mark class="bg-yellow-200 px-0.5 rounded-sm">$1</mark>`);
}

// --- POPOVER LOGIC (SHARED) ---
function updatePopoverPositionOnScroll() {
    if (dom.suggestionsPopover && !dom.suggestionsPopover.classList.contains('hidden')) {
        positionPopover();
    }
}

function positionPopover() {
    const { button } = state.popoverContext;
    if (!button || !document.body.contains(button)) {
        hideSuggestionsPopover();
        return;
    }
    const rect = button.getBoundingClientRect();
    dom.suggestionsPopover.style.visibility = 'hidden';
    dom.suggestionsPopover.classList.remove('hidden');
    const popoverHeight = dom.suggestionsPopover.offsetHeight;
    const popoverWidth = dom.suggestionsPopover.offsetWidth;
    dom.suggestionsPopover.classList.add('hidden');
    dom.suggestionsPopover.style.visibility = 'visible';
    let top = window.scrollY + rect.top - popoverHeight - 8;
    let left = window.scrollX + rect.left + (rect.width / 2) - (popoverWidth / 2);
    if (top < window.scrollY) { top = window.scrollY + rect.bottom + 8; }
    if (left < 0) { left = 5; }
    if ((left + popoverWidth) > window.innerWidth) { left = window.innerWidth - popoverWidth - 5; }
    dom.suggestionsPopover.style.top = `${top}px`;
    dom.suggestionsPopover.style.left = `${left}px`;
}

function hideSuggestionsPopover() {
    if (dom.suggestionsPopover) {
        dom.suggestionsPopover.classList.add('hidden');
        dom.suggestionsPopover.removeAttribute('data-trigger');
        state.popoverContext = { button: null, icdName: null, system: null };
    }
}

// Expose a couple of helpers for page modules
window.fetchSharedData = fetchSharedData;
window.state = state; // useful for debugging
