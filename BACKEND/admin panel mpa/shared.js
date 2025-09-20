// This file contains shared state, API functions, and utilities used across all pages.

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

/*
async function handleResetCuration(button) {
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
}
*/

// Replace the old handleResetCuration function in shared.js

async function handleResetCuration(button) {
    if (!confirm("This will delete all curated data and regenerate suggestions. This may take a moment. Continue?")) return;

    // Clear suggestions cache so the next visit to New Suggestions fetches fresh data
    await clearSuggestionsCache();

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
