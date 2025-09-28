// FILE: icd11.js
// This file contains the specific logic for the ICD-11 List page.

async function initializePage() {
    // Add page-specific state for filtering and searching
    state.icdFilter = 'all';
    state.icdSearchTerm = '';
    // Add pagination state for the ICD list
    state.pagination.icd = { page: 1, limit: 500, total: 0 };

    Object.assign(dom, {
        addIcdModal: document.getElementById('add-icd-modal'),
        icdFilterButtons: document.getElementById('icd-filter-buttons'),
        icdSearchInput: document.getElementById('icd-search-input'),
        // MODIFIED: Cache both pagination container elements
        icdPaginationTop: document.getElementById('icd-pagination-top'),
        icdPagination: document.getElementById('icd-pagination')
    });

    try {
        const icdList = await fetchAPI('/admin/icd-master-list');
        state.data.icdMasterList = icdList;
        // With the data now loaded, render the final content
        renderIcdPageContent();
    } catch (error) {
        document.getElementById('icd-list-tbody').innerHTML = `<tr><td colspan="3" class="text-center py-12 table-cell text-red-500">Error loading ICD-11 list.</td></tr>`;
    } finally {
        dom.mainLoader.classList.add('hidden');
    }
}

// Renders the dynamic parts of the page (filters and table)
function renderIcdPageContent() {
    const mappedCount = state.data.icdMasterList.filter(item => item.status === 'Mapped').length;
    const orphanedCount = state.data.icdMasterList.filter(item => item.status === 'Orphaned').length;
    
    // Render Filter Buttons
    dom.icdFilterButtons.innerHTML = `
        <button onclick="filterIcdList('all')" class="sub-tab-button relative px-4 py-2 text-sm font-medium border rounded-l-lg ${state.icdFilter === 'all' ? 'sub-tab-active' : 'bg-white hover:bg-gray-50'}">
            All <span class="ml-2 text-xs font-semibold">${state.data.icdMasterList.length}</span>
        </button>
        <button onclick="filterIcdList('mapped')" class="sub-tab-button relative px-4 py-2 text-sm font-medium border-t border-b ${state.icdFilter === 'mapped' ? 'sub-tab-active' : 'bg-white hover:bg-gray-50'}">
            Mapped <span class="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-100 bg-green-600 rounded-full">${mappedCount}</span>
        </button>
        <button onclick="filterIcdList('orphaned')" class="sub-tab-button relative px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg ${state.icdFilter === 'orphaned' ? 'sub-tab-active' : 'bg-white hover:bg-gray-50'}">
            Orphaned <span class="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-yellow-100 bg-yellow-600 rounded-full">${orphanedCount}</span>
        </button>
    `;
    
    // Set the search input value from state
    dom.icdSearchInput.value = state.icdSearchTerm;

    updateIcdTable(); // Populate the table with data
}

function filterIcdList(status) {
    state.icdFilter = status;
    // Reset to page 1 when the filter changes
    state.pagination.icd.page = 1;
    renderIcdPageContent();
}

function searchIcdList(inputElement) {
    state.icdSearchTerm = inputElement.value;
    // Reset to page 1 when a search is performed
    state.pagination.icd.page = 1;
    updateIcdTable();
}

function updateIcdTable() {
    const tbody = document.getElementById('icd-list-tbody');
    if (!tbody) return;

    let filteredData = state.data.icdMasterList;

    // Apply the status filter
    if (state.icdFilter !== 'all') {
        const statusToFilter = state.icdFilter.charAt(0).toUpperCase() + state.icdFilter.slice(1);
        filteredData = filteredData.filter(item => item.status === statusToFilter);
    }

    // Apply the search term filter
    const searchTerm = state.icdSearchTerm.toLowerCase();
    if (searchTerm) {
        filteredData = filteredData.filter(item => 
            item.icd_name.toLowerCase().includes(searchTerm) ||
            (item.icd_code && item.icd_code.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }

    // Set the total count for the pagination based on the filtered results
    state.pagination.icd.total = filteredData.length;

    // Slice the data for the current page
    const { page, limit } = state.pagination.icd;
    const start = (page - 1) * limit;
    const paginatedData = filteredData.slice(start, start + limit);

    // Render the final rows using the paginated data
    const rowsHtml = paginatedData.map(item => `
        <tr class="text-sm">
            <td class="table-cell font-semibold">${item.icd_name}</td>
            <td class="table-cell text-gray-800">${item.icd_code || ''}</td>
            <td class="table-cell text-gray-600">${item.description || ''}</td>
            <td class="table-cell text-center"><span class="px-2 py-1 text-xs font-medium rounded-full ${item.status === 'Orphaned' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${item.status}</span></td>
        </tr>
    `).join('');

    tbody.innerHTML = rowsHtml || `<tr><td colspan="4" class="text-center py-12 table-cell">No ICD-11 codes match your search/filter.</td></tr>`;

    // Render the pagination controls
    renderIcdPagination();
}


// Handles the submission of the "Add New ICD-11" modal
async function handleAddIcdCode(button) {
    const icdNameInput = document.getElementById('new-icd-name');
    const icdDescInput = document.getElementById('new-icd-description');
    
    const payload = {
        icd_name: icdNameInput.value.trim(),
        description: icdDescInput.value.trim()
    };

    if (!payload.icd_name || !payload.description) {
        alert('Both name and description are required.');
        return;
    }

    toggleButtonLoading(button, true);
    try {
        await fetchAPI('/admin/add-icd-code', 'POST', payload);
        icdNameInput.value = '';
        icdDescInput.value = '';
        dom.addIcdModal.classList.add('hidden');
        dom.addIcdModal.classList.remove('flex');
        // Re-fetch all data and re-render. Pagination will update automatically.
        initializePage();
    } catch (error) {
        alert(`Failed to add ICD code: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
}

// --- PAGINATION FUNCTIONS ---

/**
 * Renders the pagination controls (buttons and text) into both top and bottom containers.
 */
function renderIcdPagination() {
    const { page, limit, total } = state.pagination.icd;
    let paginationHtml = '';

    if (total > limit) {
        const totalPages = Math.ceil(total / limit);
        
        // Generate page buttons
        let buttonsHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            const isActive = i === page ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-gray-50';
            buttonsHtml += `<button onclick="changeIcdPage(${i})" class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${isActive}">${i}</button>`;
        }
        
        // Generate "Showing X-Y of Z" text
        const startItem = (page - 1) * limit + 1;
        const endItem = Math.min(page * limit, total);
        const infoHtml = `<p class="text-sm text-gray-700">Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of <span class="font-medium">${total}</span> results</p>`;
        
        paginationHtml = `
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                <div>${infoHtml}</div>
                <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        ${buttonsHtml}
                    </nav>
                </div>
            </div>
        `;
    }
    
    // MODIFIED: Update both top and bottom pagination containers
    if (dom.icdPaginationTop) {
        dom.icdPaginationTop.innerHTML = paginationHtml;
    }
    if (dom.icdPagination) {
        dom.icdPagination.innerHTML = paginationHtml;
    }
}

/**
 * Changes the current page and re-renders the table.
 * @param {number} newPage - The page number to switch to.
 */
function changeIcdPage(newPage) {
    state.pagination.icd.page = newPage;
    updateIcdTable();
    // Scroll to the top of the table for a better user experience
    document.querySelector('.grid-table').scrollIntoView({ behavior: 'smooth' });
}