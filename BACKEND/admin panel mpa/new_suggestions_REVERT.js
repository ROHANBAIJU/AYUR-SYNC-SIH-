// This file contains the specific logic for the New Suggestions page.

/**
 * Calculates a score for a suggestion based on how many systems have mappings.
 * @param {object} suggestion - The suggestion row object.
 * @returns {number} - A score from 0 to 3.
 */
function calculateMappingScore(suggestion) {
    let score = 0;
    if (suggestion.ayurveda_suggestions && suggestion.ayurveda_suggestions !== '[]') score++;
    if (suggestion.siddha_suggestions && suggestion.siddha_suggestions !== '[]') score++;
    if (suggestion.unani_suggestions && suggestion.unani_suggestions !== '[]') score++;
    return score;
}

// This function is called by shared.js after the DOM is ready and common data is loaded.
async function initializePage() {
    // Assign page-specific DOM elements
    Object.assign(dom, {
        rejectionModal: document.getElementById('rejection-modal'),
        rejectionReasonView: document.getElementById('rejection-reason-view'),
        rejectionUndoView: document.getElementById('rejection-undo-view'),
        validationModal: document.getElementById('validation-modal'),
        validationIssues: document.getElementById('validation-issues'),
        validationErrorView: document.getElementById('validation-error-view'),
        validationPromoteView: document.getElementById('validation-promote-view'),
        promotionMessage: document.getElementById('promotion-message'),
        confirmPromoteButton: document.getElementById('confirm-promote-button'),
    });

    try {
        const suggestions = await fetchAPI('/admin/all-suggestions');

        // Sort by mapping count (descending) then alphabetically
        suggestions.sort((a, b) => {
            const scoreA = calculateMappingScore(a);
            const scoreB = calculateMappingScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.suggested_icd_name.localeCompare(b.suggested_icd_name);
        });
        
        state.allSuggestionsCache = suggestions;
        state.filteredSuggestions = state.allSuggestionsCache;
        state.pagination.new.total = state.filteredSuggestions.length;
        
        renderNewSuggestions();
    } catch (error) {
        dom.contentArea.innerHTML = `<p class="p-8 text-red-500">Error loading suggestions: ${error.message}</p>`;
    } finally {
        dom.mainLoader.classList.add('hidden');
    }
}

// --- RENDERING FUNCTIONS ---

function renderNewSuggestions() {
    const searchBarHtml = `<div class="p-4 border-b relative"><input type="text" id="search-bar" onkeyup="handleSearch(this)" value="${state.searchTerm}" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Search by ICD-11 Name or Term (min. 3 chars)..."><div id="search-loader" class="loader hidden" style="position: absolute; right: 25px; top: 25px;"></div></div>`;
    const tableHeader = `<thead class="bg-gray-50"><tr class="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"><th class="table-cell w-1/4">Suggested ICD-11</th><th class="table-cell w-1/4">Ayurveda</th><th class="table-cell w-1/4">Siddha</th><th class="table-cell w-1/4">Unani</th></tr></thead>`;
    const shellHtml = `${searchBarHtml}<div class="overflow-x-auto"><table class="grid-table">${tableHeader}<tbody id="suggestions-tbody"></tbody></table></div><div id="suggestions-pagination" class="p-4 flex justify-between items-center border-t"></div>`;
    dom.contentArea.innerHTML = shellHtml;
    dom.suggestionsTbody = document.getElementById('suggestions-tbody');
    dom.suggestionsPagination = document.getElementById('suggestions-pagination');
    updateNewSuggestionsContent();
}

function updateNewSuggestionsContent() {
    if (!dom.suggestionsTbody) return;
    const { page, limit, total } = state.pagination.new;
    const start = (page - 1) * limit;
    const paginatedItems = state.filteredSuggestions.slice(start, start + limit);
    const rows = paginatedItems.map(row => createNewSuggestionRow(row)).join('');
    dom.suggestionsTbody.innerHTML = rows || `<tr><td colspan="4" class="text-center py-12 text-gray-500">No suggestions match your search.</td></tr>`;
    if (dom.suggestionsPagination) dom.suggestionsPagination.innerHTML = renderPagination();
}

function createNewSuggestionRow(row) {
    const icdName = row.suggested_icd_name;
    const safeIcdName = icdName.replace(/[^a-zA-Z0-9]/g, '-');
    const highlightedIcdName = highlightMatches(icdName, state.searchTerm);
    return `<tr><td class="table-cell font-medium text-sm text-gray-800">${highlightedIcdName}</td>${createCurationCell(safeIcdName,icdName,'ayurveda',row)}${createCurationCell(safeIcdName,icdName,'siddha',row)}${createCurationCell(safeIcdName,icdName,'unani',row)}</tr>`;
}

function createCurationCell(safeIcdName, icdName, system, row) {
    const systemDataString = row[`${system}_suggestions`];
    if (!systemDataString || systemDataString === '[]') return `<td class="table-cell text-gray-400 bg-gray-50 text-xs">N/A</td>`;
    let suggestions;
    try {
        suggestions = JSON.parse(systemDataString);
        if (!Array.isArray(suggestions) || suggestions.length === 0) return `<td class="table-cell text-gray-400 bg-gray-50 text-xs">N/A</td>`;
    } catch (e) { return `<td class="table-cell text-red-500 bg-red-100 text-xs">Data Error</td>`; }

    const decisionObj = state.curationDecisions[icdName]?.[system] || {};
    let cellClass = '';
    if (decisionObj.primary) cellClass = 'cell-approved';
    else if (decisionObj.review_suggestion) cellClass = 'cell-review';
    else if ((decisionObj.rejected_suggestions || []).some(r => r.isPrimary)) cellClass = 'cell-rejected';

    let primarySugg = null;
    const approvedPrimaryId = decisionObj.primary;
    const rejectedPrimaryInfo = (decisionObj.rejected_suggestions || []).find(r => r.isPrimary);
    const isPrimaryRejected = !!rejectedPrimaryInfo;

    if (approvedPrimaryId) primarySugg = suggestions.find(s => getSuggestionId(s) === approvedPrimaryId);
    else if (decisionObj.review_suggestion) primarySugg = suggestions.find(s => getSuggestionId(s) === decisionObj.review_suggestion);
    else if (rejectedPrimaryInfo) primarySugg = rejectedPrimaryInfo.suggestion;
    else primarySugg = suggestions.find(s => !(decisionObj.rejected_suggestions || []).some(r => getSuggestionId(r.suggestion) === getSuggestionId(s)));
    
    if (!primarySugg) return `<td class="table-cell cell-rejected text-xs" id="cell-${safeIcdName}-${system}">All suggestions handled.</td>`;

    const otherSuggs = suggestions.filter(s => getSuggestionId(s) !== getSuggestionId(primarySugg));
    const primaryHtml = renderSuggestion(primarySugg, icdName, system, 'primary');
    let extraContentHtml = '';

    if (otherSuggs.length > 0) {
        const untouchedAliasCount = otherSuggs.filter(s => {
            const sId = getSuggestionId(s);
            const isLinked = (decisionObj.aliases || []).includes(sId);
            const isRejected = (decisionObj.rejected_suggestions || []).some(r => getSuggestionId(r.suggestion) === sId);
            return !isLinked && !isRejected;
        }).length;
        const actionBadge = (untouchedAliasCount > 0 && (decisionObj.primary || isPrimaryRejected)) ? `<span class="ml-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">${untouchedAliasCount}</span>` : '';
        const popoverButtonId = `popover-btn-${safeIcdName}-${system}`;
        extraContentHtml = `<div class="mt-2 pt-2 border-t"><button id="${popoverButtonId}" onclick="showSuggestionsPopover(this, '${icdName}', '${system}')" class="popover-trigger w-full text-left text-xs font-semibold text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 flex items-center transition-colors"><i class="fa-solid fa-plus mr-2 text-xs"></i>+${otherSuggs.length} More Suggestion(s) ${actionBadge}</button></div>`;
    }
    return `<td class="table-cell ${cellClass} text-xs" id="cell-${safeIcdName}-${system}">${primaryHtml}${extraContentHtml}</td>`;
}

function renderSuggestion(suggestion, icdName, system, type) {
    if (!suggestion) return '';
    const { term = 'N/A', code = 'N/A', devanagari, tamil, arabic, confidence = 0, source_description = 'N/A', justification = 'N/A', source_row = '?' } = suggestion;
    const suggestionId = getSuggestionId(suggestion);
    const decisionObj = state.curationDecisions[icdName]?.[system] || {};
    
    const highlightedTerm = highlightMatches(term, state.searchTerm);
    const highlightedVernacular = devanagari ? highlightMatches(devanagari, state.searchTerm) : (tamil ? highlightMatches(tamil, state.searchTerm) : (arabic ? highlightMatches(arabic, state.searchTerm) : ''));

    const isPrimary = decisionObj.primary === suggestionId;
    const isAlias = (decisionObj.aliases || []).includes(suggestionId);
    const rejectedInfo = (decisionObj.rejected_suggestions || []).find(r => getSuggestionId(r.suggestion) === suggestionId);
    const isRejected = !!rejectedInfo;
    const isReview = decisionObj.review_suggestion === suggestionId;

    const numericConfidence = parseInt(confidence, 10) || 0;
    let confColor = 'bg-gray-200 text-gray-800';
    if (numericConfidence >= 80) confColor = 'bg-green-100 text-green-800';
    else if (numericConfidence >= 50) confColor = 'bg-yellow-100 text-yellow-800';
    else if (numericConfidence > 0) confColor = 'bg-red-100 text-red-800';

    const actionButtonsHtml = (type === 'primary') ? `
        <button onclick="handleSetPrimary('${icdName}', '${system}', '${suggestionId}')" class="${isPrimary ? 'text-green-600' : 'text-gray-400'} hover:text-green-600 text-lg" title="Set as Primary"><i class="${isPrimary ? 'fa-solid' : 'fa-regular'} fa-circle-check"></i></button>
        <button onclick="handleSetReview('${icdName}', '${system}', '${suggestionId}')" class="${isReview ? 'text-orange-500' : 'text-gray-400'} hover:text-orange-500 text-lg" title="Mark for Review"><i class="${isReview ? 'fa-solid' : 'fa-regular'} fa-star"></i></button>
        <button onclick="handleReject('${icdName}', '${system}', '${suggestionId}', true)" class="${isRejected ? 'text-red-600' : 'text-gray-400'} hover:text-red-600 text-lg" title="${isRejected ? 'Undo Reject' : 'Reject'}"><i class="fa-solid fa-circle-xmark"></i></button>
    ` : `
        <button onclick="handlePromoteToPrimary('${icdName}', '${system}', '${suggestionId}')" class="text-xs font-semibold text-gray-500 hover:text-blue-600 p-1 rounded flex items-center" title="Make Primary"><i class="fa-solid fa-arrow-up-from-bracket mr-1"></i>Promote</button>
        <button onclick="handleAddAlias('${icdName}', '${system}', '${suggestionId}')" class="alias-button ${isAlias ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-indigo-600'} text-xs font-semibold p-1 rounded flex items-center" title="Add as Alias"><i class="fa-solid fa-link mr-1"></i>Link</button>
        <button onclick="handleReject('${icdName}', '${system}', '${suggestionId}', false)" class="${isRejected ? 'text-red-600' : 'text-gray-400'} hover:text-red-600 text-lg px-2" title="${isRejected ? 'Undo Reject' : 'Reject Alias'}"><i class="fa-solid fa-xmark"></i></button>
    `;

    const rejectionReasonHtml = (isRejected) ? `<p class="text-xs text-red-700 mt-1 font-semibold">Reason: ${(rejectedInfo.reason || 'N/A').replace('incorrect', 'Incorrect Mapping').replace('orphan', 'Orphaned')}</p>` : '';
    const containerClass = isAlias ? 'alias-approved' : (isRejected ? 'alias-rejected' : '');

    return `<div class="p-1 ${containerClass} rounded-md"><div class="flex justify-between items-start mb-1"><div><p class="font-semibold text-sm">${highlightedTerm}</p><p class="text-gray-500 text-sm">${highlightedVernacular}</p></div><span class="px-2 py-0.5 rounded-full text-xs font-medium ${confColor}">${confidence}%</span></div><p class="font-mono text-xs text-gray-500 mb-2">${code}</p><div class="space-y-2 text-[11px]"><div class="border-t pt-2"> <h4 class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Source Desc. <span class="font-mono lowercase text-gray-400">(line ${source_row})</span></h4><p class="text-gray-600 break-words">${source_description}</p></div><div><h4 class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Justification</h4><p class="text-gray-600 break-words">${justification}</p></div></div>${rejectionReasonHtml}<div class="flex items-center justify-end mt-2 space-x-2 pt-2 border-t">${actionButtonsHtml}</div></div>`;
}

// --- EVENT HANDLERS & LOGIC ---

function handleSearch(inputElement) {
    clearTimeout(state.searchTimeout);
    const searchLoader = document.getElementById('search-loader');
    if (searchLoader) searchLoader.classList.remove('hidden');

    state.searchTimeout = setTimeout(() => {
        state.searchTerm = inputElement.value;
        state.pagination.new.page = 1;
        
        const searchTerm = state.searchTerm.toLowerCase();
        if (searchTerm.length >= 3) {
            state.filteredSuggestions = state.allSuggestionsCache.filter(row => 
                row.suggested_icd_name.toLowerCase().includes(searchTerm) ||
                row.ayurveda_suggestions.toLowerCase().includes(searchTerm) ||
                row.siddha_suggestions.toLowerCase().includes(searchTerm) ||
                row.unani_suggestions.toLowerCase().includes(searchTerm)
            );
        } else {
            state.filteredSuggestions = state.allSuggestionsCache;
        }
        
        state.pagination.new.total = state.filteredSuggestions.length;
        updateNewSuggestionsContent();
        if (searchLoader) searchLoader.classList.add('hidden');
    }, 300);
}

function updateCellUI(icdName, system) {
    const rowData = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
    if (!rowData) return;
    const safeIcdName = icdName.replace(/[^a-zA-Z0-9]/g, '-');
    const oldCell = document.getElementById(`cell-${safeIcdName}-${system}`);
    if (oldCell) {
        oldCell.outerHTML = createCurationCell(safeIcdName, icdName, system, rowData);
    }
}

// --- Curation Decision Logic ---
function initializeDecisionObject(icdName, system) {
    if (!state.curationDecisions[icdName]) state.curationDecisions[icdName] = {};
    if (!state.curationDecisions[icdName][system] || typeof state.curationDecisions[icdName][system] !== 'object') {
        state.curationDecisions[icdName][system] = { primary: null, aliases: [], rejected_suggestions: [], review_suggestion: null };
    }
}

function handleSetPrimary(icdName, system, suggestionId) {
    initializeDecisionObject(icdName, system);
    const d = state.curationDecisions[icdName][system];
    d.primary = (d.primary === suggestionId) ? null : suggestionId;
    if (d.primary) {
        d.aliases = d.aliases.filter(id => id !== suggestionId);
        d.review_suggestion = null;
        d.rejected_suggestions = d.rejected_suggestions.filter(r => getSuggestionId(r.suggestion) !== suggestionId);
    }
    updateCellUI(icdName, system);
}

function handleAddAlias(icdName, system, suggestionId) {
    initializeDecisionObject(icdName, system);
    const d = state.curationDecisions[icdName][system];
    if (d.primary === suggestionId) return;

    // ** BUG FIX **: When linking, always remove from rejected list first.
    d.rejected_suggestions = d.rejected_suggestions.filter(r => getSuggestionId(r.suggestion) !== suggestionId);

    const i = d.aliases.indexOf(suggestionId);
    if (i > -1) d.aliases.splice(i, 1); else d.aliases.push(suggestionId);
    
    updateUIAfterPopoverAction(icdName, system);
}

function handlePromoteToPrimary(icdName, system, suggestionId) {
    handleSetPrimary(icdName, system, suggestionId);
    hideSuggestionsPopover();
}

function handleSetReview(icdName, system, suggestionId) {
    initializeDecisionObject(icdName, system);
    const d = state.curationDecisions[icdName][system];
    d.review_suggestion = (d.review_suggestion === suggestionId) ? null : suggestionId;
    if (d.review_suggestion) {
        d.primary = null;
        d.aliases = [];
        d.rejected_suggestions = d.rejected_suggestions.filter(r => getSuggestionId(r.suggestion) !== suggestionId);
    }
    updateCellUI(icdName, system);
}

// --- Rejection Logic ---
function handleReject(icdName, system, suggestionId, isPrimary) {
    initializeDecisionObject(icdName, system);
    const all = JSON.parse(state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName)[`${system}_suggestions`]);
    const sugg = all.find(s => getSuggestionId(s) === suggestionId);
    state.rejectionContext = { icdName, system, suggestion: sugg, isPrimary };
    const isAlreadyRejected = state.curationDecisions[icdName][system].rejected_suggestions.some(r => getSuggestionId(r.suggestion) === suggestionId);
    dom.rejectionReasonView.classList.toggle('hidden', isAlreadyRejected);
    dom.rejectionUndoView.classList.toggle('hidden', !isAlreadyRejected);
    dom.rejectionModal.classList.remove('hidden');
}

function submitRejection(reason) {
    const { icdName, system, suggestion, isPrimary } = state.rejectionContext;
    if (!icdName || !system || !suggestion) return;
    initializeDecisionObject(icdName, system);
    const d = state.curationDecisions[icdName][system];
    const suggestionId = getSuggestionId(suggestion);
    if (!d.rejected_suggestions.some(r => getSuggestionId(r.suggestion) === suggestionId)) {
        d.rejected_suggestions.push({ suggestion, reason, isPrimary });
    }
    // When rejecting, always remove from aliases list.
    d.aliases = d.aliases.filter(id => id !== suggestionId);
    if (d.primary === suggestionId) d.primary = null;
    if (d.review_suggestion === suggestionId) d.review_suggestion = null;
    if (isPrimary) updateCellUI(icdName, system); else updateUIAfterPopoverAction(icdName, system);
    closeRejectionModal();
}

function submitUndoRejection() {
    const { icdName, system, suggestion, isPrimary } = state.rejectionContext;
    if (!icdName || !system || !suggestion) return;
    initializeDecisionObject(icdName, system);
    const d = state.curationDecisions[icdName][system];
    const suggestionId = getSuggestionId(suggestion);
    d.rejected_suggestions = d.rejected_suggestions.filter(r => getSuggestionId(r.suggestion) !== suggestionId);
    if (isPrimary) updateCellUI(icdName, system); else updateUIAfterPopoverAction(icdName, system);
    closeRejectionModal();
}

function closeRejectionModal() { dom.rejectionModal.classList.add('hidden'); }

// --- Save Curation ---
/*async function handleSaveCuration() {
    // 1. Run standard validation checks first.
    const issues = [];
    const touchedIcds = Object.keys(state.curationDecisions);

    for (const icdName of touchedIcds) {
        const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
        if (!originalRow) continue;

        for (const system of ['ayurveda', 'siddha', 'unani']) {
            const hasSuggestions = originalRow[`${system}_suggestions`] && originalRow[`${system}_suggestions`] !== '[]';
            if (!hasSuggestions) continue;

            const decision = state.curationDecisions[icdName]?.[system];
            if (!decision || Object.values(decision).every(val => !val || (Array.isArray(val) && val.length === 0))) {
                issues.push({ icdName, system, message: `A decision is required.` });
                continue; 
            }
            if (decision.review_suggestion) {
                issues.push({ icdName, system, message: `Item is marked for review. Please approve or reject.`});
                continue;
            }
            const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`]);
            const hasPrimaryDecision = !!decision.primary;
            const isPrimaryRejected = (decision.rejected_suggestions || []).some(r => r.isPrimary);
            if (!hasPrimaryDecision && !isPrimaryRejected) {
                issues.push({ icdName, system, message: `A primary decision is required.` });
            } else {
                const primarySuggId = hasPrimaryDecision ? decision.primary : getSuggestionId(decision.rejected_suggestions.find(r => r.isPrimary).suggestion);
                const otherSuggs = allSuggestions.filter(s => getSuggestionId(s) !== primarySuggId);
                const untouchedCount = otherSuggs.filter(s => {
                    const sId = getSuggestionId(s);
                    return !(decision.aliases || []).includes(sId) && !(decision.rejected_suggestions || []).some(r => getSuggestionId(r.suggestion) === sId);
                }).length;
                if (untouchedCount > 0) {
                    issues.push({ icdName, system, message: `<span class="font-semibold text-red-600">${untouchedCount} suggestion(s)</span> still require an action (link or reject).` });
                }
            }
        }
    }

    if (issues.length > 0) {
        showValidationModal(false, issues); // Show in error mode
        return;
    }

    // 2. If standard validation passes, check for "Alias Promotion" cases across all systems.
    const promotionCandidates = [];
    for (const icdName in state.curationDecisions) {
        const systems = state.curationDecisions[icdName];
        let hasApprovedPrimary = false;
        // Check if any system in the row has an approved primary
        for (const system in systems) {
            if (systems[system].primary) {
                hasApprovedPrimary = true;
                break;
            }
        }
        // If no primary is approved for the entire row, check for promotable aliases
        if (!hasApprovedPrimary) {
             for (const system in systems) {
                const decision = systems[system];
                if (decision.aliases && decision.aliases.length > 0) {
                    const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
                    const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`]);
                    const firstAlias = allSuggestions.find(s => getSuggestionId(s) === decision.aliases[0]);
                    promotionCandidates.push({ icdName, firstAlias, aliasSystem: system });
                }
            }
        }
    }
    
    if (promotionCandidates.length > 0) {
        showValidationModal(true, promotionCandidates); // Show in promotion mode
        return;
    }

    // 3. If no issues and no promotion case, proceed to save.
    await performSave();
}
*/
async function handleSaveCuration() {
    // 1. Run standard validation checks first.
    const issues = [];
    const touchedIcds = Object.keys(state.curationDecisions);

    for (const icdName of touchedIcds) {
        // --- NEW LOGIC TO SOLVE THE BUG ---
        // First, check if the user has undone all actions for this entire row.
        const systemsForIcd = state.curationDecisions[icdName];
        const isRowEffectivelyEmpty = Object.values(systemsForIcd).every(decision =>
            !decision || (
                !decision.primary &&
                !decision.review_suggestion &&
                (!decision.aliases || decision.aliases.length === 0) &&
                (!decision.rejected_suggestions || decision.rejected_suggestions.length === 0)
            )
        );

        // If all actions were undone, skip this row from validation entirely.
        if (isRowEffectivelyEmpty) {
            continue;
        }
        // --- END OF NEW LOGIC ---

        const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
        if (!originalRow) continue;

        for (const system of ['ayurveda', 'siddha', 'unani']) {
            const hasSuggestions = originalRow[`${system}_suggestions`] && originalRow[`${system}_suggestions`] !== '[]';
            if (!hasSuggestions) continue;

            const decision = state.curationDecisions[icdName]?.[system];
            if (!decision || Object.values(decision).every(val => !val || (Array.isArray(val) && val.length === 0))) {
                issues.push({ icdName, system, message: `A decision is required.` });
                continue;
            }
            if (decision.review_suggestion) {
                issues.push({ icdName, system, message: `Item is marked for review. Please approve or reject.` });
                continue;
            }
            const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`]);
            const hasPrimaryDecision = !!decision.primary;
            const isPrimaryRejected = (decision.rejected_suggestions || []).some(r => r.isPrimary);
            if (!hasPrimaryDecision && !isPrimaryRejected) {
                issues.push({ icdName, system, message: `A primary decision is required.` });
            } else {
                const primarySuggId = hasPrimaryDecision ? decision.primary : getSuggestionId(decision.rejected_suggestions.find(r => r.isPrimary).suggestion);
                const otherSuggs = allSuggestions.filter(s => getSuggestionId(s) !== primarySuggId);
                const untouchedCount = otherSuggs.filter(s => {
                    const sId = getSuggestionId(s);
                    return !(decision.aliases || []).includes(sId) && !(decision.rejected_suggestions || []).some(r => getSuggestionId(r.suggestion) === sId);
                }).length;
                if (untouchedCount > 0) {
                    issues.push({ icdName, system, message: `<span class="font-semibold text-red-600">${untouchedCount} suggestion(s)</span> still require an action (link or reject).` });
                }
            }
        }
    }

    if (issues.length > 0) {
        showValidationModal(false, issues); // Show in error mode
        return;
    }

    // 2. If standard validation passes, check for "Alias Promotion" cases.
    const promotionCandidates = [];
    for (const icdName in state.curationDecisions) {
        // Skip rows that were effectively empty
        const systemsForIcd = state.curationDecisions[icdName];
        const isRowEffectivelyEmpty = Object.values(systemsForIcd).every(decision => !decision || (!decision.primary && !decision.review_suggestion && (!decision.aliases || decision.aliases.length === 0) && (!decision.rejected_suggestions || decision.rejected_suggestions.length === 0)));
        if (isRowEffectivelyEmpty) continue;

        let hasApprovedPrimary = false;
        for (const system in systemsForIcd) {
            if (systemsForIcd[system].primary) {
                hasApprovedPrimary = true;
                break;
            }
        }
        if (!hasApprovedPrimary) {
             for (const system in systemsForIcd) {
                const decision = systemsForIcd[system];
                if (decision.aliases && decision.aliases.length > 0) {
                    const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
                    const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`]);
                    const firstAlias = allSuggestions.find(s => getSuggestionId(s) === decision.aliases[0]);
                    promotionCandidates.push({ icdName, firstAlias, aliasSystem: system });
                }
            }
        }
    }
    
    if (promotionCandidates.length > 0) {
        showValidationModal(true, promotionCandidates); // Show in promotion mode
        return;
    }

    // 3. If no issues and no promotion case, proceed to save.
    await performSave();
}




/*
async function performSave(button = null) {
    const saveButton = button || document.querySelector('#fab-new-suggestions button');
    toggleButtonLoading(saveButton, true);
    
    const payload = [];
    for (const [icdName, systems] of Object.entries(state.curationDecisions)) {
        if (Object.values(systems).every(dec => !dec || Object.values(dec).every(val => !val || val.length === 0))) continue;
        const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
        if (!originalRow) continue;
        const statuses = {};
        for (const [system, decision] of Object.entries(systems)) {
            const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`]);
            const systemStatus = {};
            if (decision.primary) {
                systemStatus.primary = allSuggestions.find(s => getSuggestionId(s) === decision.primary);
                systemStatus.aliases = allSuggestions.filter(s => (decision.aliases || []).includes(getSuggestionId(s)));
            }
            if (decision.rejected_suggestions?.length > 0) systemStatus.rejected_suggestions = decision.rejected_suggestions;
            if (decision.review_suggestion) systemStatus.review_suggestion = allSuggestions.find(s => getSuggestionId(s) === decision.review_suggestion);
            if (Object.keys(systemStatus).length > 0) statuses[system] = systemStatus;
        }
        if (Object.keys(statuses).length > 0) payload.push({ icd_name: icdName, statuses });
    }

    if (payload.length === 0) {
        toggleButtonLoading(saveButton, false);
        return;
    }
    try {
        await fetchAPI('/admin/submit-curation', 'POST', payload);
        alert("Curation saved successfully!");
        window.location.reload();
    } catch (error) {
        alert(`Failed to save curation: ${error.message}`);
    } finally {
        toggleButtonLoading(saveButton, false);
    }
}
*/
// FILE: new_suggestions.js

async function performSave(button = null) {
    const saveButton = button || document.querySelector('#fab-new-suggestions button');
    toggleButtonLoading(saveButton, true);
    
    const payload = [];
    for (const [icdName, systems] of Object.entries(state.curationDecisions)) {
        if (Object.values(systems).every(dec => !dec || Object.values(dec).every(val => !val || (Array.isArray(val) && val.length === 0)))) continue;
        
        const originalRow = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
        if (!originalRow) continue;
        
        const statuses = {};
        for (const [system, decision] of Object.entries(systems)) {
            const allSuggestions = JSON.parse(originalRow[`${system}_suggestions`] || '[]');
            const systemStatus = {};
            
            if (decision.primary) {
                systemStatus.primary = allSuggestions.find(s => getSuggestionId(s) === decision.primary);
            }
            if (decision.aliases?.length > 0) {
                systemStatus.aliases = allSuggestions.filter(s => (decision.aliases || []).includes(getSuggestionId(s)));
            }
            if (decision.rejected_suggestions?.length > 0) {
                systemStatus.rejected_suggestions = decision.rejected_suggestions;
            }
            if (decision.review_suggestion) {
                systemStatus.review_suggestion = allSuggestions.find(s => getSuggestionId(s) === decision.review_suggestion);
            }
            
            if (Object.keys(systemStatus).length > 0) {
                statuses[system] = systemStatus;
            }
        }
        
        if (Object.keys(statuses).length > 0) {
            payload.push({ icd_name: icdName, statuses });
        }
    }

    if (payload.length === 0) {
        toggleButtonLoading(saveButton, false);
        return;
    }
    
    try {
        await fetchAPI('/admin/submit-curation', 'POST', payload);
        alert("Curation saved successfully!");
        // --- FIX: Redirect to the master map to see the results ---
        window.location.href = 'master_map.html';
    } catch (error) {
        alert(`Failed to save curation: ${error.message}`);
        // Still reload the current page on failure to clear state
        window.location.reload(); 
    } finally {
        // This will only run on failure, as success navigates away
        toggleButtonLoading(saveButton, false);
    }
}

// --- Modal & Popover Logic ---
function showValidationModal(isPromoteMode, data) {
    if (isPromoteMode) {
        const promotionListHtml = data.map(candidate => 
            `<li>For <strong class="text-gray-800">${candidate.icdName}</strong>, will promote <strong class="text-gray-800">'${candidate.firstAlias.term}'</strong> in the <strong class="capitalize">${candidate.aliasSystem}</strong> system.</li>`
        ).join('');

        const message = `You have rejected the main suggestions but linked aliases in the following cases: <ul class="list-disc pl-5 mt-2 mb-2">${promotionListHtml}</ul> Do you want to promote these aliases to be the new primary mappings?`;
        dom.promotionMessage.innerHTML = message;

        dom.confirmPromoteButton.onclick = () => {
            // Programmatically promote ALL candidates
            data.forEach(candidate => {
                const decision = state.curationDecisions[candidate.icdName][candidate.aliasSystem];
                const aliasId = getSuggestionId(candidate.firstAlias);
                decision.primary = aliasId;
                decision.aliases = decision.aliases.filter(id => id !== aliasId);
            });
            closeValidationModal();
            performSave(dom.confirmPromoteButton);
        };
        
        dom.validationErrorView.classList.add('hidden');
        dom.validationPromoteView.classList.remove('hidden');
    } else {
        dom.validationIssues.innerHTML = data.map(issue => `
            <div class="p-2 bg-white border rounded-md">
                <p class="font-bold text-gray-800">${issue.icdName}</p>
                <p class="text-xs text-gray-500 capitalize">${issue.system}: ${issue.message}</p>
            </div>`).join('');
        dom.validationPromoteView.classList.add('hidden');
        dom.validationErrorView.classList.remove('hidden');
    }
    dom.validationModal.classList.remove('hidden');
}

function closeValidationModal() {
    dom.validationModal.classList.add('hidden');
}

function showSuggestionsPopover(buttonElement, icdName, system) {
    state.popoverContext = { button: buttonElement, icdName, system };
    if (!dom.suggestionsPopover.classList.contains('hidden') && dom.suggestionsPopover.dataset.trigger === buttonElement.id) {
        hideSuggestionsPopover();
        return;
    }
    renderSuggestionsPopover();
    positionPopover();
    dom.suggestionsPopover.classList.remove('hidden');
}

function renderSuggestionsPopover() {
    const { button, icdName, system } = state.popoverContext;
    if (!button || !icdName || !system) return;

    const rowData = state.allSuggestionsCache.find(r => r.suggested_icd_name === icdName);
    if (!rowData) return;

    const suggestions = JSON.parse(rowData[`${system}_suggestions`]);
    const decisionObj = state.curationDecisions[icdName]?.[system] || {};

    let primarySugg = null;
    const approvedPrimaryId = decisionObj.primary;
    const rejectedPrimaryInfo = (decisionObj.rejected_suggestions || []).find(r => r.isPrimary);

    if (approvedPrimaryId) primarySugg = suggestions.find(s => getSuggestionId(s) === approvedPrimaryId);
    else if (decisionObj.review_suggestion) primarySugg = suggestions.find(s => getSuggestionId(s) === decisionObj.review_suggestion);
    else if (rejectedPrimaryInfo) primarySugg = rejectedPrimaryInfo.suggestion;
    else primarySugg = suggestions.find(s => !(decisionObj.rejected_suggestions || []).some(r => getSuggestionId(r.suggestion) === getSuggestionId(s)));

    if (!primarySugg) { hideSuggestionsPopover(); return; }
    
    const otherSuggs = suggestions.filter(s => getSuggestionId(s) !== getSuggestionId(primarySugg));
    const popoverContentHtml = otherSuggs.map(sugg => renderSuggestion(sugg, icdName, system, 'alias')).join('');

    if (!popoverContentHtml) { hideSuggestionsPopover(); return; }

    const closeButtonHtml = `<button onclick="hideSuggestionsPopover()" class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times"></i></button>`;
    dom.suggestionsPopover.innerHTML = `<div class="relative p-2 space-y-2">${closeButtonHtml}${popoverContentHtml}</div>`;
    dom.suggestionsPopover.dataset.trigger = button.id;
}

function updateUIAfterPopoverAction(icdName, system) {
    const popoverBtnId = state.popoverContext.button?.id;
    updateCellUI(icdName, system);
    if (!popoverBtnId) return;

    const newButton = document.getElementById(popoverBtnId);
    if (newButton) {
        state.popoverContext.button = newButton;
        renderSuggestionsPopover();
        positionPopover();
        dom.suggestionsPopover.classList.remove('hidden');
    } else {
        hideSuggestionsPopover();
    }
}

// --- PAGINATION ---
function renderPagination() {
    const { page, limit, total } = state.pagination.new;
    if (total <= limit) return '';
    const totalPages = Math.ceil(total / limit);
    let buttons = '';
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100';
        buttons += `<button onclick="changePage(${i})" class="px-3 py-1 border rounded text-xs ${isActive}">${i}</button>`;
    }
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    const info = `<p class="text-xs text-gray-600">Showing ${start}-${end} of ${total}</p>`;
    return `<div class="flex items-center justify-between w-full">${info}<div class="flex space-x-1">${buttons}</div></div>`;
}

function changePage(newPage) {
    state.pagination.new.page = newPage;
    updateNewSuggestionsContent();
}