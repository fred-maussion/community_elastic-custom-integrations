// --- NEW ---
// State object to track the current index and max items for each carousel
const sliderState = {
    content: { index: 0, max: 0, itemsPerView: 1 },
    all: { index: 0, max: 0, itemsPerView: 1 },
    observability: { index: 0, max: 0, itemsPerView: 1 },
    security: { index: 0, max: 0, itemsPerView: 1 }
};

// --- NEW ---
// Utility function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

// --- NEW ---
// Function to update the slider's position and button states
function updateSlider(category) {
    const state = sliderState[category];
    const container = document.getElementById(`${category}-integrations`);
    const prevBtn = document.querySelector(`.carousel-nav .carousel-btn.prev[data-category="${category}"]`);
    const nextBtn = document.querySelector(`.carousel-nav .carousel-btn.next[data-category="${category}"]`);

    if (!container || !prevBtn || !nextBtn) {
        return;
    }

    const cards = container.querySelectorAll('.integration-card');
    if (cards.length === 0) {
        // No cards yet, do nothing.
        return;
    }
    
    // More robustly calculate the distance to scroll for one card.
    // This accounts for card width + gap.
    const scrollDistance = cards.length > 1 ? (cards[1].offsetLeft - cards[0].offsetLeft) : cards[0].offsetWidth;

    const offset = -state.index * scrollDistance;
    container.style.transform = `translateX(${offset}px)`;

    // Update button disabled state
    prevBtn.disabled = state.index === 0;
    
    const viewportWidth = container.parentElement.clientWidth;
    // Estimate how many full cards are visible
    const visibleCards = Math.floor(viewportWidth / scrollDistance);
    
    nextBtn.disabled = state.index >= state.max - visibleCards;
}

// --- NEW ---
// Function to initialize all carousel buttons
function initSliders() {
    document.querySelectorAll('.carousel-nav .carousel-btn').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            const state = sliderState[category];
            
            if (button.classList.contains('next')) {
                state.index++;
            } else if (button.classList.contains('prev')) {
                state.index--;
            }
            
            updateSlider(category);
        });
    });

    // --- NEW ---
    // Re-calculate slider on window resize
    window.addEventListener('resize', () => {
        // Use a timeout to avoid spamming the resize event
        setTimeout(() => {
            updateSlider('content');
            updateSlider('all');
            updateSlider('observability');
            updateSlider('security');
        }, 200);
    });
}


/**
 * Helper function to construct the absolute URL for an integration icon.
 * The API returns an 'icons' array, not a single 'icon' field.
 * This function now correctly accesses the 'src' from the first element of that array.
 */
function getAbsoluteIconUrl(icons) {
    // Check if the icons array is valid and has at least one element
    if (!icons || !Array.isArray(icons) || icons.length === 0) {
        return ''; // Return empty string if no icons are available
    }

    // --- CORRECTED ---
    // Use the 'path' property which contains the full relative URL.
    const iconPath = icons[0].path;

    if (!iconPath) {
        return '';
    }
    if (iconPath.startsWith('http')) {
        return iconPath; // It's already an absolute URL
    }
    return `${EPR_URL}${iconPath}`;
}

// A hardcoded list of relevant Kibana versions.
// This is the correct approach since the API does not provide a version endpoint.
const KIBANA_VERSIONS = [
"9.2.0",
"9.1.0",
"9.0.0",
"8.19.0",
"8.18.0",
"8.17.0",
"8.16.0",
"8.15.0",
"8.14.0",
"8.13.0",
"8.12.0",
"8.11.0",
"8.10.0",
"8.9.0",
"8.8.0",
"8.7.0",
"8.6.0",
"8.5.0",
"8.4.0",
"8.3.0",
"8.2.0",
"8.1.0",
"8.0.0"
]

// Function to populate the Kibana version dropdown from the hardcoded list
function populateKibanaVersions() {
    const selector = document.getElementById('kibana-version-selector');
    const prereleaseToggle = document.getElementById('prerelease-toggle');
    if (!selector || !prereleaseToggle) return;

    selector.innerHTML = ''; // Clear any existing options

    KIBANA_VERSIONS.forEach(version => {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = version;
        selector.appendChild(option);
    });
    
    // Check for a stored version and set the dropdown to it
    const storedVersion = sessionStorage.getItem('kibanaVersion');
    if (storedVersion && KIBANA_VERSIONS.includes(storedVersion)) {
        selector.value = storedVersion;
    }
    
    // Set initial state of the toggle from session storage
    const storedPrerelease = sessionStorage.getItem('prerelease') === 'true';
    prereleaseToggle.checked = storedPrerelease;

    // Add event listener to handle version changes
    selector.addEventListener('change', () => {
        const newVersion = selector.value;
        sessionStorage.setItem('kibanaVersion', newVersion);

        // If on the homepage, reload the integrations.
        // If on the search page, you could optionally re-trigger the search.
        if (document.getElementById('all-integrations')) {
            loadHomepageIntegrations();
        } else if (document.getElementById('search-results')) {
            // Re-run the search with the new version
            loadSearchResults();
        }
    });
      // Add event listener for the prerelease toggle
    prereleaseToggle.addEventListener('change', () => {
        sessionStorage.setItem('prerelease', prereleaseToggle.checked);
        // Refresh the page to apply the new criteria everywhere
        window.location.reload();
    });
}


// Wait for the page to load
document.addEventListener('DOMContentLoaded', () => {
    
    // --- MODIFIED ---
    // Populate the Kibana versions on every page load
    populateKibanaVersions();

    // Check which page we're on and call the appropriate function
    if (document.getElementById('all-integrations')) {
        loadHomepageIntegrations(); 
        initSliders(); 
    }

    if (document.getElementById('content-integrations')) {
        initSliders(); 
    }

    if (document.getElementById('observability-integrations')) {
        initSliders(); 
    }
    
    if (document.getElementById('security-integrations')) {
        initSliders(); 
    }

    if (document.getElementById('search-results')) {
        loadSearchResults();
    }
    
    if (document.getElementById('integration-detail')) {
        loadIntegrationDetails();
    }

    if (document.getElementById('browse-grid')) {
        loadBrowsePage();
    }
});

/**
 * Creates an HTML card for a single integration
 * (Unchanged)
 */
function createIntegrationCard(pkg, kibanaVersion) {
    // Construct the absolute URL using the global SITE_BASE_URL variable.
    let detailUrl = `${SITE_BASE_URL}integration?pkg=${pkg.name}${kibanaVersion ? `&kibana_version=${kibanaVersion}` : ''}`;

    // Append the prerelease flag to the URL if it's active
    const includePrerelease = sessionStorage.getItem('prerelease') === 'true';
    if (includePrerelease) {
        detailUrl += '&prerelease=true';
    }

    return `
        <div class="integration-card">
            <div class="integration-card-header">
                <img src="${getAbsoluteIconUrl(pkg.icons)}" alt="${pkg.name} logo" class="integration-icon" onerror="this.style.display='none'">
                <h3>${pkg.title || pkg.name}</h3>
            </div>
            <p class="integration-version">v${pkg.version}</p>
            <p class="integration-desc">${pkg.description.substring(0, 100)}...</p>
            <a href="${detailUrl}" class="btn-details">Details</a>
        </div>
    `;
}

/**
 * Helper function to parse the API response (which can be an array or object)
 * (Unchanged)
 */
function parseApiResponse(data) {
    // 1. Elasticsearch object structure (data.hits.hits)
    if (data && data.hits && data.hits.hits) {
        return data.hits.hits.map(hit => hit._source);
    } 
    // 2. Simple Array structure (Array.isArray)
    if (Array.isArray(data)) {
        return data;
    }
    // 3. Array-like object structure (which caused errors before)
    if (typeof data === 'object' && data !== null && typeof data.length === 'number') {
         return Array.from(data); // Convert array-like to true array
    }
    
    console.error("Unexpected API response structure:", data);
    return []; 
}

/**
 * Helper function to fetch integrations for a specific category and display them
 * Filters by the selected Kibana version.
 */
// async function fetchAndDisplayCategory(category, container, kibanaVersion, includePrerelease) {
async function fetchAndDisplay(filterType, filterValue, container, kibanaVersion, includePrerelease) {
    try {
        // Build the URL with the Kibana version parameter
        // const apiUrl = `${EPR_URL}/search?category=${category}&kibana.version=${kibanaVersion}`;
        let apiUrl = `${EPR_URL}/search?kibana.version=${kibanaVersion}`;
        // if (category !== 'all') {
        //     apiUrl += `&category=${category}`;
        // }
        if (filterType === 'category' && filterValue !== 'all') {
            apiUrl += `&category=${filterValue}`;
        } else if (filterType === 'type') {
            apiUrl += `&type=${filterValue}`;
        }
        if (includePrerelease) {
            apiUrl += '&prerelease=true';
        }
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const packages = parseApiResponse(data);

        // Shuffle the array and take the first 10
        const randomPackages = shuffleArray(packages).slice(0, 10);

        // Clear loading text
        container.innerHTML = '';

        if (randomPackages.length === 0) {
            container.innerHTML = '<p>No integrations found in this category.</p>';
            return;
        }

        // Iterate over the 5 random packages
        randomPackages.forEach(pkg => {
            if (pkg) {
                // Pass the kibanaVersion to the card creator
                container.innerHTML += createIntegrationCard(pkg, kibanaVersion);
            }
        });

        // Update the slider state for this category
        sliderState[filterValue].max = randomPackages.length;        
        
        requestAnimationFrame(() => {
            updateSlider(filterValue);
        }, 100);

    } catch (error) {
        console.error(`Failed to load ${filterValue} integrations:`, error);
        container.innerHTML = `<p class="error">Could not load ${filterValue} integrations.</p>`;
    }
}

/**
 * 1. HOMEPAGE: Fetches all integrations and sorts them by category
 * Reads the selected Kibana version and passes it to the fetch helpers.
 */
async function loadHomepageIntegrations() {
    const obsContainer = document.getElementById('observability-integrations');
    const secContainer = document.getElementById('security-integrations');
    const contContainer = document.getElementById('content-integrations');
    const allContainer = document.getElementById('all-integrations');
    const versionSelector = document.getElementById('kibana-version-selector');
    const prereleaseToggle = document.getElementById('prerelease-toggle');
    const selectedVersion = versionSelector ? versionSelector.value : KIBANA_VERSIONS[0];
    const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;

    // Store the selected version so it persists across pages
    sessionStorage.setItem('kibanaVersion', selectedVersion);

    // Reset carousel state and show loading message
    Object.keys(sliderState).forEach(cat => {
        sliderState[cat].index = 0;
        updateSlider(cat);
    });
    if(contContainer) contContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`; // <-- ADD THIS
    if(obsContainer) obsContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`;
    if(secContainer) secContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`;
    if(allContainer) allContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`; // <-- ADD THIS

    // Run all fetches in parallel, passing the selected version
    fetchAndDisplay('all', 'all', allContainer, selectedVersion, includePrerelease);
    fetchAndDisplay('category', 'observability', obsContainer, selectedVersion, includePrerelease);
    fetchAndDisplay('category', 'security', secContainer, selectedVersion, includePrerelease);
    fetchAndDisplay('type', 'content', contContainer, selectedVersion, includePrerelease); // <-- ADD THIS (using 'type')
}

/**
 * 2. SEARCH PAGE: Fetches results for a specific query
 */
async function loadSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    const title = document.getElementById('search-title');
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const kibanaVersion = sessionStorage.getItem('kibanaVersion');
    const prerelease = sessionStorage.getItem('prerelease') === 'true';

    if (!query) {
        title.textContent = 'Please enter a search term.';
        return;
    }

    title.textContent = `Search results for "${query}"`;
    if (kibanaVersion) {
        title.textContent += ` (Kibana v${kibanaVersion})`;
    }
    if (prerelease) {
        title.textContent += ' [Pre-releases]';
    }

    try {
        let apiUrl = `${EPR_URL}/search?kibana.version=${kibanaVersion}`;
        if (prerelease) {
            apiUrl += '&prerelease=true';
        }
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const versionFilteredPackages = parseApiResponse(await response.json());

        // 2. Filter the results on the client-side to find where the name "contains" the query.
        const lowerCaseQuery = query.toLowerCase();
        const packages = versionFilteredPackages.filter(pkg => 
            (pkg.title || pkg.name).toLowerCase().includes(lowerCaseQuery)
        );

        resultsContainer.innerHTML = ''; 

        if (packages.length === 0) {
            resultsContainer.innerHTML = '<p>No integrations found.</p>';
            return;
        }

        packages.forEach(pkg => {
            if (pkg) {
                resultsContainer.innerHTML += createIntegrationCard(pkg, kibanaVersion);
            }
        });

    } catch (error) {
        console.error('Failed to search:', error);
        resultsContainer.innerHTML = '<p class="error">Search failed. See console for details.</p>';
    }
}

/**
 * 3. DETAIL PAGE: Fetches info for one integration
 */
async function loadIntegrationDetails() {
    const detailContainer = document.getElementById('integration-detail');
    const urlParams = new URLSearchParams(window.location.search);
    const pkgName = urlParams.get('pkg');
    const kibanaVersion = urlParams.get('kibana_version');
    const prerelease = urlParams.get('prerelease') === 'true';

    if (!pkgName) {
        detailContainer.innerHTML = '<p class="error">No integration specified.</p>';
        return;
    }

    try {
        // Step 1: Find the correct package version that matches the Kibana version.
        let searchUrl = `${EPR_URL}/search?package=${encodeURIComponent(pkgName)}` + (kibanaVersion ? `&kibana.version=${kibanaVersion}` : '');
        if (prerelease) {
            searchUrl += '&prerelease=true';
        }
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Could not find a version of '${pkgName}' compatible with Kibana ${kibanaVersion}.`);

        const packages = parseApiResponse(await searchResponse.json());
        if (packages.length === 0) throw new Error(`No compatible version of '${pkgName}' found.`);
        
        const basePkg = packages[0];
        const correctVersion = basePkg.version;

        // Step 2: Fetch the full, detailed package info using the correct version.
        let pkg;
        const detailedResponse = await fetch(`${EPR_URL}/package/${encodeURIComponent(pkgName)}/${correctVersion}/`)
            .catch(() => null);

        if (detailedResponse && detailedResponse.ok) {
            pkg = await detailedResponse.json();
        } else {
            console.warn(`Could not load detailed info for ${pkgName} v${correctVersion}. Using summary data.`);
            pkg = basePkg;
        }
        
        // --- Build UI ---
        const leftSidebarHTML = `
            <aside class="detail-left-sidebar">
                <img src="${getAbsoluteIconUrl(pkg.icons)}" alt="${pkg.name} logo" class="detail-icon" onerror="this.style.display='none'">
                <h1>${pkg.title || pkg.name}</h1>
                <p class="version-display">v${pkg.version}</p>
                <p>${pkg.description}</p>
                <a href="${EPR_URL}/epr/${pkg.name}/${pkg.name}-${pkg.version}.zip" class="btn-download" download>Download</a>
            </aside>
        `;

        const centerContentHTML = `
            <main class="detail-center-content">
                <div id="readme-content" class="readme-container"><p class="loading">Loading README...</p></div>
                <div id="datastreams-section" class="data-streams-list"></div>
            </main>
        `;

        const rightSidebarHTML = `
            <aside class="detail-right-sidebar">
                <div id="screenshots-section"></div>
            </aside>
        `;

        detailContainer.innerHTML = leftSidebarHTML + centerContentHTML + rightSidebarHTML;

        // --- Asynchronously Load and Render Content ---
        if (pkg.screenshots && pkg.screenshots.length > 0) {
            let screenshotIndex = 0;
            let imagesHTML = '';
            pkg.screenshots.forEach(ss => imagesHTML += `<img src="${EPR_URL}${ss.path}" alt="${ss.title || ''}">`);

            const screenshotsHTML = `
                <div class="screenshot-gallery">
                    <h3>Screenshots</h3>
                    <div class="screenshot-carousel">
                        <div class="screenshot-carousel-viewport">
                            <div class="screenshot-carousel-track" style="transform: translateX(0%);">
                                ${imagesHTML}
                            </div>
                        </div>
                        <div class="screenshot-nav">
                            <button id="ss-prev" disabled>&lt; Prev</button>
                            <span id="ss-counter">1 / ${pkg.screenshots.length}</span>
                            <button id="ss-next">${pkg.screenshots.length > 1 ? 'Next &gt;' : ''}</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('screenshots-section').innerHTML = screenshotsHTML;

            const track = document.querySelector('.screenshot-carousel-track');
            const prevBtn = document.getElementById('ss-prev');
            const nextBtn = document.getElementById('ss-next');
            const counter = document.getElementById('ss-counter');

            const updateScreenshotCarousel = () => {
                track.style.transform = `translateX(-${screenshotIndex * 100}%)`;
                prevBtn.disabled = screenshotIndex === 0;
                nextBtn.disabled = screenshotIndex === pkg.screenshots.length - 1;
                counter.textContent = `${screenshotIndex + 1} / ${pkg.screenshots.length}`;
            };

            prevBtn.addEventListener('click', () => { if (screenshotIndex > 0) { screenshotIndex--; updateScreenshotCarousel(); }});
            nextBtn.addEventListener('click', () => { if (screenshotIndex < pkg.screenshots.length - 1) { screenshotIndex++; updateScreenshotCarousel(); }});
        }

        const readmePath = pkg.readme || `/package/${pkg.name}/${pkg.version}/docs/README.md`;
        fetch(`${EPR_URL}${readmePath}`)
            .then(res => res.ok ? res.text() : Promise.reject())
            .then(text => {
                document.getElementById('readme-content').innerHTML = `<h3>README</h3>${marked.parse(text)}`;
            }).catch(() => document.getElementById('readme-content').innerHTML = '');

        if (pkg.data_streams && pkg.data_streams.length > 0) {
            let dsHTML = '<h3>Data Streams</h3>';
            document.getElementById('datastreams-section').innerHTML = dsHTML;
            pkg.data_streams.forEach(async (ds, index) => {
                const streamElement = document.createElement('div');
                streamElement.className = 'data-stream-item';
                streamElement.innerHTML = `<h4>${ds.title || ds.dataset}</h4><p>Type: ${ds.type} | Dataset: ${ds.dataset}</p><div id="json-viewer-${index}" class="json-viewer" style="display:none;"></div>`;
                
                streamElement.addEventListener('click', async () => {
                    const jsonViewer = document.getElementById(`json-viewer-${index}`);
                    if (jsonViewer.style.display === 'none') {
                        try {
                            const jsonPath = `/package/${pkg.name}/${pkg.version}/data_stream/${ds.dataset}/sample_event.json`;
                            const res = await fetch(`${EPR_URL}${jsonPath}`);
                            if (!res.ok) throw new Error();
                            const json = await res.json();
                            jsonViewer.innerHTML = `<pre>${JSON.stringify(json, null, 2)}</pre>`;
                            jsonViewer.style.display = 'block';
                        } catch {
                            jsonViewer.innerHTML = '<p class="error">Sample event not available.</p>';
                            jsonViewer.style.display = 'block';
                        }
                    } else {
                        jsonViewer.style.display = 'none';
                    }
                });
                document.getElementById('datastreams-section').appendChild(streamElement);
            });
        }

    } catch (error) {
        console.error(`Failed to load integration details for '${pkgName}':`, error);
        detailContainer.innerHTML = `<p class="error">Could not find integration: ${pkgName}. Details: ${error.message}</p>`;
    }
}

/**
 * 4. BROWSE PAGE: Fetches all integrations and categories for client-side filtering
 */
async function loadBrowsePage() {
    const grid = document.getElementById('browse-grid');
    const categoryFilters = document.getElementById('category-filters');
    const textFilter = document.getElementById('text-filter');
    const ownerFilterContainer = document.getElementById('owner-filters');
    const title = document.getElementById('browse-title');

    let allPackages = [];
    let activeFilters = {
        text: '',
        owner: 'all',
        categories: new Set(),
        type: 'all',
        currentPage: 1,
        itemsPerPage: 50
    };

    const urlParams = new URLSearchParams(window.location.search);
    const preselectedCategory = urlParams.get('category');
    if (preselectedCategory) {
        activeFilters.categories.add(preselectedCategory);
    }
    const preselectedType = urlParams.get('type');
    if (preselectedType) {
        activeFilters.type = preselectedType;
    }

    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        activeFilters.text = searchQuery.toLowerCase();
        textFilter.value = searchQuery;
    }

    const paginationControls = document.getElementById('pagination-controls');

    const renderPagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / activeFilters.itemsPerPage);
        const currentPage = activeFilters.currentPage;
        paginationControls.innerHTML = ''; // Clear old buttons

        if (totalPages <= 1) return; // No pagination needed

        // --- Helper to create a button ---
        const createButton = (page, text, isDisabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = 'pagination-btn';
            btn.textContent = text || page;
            if (isDisabled) btn.disabled = true;
            if (isActive) btn.classList.add('active');
            
            btn.addEventListener('click', () => {
                activeFilters.currentPage = page;
                applyFilters();
                // Scroll to the top of the grid
                document.getElementById('browse-title').scrollIntoView({ behavior: 'smooth' });
            });
            return btn;
        };

        // --- "Prev" Button ---
        paginationControls.appendChild(createButton(currentPage - 1, '< Prev', currentPage === 1));
        
        // --- Page Number Buttons (with ellipsis) ---
        let showEllipsisStart = false;
        let showEllipsisEnd = false;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationControls.appendChild(createButton(i, null, false, i === currentPage));
            } else if (i < currentPage - 2 && !showEllipsisStart) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationControls.appendChild(ellipsis);
                showEllipsisStart = true;
            } else if (i > currentPage + 2 && !showEllipsisEnd) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationControls.appendChild(ellipsis);
                showEllipsisEnd = true;
            }
        }

        // --- "Next" Button ---
        paginationControls.appendChild(createButton(currentPage + 1, 'Next >', currentPage === totalPages));
    };
    // --- END OF NEW FUNCTION ---


    const applyFilters = () => {
        const kibanaVersion = sessionStorage.getItem('kibanaVersion');
        const prerelease = sessionStorage.getItem('prerelease') === 'true'; // --- MODIFIED: Get prerelease state ---

        // --- MODIFIED: Add dynamic title logic ---
        let titleText = 'All Integrations'; // Default title
        if (activeFilters.type === 'content') {
            titleText = 'Dashboard & Content';
        } else if (activeFilters.type === 'integration') {
            titleText = 'Integrations';
        }
        // Set the title text, including prerelease status
        title.textContent = `${titleText} (Kibana v${kibanaVersion}${prerelease ? ', Pre-releases' : ''})`;
        // --- END MODIFICATION ---

        const filteredPackages = allPackages.filter(pkg => {
            const textMatch = activeFilters.text === '' || (pkg.title || pkg.name).toLowerCase().includes(activeFilters.text);
            const categoryMatch = activeFilters.categories.size === 0 || (pkg.categories && pkg.categories.some(cat => activeFilters.categories.has(cat)));
            const ownerMatch = activeFilters.owner === 'all' || (pkg.owner && pkg.owner.type === activeFilters.owner);
            const typeMatch = activeFilters.type === 'all' || (pkg.type && pkg.type === activeFilters.type);
            return textMatch && categoryMatch && ownerMatch && typeMatch;
        });

        // --- 3. Slicing Logic ---
        const start = (activeFilters.currentPage - 1) * activeFilters.itemsPerPage;
        const end = start + activeFilters.itemsPerPage;
        const paginatedPackages = filteredPackages.slice(start, end);

        // grid.innerHTML = '';
        // if (filteredPackages.length === 0) {
        //     grid.innerHTML = '<p>No integrations match your filters.</p>';
        //     return;
        // }
        // filteredPackages.forEach(pkg => {
        //     grid.innerHTML += createIntegrationCard(pkg, kibanaVersion);
        // });
        // --- 4. Render Logic (Updated) ---
        grid.innerHTML = '';
        if (filteredPackages.length === 0) {
            grid.innerHTML = '<p>No integrations match your filters.</p>';
        } else {
            paginatedPackages.forEach(pkg => {
                grid.innerHTML += createIntegrationCard(pkg, kibanaVersion);
            });
        }
        
        // --- 5. Render Pagination (NEW) ---
        renderPagination(filteredPackages.length);
    };

    try {
        const kibanaVersion = sessionStorage.getItem('kibanaVersion');
        const prerelease = sessionStorage.getItem('prerelease') === 'true';

        let apiUrl = `${EPR_URL}/search?kibana.version=${kibanaVersion}`;
        if (prerelease) {
            apiUrl += '&prerelease=true';
        }

        const pkgResponse = await fetch(apiUrl);
        // --- ADDED: Check if response is OK ---
        if (!pkgResponse.ok) {
            throw new Error(`Failed to fetch package list: ${pkgResponse.status}`);
        }
        allPackages = await parseApiResponse(await pkgResponse.json());
        allPackages.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));

        // --- Owner Filters ---
        const ownerTypes = ['all', ...new Set(allPackages.map(pkg => pkg.owner ? pkg.owner.type : null).filter(Boolean))];
        ownerFilterContainer.innerHTML = '';
        ownerTypes.forEach(ownerType => {
            const capitalizedOwner = ownerType.charAt(0).toUpperCase() + ownerType.slice(1);
            const itemHTML = `
                <div class="owner-filter-item">
                    <input type="radio" id="owner-${ownerType}" name="owner-filter" value="${ownerType}" ${ownerType === 'all' ? 'checked' : ''}>
                    <label for="owner-${ownerType}">${capitalizedOwner}</label>
                </div>
            `;
            ownerFilterContainer.innerHTML += itemHTML;
        });
        ownerFilterContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                activeFilters.owner = e.target.value;
                activeFilters.currentPage = 1;
                applyFilters();
            });
        });

        // --- Add listener for Type filters ---
        document.querySelectorAll('input[name="type-filter"]').forEach(radio => {
            // Set the default checked state from URL params
            if (radio.value === activeFilters.type) {
                radio.checked = true;
            }
            
            radio.addEventListener('change', (e) => {
                activeFilters.type = e.target.value;
                activeFilters.currentPage = 1;
                applyFilters();
            });
        });

        // --- Category Filters ---
        const allCategories = [...new Set(allPackages.flatMap(p => p.categories || []))].sort();
        const contentItem = document.createElement('div');
        contentItem.className = 'category-filter-item';
        contentItem.innerHTML = `
            <input type="checkbox" id="cat-content" value="content" ${preselectedType === 'content' ? 'checked' : ''}>
            <label for="cat-content">Content</label>
        `;
        categoryFilters.appendChild(contentItem); 
        categoryFilters.innerHTML = '';
        allCategories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-filter-item';
            item.innerHTML = `
                <input type="checkbox" id="cat-${cat}" value="${cat}" ${preselectedCategory === cat ? 'checked' : ''}>
                <label for="cat-${cat}">${cat}</label>
            `;
            categoryFilters.appendChild(item);
        });
        categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    activeFilters.categories.add(e.target.value);
                } else {
                    activeFilters.categories.delete(e.target.value);
                }
                activeFilters.currentPage = 1;
                applyFilters();
            });
        });
        // --- Text Filter ---
        textFilter.addEventListener('input', (e) => {
            activeFilters.text = e.target.value.toLowerCase();
            activeFilters.currentPage = 1;
            applyFilters();
        });

        // Initial render
        applyFilters();

    } catch (error) {
        grid.innerHTML = '<p class="error">Could not load integrations.</p>';
        console.error("Error loading browse page:", error);
    }
}
