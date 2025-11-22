// --- Data ---
// In a real application, this would come from an API
const artPieces = [
    {
        id: 0,
        src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80",
        author: "现代艺术家",
        title: "《花瓶里的花》的现代演绎",
    },
    {
        id: 1,
        src: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2940&q=80",
        author: "街头艺术家",
        title: "色彩斑斓的抽象画",
    },
    {
        id: 2,
        src: "https://images.unsplash.com/photo-1506806782131-547c12c68a88?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2940&q=80",
        author: "未知",
        title: "沉思的雕塑",
    },
    {
        id: 3,
        src: "https://images.unsplash.com/photo-1578926375605-eaf75a6b42a6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "数字艺术家",
        title: "霓虹灯下的城市",
    },
    {
        id: 4,
        src: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2938&q=80",
        author: "文森特·梵高 (风格)",
        title: "旋转的星空",
    },
    {
        id: 5,
        src: "https://images.unsplash.com/photo-1512413216333-381751a4a81a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "古典主义",
        title: "宁静的肖像",
    },
    {
        id: 6,
        src: "https://images.unsplash.com/photo-1558865869-c93f6f8482af?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "印象派",
        title: "阳光下的风景",
    },
    {
        id: 7,
        src: "https://images.unsplash.com/photo-1579965342575-1524a1e3b3af?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "超现实主义",
        title: "梦境的融合",
    },
    {
        id: 8,
        src: "https://images.unsplash.com/photo-1531816458010-fb7685eec993?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "摄影师",
        title: "黑白光影",
    },
    {
        id: 9,
        src: "https://images.unsplash.com/photo-1579803815617-1693707d35a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80",
        author: "文艺复兴",
        title: "天使的细节",
    }
];

// --- DOM Elements ---
const artContainer = document.getElementById('art-container');
const randomBtn = document.getElementById('random-btn');

// --- State ---
let currentArtIndex = 0;
const loadedArt = new Set([0]); // Keep track of which art pieces are in the DOM

// --- Functions ---

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

    const artInfo = document.createElement('div');
    artInfo.className = 'art-info';

    const author = document.createElement('h3');
    author.textContent = artPiece.author;

    const title = document.createElement('p');
    title.textContent = artPiece.title;

    artInfo.appendChild(author);
    artInfo.appendChild(title);
    slide.appendChild(img);
    slide.appendChild(artInfo);

    return slide;
}

/**
 * Loads a specific art piece into the container.
 * @param {number} index - The index of the art piece to load.
 */
function loadArt(index) {
    if (index < 0 || index >= artPieces.length || loadedArt.has(index)) {
        return;
    }

    const artPiece = artPieces[index];
    const slide = createArtSlide(artPiece);

    // Insert the slide in the correct order
    const slides = Array.from(artContainer.children);
    const nextSlide = slides.find(s => parseInt(s.dataset.id, 10) > index);
    if (nextSlide) {
        artContainer.insertBefore(slide, nextSlide);
    } else {
        artContainer.appendChild(slide);
    }
    
    loadedArt.add(index);
}

/**
 * Handles the random button click.
 */
function handleRandomClick() {
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * artPieces.length);
    } while (randomIndex === currentArtIndex);

    // If the art is not loaded, load it
    if (!loadedArt.has(randomIndex)) {
        loadArt(randomIndex);
    }

    // Scroll to the art piece
    const targetSlide = artContainer.querySelector(`.art-slide[data-id='${randomIndex}']`);
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
    const nextIndex = index + 1;
    const prevIndex = index - 1;

    if (nextIndex < artPieces.length) {
        const nextImg = new Image();
        nextImg.src = artPieces[nextIndex].src;
    }
    if (prevIndex >= 0) {
        const prevImg = new Image();
        prevImg.src = artPieces[prevIndex].src;
    }
    
    // Preload two random images
    for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * artPieces.length);
        if (randomIndex !== index) {
            const randomImg = new Image();
            randomImg.src = artPieces[randomIndex].src;
        }
    }
}

/**
 * Updates the current art index based on scroll position.
 */
function updateCurrentArtOnScroll() {
    const slides = Array.from(artContainer.children);
    const scrollTop = artContainer.scrollTop;
    const scrollCenter = scrollTop + artContainer.clientHeight / 2;

    const currentSlide = slides.find(slide => {
        return scrollCenter >= slide.offsetTop && scrollCenter <= slide.offsetTop + slide.offsetHeight;
    });

    if (currentSlide) {
        const newIndex = parseInt(currentSlide.dataset.id, 10);
        if (newIndex !== currentArtIndex) {
            currentArtIndex = newIndex;
            // Load adjacent art pieces
            loadArt(currentArtIndex - 1);
            loadArt(currentArtIndex + 1);
            // Preload images for even smoother scrolling
            preloadImages(currentArtIndex);
        }
    }
}


// --- Event Listeners ---
randomBtn.addEventListener('click', handleRandomClick);
artContainer.addEventListener('scroll', updateCurrentArtOnScroll, { passive: true });


// --- Initial Load ---
function init() {
    const firstArt = artPieces.find(p => p.id === 0);
    if (!firstArt) {
        console.error("Art piece with ID 0 not found!");
        return;
    }

    artContainer.innerHTML = ''; // Clear container
    const firstSlide = createArtSlide(firstArt);
    artContainer.appendChild(firstSlide);
    loadedArt.add(0);

    // Load initial set of art
    loadArt(1); // Load the next one
    preloadImages(0); // Preload for the first slide
}

init();
