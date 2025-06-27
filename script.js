// ===== GLOBAL VARIABLES =====
let currentTheme = 'light';
let allQuestions = [];
let bookmarks = [];
let catechismData = null;

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

    qaItem.innerHTML = `
        <button class="qa-bookmark-btn" onclick="toggleBookmark(${questionData.id})" title="Bookmark this question">
            <svg class="qa-bookmark-icon" viewBox="0 0 24 24">
                <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,4.89 18.89,4 17,3Z" />
            </svg>
        </button>
        <div class="question">Q. ${questionData.id}. ${questionData.question}</div>
        <div class="answer">A. ${questionData.answer}</div>
    `;

    return qaItem;
}

// ===== THEME MANAGEMENT =====
function setTheme(theme) {
    // Remove current theme class
    document.body.className = theme;
    currentTheme = theme;

    // Save theme to localStorage
    try {
        localStorage.setItem('shortercat-theme', theme);
    } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
    }

    // Update button states
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Set active button
    const activeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Close menu after selection
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

// ===== BOOKMARK MANAGEMENT =====
function loadBookmarks() {
    try {
        const saved = localStorage.getItem('shortercat-bookmarks');
        bookmarks = saved ? JSON.parse(saved) : [];
        updateBookmarkUI();
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
        // Add bookmark - get data from JSON
        const questionData = catechismData.questions.find(q => q.id === questionId);
        if (questionData) {
            bookmarks.push({
                id: questionId,
                question: `Q. ${questionData.id}. ${questionData.question}`,
                answer: `A. ${questionData.answer}`,
                timestamp: Date.now()
            });
        }
    } else {
        // Remove bookmark
        bookmarks.splice(index, 1);
    }

    saveBookmarks();
    updateBookmarkUI();
}

function updateBookmarkUI() {
    // Update bookmark count
    const countElement = document.getElementById('bookmarkCount');
    const count = bookmarks.length;
    countElement.textContent = count;
    countElement.classList.toggle('visible', count > 0);

    // Update individual bookmark buttons
    document.querySelectorAll('.qa-bookmark-btn').forEach(btn => {
        const questionId = parseInt(btn.closest('.qa-item').dataset.questionId);
        const isBookmarked = bookmarks.some(b => b.id === questionId);
        btn.classList.toggle('bookmarked', isBookmarked);
    });

    // Update bookmark dropdown
    updateBookmarkDropdown();
}

function updateBookmarkDropdown() {
    const bookmarkList = document.getElementById('bookmarkList');

    if (bookmarks.length === 0) {
        bookmarkList.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Click the bookmark icon on any question to save it!</div>';
        return;
    }

    // Show only the 10 most recent bookmarks
    const recentBookmarks = bookmarks
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

    bookmarkList.innerHTML = recentBookmarks.map((bookmark, index) => {
        const colorClass = `ribbon-color-${(index % 10) + 1}`;
        return `
            <div class="bookmark-item ${colorClass}" onclick="scrollToQuestion(${bookmark.id})">
                <svg class="bookmark-ribbon-small ${colorClass}" viewBox="0 0 24 24">
                    <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,4.89 18.89,4 17,3Z" />
                </svg>
                <div class="bookmark-item-text">
                    ${bookmark.question}
                </div>
                <button class="bookmark-remove" onclick="event.stopPropagation(); removeBookmark(${bookmark.id})" title="Remove bookmark">×</button>
            </div>
        `;
    }).join('');
}

function scrollToQuestion(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionElement) {
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Brief highlight effect
        questionElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            questionElement.style.transform = '';
        }, 300);
    }

    // Close dropdown
    toggleBookmarkDropdown();
}

function removeBookmark(questionId) {
    const index = bookmarks.findIndex(b => b.id === questionId);
    if (index !== -1) {
        bookmarks.splice(index, 1);
        saveBookmarks();
        updateBookmarkUI();
    }
}

function toggleBookmarkDropdown() {
    const dropdown = document.getElementById('bookmarkDropdown');
    dropdown.classList.toggle('active');
}

// ===== SCROLL TO TOP FUNCTIONALITY =====
function updateScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    const questionsContainer = document.getElementById('questionsContainer');
    const questions = questionsContainer.querySelectorAll('.qa-item');

    if (questions.length >= 15) {
        // Calculate approximate position of 15th question
        const fifteenthQuestion = questions[14]; // 0-indexed
        const questionRect = fifteenthQuestion.getBoundingClientRect();
        const windowTop = window.pageYOffset || document.documentElement.scrollTop;
        const questionTop = questionRect.top + windowTop;

        // Show button when scrolled past 15th question
        if (window.scrollY > questionTop - window.innerHeight) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== SEARCH FUNCTIONALITY =====
function initializeSearch() {
    // Collect all questions and answers from JSON data
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

    if (!query.trim()) {
        // Show all questions and remove all highlights
        allQuestions.forEach(item => {
            item.element.style.display = 'block';
            removeHighlights(item.element);
        });
        searchResults.textContent = '';
        document.getElementById('clearSearch').classList.remove('visible');
        return;
    }

    document.getElementById('clearSearch').classList.add('visible');

    const lowerQuery = query.toLowerCase();
    let visibleCount = 0;

    allQuestions.forEach(item => {
        const questionMatch = item.question.toLowerCase().includes(lowerQuery);
        const answerMatch = item.answer.toLowerCase().includes(lowerQuery);

        if (questionMatch || answerMatch) {
            item.element.style.display = 'block';
            visibleCount++;

            // Highlight matching text
            highlightText(item.element, query);
        } else {
            item.element.style.display = 'none';
        }
    });

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

    // Remove existing highlights
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

    // Reset to plain text, removing any HTML tags including highlights
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

    // Bookmark functionality
    document.getElementById('bookmarkMainBtn').addEventListener('click', toggleBookmarkDropdown);

    // Scroll to top functionality
    document.getElementById('scrollToTop').addEventListener('click', scrollToTop);
    window.addEventListener('scroll', debounce(updateScrollToTop, 100));

    // Close bookmark dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('bookmarkDropdown');
        const bookmarkBtn = document.getElementById('bookmarkMainBtn');

        if (!dropdown.contains(e.target) && !bookmarkBtn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearch');

    searchInput.addEventListener('input', debounce(function (e) {
        performSearch(e.target.value);
    }, 300));

    clearButton.addEventListener('click', clearSearch);

    // Retry button
    document.getElementById('retryBtn').addEventListener('click', loadCatechism);

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Escape to close menus
        if (e.key === 'Escape') {
            closeMenu();
            document.getElementById('bookmarkDropdown').classList.remove('active');
        }

        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }

        // Theme shortcuts
        if (e.ctrlKey || e.metaKey) {
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
    // Restore theme and bookmarks
    loadSavedTheme();
    loadBookmarks();

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
// These functions need to be global for the onclick handlers in the HTML
window.toggleBookmark = toggleBookmark;
window.scrollToQuestion = scrollToQuestion;
window.removeBookmark = removeBookmark;