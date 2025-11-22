// --- DOM Elements ---
const artContainer = document.getElementById('art-container');
const randomBtn = document.getElementById('random-btn');

// --- State ---
let artworks = []; // This will be populated from the API
let currentArtIndex = 0;
const loadedArtIds = new Set(); // Keep track of which art pieces (by ID) are in the DOM
let isLoading = false;

// --- API Configuration ---
const API_BASE_URL = "https://api.artic.edu/api/v1/artworks";
const IMAGE_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{imageId}/full/843,/0/default.jpg";

// --- Functions ---

/**
 * Fetches art pieces from the Art Institute of Chicago API.
 */
async function fetchArtPieces() {
    if (isLoading) return;
    isLoading = true;
    showLoadingIndicator();

    try {
        // To get more variety, we'll pick a random page from the first 100 pages of results.
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const url = `${API_BASE_URL}?fields=id,title,artist_display,image_id,short_description&limit=100&page=${randomPage}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        
        const fetchedArtworks = data.data
            .filter(item => item.image_id) // Ensure the artwork has an image
            .map(item => ({
                id: item.id,
                src: IMAGE_URL_TEMPLATE.replace('{imageId}', item.image_id),
                author: item.artist_display ? item.artist_display.split('\n')[0] : "Unknown Artist",
                title: item.title || "Untitled",
                description: item.short_description || null
            }));

        artworks = fetchedArtworks;
        
        if (artworks.length > 0) {
            // Initial load
            loadArtByIndex(0);
            loadArtByIndex(1); // Pre-load the next one
            preloadImages(0);
        } else {
            // If a random page has no images, try fetching again.
            fetchArtPieces();
        }

    } catch (error) {
        console.error("Failed to fetch artworks:", error);
        showError(error.message);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

/**
 * Creates and returns a new art slide element.
 * @param {object} artPiece - The art piece data.
 * @returns {HTMLElement} - The created art slide element.
 */
function createArtSlide(artPiece) {
    const slide = document.createElement('div');
    slide.className = 'art-slide';
    slide.dataset.id = artPiece.id;

    const img = document.createElement('img');
    img.src = artPiece.src;
    img.alt = artPiece.title;
    // Show info on image load
    img.onload = () => {
        slide.querySelector('.art-info').style.opacity = 1;
    };
    img.onerror = () => {
        // Handle cases where the image fails to load
        slide.querySelector('.art-info p').textContent = "Image not available.";
    };

    const artInfo = document.createElement('div');
    artInfo.className = 'art-info';
    artInfo.style.opacity = 0; // Initially hidden, revealed on image load

    const author = document.createElement('h3');
    author.textContent = artPiece.author;

    const title = document.createElement('p');
    title.textContent = artPiece.title;
    
    const description = document.createElement('p');
    description.className = 'art-description';
    description.textContent = artPiece.description || '';

    artInfo.appendChild(author);
    artInfo.appendChild(title);
    if (artPiece.description) {
        artInfo.appendChild(description);
    }
    
    slide.appendChild(img);
    slide.appendChild(artInfo);

    return slide;
}

/**
 * Loads a specific art piece into the container by its index in the artworks array.
 * @param {number} index - The index of the art piece to load.
 */
function loadArtByIndex(index) {
    if (index < 0 || index >= artworks.length) return;
    
    const artPiece = artworks[index];
    if (!artPiece || loadedArtIds.has(artPiece.id)) return;

    const slide = createArtSlide(artPiece);
    
    // Insert the slide in the correct order based on its index
    const slides = [...artContainer.children];
    const nextSlideIndex = slides.findIndex(s => {
        const slideArtIndex = artworks.findIndex(a => a.id === parseInt(s.dataset.id));
        return slideArtIndex > index;
    });

    if (nextSlideIndex !== -1) {
        artContainer.insertBefore(slide, slides[nextSlideIndex]);
    } else {
        artContainer.appendChild(slide);
    }
    
    loadedArtIds.add(artPiece.id);
}

/**
 * Handles the random button click.
 */
function handleRandomClick() {
    if (artworks.length === 0) return;

    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * artworks.length);
    } while (randomIndex === currentArtIndex);

    loadArtByIndex(randomIndex);

    const artPiece = artworks[randomIndex];
    const targetSlide = artContainer.querySelector(`.art-slide[data-id='${artPiece.id}']`);
    
    if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: 'smooth' });
        currentArtIndex = randomIndex;
    }
}

/**
 * Preloads images for a smoother experience.
 * @param {number} index - The current art index.
 */
function preloadImages(index) {
    // Preload next and previous
    if (index + 1 < artworks.length) new Image().src = artworks[index + 1].src;
    if (index - 1 >= 0) new Image().src = artworks[index - 1].src;
}

/**
 * Updates the current art index based on scroll position.
 */
function updateCurrentArtOnScroll() {
    const scrollCenter = artContainer.scrollTop + artContainer.clientHeight / 2;
    
    const currentSlide = [...artContainer.children].find(slide => 
        scrollCenter >= slide.offsetTop && scrollCenter < slide.offsetHeight + slide.offsetTop
    );

    if (currentSlide) {
        const newArtId = parseInt(currentSlide.dataset.id, 10);
        const newIndex = artworks.findIndex(a => a.id === newArtId);

        if (newIndex !== -1 && newIndex !== currentArtIndex) {
            currentArtIndex = newIndex;
            // Load adjacent art pieces for seamless scrolling
            loadArtByIndex(currentArtIndex - 1);
            loadArtByIndex(currentArtIndex + 1);
            preloadImages(currentArtIndex);
        }
    }
}

// --- UI Indicators ---

function showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.textContent = 'Loading Art...';
    artContainer.appendChild(indicator);
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showError(message) {
    artContainer.innerHTML = `<div class="art-slide" style="color: #ff6b6b;">Error: ${message}</div>`;
}


// --- Event Listeners ---
randomBtn.addEventListener('click', handleRandomClick);
artContainer.addEventListener('scroll', updateCurrentArtOnScroll, { passive: true });

// --- Initial Load ---
fetchArtPieces();
