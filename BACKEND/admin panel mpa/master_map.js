// FILE: master_map.js
// This file contains the specific logic for the Master Map page.

async function initializePage() {
    Object.assign(dom, {
        mappingEditorModal: document.getElementById('mapping-editor-modal'),
        aliasEditorContainer: document.getElementById('alias-editor-container'),
        editorErrorMessage: document.getElementById('editor-error-message'),
        // FIX #1: Explicitly cache the suggestionsPopover to prevent race conditions
        suggestionsPopover: document.getElementById('suggestions-popover')
    });

    await refreshMasterMapData();
}

async function refreshMasterMapData() {
    dom.mainLoader.classList.remove('hidden');
    try {
        state.data.master = await fetchAPI('/admin/master-map-data');
        renderMasterMap();
    } catch (error) {
        dom.contentArea.innerHTML = `<p class="p-8 text-red-500">Error loading master map: ${error.message}</p>`;
    } finally {
        dom.mainLoader.classList.add('hidden');
    }
}

function renderMasterMap() {
    const rows = state.data.master.map(createMasterMapRow).join('');
    const contentHtml = `<div class="overflow-x-auto"><table class="grid-table"><thead class="bg-gray-50"><tr class="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"><th class="table-cell w-1/4">Verified ICD-11</th><th class="table-cell w-1/4">Ayurveda Mapping</th><th class="table-cell w-1/4">Siddha Mapping</th><th class="table-cell w-1/4">Unani Mapping</th><th class="table-cell w-[100px]">Actions</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="text-center py-12 table-cell">Master map is empty.</td></tr>`}</tbody></table></div>`;
    dom.contentArea.innerHTML = contentHtml;
}

/*
function createMasterMapRow(row) {
    const icdName = row.suggested_icd_name;
    const revertButton = `<button onclick="revertToSuggestions('${icdName}')" class="text-sm font-medium text-yellow-600 hover:text-yellow-800 hover:underline" title="Move this entire row back to New Suggestions"><i class="fa-solid fa-arrow-rotate-left"></i> Revert</button>`;
    return `<tr><td class="table-cell font-medium text-sm">${icdName}</td><td class="table-cell">${renderGoldenRecordCell(row.ayurveda_mapping, icdName, 'ayurveda')}</td><td class="table-cell">${renderGoldenRecordCell(row.siddha_mapping, icdName, 'siddha')}</td><td class="table-cell">${renderGoldenRecordCell(row.unani_mapping, icdName, 'unani')}</td><td class="table-cell text-center">${revertButton}</td></tr>`;
}
*/


// In master_map.js

function createMasterMapRow(row) {
    const icdName = row.suggested_icd_name;
    const isVerified = row.row_status === 'Verified';

    const statusBadge = isVerified 
        ? `<span class="px-2 py-1 text-xs font-bold leading-none text-white bg-green-600 rounded-full">Verified</span>`
        : `<span class="px-2 py-1 text-xs font-bold leading-none text-yellow-800 bg-yellow-200 rounded-full">Staged</span>`;

    // The Undo button is only shown for Verified rows.
    const undoButton = `<button onclick="handleUndoVerification('${icdName}')" class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline" title="Revert this row to Staged status for editing."><i class="fa-solid fa-undo"></i> Undo</button>`;
    
    // The Revert button is always shown.
    const revertButton = `<button onclick="revertToSuggestions('${icdName}')" class="text-sm font-medium text-yellow-600 hover:text-yellow-800 hover:underline" title="Move this entire row back to New Suggestions"><i class="fa-solid fa-arrow-rotate-left"></i> Revert</button>`;
    
    // Combine buttons based on status
    const actionButtons = `
        <div class="flex flex-col items-center space-y-2">
            ${isVerified ? undoButton : ''}
            ${revertButton}
        </div>
    `;

    // Note that the renderGoldenRecordCell function will now get an extra 'isVerified' parameter
    return `
        <tr>
            <td class="table-cell font-medium text-sm">
                <div class="flex items-center space-x-2">
                    <span>${icdName}</span>
                    ${statusBadge}
                </div>
            </td>
            <td class="table-cell">${renderGoldenRecordCell(row.ayurveda_mapping, icdName, 'ayurveda', isVerified)}</td>
            <td class="table-cell">${renderGoldenRecordCell(row.siddha_mapping, icdName, 'siddha', isVerified)}</td>
            <td class="table-cell">${renderGoldenRecordCell(row.unani_mapping, icdName, 'unani', isVerified)}</td>
            <td class="table-cell text-center">${actionButtons}</td>
        </tr>
    `;
}



/*
function renderGoldenRecordCell(mappingStr, icdName, system) {
    const editButton = `<button onclick="openMappingEditor('${icdName}', '${system}')" class="absolute top-2 right-2 text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-gray-100 transition-colors" title="Edit Mapping"><i class="fa-solid fa-pencil"></i></button>`;
    const addMappingButton = `<div class="relative h-full flex items-center justify-center"><button onclick="openMappingEditor('${icdName}', '${system}')" class="text-sm font-semibold text-gray-400 hover:text-blue-600 flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"><i class="fa-solid fa-plus mr-2"></i> Add Mapping</button></div>`;

    if (!mappingStr) return addMappingButton;
    
    try {
        const mapping = JSON.parse(mappingStr);
        if (!mapping.primary || !mapping.primary.term) return addMappingButton;
        
        let html = `<div class="relative">${editButton}${renderSuggestionDisplay(mapping.primary)}`;
        if (mapping.aliases && mapping.aliases.length > 0) {
            const safeIcdName = icdName.replace(/[^a-zA-Z0-9]/g, '-');
            const popoverButtonId = `master-popover-btn-${safeIcdName}-${system}`;
            html += `<div class="mt-2 pt-2 border-t"><button id="${popoverButtonId}" onclick="showMasterAliasPopover(this, '${icdName}', '${system}')" class="w-full text-left text-xs font-semibold text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 flex items-center transition-colors"><i class="fa-solid fa-tags mr-2 text-xs"></i>+${mapping.aliases.length} Linked Alias(es)</button></div>`;
        }
        html += `</div>`;
        return html;
    } catch (e) { return '<span class="text-xs text-red-500">Data Error</span>'; }
}

*/

// In master_map.js

function renderGoldenRecordCell(mappingStr, icdName, system, isVerified) {
    // Edit button is now disabled if the row is verified
    const editButton = `
        <button onclick="openMappingEditor('${icdName}', '${system}')" 
                class="absolute top-2 right-2 text-gray-400 p-1 rounded-full transition-colors ${isVerified ? 'text-gray-300 cursor-not-allowed' : 'hover:text-blue-600 hover:bg-gray-100'}" 
                title="${isVerified ? 'Undo verification to edit' : 'Edit Mapping'}" 
                ${isVerified ? 'disabled' : ''}>
            <i class="fa-solid fa-pencil"></i>
        </button>`;
    
    const addMappingButton = `<div class="relative h-full flex items-center justify-center"><button onclick="openMappingEditor('${icdName}', '${system}')" class="text-sm font-semibold text-gray-400 hover:text-blue-600 flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"><i class="fa-solid fa-plus mr-2"></i> Add Mapping</button></div>`;

    if (!mappingStr) return addMappingButton;
    
    try {
        const mapping = JSON.parse(mappingStr);
        if (!mapping.primary || !mapping.primary.term) return addMappingButton;
        
    let html = `<div class="relative">${editButton}${renderSuggestionDisplay(mapping.primary, system)}`;
        if (mapping.aliases && mapping.aliases.length > 0) {
            const safeIcdName = icdName.replace(/[^a-zA-Z0-9]/g, '-');
            const popoverButtonId = `master-popover-btn-${safeIcdName}-${system}`;
            html += `<div class="mt-2 pt-2 border-t"><button id="${popoverButtonId}" onclick="showMasterAliasPopover(this, '${icdName}', '${system}')" class="w-full text-left text-xs font-semibold text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 flex items-center transition-colors"><i class="fa-solid fa-tags mr-2 text-xs"></i>+${mapping.aliases.length} Linked Alias(es)</button></div>`;
        }
        html += `</div>`;
        return html;
    } catch (e) { return '<span class="text-xs text-red-500">Data Error</span>'; }
}



function renderSuggestionDisplay(suggestion, system) {
    if (!suggestion) return '';
    const { term = 'N/A', code = 'N/A', devanagari, tamil, arabic, confidence = 'N/A', source_description = 'N/A', source_short_definition = null, source_long_definition = null, justification = 'N/A', source_row = '?' } = suggestion;
    const numericConfidence = parseInt(confidence, 10);
    let confColor = 'bg-gray-200 text-gray-800';
    if (!isNaN(numericConfidence)) {
        if (numericConfidence >= 80) confColor = 'bg-green-100 text-green-800';
        else if (numericConfidence >= 50) confColor = 'bg-yellow-100 text-yellow-800';
        else if (numericConfidence > 0) confColor = 'bg-red-100 text-red-800';
    }
    const confidenceBadge = isNaN(numericConfidence) ? '' : `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${confColor}">${confidence}%</span>`;
    // Strict separation: do NOT fallback between short/long; show explicit messages when missing
    const shortDef = (source_short_definition && String(source_short_definition).trim())
        ? source_short_definition
        : 'Short definition is not available in source file';
    const longDef = (source_long_definition && String(source_long_definition).trim())
        ? source_long_definition
        : 'Long definition is not available in source file';
    return `<div class="p-1">
        <div class="flex justify-between items-start mb-1">
            <div>
                <p class="font-semibold text-sm">${term}</p>
                <p class="text-gray-500 text-sm">${devanagari || tamil || arabic || ''}</p>
            </div>
            ${confidenceBadge}
        </div>
        <p class="font-mono text-xs text-gray-500 mb-2">${code}</p>
        <div class="space-y-2 text-[11px]">
            <div class="border-t pt-2">
                <h4 class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Source Short Def. <span class="font-mono lowercase text-gray-400">(line ${source_row})</span></h4>
                <p class="text-gray-600 break-words">${shortDef}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Source Long Def.</h4>
                <p class="text-gray-600 break-words">${longDef}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Justification</h4>
                <p class="text-gray-600 break-words">${justification}</p>
            </div>
        </div>
    </div>`;
}

function openMappingEditor(icdName, system) {
    state.editorContext = { icdName, system };
    document.getElementById('editor-title').textContent = `Edit Mapping for ${system.charAt(0).toUpperCase() + system.slice(1)}`;
    const vernacularLabel = document.getElementById('editor-primary-vernacular-label');
    if (system === 'ayurveda') vernacularLabel.textContent = 'Devanagari';
    else if (system === 'siddha') vernacularLabel.textContent = 'Tamil';
    else if (system === 'unani') vernacularLabel.textContent = 'Arabic';

    if (dom.editorErrorMessage) dom.editorErrorMessage.textContent = '';
    document.getElementById('editor-primary-term').value = '';
    document.getElementById('editor-primary-code').value = '';
    document.getElementById('editor-primary-vernacular').value = '';
    document.getElementById('editor-primary-source_row').value = '';
    document.getElementById('editor-primary-source_description').value = '';
    document.getElementById('editor-primary-source_short_definition').value = '';
    document.getElementById('editor-primary-source_long_definition').value = '';
    document.getElementById('editor-primary-justification-hidden').value = '';
    document.getElementById('editor-primary-confidence-hidden').value = '';
    dom.aliasEditorContainer.innerHTML = '';
    document.querySelector('.p-4.border.rounded-lg .ai-feedback-container').classList.add('hidden');

    const masterRow = state.data.master.find(r => r.suggested_icd_name === icdName);
    const mappingStr = masterRow?.[`${system}_mapping`];
    if (mappingStr) {
        try {
            const mapping = JSON.parse(mappingStr);
            if (mapping.primary) {
                const p = mapping.primary;
                document.getElementById('editor-primary-term').value = p.term || '';
                document.getElementById('editor-primary-code').value = p.code || '';
                document.getElementById('editor-primary-vernacular').value = p.devanagari || p.tamil || p.arabic || '';
                document.getElementById('editor-primary-source_row').value = p.source_row || '';
                document.getElementById('editor-primary-source_description').value = p.source_description || '';
                document.getElementById('editor-primary-source_short_definition').value = p.source_short_definition || '';
                document.getElementById('editor-primary-source_long_definition').value = p.source_long_definition || '';
                document.getElementById('editor-primary-justification-hidden').value = p.justification || '';
                document.getElementById('editor-primary-confidence-hidden').value = p.confidence || '';
            }
            if (mapping.aliases?.length > 0) {
                mapping.aliases.forEach(alias => addAliasField(alias));
            }
        } catch (e) { console.error("Could not parse master mapping:", e); }
    }
    dom.mappingEditorModal.classList.remove('hidden');
}

function closeMappingEditor() {
    dom.mappingEditorModal.classList.add('hidden');
}

function addAliasField(alias = null) {
    const fieldset = document.createElement('div');
    fieldset.className = 'alias-fieldset border-t pt-4';
    const vernacularLabel = state.editorContext.system === 'ayurveda' ? 'Devanagari' : state.editorContext.system === 'siddha' ? 'Tamil' : 'Arabic';

    fieldset.innerHTML = `
        <div class="p-4 border rounded-lg space-y-2 relative">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="absolute -top-2 -right-2 bg-white h-6 w-6 text-xs flex items-center justify-center font-semibold text-red-500 hover:text-red-700 border rounded-full" title="Remove Alias"><i class="fa-solid fa-times"></i></button>
            <input type="hidden" class="editor-alias-justification-hidden" value="${alias?.justification || ''}">
            <input type="hidden" class="editor-alias-confidence-hidden" value="${alias?.confidence || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><label class="block font-medium text-gray-600">Term Name</label><input type="text" value="${alias?.term || ''}" class="editor-alias-term w-full mt-1 p-2 border rounded"></div>
                <div><label class="block font-medium text-gray-600">Code</label><input type="text" value="${alias?.code || ''}" class="editor-alias-code w-full mt-1 p-2 border rounded"></div>
                <div><label class="block font-medium text-gray-600">${vernacularLabel}</label><input type="text" value="${alias?.devanagari || alias?.tamil || alias?.arabic || ''}" class="editor-alias-vernacular w-full mt-1 p-2 border rounded"></div>
                <div><label class="block font-medium text-gray-600">Source Row</label><input type="text" value="${alias?.source_row || ''}" class="editor-alias-source_row w-full mt-1 p-2 border rounded"></div>
                <div class="col-span-full"><label class="block font-medium text-gray-600">Source Description (legacy)</label><textarea rows="2" class="editor-alias-source_description w-full mt-1 p-2 border rounded" placeholder="Legacy description; UI displays Short/Long separately.">${alias?.source_description || ''}</textarea></div>
                <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block font-medium text-gray-600">Source Short Definition</label><textarea rows="2" class="editor-alias-source_short_definition w-full mt-1 p-2 border rounded">${alias?.source_short_definition || ''}</textarea></div>
                    <div><label class="block font-medium text-gray-600">Source Long Definition</label><textarea rows="2" class="editor-alias-source_long_definition w-full mt-1 p-2 border rounded">${alias?.source_long_definition || ''}</textarea></div>
                </div>
                <div class="col-span-full pt-2"><button type="button" onclick="handleRunAiSurety(this, false)" class="w-full text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md flex items-center justify-center"><span class="btn-text"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Run AI Surety for this Alias</span><div class="loader hidden ml-2"></div></button></div>
                <div class="ai-feedback-container col-span-full grid-cols-5 gap-4 hidden">
                    <div class="col-span-4 bg-gray-50 p-3 rounded-md border"><label class="block font-medium text-gray-600 text-xs">AI-Generated Justification</label><p class="editor-justification text-xs text-gray-700 mt-1 h-12 overflow-y-auto"></p></div>
                    <div class="col-span-1 bg-gray-50 p-3 rounded-md border text-center"><label class="block font-medium text-gray-600 text-xs">AI Confidence</label><p class="editor-confidence text-2xl font-bold text-gray-800 mt-2"></p></div>
                </div>
            </div>
        </div>`;
    dom.aliasEditorContainer.appendChild(fieldset);
}

// Add this new function at the end of master_map.js

// In master_map.js, replace the placeholder function

async function handleUndoVerification(icdName) {
    if (!confirm(`Undo verification for "${icdName}"? This will make it editable again.`)) return;
    try {
        const result = await fetchAPI('/admin/undo-verification', 'POST', { icd_name: icdName });
        alert(result.message);
        // Clear suggestions cache so New Suggestions reflects latest state
        if (typeof clearSuggestionsCache === 'function') {
            await clearSuggestionsCache();
        }
        // Refresh global stats and this page
        await fetchSharedData();
        await refreshMasterMapData();
    } catch (error) {
        alert(`Failed to undo verification: ${error.message}`);
    }
}




async function handleRunAiSurety(button, isPrimary) {
    toggleButtonLoading(button, true);
    const { icdName, system } = state.editorContext;
    const rootElement = button.closest(isPrimary ? '.p-4.border.rounded-lg' : '.alias-fieldset');
    const itemToVerify = {
        term: rootElement.querySelector(isPrimary ? '#editor-primary-term' : '.editor-alias-term').value,
        code: rootElement.querySelector(isPrimary ? '#editor-primary-code' : '.editor-alias-code').value,
        source_description: rootElement.querySelector(isPrimary ? '#editor-primary-source_description' : '.editor-alias-source_description').value,
        source_short_definition: rootElement.querySelector(isPrimary ? '#editor-primary-source_short_definition' : '.editor-alias-source_short_definition')?.value,
        source_long_definition: rootElement.querySelector(isPrimary ? '#editor-primary-source_long_definition' : '.editor-alias-source_long_definition')?.value
    };
    const vernacularValue = rootElement.querySelector(isPrimary ? '#editor-primary-vernacular' : '.editor-alias-vernacular').value;
    if (system === 'ayurveda') itemToVerify.devanagari = vernacularValue;
    else if (system === 'siddha') itemToVerify.tamil = vernacularValue;
    else if (system === 'unani') itemToVerify.arabic = vernacularValue;
    
    try {
        const result = await fetchAPI('/admin/verify-mapping-with-ai', 'POST', { icd_name: icdName, mapping: { primary: itemToVerify } });
        const feedbackContainer = rootElement.querySelector('.ai-feedback-container');
        feedbackContainer.querySelector('.editor-justification').textContent = result.justification;
        feedbackContainer.querySelector('.editor-confidence').textContent = `${result.confidence}%`;
        rootElement.querySelector(isPrimary ? '#editor-primary-justification-hidden' : '.editor-alias-justification-hidden').value = result.justification;
        rootElement.querySelector(isPrimary ? '#editor-primary-confidence-hidden' : '.editor-alias-confidence-hidden').value = result.confidence;
        feedbackContainer.classList.remove('hidden');
        feedbackContainer.style.display = 'grid';
    } catch (error) {
        alert(`AI Surety check failed: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
}

async function handleSaveMasterMapEdit(button) {
    toggleButtonLoading(button, true);
    if (dom.editorErrorMessage) dom.editorErrorMessage.textContent = '';

    let isValid = true;
    const aliasFieldsets = document.querySelectorAll('.alias-fieldset');
    aliasFieldsets.forEach(fieldset => {
        const term = fieldset.querySelector('.editor-alias-term').value.trim();
        const description = fieldset.querySelector('.editor-alias-source_description').value.trim();
        if (term || description) {
            if (!term || !description) {
                isValid = false;
            }
        }
    });

    if (!isValid) {
        dom.editorErrorMessage.textContent = 'For each alias, Term Name and Source Description are required.';
        toggleButtonLoading(button, false);
        return;
    }

    const { icdName, system } = state.editorContext;
    const primaryVernacularField = system === 'ayurveda' ? 'devanagari' : (system === 'siddha' ? 'tamil' : 'arabic');
    
    const primary = {
        term: document.getElementById('editor-primary-term').value.trim(),
        code: document.getElementById('editor-primary-code').value.trim(),
        source_row: document.getElementById('editor-primary-source_row').value.trim(),
        source_description: document.getElementById('editor-primary-source_description').value.trim(),
        source_short_definition: document.getElementById('editor-primary-source_short_definition').value.trim(),
        source_long_definition: document.getElementById('editor-primary-source_long_definition').value.trim(),
        justification: document.getElementById('editor-primary-justification-hidden').value.trim(),
        confidence: document.getElementById('editor-primary-confidence-hidden').value.trim()
    };
    primary[primaryVernacularField] = document.getElementById('editor-primary-vernacular').value.trim();

    const aliases = [];
    aliasFieldsets.forEach(fieldset => {
        const term = fieldset.querySelector('.editor-alias-term').value.trim();
        if (term) {
            const aliasVernacularField = system === 'ayurveda' ? 'devanagari' : (system === 'siddha' ? 'tamil' : 'arabic');
            const alias = {
                term: term,
                code: fieldset.querySelector('.editor-alias-code').value.trim(),
                source_row: fieldset.querySelector('.editor-alias-source_row').value.trim(),
                source_description: fieldset.querySelector('.editor-alias-source_description').value.trim(),
                source_short_definition: fieldset.querySelector('.editor-alias-source_short_definition').value.trim(),
                source_long_definition: fieldset.querySelector('.editor-alias-source_long_definition').value.trim(),
                justification: fieldset.querySelector('.editor-alias-justification-hidden').value.trim(),
                confidence: fieldset.querySelector('.editor-alias-confidence-hidden').value.trim()
            };
            alias[aliasVernacularField] = fieldset.querySelector('.editor-alias-vernacular').value.trim();
            aliases.push(alias);
        }
    });

    const mapping = { primary, aliases };
    const payload = { icd_name: icdName, system: system, mapping: mapping };

    try {
        closeMappingEditor();
        await fetchAPI('/admin/update-master-mapping', 'POST', payload);
        await refreshMasterMapData();
    } catch (error) {
        alert(`Failed to save changes: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
}

async function handleCommitToMaster(button) {
    if (!confirm("Commit all items to the final database? This cannot be undone.")) return;
    toggleButtonLoading(button, true);
    try {
        const result = await fetchAPI('/admin/commit-to-master', 'POST');
        alert(result.message);
        // Update stats to reflect verified counts and refresh page data
        await fetchSharedData();
        await refreshMasterMapData();
    } catch (error) {
        alert(`Failed to commit: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
}

// FIX #2: Added visual feedback to the Revert button logic
async function revertToSuggestions(icdName) {
    if (!confirm(`Are you sure you want to move the entire mapping for "${icdName}" back to New Suggestions for re-curation?`)) return;
    
    try {
        closeMappingEditor(); // Close any open editors before reverting
        // Provide immediate visual feedback
        dom.mainLoader.classList.remove('hidden');
        dom.contentArea.innerHTML = '';
        
        await fetchAPI('/admin/revert-master-mapping', 'POST', { icd_name: icdName });
        alert(`"${icdName}" has been moved back to New Suggestions.`);
        // Invalidate suggestions cache so New Suggestions page fetches fresh data
        if (typeof clearSuggestionsCache === 'function') {
            await clearSuggestionsCache();
        }
        // Refresh stats to reflect the move
        await fetchSharedData();
        // The refresh function will handle hiding the loader
        await refreshMasterMapData();
    } catch (error) {
        alert(`Failed to revert mapping: ${error.message}`);
        // Refresh the page to show the original state if the revert fails
        await refreshMasterMapData();
    }
}

// --- Popover Logic ---
function showMasterAliasPopover(buttonElement, icdName, system) {
    state.popoverContext = { button: buttonElement, icdName, system };
    if (!dom.suggestionsPopover.classList.contains('hidden') && dom.suggestionsPopover.dataset.trigger === buttonElement.id) {
        hideSuggestionsPopover();
        return;
    }
    renderMasterAliasPopover();
    positionPopover();
    dom.suggestionsPopover.classList.remove('hidden');
}

function renderMasterAliasPopover() {
    const { button, icdName, system } = state.popoverContext;
    if (!button || !icdName || !system) return;
    const rowData = state.data.master.find(r => r.suggested_icd_name === icdName);
    if (!rowData) return;
    try {
        const mapping = JSON.parse(rowData[`${system}_mapping`]);
        const aliases = mapping.aliases || [];
        if (aliases.length === 0) { hideSuggestionsPopover(); return; }
    const popoverContentHtml = aliases.map(alias => renderSuggestionDisplay(alias, system)).join('<hr class="my-2 border-gray-100">');
        const closeButtonHtml = `<button onclick="hideSuggestionsPopover()" class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-times"></i></button>`;
        dom.suggestionsPopover.innerHTML = `<div class="relative p-3">${closeButtonHtml}<h4 class="text-sm font-bold text-gray-700 mb-2">Linked Aliases</h4><div class="space-y-2">${popoverContentHtml}</div></div>`;
        dom.suggestionsPopover.dataset.trigger = button.id;
    } catch (e) {
        hideSuggestionsPopover();
    }
}