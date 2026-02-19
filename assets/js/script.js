const PRODUCTS_URL = './assets/data/products.json?t=' + new Date().getTime();
const WHATSAPP_NUMBER = '221764297495'; // Make sure this matches user request

// --- Analytics Tracking ---
function trackVisit() {
  const date = new Date().toISOString().split('T')[0];
  fetch('/api/analytics/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: date })
  }).catch(err => console.error("Analytics Error:", err));
}
document.addEventListener('DOMContentLoaded', trackVisit);
// --------------------------

// State
let products = [];
let cart = JSON.parse(localStorage.getItem('idi_cart')) || [];

// Initialization
// Product Page Logic
function changeImage(src) {
  document.getElementById('product-image').src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  // Find the thumb with this src (simple check) and activate it
  event.target.classList.add('active');
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

function selectSize(el) {
  document.querySelectorAll('.size-btn').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

function updateQty(change) {
  const input = document.getElementById('qty-input');
  let val = parseInt(input.value) + change;
  if (val < 1) val = 1;
  input.value = val;
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

function buyNowWhatsApp() {
  const product = getCurrentProduct(); // Need to ensure we have product context
  if (!product) return;
  const qty = document.getElementById('qty-input').value;
  const msg = `Bonjour, je veux acheter: ${product.name} (x${qty}). Prix: ${formatCurrency(product.price * qty)}.`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function getCurrentProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  return products.find(p => p.id == productId);
}

// Update existing render logic if needed, but the static functions above handle UI interaction.
// We need to make sure the main render initializes the thumbnail active state.

async function init() {

  // --- Analytics: Product View Check ---
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (productId) {
    fetch('/api/analytics/view_product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    }).catch(err => console.error("Analytics Error (View):", err));
  }
  // -------------------------------------

  await fetchProducts();

  // Search Logic
  // urlParams is already defined at top of init
  const searchQuery = urlParams.get('search');

  if (searchQuery) {
    const term = searchQuery.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
    // Update active nav or title if on shop page
    const title = document.querySelector('h1');
    if (title && document.getElementById('product-list')) {
      title.innerHTML = `Résultats pour "${searchQuery}" <small>(${products.length})</small>`;
    }
    // Fill search input if present
    const searchInput = document.querySelector('.search-input');
    if (searchInput) searchInput.value = searchQuery;
  }

  updateCartBadge();

  // Page specific init
  if (document.getElementById('product-list')) {
    renderProducts(products, 'product-list');
  }
  if (document.getElementById('featured-products')) {
    renderProducts(products, 'featured-products');
  }

  initSlider(); // Start slider if elements exist

  if (document.getElementById('cart-items')) {
    renderCart();
  }

  // Product Detail Page
  // productId is already defined at the top of init()
  console.log('Init: Checking product page...', { productId, hasElementName: !!document.getElementById('product-name') });

  // Check for any unique element on the product page
  if (productId && document.getElementById('product-name')) {
    console.log('Init: Detected product page, rendering...');
    await renderProductDetail(productId);
  } else {
    console.log('Init: Not on product page or missing ID');
  }
}

// Fetch Products
async function fetchProducts() {
  try {
    const response = await fetch(PRODUCTS_URL);
    products = await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Render Products (AliExpress Card Style)
function renderProducts(productsToRender, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return; // Guard clause

  container.className = 'grid-container'; // Force grid class

  container.innerHTML = productsToRender.map(product => {
    // Calculate discount
    const discount = product.original_price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : 0;

    return `
    <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
      <div class="product-image-container">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
      </div>
      <div class="product-info">
        <div class="product-title">${product.name}</div>
        <div class="price-container">
          <span class="current-price">${formatCurrency(product.price)}</span>
          ${product.original_price ? `<span class="original-price">${formatCurrency(product.original_price)}</span>` : ''}
        </div>
        <div class="meta-info">
          <span class="rating">★ ${product.rating || '4.5'}</span>
          <span class="sold-count">${product.sold || '0'} vendus</span>
        </div>
        <button class="add-btn" onclick="event.stopPropagation(); addToCart(${product.id})">Ajouter</button>
      </div>
    </div>
  `}).join('');
}

// Render Product Detail (Updated for new fields)
async function renderProductDetail(id) {
  console.log('Rendering Product:', id);
  // Ensure products are loaded if called directly (though init awaits it)
  if (products.length === 0) await fetchProducts();

  const product = products.find(p => p.id == id);
  if (!product) {
    console.error('Product not found in list:', id, products);
    document.getElementById('product-name').innerText = "Produit introuvable";
    return;
  }
  console.log('Product Data:', product);

  document.getElementById('product-name').innerText = product.name;
  document.getElementById('breadcrumb-name').innerText = product.name;

  // Set Images
  // Set Images
  const mainImg = document.getElementById('product-image');
  let mainImageSrc = product.image;
  if (product.images && product.images.length > 0) {
    mainImageSrc = product.images[0];
  }
  if (mainImg) mainImg.src = mainImageSrc;

  // Update Thumbnails
  const thumbnailsRow = document.querySelector('.thumbnails-row');
  if (thumbnailsRow) {
    thumbnailsRow.innerHTML = ''; // Clear existing

    let imagesToDisplay = [];
    if (product.images && product.images.length > 0) {
      imagesToDisplay = product.images;
    } else if (product.image) {
      imagesToDisplay = [product.image];
    }

    imagesToDisplay.forEach((imgUrl, index) => {
      const thumbDiv = document.createElement('div');
      thumbDiv.className = `thumb-item ${index === 0 ? 'active' : ''}`;
      thumbDiv.onclick = function () {
        changeImage(imgUrl);
        document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      };

      const thumbImg = document.createElement('img');
      thumbImg.src = imgUrl;
      thumbImg.alt = `Vue ${index + 1}`;

      thumbDiv.appendChild(thumbImg);
      thumbnailsRow.appendChild(thumbDiv);
    });
  }

  // Price
  const priceContainer = document.getElementById('product-price');
  if (product.original_price) {
    priceContainer.innerHTML = `
      <span class="current-price" style="font-size: 2rem; font-weight: 800; color: var(--primary-color);">${formatCurrency(product.price)}</span>
      <span class="original-price" style="text-decoration: line-through; margin-left:10px; font-size: 1.2rem; color: #999;">${formatCurrency(product.original_price)}</span>
      <span class="discount-badge" style="position:static; margin-left:10px;">-${Math.round(((product.original_price - product.price) / product.original_price) * 100)}%</span>
    `;
  } else {
    priceContainer.innerHTML = `<span class="current-price" style="font-size: 2rem; font-weight: 800; color: var(--primary-color);">${formatCurrency(product.price)}</span>`;
  }

  const descEl = document.getElementById('product-description');
  if (descEl) descEl.innerText = product.description || "Description détaillée du produit...";

  // Update Add to Cart Button (Handle both old and new buttons if present, favoring new)
  const btn = document.getElementById('add-to-cart-btn');
  if (btn) {
    btn.onclick = () => {
      const qtyInput = document.getElementById('qty-input');
      const qty = qtyInput ? parseInt(qtyInput.value) : 1;
      addToCart(product.id, qty);
    };
  }
}

// Product Page Interaction Functions
function changeImage(src) {
  document.getElementById('product-image').src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

function selectSize(el) {
  document.querySelectorAll('.size-btn').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

// Overwrite global updateQty to handle both cart (2 args) and product page (1 arg) context if needed, 
// but easier to keep them separate or check args. 
// The cart uses updateQty(id, change), product page uses updateQty(change).
// Let's rename the product page one to avoid conflict or check arguments.
function updateProductQty(change) {
  const input = document.getElementById('qty-input');
  if (!input) return;
  let val = parseInt(input.value) + change;
  if (val < 1) val = 1;
  input.value = val;
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Find button that triggered this
  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase().includes(tabId) || b.getAttribute('onclick').includes(tabId));
  if (btn) btn.classList.add('active');

  const tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');
}

function buyNowWhatsApp() {
  const product = getCurrentProduct();
  if (!product) return;
  const qtyInput = document.getElementById('qty-input');
  const qty = qtyInput ? parseInt(qtyInput.value) : 1;
  const msg = `Bonjour, je veux acheter: ${product.name} (x${qty}). Prix: ${formatCurrency(product.price * qty)}.`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// Cart Logic
function addToCart(id, qty = 1) {
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.qty += qty;
  } else {
    // We need to wait for products to be loaded if adding from URL params or direct ID
    const product = products.find(p => p.id === id);
    if (!product) return; // Should not happen if products loaded
    cart.push({ ...product, qty });
  }
  saveCart();
  updateCartBadge();
  alert('Ajouté au panier !');
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart(); // Re-render cart page
  updateCartBadge();
}

function updateQty(id, change) {
  const item = cart.find(item => item.id === id);
  if (item) {
    item.qty += change;
    if (item.qty <= 0) removeFromCart(id);
    else {
      saveCart();
      renderCart();
      updateCartBadge();
    }
  }
}

function saveCart() {
  localStorage.setItem('idi_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? 'inline-block' : 'none';
    if (totalQty === 0) badge.style.display = 'none';
  }
}

// Render Cart Page
function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const finalTotalEl = document.getElementById('cart-final-total'); // Update both totals

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="padding: 40px; text-align: center; color: #636e72;">Votre panier est vide.</p>';
    if (totalEl) totalEl.textContent = formatCurrency(0);
    if (finalTotalEl) finalTotalEl.textContent = formatCurrency(0);
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    // Check if item.image is defined, else use placeholder
    const imageSrc = item.image || 'https://via.placeholder.com/150';

    return `
      <div class="cart-item-row">
        <!-- Product -->
        <div class="cart-product-cell">
          <img src="${imageSrc}" alt="${item.name}">
          <div class="cart-product-details">
            <h4>${item.name}</h4>
            ${item.category ? `<span>${item.category}</span>` : ''}
          </div>
        </div>
        
        <!-- Price -->
        <div class="cart-price-cell">
          ${formatCurrency(item.price)}
        </div>

        <!-- Quantity -->
        <div style="display: flex; justify-content: center;">
            <div class="qty-control">
                <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
            </div>
        </div>

        <!-- Total -->
        <div class="cart-total-cell" style="text-align: right;">
          ${formatCurrency(itemTotal)}
        </div>

        <!-- Remove -->
        <div style="display: flex; justify-content: flex-end;">
            <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Supprimer">
                <i class="ri-close-line"></i>
            </button>
        </div>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (finalTotalEl) finalTotalEl.textContent = formatCurrency(total);
}



// Checkout WhatsApp
function checkoutWhatsApp() {
  if (cart.length === 0) {
    alert('Votre panier est vide.');
    return;
  }

  let message = "Bonjour Idi's House 👋\nJe souhaite commander :\n\n";
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    message += `🛒 ${item.name} — Qté : ${item.qty} — Prix : ${formatCurrency(item.price)}\n`;
  });

  message += `\n💰 Total : ${formatCurrency(total)}\n\nMerci de confirmer ma commande 🙏`;

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  window.open(url, '_blank');
}

// Utilities
function formatCurrency(amount) {
  // Use a compact format for mobile
  return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
}


// Slider Logic
function initSlider() {
  const slides = document.querySelectorAll('.slide');
  if (slides.length === 0) return;

  let currentSlide = 0;
  const slideInterval = setInterval(nextSlide, 5000); // Change every 5 seconds

  function nextSlide() {
    slides[currentSlide].className = 'slide';
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].className = 'slide active';
  }
}

// Search Form Listener
function initSearch() {
  const forms = document.querySelectorAll('.search-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.search-input');
      const query = input.value.trim();
      if (query) {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initSearch();
});
