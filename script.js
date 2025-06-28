// ===== GLOBAL VARIABLES =====
let currentTheme = 'light';
let currentTab = 'home';
let allQuestions = [];
let favorites = [];
let bookmarks = [];
let notes = {};
let catechismData = null;
let expandedCard = null;
let activeCategories = new Set(); // For category filtering

// ===== CATEGORY COLOR MAPPING =====
const categoryColors = {
    "God's Nature": "#6366f1",        // Indigo - Divine
    "Scripture": "#f59e0b",           // Amber - Wisdom  
    "Creation & Fall": "#10b981",     // Emerald - Earth/Nature
    "Salvation & Christ": "#ef4444",  // Red - Sacrifice/Love
    "Ten Commandments": "#8b5cf6",    // Violet - Authority/Law
    "Prayer": "#06b6d4",              // Cyan - Peace/Communication
    "Sacraments": "#059669",          // Emerald Dark - Sacred
    "Last Things": "#ea580c"          // Orange Dark - Eternal
};

// ===== UTILITY FUNCTIONS =====
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatCopyText(questionData, userNote = '') {
    let text = `Q${questionData.id}: ${questionData.question}\n\n`;
    text += `A: ${questionData.answer}`;

    if (userNote) {
        text += `\n\nMy Notes:\n${userNote}`;
    }

    text += `\n\n---\nFrom Children's Catechism`;
    return text;
}

// ===== DATA LOADING =====
async function loadCatechism() {
    try {
        showLoadingState();
        const response = await fetch('./data/childrens-catechism.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        catechismData = await response.json();

        if (!catechismData.questions || !Array.isArray(catechismData.questions)) {
            throw new Error('Invalid data format');
        }

        renderQuestions();
        initializeSearch();
        hideLoadingState();

    } catch (error) {
        console.error('Error loading catechism data:', error);
        showErrorState();
    }
}

function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('questionsContainer').style.display = 'none';
}

function showErrorState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('questionsContainer').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('questionsContainer').style.display = 'block';
}

// ===== QUESTION RENDERING =====
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    catechismData.questions.forEach(questionData => {
        const questionElement = createQuestionElement(questionData);
        container.appendChild(questionElement);
    });
}

function createQuestionElement(questionData) {
    const qaItem = document.createElement('div');
    qaItem.className = 'qa-item';
    qaItem.setAttribute('data-question-id', questionData.id);
    qaItem.setAttribute('data-category', questionData.category);

    const isFavorited = favorites.some(f => f.id === questionData.id);
    const isBookmarked = bookmarks.some(b => b.id === questionData.id);
    const hasNote = notes[questionData.id];

    // Set category color for left border
    const categoryColor = categoryColors[questionData.category] || '#4a90e2';
    qaItem.style.borderLeftColor = categoryColor;

    qaItem.innerHTML = `
        <div class="qa-content" onclick="toggleCardExpansion(${questionData.id})">
            <div class="question">Q${questionData.id}: ${questionData.question}</div>
            <div class="answer">A: ${questionData.answer}</div>
        </div>
        <div class="qa-actions">
            <div class="action-buttons">
                <button class="action-btn favorite-btn ${isFavorited ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${questionData.id})" title="Add to favorites">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
                    </svg>
                    <span>Favorite</span>
                </button>
                <button class="action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="event.stopPropagation(); toggleBookmark(${questionData.id})" title="Bookmark for later">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,4.89 18.89,4 17,3Z" />
                    </svg>
                    <span>Bookmark</span>
                </button>
                <button class="action-btn note-btn ${hasNote ? 'active' : ''}" onclick="event.stopPropagation(); openNotesModal(${questionData.id})" title="Add personal note">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <span>Note</span>
                </button>
                <button class="action-btn copy-btn" onclick="event.stopPropagation(); copyToClipboard(${questionData.id})" title="Copy question text">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
        </div>
    `;

    return qaItem;
}

// ===== CARD EXPANSION =====
function toggleCardExpansion(questionId) {
    const card = document.querySelector(`[data-question-id="${questionId}"]`);

    // Close any other expanded card
    if (expandedCard && expandedCard !== card) {
        expandedCard.classList.remove('expanded');
    }

    // Toggle current card
    if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        expandedCard = null;
    } else {
        card.classList.add('expanded');
        expandedCard = card;
    }
}

// ===== TAB MANAGEMENT =====
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Pane`).classList.add('active');

    currentTab = tabName;

    // Collapse any expanded cards when switching tabs
    if (expandedCard) {
        expandedCard.classList.remove('expanded');
        expandedCard = null;
    }

    // Update content based on tab and apply category filter
    if (tabName === 'favorites') {
        renderFavorites();
    } else if (tabName === 'bookmarks') {
        renderBookmarks();
    } else if (tabName === 'home') {
        filterQuestionsByCategory();
    }

    // Clear search when switching tabs
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value) {
        searchInput.value = '';
        clearSearch();
    }
}

// ===== THEME MANAGEMENT =====
function setTheme(theme) {
    document.body.className = theme;
    currentTheme = theme;

    try {
        localStorage.setItem('shortercat-theme', theme);
    } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
    }

    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    closeMenu();
}

function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('shortercat-theme');
        if (savedTheme && savedTheme !== currentTheme) {
            setTheme(savedTheme);
        }
    } catch (e) {
        console.warn('Could not load theme from localStorage:', e);
    }
}

// ===== MENU FUNCTIONALITY =====
function toggleMenu() {
    const hamburger = document.getElementById('hamburger');
    const menuOverlay = document.getElementById('menuOverlay');
    const themeMenu = document.getElementById('themeMenu');

    hamburger.classList.toggle('active');
    menuOverlay.classList.toggle('active');
    themeMenu.classList.toggle('active');
}

function closeMenu() {
    const hamburger = document.getElementById('hamburger');
    const menuOverlay = document.getElementById('menuOverlay');
    const themeMenu = document.getElementById('themeMenu');

    hamburger.classList.remove('active');
    menuOverlay.classList.remove('active');
    themeMenu.classList.remove('active');
}

// ===== FAVORITES MANAGEMENT =====
function loadFavorites() {
    try {
        const saved = localStorage.getItem('shortercat-favorites');
        favorites = saved ? JSON.parse(saved) : [];
        updateFavoritesUI();
    } catch (e) {
        console.warn('Could not load favorites from localStorage:', e);
        favorites = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('shortercat-favorites', JSON.stringify(favorites));
    } catch (e) {
        console.warn('Could not save favorites to localStorage:', e);
    }
}

function toggleFavorite(questionId) {
    const index = favorites.findIndex(f => f.id === questionId);

    if (index === -1) {
        const questionData = catechismData.questions.find(q => q.id === questionId);
        if (questionData) {
            favorites.push({
                id: questionId,
                question: `Q${questionData.id}: ${questionData.question}`,
                answer: `A: ${questionData.answer}`,
                timestamp: Date.now()
            });
        }
    } else {
        favorites.splice(index, 1);
    }

    saveFavorites();
    updateFavoritesUI();
    updateCardButtons();
}

function updateFavoritesUI() {
    const countElement = document.getElementById('favoritesCount');
    const count = favorites.length;
    countElement.textContent = count;
    countElement.classList.toggle('visible', count > 0);
}

function renderFavorites() {
    const container = document.getElementById('favoritesContainer');
    const emptyState = document.getElementById('emptyFavorites');

    // Filter favorites by active categories
    const filteredFavorites = favorites.filter(favoriteData => {
        const questionData = catechismData.questions.find(q => q.id === favoriteData.id);
        return activeCategories.size === 0 || activeCategories.has(questionData.category);
    });

    if (filteredFavorites.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        // Update empty state message based on filter
        const emptyMessage = activeCategories.size === 0 ?
            'No favorites yet. Click the heart icon on any question to add it to your favorites!' :
            'No favorites in the selected categories. Try selecting different categories or add more favorites!';
        emptyState.querySelector('p').textContent = emptyMessage;
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';
    container.innerHTML = '';

    filteredFavorites.forEach(favoriteData => {
        const questionData = catechismData.questions.find(q => q.id === favoriteData.id);
        if (questionData) {
            const questionElement = createQuestionElement(questionData);
            container.appendChild(questionElement);
        }
    });
}

// ===== BOOKMARK MANAGEMENT =====
function loadBookmarks() {
    try {
        const saved = localStorage.getItem('shortercat-bookmarks');
        bookmarks = saved ? JSON.parse(saved) : [];
        updateBookmarksUI();
    } catch (e) {
        console.warn('Could not load bookmarks from localStorage:', e);
        bookmarks = [];
    }
}

function saveBookmarks() {
    try {
        localStorage.setItem('shortercat-bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
        console.warn('Could not save bookmarks to localStorage:', e);
    }
}

function toggleBookmark(questionId) {
    const index = bookmarks.findIndex(b => b.id === questionId);

    if (index === -1) {
        const questionData = catechismData.questions.find(q => q.id === questionId);
        if (questionData) {
            bookmarks.push({
                id: questionId,
                question: `Q${questionData.id}: ${questionData.question}`,
                answer: `A: ${questionData.answer}`,
                timestamp: Date.now()
            });
        }
    } else {
        bookmarks.splice(index, 1);
    }

    saveBookmarks();
    updateBookmarksUI();
    updateCardButtons();
}

function updateBookmarksUI() {
    const countElement = document.getElementById('bookmarksCount');
    const count = bookmarks.length;
    countElement.textContent = count;
    countElement.classList.toggle('visible', count > 0);
}

function renderBookmarks() {
    const container = document.getElementById('bookmarksContainer');
    const emptyState = document.getElementById('emptyBookmarks');

    // Filter bookmarks by active categories
    const filteredBookmarks = bookmarks.filter(bookmarkData => {
        const questionData = catechismData.questions.find(q => q.id === bookmarkData.id);
        return activeCategories.size === 0 || activeCategories.has(questionData.category);
    });

    if (filteredBookmarks.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        // Update empty state message based on filter
        const emptyMessage = activeCategories.size === 0 ?
            'No bookmarks yet. Click the bookmark icon on any question to save your reading progress!' :
            'No bookmarks in the selected categories. Try selecting different categories or add more bookmarks!';
        emptyState.querySelector('p').textContent = emptyMessage;
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';
    container.innerHTML = '';

    filteredBookmarks.forEach(bookmarkData => {
        const questionData = catechismData.questions.find(q => q.id === bookmarkData.id);
        if (questionData) {
            const questionElement = createQuestionElement(questionData);
            container.appendChild(questionElement);
        }
    });
}

// ===== NOTES MANAGEMENT =====
function loadNotes() {
    try {
        const saved = localStorage.getItem('shortercat-notes');
        notes = saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.warn('Could not load notes from localStorage:', e);
        notes = {};
    }
}

function saveNotes() {
    try {
        localStorage.setItem('shortercat-notes', JSON.stringify(notes));
    } catch (e) {
        console.warn('Could not save notes to localStorage:', e);
    }
}

function openNotesModal(questionId) {
    const questionData = catechismData.questions.find(q => q.id === questionId);
    if (!questionData) return;

    const modal = document.getElementById('notesModal');
    const overlay = document.getElementById('notesModalOverlay');
    const title = document.getElementById('notesModalTitle');
    const questionDiv = document.getElementById('notesModalQuestion');
    const textarea = document.getElementById('notesTextarea');

    title.textContent = `Note for Q${questionData.id}`;
    questionDiv.innerHTML = `
        <strong>Q${questionData.id}: ${questionData.question}</strong><br>
        A: ${questionData.answer}
    `;

    textarea.value = notes[questionId] || '';
    textarea.setAttribute('data-question-id', questionId);

    overlay.classList.add('active');
    setTimeout(() => textarea.focus(), 100);
}

function closeNotesModal() {
    const overlay = document.getElementById('notesModalOverlay');
    overlay.classList.remove('active');
}

// ===== ABOUT MODAL =====
function openAboutModal() {
    const overlay = document.getElementById('aboutModalOverlay');
    overlay.classList.add('active');
    closeMenu(); // Close hamburger menu when opening about
}

function closeAboutModal() {
    const overlay = document.getElementById('aboutModalOverlay');
    overlay.classList.remove('active');
}

// ===== CATEGORIES MODAL =====
function openCategoriesModal() {
    const overlay = document.getElementById('categoriesModalOverlay');
    populateCategoriesList();
    overlay.classList.add('active');
    closeMenu(); // Close hamburger menu when opening categories
}

function closeCategoriesModal() {
    const overlay = document.getElementById('categoriesModalOverlay');
    overlay.classList.remove('active');
}

function populateCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    const categories = catechismData ? Object.keys(categoryColors) : [];

    categoriesList.innerHTML = '';

    categories.forEach(category => {
        const count = catechismData.questions.filter(q => q.category === category).length;
        const isActive = activeCategories.size === 0 || activeCategories.has(category);
        const color = categoryColors[category];

        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item ${isActive ? 'active' : ''}`;
        categoryItem.style.setProperty('--category-color', color);
        categoryItem.setAttribute('data-category', category);

        categoryItem.innerHTML = `
            <div class="category-checkbox ${isActive ? 'checked' : ''}" style="border-color: ${color}"></div>
            <div class="category-color-indicator" style="background-color: ${color}"></div>
            <div class="category-details">
                <div class="category-name">${category}</div>
                <div class="category-count">${count} questions</div>
            </div>
        `;

        categoryItem.addEventListener('click', () => toggleCategory(category));
        categoriesList.appendChild(categoryItem);
    });
}

function toggleCategory(category) {
    const categoryItem = document.querySelector(`[data-category="${category}"]`);
    const checkbox = categoryItem.querySelector('.category-checkbox');

    if (activeCategories.has(category)) {
        activeCategories.delete(category);
        categoryItem.classList.remove('active');
        checkbox.classList.remove('checked');
    } else {
        activeCategories.add(category);
        categoryItem.classList.add('active');
        checkbox.classList.add('checked');
    }
}

function selectAllCategories() {
    const categories = Object.keys(categoryColors);
    activeCategories.clear();
    categories.forEach(category => activeCategories.add(category));
    populateCategoriesList();
}

function applyCategoryFilter() {
    // If no categories selected, show all
    if (activeCategories.size === 0) {
        Object.keys(categoryColors).forEach(category => activeCategories.add(category));
    }

    // Apply filter to current view
    filterQuestionsByCategory();
    closeCategoriesModal();
}

function filterQuestionsByCategory() {
    if (currentTab === 'home') {
        // Filter home questions
        allQuestions.forEach(item => {
            const questionData = catechismData.questions.find(q => q.id === item.id);
            const shouldShow = activeCategories.size === 0 ||
                activeCategories.has(questionData.category);
            item.element.style.display = shouldShow ? 'block' : 'none';
        });
    } else if (currentTab === 'favorites') {
        renderFavorites();
    } else if (currentTab === 'bookmarks') {
        renderBookmarks();
    }

    // Update search if there's an active search
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
        performSearch(searchInput.value);
    }
}

function saveNote() {
    const textarea = document.getElementById('notesTextarea');
    const questionId = parseInt(textarea.getAttribute('data-question-id'));
    const noteText = textarea.value.trim();

    if (noteText) {
        notes[questionId] = noteText;
    } else {
        delete notes[questionId];
    }

    saveNotes();
    updateCardButtons();
    closeNotesModal();
}

// ===== CLIPBOARD SHARING =====
async function copyToClipboard(questionId) {
    const questionData = catechismData.questions.find(q => q.id === questionId);
    if (!questionData) return;

    const userNote = notes[questionId] || '';
    const formattedText = formatCopyText(questionData, userNote);

    try {
        await navigator.clipboard.writeText(formattedText);
        showCopyFeedback(questionId);
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = formattedText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(questionId);
        } catch (fallbackErr) {
            console.error('Failed to copy text:', fallbackErr);
            alert('Could not copy to clipboard. Please try again.');
        }
        document.body.removeChild(textArea);
    }
}

function formatCopyText(questionData, userNote = '') {
    let text = `Q${questionData.id}: ${questionData.question}\n\n`;
    text += `A: ${questionData.answer}`;

    if (userNote) {
        text += `\n\nMy Notes:\n${userNote}`;
    }

    text += `\n\n---\nFrom Children's Catechism`;
    return text;
}

function showCopyFeedback(questionId) {
    const card = document.querySelector(`[data-question-id="${questionId}"]`);
    const copyBtn = card.querySelector('.copy-btn');
    const originalText = copyBtn.querySelector('span').textContent;

    // Show success state
    copyBtn.classList.add('copied');
    copyBtn.querySelector('span').textContent = 'Copied!';

    // Reset after 2 seconds
    setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('span').textContent = originalText;
    }, 2000);
}

// ===== UI UPDATES =====
function updateCardButtons() {
    document.querySelectorAll('.qa-item').forEach(card => {
        const questionId = parseInt(card.dataset.questionId);

        const favoriteBtn = card.querySelector('.favorite-btn');
        const bookmarkBtn = card.querySelector('.bookmark-btn');
        const noteBtn = card.querySelector('.note-btn');

        const isFavorited = favorites.some(f => f.id === questionId);
        const isBookmarked = bookmarks.some(b => b.id === questionId);
        const hasNote = notes[questionId];

        favoriteBtn.classList.toggle('active', isFavorited);
        bookmarkBtn.classList.toggle('active', isBookmarked);
        noteBtn.classList.toggle('active', !!hasNote);
    });
}

// ===== SCROLL TO TOP FUNCTIONALITY =====
function updateScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    const isVisible = window.scrollY > 300;
    scrollToTopBtn.classList.toggle('visible', isVisible);
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== SEARCH FUNCTIONALITY =====
function initializeSearch() {
    const qaItems = document.querySelectorAll('.qa-item');
    allQuestions = Array.from(qaItems).map((item, index) => {
        const questionData = catechismData.questions[index];
        return {
            element: item,
            question: item.querySelector('.question').textContent,
            answer: item.querySelector('.answer').textContent,
            index: index,
            id: questionData.id
        };
    });
}

function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    let questionsToSearch = [];

    // Determine which questions to search based on current tab and category filter
    if (currentTab === 'home') {
        questionsToSearch = allQuestions.filter(q => {
            const questionData = catechismData.questions.find(qd => qd.id === q.id);
            return activeCategories.size === 0 || activeCategories.has(questionData.category);
        });
    } else if (currentTab === 'favorites') {
        const favoriteIds = favorites.map(f => f.id);
        questionsToSearch = allQuestions.filter(q => {
            const questionData = catechismData.questions.find(qd => qd.id === q.id);
            return favoriteIds.includes(q.id) &&
                (activeCategories.size === 0 || activeCategories.has(questionData.category));
        });
    } else if (currentTab === 'bookmarks') {
        const bookmarkIds = bookmarks.map(b => b.id);
        questionsToSearch = allQuestions.filter(q => {
            const questionData = catechismData.questions.find(qd => qd.id === q.id);
            return bookmarkIds.includes(q.id) &&
                (activeCategories.size === 0 || activeCategories.has(questionData.category));
        });
    }

    if (!query.trim()) {
        // Show questions based on current tab and category filter
        if (currentTab === 'home') {
            filterQuestionsByCategory();
        } else {
            // For favorites/bookmarks tabs, re-render the content
            if (currentTab === 'favorites') renderFavorites();
            if (currentTab === 'bookmarks') renderBookmarks();
        }
        searchResults.textContent = '';
        document.getElementById('clearSearch').classList.remove('visible');
        return;
    }

    document.getElementById('clearSearch').classList.add('visible');

    const lowerQuery = query.toLowerCase();
    let visibleCount = 0;

    if (currentTab === 'home') {
        allQuestions.forEach(item => {
            const questionData = catechismData.questions.find(q => q.id === item.id);
            const questionMatch = item.question.toLowerCase().includes(lowerQuery);
            const answerMatch = item.answer.toLowerCase().includes(lowerQuery);
            const inActiveCategory = activeCategories.size === 0 || activeCategories.has(questionData.category);

            if ((questionMatch || answerMatch) && inActiveCategory) {
                item.element.style.display = 'block';
                visibleCount++;
                highlightText(item.element, query);
            } else {
                item.element.style.display = 'none';
            }
        });
    } else {
        // For favorites/bookmarks, filter and re-render
        const filteredQuestions = questionsToSearch.filter(item => {
            const questionMatch = item.question.toLowerCase().includes(lowerQuery);
            const answerMatch = item.answer.toLowerCase().includes(lowerQuery);
            return questionMatch || answerMatch;
        });

        visibleCount = filteredQuestions.length;

        // Re-render filtered results
        const container = currentTab === 'favorites' ?
            document.getElementById('favoritesContainer') :
            document.getElementById('bookmarksContainer');

        container.innerHTML = '';

        filteredQuestions.forEach(item => {
            const questionData = catechismData.questions.find(q => q.id === item.id);
            const questionElement = createQuestionElement(questionData);
            highlightText(questionElement, query);
            container.appendChild(questionElement);
        });
    }

    // Update search results
    if (visibleCount === 0) {
        searchResults.textContent = 'No questions found matching your search.';
    } else if (visibleCount === 1) {
        searchResults.textContent = '1 question found';
    } else {
        searchResults.textContent = `${visibleCount} questions found`;
    }
}

function highlightText(element, query) {
    const question = element.querySelector('.question');
    const answer = element.querySelector('.answer');

    removeHighlights(element);

    if (query.trim()) {
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        question.innerHTML = question.textContent.replace(regex, '<mark style="background-color: yellow; color: black;">$1</mark>');
        answer.innerHTML = answer.textContent.replace(regex, '<mark style="background-color: yellow; color: black;">$1</mark>');
    }
}

function removeHighlights(element) {
    const question = element.querySelector('.question');
    const answer = element.querySelector('.answer');

    question.innerHTML = question.textContent;
    answer.innerHTML = answer.textContent;
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    performSearch('');
    searchInput.focus();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Hamburger menu
    document.getElementById('hamburger').addEventListener('click', toggleMenu);
    document.getElementById('menuOverlay').addEventListener('click', closeMenu);

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
        });
    });

    // Scroll to top functionality
    document.getElementById('scrollToTop').addEventListener('click', scrollToTop);
    window.addEventListener('scroll', debounce(updateScrollToTop, 100));

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');

    searchInput.addEventListener('input', debounce(function (e) {
        performSearch(e.target.value);
    }, 300));

    clearButton.addEventListener('click', clearSearch);

    // Retry button
    document.getElementById('retryBtn').addEventListener('click', loadCatechism);

    // Notes modal
    document.getElementById('notesModalClose').addEventListener('click', closeNotesModal);
    document.getElementById('notesModalCancel').addEventListener('click', closeNotesModal);
    document.getElementById('notesModalSave').addEventListener('click', saveNote);

    // About modal
    document.getElementById('aboutBtn').addEventListener('click', openAboutModal);
    document.getElementById('aboutModalClose').addEventListener('click', closeAboutModal);
    document.getElementById('aboutModalOk').addEventListener('click', closeAboutModal);

    // Categories modal
    document.getElementById('categoriesBtn').addEventListener('click', openCategoriesModal);
    document.getElementById('categoriesModalClose').addEventListener('click', closeCategoriesModal);
    document.getElementById('categoriesSelectAll').addEventListener('click', selectAllCategories);
    document.getElementById('categoriesApply').addEventListener('click', applyCategoryFilter);

    // Close modals on overlay click
    document.getElementById('notesModalOverlay').addEventListener('click', function (e) {
        if (e.target === this) {
            closeNotesModal();
        }
    });

    document.getElementById('aboutModalOverlay').addEventListener('click', function (e) {
        if (e.target === this) {
            closeAboutModal();
        }
    });

    document.getElementById('categoriesModalOverlay').addEventListener('click', function (e) {
        if (e.target === this) {
            closeCategoriesModal();
        }
    });

    // Close expanded cards when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.qa-item') && expandedCard) {
            expandedCard.classList.remove('expanded');
            expandedCard = null;
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Escape to close menus and modals
        if (e.key === 'Escape') {
            closeMenu();
            closeNotesModal();
            closeAboutModal();
            closeCategoriesModal();
            if (expandedCard) {
                expandedCard.classList.remove('expanded');
                expandedCard = null;
            }
        }

        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }

        // Tab shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    switchTab('home');
                    break;
                case '2':
                    e.preventDefault();
                    switchTab('favorites');
                    break;
                case '3':
                    e.preventDefault();
                    switchTab('bookmarks');
                    break;
            }
        }

        // Theme shortcuts
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    setTheme('light');
                    break;
                case '2':
                    e.preventDefault();
                    setTheme('dark');
                    break;
                case '3':
                    e.preventDefault();
                    setTheme('blue');
                    break;
                case '4':
                    e.preventDefault();
                    setTheme('sepia');
                    break;
            }
        }
    });
}

// ===== INITIALIZATION =====
function initializeApp() {
    // Load saved data
    loadSavedTheme();
    loadFavorites();
    loadBookmarks();
    loadNotes();

    // Initialize categories - show all by default
    Object.keys(categoryColors).forEach(category => activeCategories.add(category));

    // Load catechism data
    loadCatechism();

    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Setup all event listeners
    setupEventListeners();
}

// ===== ENTRY POINT =====
document.addEventListener('DOMContentLoaded', initializeApp);

// ===== GLOBAL FUNCTIONS (for onclick handlers) =====
window.toggleCardExpansion = toggleCardExpansion;
window.toggleFavorite = toggleFavorite;
window.toggleBookmark = toggleBookmark;
window.openNotesModal = openNotesModal;
window.copyToClipboard = copyToClipboard;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.openCategoriesModal = openCategoriesModal;
window.closeCategoriesModal = closeCategoriesModal;