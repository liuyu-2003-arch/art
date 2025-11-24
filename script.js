// --- DOM Elements ---
const artContainer = document.getElementById('art-container');
const similarBtn = document.getElementById('similar-btn');

// --- State ---
let artworks = []; // 存储所有已加载的艺术品数据
let currentArtIndex = 0;
const loadedArtIds = new Set(); // 避免重复渲染
let isLoading = false;
let currentQuery = null; // 记录当前是在"随机模式"还是"搜索模式"

// --- API Configuration ---
const API_BASE_URL = "https://api.artic.edu/api/v1/artworks";
const API_SEARCH_URL = "https://api.artic.edu/api/v1/artworks/search";
const IMAGE_URL_TEMPLATE = "https://www.artic.edu/iiif/2/{imageId}/full/843,/0/default.jpg";
const TRANSLATION_API_URL = "https://api.mymemory.translated.net/get";

// --- Utility Functions ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

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
 * 获取艺术品数据
 * @param {string|null} query - 搜索关键词（如艺术家名字），传 null 则为随机模式
 * @param {boolean} isAppend - 是否是追加模式（下滑加载更多时为 true）
 */
async function fetchArtPieces(query = null, isAppend = false) {
    if (isLoading) return;
    isLoading = true;

    // 如果不是追加模式（即完全重新刷新），则清空当前内容
    if (!isAppend) {
        showLoadingIndicator(); // 只有全屏加载时才显示中间的大loading
        artContainer.innerHTML = '';
        loadedArtIds.clear();
        artworks = [];
        currentArtIndex = 0;
        currentQuery = query; // 更新当前模式
    }

    try {
        let url;
        // 策略调整：随机模式下，每次只取 15 张 (limit=15)，但来自完全随机的页码
        // 这样当你滑完 15 张，下次加载会自动去另一个随机页码，风格就会大变
        const limit = query ? 50 : 15;

        if (query) {
            // 搜索模式 (查找相似)
            url = `${API_SEARCH_URL}?q=${encodeURIComponent(query)}&fields=id,title,artist_display,image_id,short_description&limit=${limit}`;
        } else {
            // 随机模式：随机页码 (1-1000页)
            const randomPage = Math.floor(Math.random() * 1000) + 1;
            url = `${API_BASE_URL}?fields=id,title,artist_display,image_id,short_description&limit=${limit}&page=${randomPage}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API 请求失败`);

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
            shuffleArray(fetchedArtworks); // 再次打乱当前批次

            // 将新数据追加到主数组
            const startIndex = artworks.length;
            artworks = artworks.concat(fetchedArtworks);

            // 如果是初始加载，立即渲染前两张
            if (!isAppend) {
                loadArtByIndex(0);
                loadArtByIndex(1);
                preloadImages(0);
                hideLoadingIndicator();
            } else {
                // 如果是追加加载，尝试预加载接下来的图片
                preloadImages(currentArtIndex);
            }
        } else {
            if (!isAppend && query) fetchArtPieces(null); // 搜不到就回退到随机
            else if (!isAppend) showError("未能加载艺术品");
        }
    } catch (error) {
        console.error("Fetch failed:", error);
        if (!isAppend) showError(error.message);
    } finally {
        isLoading = false;
    }
}

function createArtSlide(artPiece) {
    const slide = document.createElement('div');
    slide.className = 'art-slide';
    slide.dataset.id = artPiece.id;

    const wrapper = document.createElement('div');
    wrapper.className = 'art-content-wrapper';

    const img = document.createElement('img');
    img.src = artPiece.src;
    img.alt = artPiece.title;
    img.onload = () => wrapper.style.opacity = 1;
    img.onerror = () => {
        slide.remove(); // 图片挂了就移除dom
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
    wrapper.style.opacity = 0;

    slide.appendChild(wrapper);

    // 异步翻译
    if (artPiece.title) translateText(artPiece.title).then(t => title.textContent = t);
    if (artPiece.description) translateText(artPiece.description).then(t => description.textContent = t);

    return slide;
}

function loadArtByIndex(index) {
    if (index < 0 || index >= artworks.length) return;

    const artPiece = artworks[index];
    // 检查是否已经存在于DOM中，避免重复添加
    if (!artPiece || loadedArtIds.has(artPiece.id)) return;

    const slide = createArtSlide(artPiece);

    // 简单的插入逻辑：直接追加到最后
    // 因为 infinite scroll 主要是向下追加，复杂的插入排序在动态追加场景下容易出错
    artContainer.appendChild(slide);

    loadedArtIds.add(artPiece.id);
}

function handleSimilarClick() {
    similarBtn.style.transform = 'scale(0.9)';
    setTimeout(() => similarBtn.style.transform = '', 150);

    if (artworks.length === 0 || isLoading) return;

    const currentArt = artworks[currentArtIndex];
    if (currentArt && currentArt.author !== "未知艺术家") {
        fetchArtPieces(currentArt.author, false); // false 表示重置列表，开始搜索
    } else {
        fetchArtPieces(null, false);
    }
}

function preloadImages(index) {
    // 预加载下两张
    if (index + 1 < artworks.length) new Image().src = artworks[index + 1].src;
    if (index + 2 < artworks.length) new Image().src = artworks[index + 2].src;
}

function updateCurrentArtOnScroll() {
    const scrollCenter = artContainer.scrollTop + artContainer.clientHeight / 2;
    const slides = [...artContainer.children].filter(c => c.classList.contains('art-slide'));

    const currentSlide = slides.find(s => scrollCenter >= s.offsetTop && scrollCenter < s.offsetTop + s.offsetHeight);

    if (currentSlide) {
        const newArtId = parseInt(currentSlide.dataset.id, 10);
        const newIndex = artworks.findIndex(a => a.id === newArtId);

        if (newIndex !== -1 && newIndex !== currentArtIndex) {
            currentArtIndex = newIndex;

            // 动态加载下一张（如果还没渲染）
            loadArtByIndex(currentArtIndex + 1);
            preloadImages(currentArtIndex);

            // --- 核心修改：无限滚动逻辑 ---
            // 如果处于随机模式 (!currentQuery)，且快滑到底部了（倒数第3张），加载新的一批
            if (!currentQuery && currentArtIndex >= artworks.length - 3) {
                console.log("接近底部，加载新的一批随机艺术品...");
                fetchArtPieces(null, true); // true 表示追加模式
            }
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

// --- Keyboard Logic ---
function handleKeyboardInput(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            artContainer.scrollBy({ top: artContainer.clientHeight, behavior: 'smooth' });
            break;

        case 'ArrowUp':
            e.preventDefault();
            artContainer.scrollBy({ top: -artContainer.clientHeight, behavior: 'smooth' });
            break;

        case 'ArrowLeft':
        case 'ArrowRight':
            e.preventDefault();
            handleSimilarClick();
            break;
    }
}

// --- Event Listeners ---
similarBtn.addEventListener('click', handleSimilarClick);
artContainer.addEventListener('scroll', updateCurrentArtOnScroll, { passive: true });
document.addEventListener('keydown', handleKeyboardInput);

// --- Initial Load ---
fetchArtPieces();