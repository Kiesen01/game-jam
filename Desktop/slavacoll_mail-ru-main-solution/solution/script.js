// State
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let currentPage = 'productList';
let filteredProducts = [];
let searchQuery = '';
let activeFilters = [];
let productToRemove = null;

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const productsSkeleton = document.getElementById('productsSkeleton');
const cartContent = document.getElementById('cartContent');
const cartEmpty = document.getElementById('cartEmpty');
const cartBadge = document.getElementById('cartBadge');
const ordersContent = document.getElementById('ordersContent');
const ordersEmpty = document.getElementById('ordersEmpty');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const productModal = document.getElementById('productModal');
const removeModal = document.getElementById('removeModal');
const modalClose = document.getElementById('modalClose');
const confirmRemove = document.getElementById('confirmRemove');
const cancelRemove = document.getElementById('cancelRemove');
const profileForm = document.getElementById('profileForm');
const searchDropdown = document.getElementById('searchDropdown');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    updateCartBadge();
    loadTheme();
    showPage('productList');
    loadProfile();
});

// Load products from JSON
async function loadProducts() {
    try {
        showSkeleton();
        const response = await fetch('data.json');
        const data = await response.json();
        products = data.products;
        filteredProducts = products;
        hideSkeleton();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        hideSkeleton();
    }
}

// Show skeleton loaders
function showSkeleton() {
    productsSkeleton.style.display = 'grid';
    productsGrid.style.display = 'none';
    productsSkeleton.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'product-skeleton';
        skeleton.innerHTML = `
            <div class="product-skeleton__image"></div>
            <div class="product-skeleton__content">
                <div class="product-skeleton__line product-skeleton__line--short"></div>
                <div class="product-skeleton__line product-skeleton__line--medium"></div>
                <div class="product-skeleton__line product-skeleton__line--long"></div>
            </div>
        `;
        productsSkeleton.appendChild(skeleton);
    }
}

// Hide skeleton loaders
function hideSkeleton() {
    productsSkeleton.style.display = 'none';
    productsGrid.style.display = 'grid';
}

// Render products
function renderProducts() {
    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--color-text-secondary);">No products found</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const isBought = orders.some(order => 
            order.items.some(item => item.id === product.id)
        );

        const card = document.createElement('div');
        card.className = `product-card ${isBought ? 'product-card--bought' : ''}`;
        card.innerHTML = `
            <img src="${product.image}" alt="${product.title}" class="product-card__image" />
            <div class="product-card__content">
                <div class="product-card__category">${product.type.toUpperCase()}</div>
                <div class="product-card__title">${product.title}</div>
                <div class="product-card__price">${formatPrice(product.price)}</div>
            </div>
        `;
        card.addEventListener('click', () => openProductModal(product));
        productsGrid.appendChild(card);
    });
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// Filter products
function filterProducts() {
    let filtered = products;

    // Filter by category
    if (activeFilters.length > 0) {
        filtered = filtered.filter(product => 
            activeFilters.includes(product.type)
        );
    }

    // Filter by search query
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(product =>
            product.title.toLowerCase().includes(query) ||
            product.type.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query)
        );
    }

    filteredProducts = filtered;
    renderProducts();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Search
    let searchTimeout;
    let isLoadingSearch = false;
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        clearTimeout(searchTimeout);
        
        if (searchQuery.trim()) {
            showSearchDropdown();
            isLoadingSearch = true;
            searchDropdown.innerHTML = '<div class="search-dropdown__loading">Loading...</div>';
            searchTimeout = setTimeout(() => {
                isLoadingSearch = false;
                filterProducts();
                updateSearchDropdown();
            }, 300);
        } else {
            hideSearchDropdown();
            filterProducts();
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchQuery.trim()) {
            showSearchDropdown();
            updateSearchDropdown();
        }
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header__search-wrapper')) {
            hideSearchDropdown();
        }
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeRemoveModal();
            hideSearchDropdown();
        }
    });

    // Filters
    document.querySelectorAll('.filter-item__checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const value = e.target.value;
            if (e.target.checked) {
                activeFilters.push(value);
            } else {
                activeFilters = activeFilters.filter(f => f !== value);
            }
            filterProducts();
        });
    });

    // Modal close
    modalClose.addEventListener('click', closeProductModal);
    document.querySelectorAll('.modal__overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeProductModal();
                closeRemoveModal();
            }
        });
    });

    // Remove modal
    confirmRemove.addEventListener('click', handleConfirmRemove);
    cancelRemove.addEventListener('click', closeRemoveModal);

    // Profile form
    profileForm.addEventListener('submit', handleProfileSubmit);
}

// Show page
function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('page--active');
    });

    const pageMap = {
        'productList': 'productListPage',
        'cart': 'cartPage',
        'profile': 'profilePage',
        'history': 'historyPage'
    };

    const pageId = pageMap[page] || 'productListPage';
    document.getElementById(pageId).classList.add('page--active');

    if (page === 'cart') {
        renderCart();
    } else if (page === 'history') {
        renderOrders();
    } else if (page === 'productList') {
        filterProducts();
    }
}

// Open product modal
function openProductModal(product) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <img src="${product.image}" alt="${product.title}" class="modal__image" />
        <h3 class="modal__title">${product.title}</h3>
        <div class="modal__category">${product.type.toUpperCase()}</div>
        <p class="modal__description">${product.description}</p>
        <div class="modal__price">${formatPrice(product.price)}</div>
        <button class="btn btn--primary" id="addToCartBtn">Add to cart</button>
    `;

    productModal.classList.add('modal--active');

    document.getElementById('addToCartBtn').addEventListener('click', () => {
        addToCart(product);
        closeProductModal();
    });
}

// Close product modal
function closeProductModal() {
    productModal.classList.remove('modal--active');
}

// Add to cart
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartBadge();
    if (currentPage === 'cart') {
        renderCart();
    }
}

// Remove from cart
function removeFromCart(productId) {
    productToRemove = productId;
    removeModal.classList.add('modal--active');
}

// Handle confirm remove
function handleConfirmRemove() {
    if (productToRemove) {
        cart = cart.filter(item => item.id !== productToRemove);
        saveCart();
        updateCartBadge();
        renderCart();
        productToRemove = null;
    }
    closeRemoveModal();
}

// Close remove modal
function closeRemoveModal() {
    removeModal.classList.remove('modal--active');
    productToRemove = null;
}

// Render cart
function renderCart() {
    if (cart.length === 0) {
        cartContent.style.display = 'none';
        cartEmpty.style.display = 'block';
        return;
    }

    cartContent.style.display = 'block';
    cartEmpty.style.display = 'none';

    cartContent.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item__image" />
            <div class="cart-item__content">
                <div class="cart-item__title">${item.title}</div>
                <div class="cart-item__price">${formatPrice(item.price * item.quantity)}</div>
            </div>
            <button class="cart-item__remove" data-product-id="${item.id}">Remove</button>
        `;
        cartItem.querySelector('.cart-item__remove').addEventListener('click', () => {
            removeFromCart(item.id);
        });
        cartContent.appendChild(cartItem);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'cart-total';
    totalDiv.innerHTML = `Total: <span class="cart-total__amount">${formatPrice(total)}</span>`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'cart-actions';
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (profile.name && profile.email) {
        actionsDiv.innerHTML = `
            <button class="btn btn--primary" id="placeOrderBtn">Place Order</button>
        `;
        actionsDiv.querySelector('#placeOrderBtn').addEventListener('click', placeOrder);
    } else {
        actionsDiv.innerHTML = `
            <button class="btn btn--primary" id="placeOrderBtn">Login to place an order</button>
        `;
        actionsDiv.querySelector('#placeOrderBtn').addEventListener('click', () => {
            alert('Please fill in your profile first');
            showPage('profile');
        });
    }

    cartContent.appendChild(totalDiv);
    cartContent.appendChild(actionsDiv);
}

// Render orders
function renderOrders() {
    if (orders.length === 0) {
        ordersContent.style.display = 'none';
        ordersEmpty.style.display = 'block';
        return;
    }

    ordersContent.style.display = 'block';
    ordersEmpty.style.display = 'none';
    ordersContent.innerHTML = '';

    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        const itemsHtml = order.items.map(item => 
            `<span class="order-item-tag">${item.title}</span>`
        ).join('');
        const total = order.items.reduce((sum, item) => sum + item.price, 0);
        
        orderCard.innerHTML = `
            <div class="order-card__id">Order ${order.id}</div>
            <div class="order-card__date">${order.date}</div>
            <div class="order-card__items">${itemsHtml}</div>
            <div class="order-card__total">Total: ${formatPrice(total)}</div>
        `;
        ordersContent.appendChild(orderCard);
    });
}

// Update cart badge
function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Toggle theme
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark-theme');
    
    if (isDark) {
        html.classList.remove('dark-theme');
        themeIcon.src = 'images/icons/moon.svg';
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark-theme');
        themeIcon.src = 'images/icons/sun.svg';
        localStorage.setItem('theme', 'dark');
    }
}

// Load theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const html = document.documentElement;
    
    if (savedTheme === 'dark') {
        html.classList.add('dark-theme');
        themeIcon.src = 'images/icons/sun.svg';
    } else {
        html.classList.remove('dark-theme');
        themeIcon.src = 'images/icons/moon.svg';
    }
}

// Handle profile submit
function handleProfileSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    
    let isValid = true;
    
    // Clear previous errors
    nameError.textContent = '';
    emailError.textContent = '';
    document.getElementById('profileName').classList.remove('error');
    document.getElementById('profileEmail').classList.remove('error');
    
    // Validate name
    if (!name) {
        nameError.textContent = 'Name is required';
        document.getElementById('profileName').classList.add('error');
        isValid = false;
    }
    
    // Validate email
    if (!email) {
        emailError.textContent = 'E-mail is required';
        document.getElementById('profileEmail').classList.add('error');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Invalid email format';
        document.getElementById('profileEmail').classList.add('error');
        isValid = false;
    }
    
    if (isValid) {
        const profile = {
            name,
            email,
            notifications: document.getElementById('profileNotifications').checked
        };
        localStorage.setItem('profile', JSON.stringify(profile));
        alert('Profile saved successfully!');
    }
}

// Load profile
function loadProfile() {
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileNotifications').checked = profile.notifications || false;
    }
}

// Show search dropdown
function showSearchDropdown() {
    searchDropdown.classList.add('search-dropdown--active');
}

// Hide search dropdown
function hideSearchDropdown() {
    searchDropdown.classList.remove('search-dropdown--active');
}

// Update search dropdown
function updateSearchDropdown() {
    if (!searchQuery.trim()) {
        hideSearchDropdown();
        return;
    }

    const query = searchQuery.toLowerCase();
    const matches = products.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.type.toLowerCase().includes(query)
    ).slice(0, 5);

    if (matches.length === 0) {
        searchDropdown.innerHTML = '<div class="search-dropdown__loading">No results found</div>';
        return;
    }

    searchDropdown.innerHTML = matches.map(product => `
        <div class="search-dropdown__item" data-product-id="${product.id}">
            ${product.title}
        </div>
    `).join('');

    // Add click handlers
    searchDropdown.querySelectorAll('.search-dropdown__item').forEach(item => {
        item.addEventListener('click', () => {
            const productId = item.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                openProductModal(product);
                searchInput.value = '';
                searchQuery = '';
                hideSearchDropdown();
            }
        });
    });
}

// Place order
function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    const order = {
        id: 'ORD-' + Date.now(),
        date: new Date().toLocaleDateString('en-GB'),
        items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price * item.quantity
        }))
    };

    orders.unshift(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
    
    alert('Order placed successfully!');
    showPage('history');
}
