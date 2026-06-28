/**
 * FakeStore API E-commerce Application
 * Trabajo Final Integrador (TFI) - Vanilla JS, HTML5 y CSS3 Moderno
 */

// URL Base de la API
const API_URL = 'https://fakestoreapi.com';

// ==========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN (Single Source of Truth)
// ==========================================================================
const state = {
  products: [],         // Todos los productos cargados
  categories: [],       // Categorías de la tienda
  cart: [],             // Elementos del carrito: [{ product, quantity }]
  filters: {
    category: 'all',    // Categoría seleccionada ('all' o nombre de la categoría)
    searchQuery: ''     // Texto del buscador en tiempo real
  },
  ui: {
    loading: false,     // Loader principal
    error: null,        // Mensaje de error
    activeProduct: null // Producto seleccionado para ver en el Modal
  }
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * Función principal de arranque de la aplicación
 */
async function initApp() {
  initTheme(); // Inicializa el Modo Oscuro y escucha cambios de tema
  initEventListeners();
  loadCartFromLocalStorage();
  renderCart(); // Renderiza el carrito guardado
  
  // Cargar datos de la API
  await fetchInitialData();
}

/**
 * Realiza las llamadas concurrentes a la API para traer productos y categorías
 */
async function fetchInitialData() {
  setLoading(true);
  setError(null);
  
  try {
    // Realizamos las peticiones en paralelo para optimizar tiempo de carga
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${API_URL}/products`),
      fetch(`${API_URL}/products/categories`)
    ]);

    if (!productsRes.ok || !categoriesRes.ok) {
      throw new Error('Error al conectar con la API de FakeStore');
    }

    state.products = await productsRes.json();
    state.categories = await categoriesRes.json();
    
    setLoading(false);
    
    // Renderizado inicial de vistas
    renderCategories();
    applyFiltersAndRender();
    
  } catch (error) {
    console.error('Error fetching data:', error);
    setLoading(false);
    setError(error.message || 'Error de conexión con el servidor. Inténtelo de nuevo.');
  }
}

// ==========================================================================
// EVENT LISTENERS & DELEGACIÓN DE EVENTOS
// ==========================================================================
function initEventListeners() {
  // Buscador en tiempo real
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    state.filters.searchQuery = e.target.value.toLowerCase().trim();
    applyFiltersAndRender();
  });

  // Botón de reintento en caso de error
  const retryBtn = document.getElementById('retry-btn');
  retryBtn.addEventListener('click', () => {
    fetchInitialData();
  });

  // --- EVENTOS DEL PANEL DEL CARRITO (DRAWER) ---
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartBackToShop = document.getElementById('cart-back-to-shop');
  const clearCartBtn = document.getElementById('clear-cart-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  cartToggleBtn.addEventListener('click', () => toggleCartDrawer(true));
  cartCloseBtn.addEventListener('click', () => toggleCartDrawer(false));
  cartOverlay.addEventListener('click', () => toggleCartDrawer(false));
  cartBackToShop.addEventListener('click', () => toggleCartDrawer(false));
  
  clearCartBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      clearCart();
    }
  });

  checkoutBtn.addEventListener('click', () => {
    alert('🎉 ¡Gracias por tu compra simulada! Tu pedido ha sido procesado con éxito.');
    clearCart();
    toggleCartDrawer(false);
  });

  // --- EVENTOS DEL MODAL DE DETALLES ---
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalOverlay = document.getElementById('modal-overlay');

  modalCloseBtn.addEventListener('click', closeProductModal);
  modalOverlay.addEventListener('click', closeProductModal);

  // Cerrar diálogos con tecla Escape (Accesibilidad)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      toggleCartDrawer(false);
    }
  });

  // --- CLICS EN LA GRILLA DE PRODUCTOS (DELEGACIÓN DE EVENTOS) ---
  const productsGrid = document.getElementById('products-grid');
  productsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;

    const productId = parseInt(card.dataset.id, 10);
    
    // Si hace clic en el botón de agregar al carrito
    const cartBtn = e.target.closest('.product-card-btn');
    if (cartBtn) {
      e.stopPropagation();
      addToCart(productId);
      return;
    }

    // De lo contrario, abrir modal de detalles del producto
    openProductModal(productId);
  });
}

// ==========================================================================
// CONTROL DE ESTADOS DE CARGA Y ERROR (UI CONTROLLER)
// ==========================================================================
function setLoading(isLoading) {
  state.ui.loading = isLoading;
  const grid = document.getElementById('products-grid');
  
  if (isLoading) {
    // Spinner principal + esqueleto de tarjetas para maquetación
    grid.innerHTML = `
      <div class="spinner-container" id="main-spinner">
        <div class="spinner" aria-hidden="true"></div>
        <p>Cargando catálogo premium...</p>
      </div>
      ${Array(4).fill(null).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-btn"></div>
        </div>
      `).join('')}
    `;
    
    document.getElementById('categories-container').innerHTML = `
      <div class="skeleton-categories">
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
      </div>
    `;
  }
}

function setError(errorMessage) {
  state.ui.error = errorMessage;
  const errorContainer = document.getElementById('error-container');
  const catalogSection = document.getElementById('catalog-section');
  const categoriesNav = document.querySelector('.categories-nav');
  
  if (errorMessage) {
    document.getElementById('error-message').textContent = errorMessage;
    errorContainer.classList.remove('hidden');
    catalogSection.classList.add('hidden');
    categoriesNav.classList.add('hidden');
  } else {
    errorContainer.classList.add('hidden');
    catalogSection.classList.remove('hidden');
    categoriesNav.classList.remove('hidden');
  }
}

// ==========================================================================
// LÓGICA DE FILTRADO Y RENDERIZADO DE PRODUCTOS
// ==========================================================================
function applyFiltersAndRender() {
  let filtered = [...state.products];

  // 1. Filtrar por categoría
  if (state.filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === state.filters.category);
  }

  // 2. Filtrar por buscador
  if (state.filters.searchQuery) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(state.filters.searchQuery) ||
      p.description.toLowerCase().includes(state.filters.searchQuery)
    );
  }

  renderProducts(filtered);
}

/**
 * Renderiza el listado de productos en la grilla principal
 */
function renderProducts(productsList) {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');

  if (productsList.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  grid.innerHTML = productsList.map(product => {
    const starsHTML = generateRatingStars(product.rating?.rate || 0);
    // Sanear categoría para crear la clase CSS pastel adecuada
    const categoryClass = `cat-${product.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-card-img-wrapper">
          <img src="${product.image}" alt="${product.title}" class="product-card-img" loading="lazy">
        </div>
        <div class="product-card-info">
          <span class="product-card-badge ${categoryClass}">${product.category}</span>
          <h3 class="product-card-title">${product.title}</h3>
          <div class="product-card-rating">
            <span class="rating-stars" aria-hidden="true">${starsHTML}</span>
            <span class="rating-count">(${product.rating?.count || 0})</span>
          </div>
          <div class="product-card-footer">
            <span class="product-card-price">${formatPrice(product.price)}</span>
            <button class="product-card-btn" aria-label="Añadir ${product.title} al carrito">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Renderiza dinámicamente los botones de categorías (Pills)
 */
function renderCategories() {
  const container = document.getElementById('categories-container');
  
  // Agregar opción 'todos' al inicio
  const allCategories = ['all', ...state.categories];
  
  container.innerHTML = allCategories.map(cat => {
    const isActive = state.filters.category === cat;
    const label = cat === 'all' ? 'Todos' : cat;
    
    return `
      <button 
        class="category-btn ${isActive ? 'active' : ''}" 
        data-category="${cat}"
        aria-pressed="${isActive}"
      >
        ${label}
      </button>
    `;
  }).join('');

  // Event listener para los botones de categorías
  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.dataset.category;
      
      // Actualizar estado de filtro
      state.filters.category = category;
      
      // Cambiar clase active visualmente de inmediato
      container.querySelectorAll('.category-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      e.target.classList.add('active');
      e.target.setAttribute('aria-pressed', 'true');
      
      // Aplicar filtros
      applyFiltersAndRender();
    });
  });
}

// ==========================================================================
// MODAL DE DETALLE DE PRODUCTO
// ==========================================================================
function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.ui.activeProduct = product;
  const modal = document.getElementById('product-modal');
  const modalContent = document.getElementById('modal-body-content');
  const starsHTML = generateRatingStars(product.rating?.rate || 0);

  modalContent.innerHTML = `
    <div class="modal-product-details">
      <div class="modal-product-img-wrapper">
        <img src="${product.image}" alt="${product.title}" class="modal-product-img">
      </div>
      <div class="modal-product-info">
        <span class="modal-product-category">${product.category}</span>
        <h2 class="modal-product-title" id="modal-title">${product.title}</h2>
        <div class="modal-product-rating">
          <span class="rating-stars" aria-hidden="true">${starsHTML}</span>
          <span><strong>${product.rating?.rate || 0}</strong> de 5 (${product.rating?.count || 0} valoraciones)</span>
        </div>
        <p class="modal-product-description">${product.description}</p>
        <div class="modal-product-price">${formatPrice(product.price)}</div>
        <div class="modal-product-actions">
          <button id="modal-add-to-cart-btn" class="btn btn-primary btn-block">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Añadir al Carrito
          </button>
        </div>
      </div>
    </div>
  `;

  // Listener para botón de agregar al carrito dentro del modal
  document.getElementById('modal-add-to-cart-btn').addEventListener('click', () => {
    addToCart(product.id);
    closeProductModal();
  });

  // Mostrar modal activando la accesibilidad
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Evita scroll de fondo
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.ui.activeProduct = null;
}

// ==========================================================================
// CARRITO DE COMPRAS (SIMULACIÓN Y PERSISTENCIA)
// ==========================================================================
function toggleCartDrawer(show) {
  const drawer = document.getElementById('cart-drawer');
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  
  if (show) {
    drawer.setAttribute('aria-hidden', 'false');
    cartToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.setAttribute('aria-hidden', 'true');
    cartToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/**
 * Agrega un producto al carrito o incrementa la cantidad
 */
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existingItemIndex = state.cart.findIndex(item => item.product.id === productId);

  if (existingItemIndex > -1) {
    // Si ya existe y la cantidad es menor a 10 (regla de negocio opcional)
    if (state.cart[existingItemIndex].quantity < 10) {
      state.cart[existingItemIndex].quantity++;
    } else {
      alert('Has alcanzado el límite máximo de 10 unidades de este producto en el carrito.');
      return;
    }
  } else {
    // Nuevo elemento
    state.cart.push({ product, quantity: 1 });
  }

  // Micro-animación de popup en la cantidad del carrito
  animateCartBadge();
  
  saveCartToLocalStorage();
  renderCart();
}

/**
 * Modifica la cantidad de un artículo existente en el carrito
 */
function updateCartQuantity(productId, change) {
  const itemIndex = state.cart.findIndex(item => item.product.id === productId);
  if (itemIndex === -1) return;

  state.cart[itemIndex].quantity += change;

  // Si llega a 0, se remueve automáticamente
  if (state.cart[itemIndex].quantity <= 0) {
    state.cart.splice(itemIndex, 1);
  }

  saveCartToLocalStorage();
  renderCart();
}

/**
 * Elimina un producto por completo del carrito
 */
function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.product.id !== productId);
  saveCartToLocalStorage();
  renderCart();
}

/**
 * Limpia todo el carrito
 */
function clearCart() {
  state.cart = [];
  saveCartToLocalStorage();
  renderCart();
}

/**
 * Renderiza los elementos del carrito en el drawer lateral
 */
function renderCart() {
  const listContainer = document.getElementById('cart-items-list');
  const emptyState = document.getElementById('cart-empty-state');
  const summarySection = document.getElementById('cart-summary');
  const cartBadge = document.getElementById('cart-badge');
  const cartTotalCount = document.getElementById('cart-total-count');
  const cartTotalPrice = document.getElementById('cart-total-price');

  // Calcular totales
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Actualizar badges
  cartBadge.textContent = totalCount;
  cartTotalCount.textContent = totalCount;
  cartTotalPrice.textContent = formatPrice(totalPrice);

  if (state.cart.length === 0) {
    emptyState.style.display = 'flex';
    summarySection.style.display = 'none';
    listContainer.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  summarySection.style.display = 'flex';

  listContainer.innerHTML = state.cart.map(item => `
    <li class="cart-item">
      <div class="cart-item-img-wrapper">
        <img src="${item.product.image}" alt="${item.product.title}" class="cart-item-img">
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.product.title}</h4>
        <div class="cart-item-price">${formatPrice(item.product.price)}</div>
        <div class="cart-item-controls">
          <div class="cart-quantity-selector">
            <button class="qty-btn" aria-label="Disminuir cantidad" onclick="updateCartQuantity(${item.product.id}, -1)">-</button>
            <span class="cart-item-qty" aria-label="Cantidad">${item.quantity}</span>
            <button class="qty-btn" aria-label="Aumentar cantidad" onclick="updateCartQuantity(${item.product.id}, 1)" ${item.quantity >= 10 ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>
      <button class="cart-item-delete" aria-label="Quitar ${item.product.title} del carrito" onclick="removeFromCart(${item.product.id})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </li>
  `).join('');
}

// Hacer globales las funciones que son invocadas desde los atributos onclick del HTML generado dinámicamente
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;

// --- PERSISTENCIA LOCAL STORAGE ---
function saveCartToLocalStorage() {
  localStorage.setItem('fakestore_cart', JSON.stringify(state.cart));
}

function loadCartFromLocalStorage() {
  const saved = localStorage.getItem('fakestore_cart');
  if (saved) {
    try {
      state.cart = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing localStorage cart:', e);
      state.cart = [];
    }
  }
}

// ==========================================================================
// HELPERS & UTILIDADES
// ==========================================================================
/**
 * Formatea un valor numérico a moneda estadounidense (USD)
 */
function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Genera el string HTML de estrellas de puntuación basadas en un valor decimal
 */
function generateRatingStars(rate) {
  const fullStars = Math.round(rate);
  const emptyStars = 5 - fullStars;
  
  return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
}

/**
 * Lanza una micro-animación en el badge del carrito
 */
function animateCartBadge() {
  const badge = document.getElementById('cart-badge');
  badge.classList.remove('badge-pop');
  // Forzar reflow para reiniciar la animación
  void badge.offsetWidth;
  badge.classList.add('badge-pop');
}

/**
 * Inicializa y controla el Modo Oscuro (Dark Mode) con persistencia local
 */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme');

  // Aplicar tema guardado o preferencia del sistema
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  // Toggle de la clase .dark-mode al presionar el botón
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}
