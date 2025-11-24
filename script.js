// --- DOM Elements ---
const artContainer = document.getElementById('art-container');
const similarBtn = document.getElementById('similar-btn');

// --- State ---
let artworks = []; // This will be populated from the API
let currentArtIndex = 0;
const loadedArtIds = new Set(); // Keep track of which art pieces (by ID) are in the DOM
let isLoading = false;

// --- API Configuration ---
const API_BASE_URL = "https://api.artic.edu/api/v1/artworks";
const API_SEARCH_URL = "https://api.artic.edu/api/v1/artworks/search";
const IMAGE_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{imageId}/full/843,/0/default.jpg";
const TRANSLATION_API_URL = "https://api.mymemory.translated.net/get";

// --- Utility Functions ---

/**
 * Shuffles an array in place.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Translates text from English to Chinese.
 * @param {string} text The text to translate.
 * @returns {Promise<string>} The translated text.
 */
async function translateText(text) {
    if (!text || !text.trim()) return text;
    try {
        const response = await fetch(`${TRANSLATION_API_URL}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`);
        if (!response.ok) return text;
        const data = await response.json();
        return data.responseData?.translatedText || text;
    } catch (error) {
        console.error("Translation API failed:", error);
        return text;
    }
}

// --- Core Functions ---

/**
 * Fetches art pieces from the API, optionally based on a query.
 * @param {string|null} query An optional search query (e.g., artist's name).
 */
async function fetchArtPieces(query = null) {
    if (isLoading) return;
    isLoading = true;
    showLoadingIndicator();
    artContainer.innerHTML = ''; // Clear previous content
    loadedArtIds.clear();
    currentArtIndex = 0;

    try {
        let url;
        if (query) {
            url = `${API_SEARCH_URL}?q=${encodeURIComponent(query)}&fields=id,title,artist_display,image_id,short_description&limit=100`;
        } else {
            const randomPage = Math.floor(Math.random() * 100) + 1;
            url = `${API_BASE_URL}?fields=id,title,artist_display,image_id,short_description&limit=100&page=${randomPage}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API 请求失败，状态码： ${response.status}`);
        
        const data = await response.json();
        
        let fetchedArtworks = data.data
            .filter(item => item.image_id)
            .map(item => ({
                id: item.id,
                src: IMAGE_URL_TEMPLATE.replace('{imageId}', item.image_id),
                author: item.artist_display ? item.artist_display.split('\n')[0] : "未知艺术家",
                title: item.title || "无题",
                description: item.short_description || null
            }));

        if (fetchedArtworks.length > 0) {
            shuffleArray(fetchedArtworks);
            artworks = fetchedArtworks;
            loadArtByIndex(0);
            loadArtByIndex(1);
            preloadImages(0);
        } else {
            if (query) fetchArtPieces(); 
            else showError("未能加载艺术品，请稍后再试。");
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
 * Creates and returns a new art slide element.
 */
function createArtSlide(artPiece) {
    const slide = document.createElement('div');
    slide.className = 'art-slide';
    slide.dataset.id = artPiece.id;

    const wrapper = document.createElement('div');
    wrapper.className = 'art-content-wrapper';

    const img = document.createElement('img');
    img.src = artPiece.src;
    img.alt = artPiece.title;
    img.onload = () => wrapper.style.opacity = 1; // Fade in the whole wrapper
    img.onerror = () => {
        console.warn(`Image failed to load, removing slide: ${artPiece.src}`);
        slide.remove();
    };

    const artInfo = document.createElement('div');
    artInfo.className = 'art-info';

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
    if (artPiece.description) artInfo.appendChild(description);
    
    wrapper.appendChild(img);
    wrapper.appendChild(artInfo);
    wrapper.style.opacity = 0; // Initially hide for fade-in

    slide.appendChild(wrapper);

    // --- Translate content after creating the slide ---
    if (artPiece.title) translateText(artPiece.title).then(t => title.textContent = t);
    if (artPiece.description) translateText(artPiece.description).then(t => description.textContent = t);

    return slide;
}

/**
 * Loads an art piece into the DOM.
 */
function loadArtByIndex(index) {
    if (index < 0 || index >= artworks.length) return;
    
    const artPiece = artworks[index];
    if (!artPiece || loadedArtIds.has(artPiece.id)) return;

    const slide = createArtSlide(artPiece);
    
    const slides = [...artContainer.children];
    const targetIndex = artworks.findIndex(a => a.id === artPiece.id);
    const nextSlide = slides.find(s => artworks.findIndex(a => a.id === parseInt(s.dataset.id)) > targetIndex);
    
    if (nextSlide) {
        artContainer.insertBefore(slide, nextSlide);
    } else {
        artContainer.appendChild(slide);
    }
    
    loadedArtIds.add(artPiece.id);
}

/**
 * Handles the "Similar" button click.
 */
function handleSimilarClick() {
    // 添加一个视觉反馈动画
    similarBtn.style.transform = 'scale(0.9)';
    setTimeout(() => similarBtn.style.transform = '', 150);

    if (artworks.length === 0 || isLoading) return;

    const currentArt = artworks[currentArtIndex];
    if (currentArt && currentArt.author !== "未知艺术家") {
        fetchArtPieces(currentArt.author);
    } else {
        fetchArtPieces();
    }
}

/**
 * Preloads adjacent images.
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
    const currentSlide = [...artContainer.children].find(s => scrollCenter >= s.offsetTop && scrollCenter < s.offsetTop + s.offsetHeight);

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

// --- NEW: Keyboard Navigation Logic ---
function handleKeyboardInput(e) {
    // 忽略在输入框内的按键（如果有的话）
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault(); // 防止默认的页面滚动
            // 向下滚动一个视口高度
            artContainer.scrollBy({ top: artContainer.clientHeight, behavior: 'smooth' });
            break;

        case 'ArrowUp':
            e.preventDefault();
            // 向上滚动一个视口高度
            artContainer.scrollBy({ top: -artContainer.clientHeight, behavior: 'smooth' });
            break;

        case 'ArrowLeft':
        case 'ArrowRight':
            e.preventDefault();
            // 左右键都触发"查找相似"功能
            handleSimilarClick();
            break;
    }
}

// --- Event Listeners ---
similarBtn.addEventListener('click', handleSimilarClick);
artContainer.addEventListener('scroll', updateCurrentArtOnScroll, { passive: true });
document.addEventListener('keydown', handleKeyboardInput); // 添加全局键盘监听

// --- Initial Load ---
fetchArtPieces();