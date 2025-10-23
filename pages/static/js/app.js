// --- NEW ---
// State object to track the current index and max items for each carousel
const sliderState = {
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
    
    // We adjust the offset based on scrolling one card at a time.
    const firstCard = container.querySelector('.integration-card');
    if (!firstCard) {
        return;
    }
    const cardWidth = firstCard.offsetWidth;
    const gapWidth = parseFloat(getComputedStyle(container).gap);
    const totalCardWidth = cardWidth + gapWidth;

    const offset = -state.index * totalCardWidth;
    container.style.transform = `translateX(${offset}px)`;

    // Update button disabled state
    prevBtn.disabled = state.index === 0;
    
    // To determine when to disable the 'next' button, we need to know how many cards are visible
    const viewportWidth = container.parentElement.clientWidth;
    const visibleCards = Math.floor(viewportWidth / totalCardWidth);
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
            updateSlider('observability');
            updateSlider('security');
        }, 200);
    });
}


/**
 * Helper function to construct the absolute URL for an integration icon.
 * --- CORRECTED ---
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
    return `https://epr.elastic.co${iconPath}`;
}

// --- NEW ---
// A hardcoded list of relevant Kibana versions.
// This is the correct approach since the API does not provide a version endpoint.
const KIBANA_VERSIONS = [
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

// --- NEW ---
// Function to populate the Kibana version dropdown from the hardcoded list
function populateKibanaVersions() {
    const selector = document.getElementById('kibana-version-selector');
    if (!selector) return;

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
    
    // Add event listener to handle version changes
    selector.addEventListener('change', () => {
        const newVersion = selector.value;
        sessionStorage.setItem('kibanaVersion', newVersion);

        // If on the homepage, reload the integrations.
        // If on the search page, you could optionally re-trigger the search.
        if (document.getElementById('obs-integrations')) {
            loadHomepageIntegrations();
        } else if (document.getElementById('search-results')) {
            // Re-run the search with the new version
            loadSearchResults();
        }
    });
}


// Wait for the page to load
document.addEventListener('DOMContentLoaded', () => {
    
    // --- MODIFIED ---
    // Populate the Kibana versions on every page load
    populateKibanaVersions();

    // Check which page we're on and call the appropriate function
    if (document.getElementById('obs-integrations')) {
        loadHomepageIntegrations(); 
        initSliders(); 
    }
    
    if (document.getElementById('search-results')) {
        loadSearchResults();
    }
    
    if (document.getElementById('integration-detail')) {
        loadIntegrationDetails();
    }
});

/**
 * Creates an HTML card for a single integration
 * (Unchanged)
 */
function createIntegrationCard(pkg, kibanaVersion) {
    // Construct the URL with the Kibana version
    const detailUrl = `integration?pkg=${pkg.name}${kibanaVersion ? `&kibana_version=${kibanaVersion}` : ''}`;

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
 * --- MODIFIED ---
 * Filters by the selected Kibana version.
 */
async function fetchAndDisplayCategory(category, container, kibanaVersion) {
    try {
        // Build the URL with the Kibana version parameter
        const apiUrl = `https://epr.elastic.co/search?category=${category}&kibana.version=${kibanaVersion}`;
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

        // --- NEW ---
        // Update the slider state for this category
        sliderState[category].max = randomPackages.length;
        updateSlider(category); // Call to set initial button states

    } catch (error) {
        console.error(`Failed to load ${category} integrations:`, error);
        container.innerHTML = `<p class="error">Could not load ${category} integrations.</p>`;
    }
}

/**
 * 1. HOMEPAGE: Fetches all integrations and sorts them by category
 * --- MODIFIED ---
 * Reads the selected Kibana version and passes it to the fetch helpers.
 */
async function loadHomepageIntegrations() {
    const obsContainer = document.getElementById('obs-integrations');
    const secContainer = document.getElementById('sec-integrations');
    const versionSelector = document.getElementById('kibana-version-selector');
    const prereleaseToggle = document.getElementById('prerelease-selector');

    const selectedVersion = versionSelector ? versionSelector.value : KIBANA_VERSIONS[0];
    const includePrerelease = prereleaseToggle ? prereleaseToggle.checked : false;

    // Store the selected version so it persists across pages
    sessionStorage.setItem('kibanaVersion', selectedVersion);
    sessionStorage.setItem('prerelease', includePrerelease);

    // Reset carousel state and show loading message
    Object.keys(sliderState).forEach(cat => {
        sliderState[cat].index = 0;
        updateSlider(cat);
    });
    obsContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`;
    secContainer.innerHTML = `<p class="loading">Loading integrations for Kibana v${selectedVersion}...</p>`;

    // Run all fetches in parallel, passing the selected version
    fetchAndDisplayCategory('observability', obsContainer, selectedVersion, includePrerelease);
    fetchAndDisplayCategory('security', secContainer, selectedVersion, includePrerelease);
}

/**
 * 2. SEARCH PAGE: Fetches results for a specific query (Req 6)
 * (Unchanged)
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
        // --- CORRECTED HYBRID APPROACH ---
        let apiUrl = `https://epr.elastic.co/search?kibana.version=${kibanaVersion}`;
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
 * 3. DETAIL PAGE: Fetches info for one integration (Req 5)
 * --- MODIFIED ---
 * Implements a more robust fallback mechanism. It attempts to fetch from the 
 * `/package/` endpoint. If that fetch promise is rejected (due to a CORS 
 * error on a 404, for example) or if the response is not 'ok', it proceeds 
 * to a fallback search.
 */
async function loadIntegrationDetails() {
    const detailContainer = document.getElementById('integration-detail');
    const urlParams = new URLSearchParams(window.location.search);
    const pkgName = urlParams.get('pkg');
    const kibanaVersion = urlParams.get('kibana_version');

    if (!pkgName) {
        detailContainer.innerHTML = '<p class="error">No integration specified.</p>';
        return;
    }

    try {
        // --- CORRECTED LOGIC ---
        // Step 1: Find the correct package version that matches the Kibana version.
        const searchUrl = `https://epr.elastic.co/search?package=${encodeURIComponent(pkgName)}` + (kibanaVersion ? `&kibana.version=${kibanaVersion}` : '');
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) throw new Error(`Could not find a version of '${pkgName}' compatible with Kibana ${kibanaVersion}.`);

        const packages = parseApiResponse(await searchResponse.json());
        if (packages.length === 0) throw new Error(`No compatible version of '${pkgName}' found.`);
        
        const basePkg = packages[0]; // This has the correct version we need
        const correctVersion = basePkg.version;

        // Step 2: Fetch the full, detailed package info using the correct version.
        let pkg;
        const detailedResponse = await fetch(`https://epr.elastic.co/package/${encodeURIComponent(pkgName)}/${correctVersion}/`)
            .catch(() => null);

        if (detailedResponse && detailedResponse.ok) {
            pkg = await detailedResponse.json();
        } else {
            console.warn(`Could not load detailed info for ${pkgName} v${correctVersion}. Using summary data.`);
            pkg = basePkg; // Fallback to the summary data if the detailed endpoint fails
        }
        
        // --- Build UI ---
        const leftSidebarHTML = `
            <aside class="detail-left-sidebar">
                <img src="${getAbsoluteIconUrl(pkg.icons)}" alt="${pkg.name} logo" class="detail-icon" onerror="this.style.display='none'">
                <h1>${pkg.title || pkg.name}</h1>
                <p class="version-display">v${pkg.version}</p>
                <p>${pkg.description}</p>
                <a href="https://epr.elastic.co/epr/${pkg.name}/${pkg.name}-${pkg.version}.zip" class="btn-download" download>Download</a>
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
            pkg.screenshots.forEach(ss => imagesHTML += `<img src="https://epr.elastic.co${ss.path}" alt="${ss.title || ''}">`);

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
        fetch(`https://epr.elastic.co${readmePath}`)
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
                            const res = await fetch(`https://epr.elastic.co${jsonPath}`);
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

