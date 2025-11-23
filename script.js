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
const TRANSLATION_API_URL = "https://api.mymemory.translated.net/get";

// --- Functions ---

/**
 * Translates text from English to Chinese using the MyMemory API.
 * @param {string} text The text to translate.
 * @returns {Promise<string>} The translated text, or the original text if translation fails.
 */
async function translateText(text) {
    if (!text || !text.trim()) {
        return text;
    }
    try {
        const response = await fetch(`${TRANSLATION_API_URL}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`);
        if (!response.ok) {
            return text; // Return original text on API error
        }
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return text; // Return original if translation not found
    } catch (error) {
        console.error("Translation API failed:", error);
        return text; // Return original on network failure
    }
}

/**
 * Fetches art pieces from the Art Institute of Chicago API.
 */
async function fetchArtPieces() {
    if (isLoading) return;
    isLoading = true;
    showLoadingIndicator();

    try {
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const url = `${API_BASE_URL}?fields=id,title,artist_display,image_id,short_description&limit=100&page=${randomPage}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 请求失败，状态码： ${response.status}`);
        }
        const data = await response.json();
        
        artworks = data.data
            .filter(item => item.image_id)
            .map(item => ({
                id: item.id,
                src: IMAGE_URL_TEMPLATE.replace('{imageId}', item.image_id),
                author: item.artist_display ? item.artist_display.split('\n')[0] : "未知艺术家",
                title: item.title || "无题",
                description: item.short_description || null
            }));

        if (artworks.length > 0) {
            loadArtByIndex(0);
            loadArtByIndex(1);
            preloadImages(0);
        } else {
            fetchArtPieces();
        }
    } catch (error) {
        console.error("获取艺术品失败:", error);
        showError(error.message);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

/**
 * Creates and returns a new art slide element with original text.
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
    img.onload = () => slide.querySelector('.art-info').style.opacity = 1;
    img.onerror = () => {
        console.warn(`Image failed to load, removing slide: ${artPiece.src}`);
        slide.remove(); // Remove the slide if the image fails to load
    };

    const artInfo = document.createElement('div');
    artInfo.className = 'art-info';
    artInfo.style.opacity = 0;

    const title = document.createElement('h3');
    title.className = 'art-title';
    title.textContent = artPiece.title;

    const author = document.createElement('p');
    author.className = 'art-author';
    author.textContent = artPiece.author;
    
    const description = document.createElement('p');
    description.className = 'art-description';
    description.textContent = artPiece.description || '';

    artInfo.appendChild(title);
    artInfo.appendChild(author);
    if (artPiece.description) {
        artInfo.appendChild(description);
    }
    
    slide.appendChild(img);
    slide.appendChild(artInfo);

    return slide;
}

/**
 * Loads an art piece, inserts it into the DOM, and then translates its content.
 * @param {number} index - The index of the art piece to load.
 */
function loadArtByIndex(index) {
    if (index < 0 || index >= artworks.length) return;
    
    const artPiece = artworks[index];
    if (!artPiece || loadedArtIds.has(artPiece.id)) return;

    const slide = createArtSlide(artPiece);
    
    const slides = [...artContainer.children];
    const nextSlide = slides.find(s => artworks.findIndex(a => a.id === parseInt(s.dataset.id)) > index);
    
    if (nextSlide) {
        artContainer.insertBefore(slide, nextSlide);
    } else {
        artContainer.appendChild(slide);
    }
    
    loadedArtIds.add(artPiece.id);

    // --- Translate content after inserting into DOM ---
    const titleElement = slide.querySelector('.art-title');
    if (titleElement && artPiece.title) {
        translateText(artPiece.title).then(translated => {
            titleElement.textContent = translated;
        });
    }

    const descriptionElement = slide.querySelector('.art-description');
    if (descriptionElement && artPiece.description) {
        translateText(artPiece.description).then(translated => {
            descriptionElement.textContent = translated;
        });
    }
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
    }
}

/**
 * Preloads images for a smoother experience.
 * @param {number} index - The current art index.
 */
function preloadImages(index) {
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
    artContainer.appendChild(indicator);
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) indicator.remove();
}

function showError(message) {
    artContainer.innerHTML = `<div class="art-slide" style="color: #ff6b6b;">错误： ${message}</div>`;
}

// --- Event Listeners ---
randomBtn.addEventListener('click', handleRandomClick);
artContainer.addEventListener('scroll', updateCurrentArtOnScroll, { passive: true });

// --- Initial Load ---
fetchArtPieces();
