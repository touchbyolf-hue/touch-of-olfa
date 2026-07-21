import { db, firebaseConfigValid } from './firebase-config.js';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

function showGalleryMessage(text) {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  gallery.innerHTML = `<p>${text}</p>`;
}

function getStoredItems(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    return [];
  }
}

function saveStoredItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function toggleStoredItem(key, productId) {
  const items = getStoredItems(key);
  const exists = items.includes(productId);
  const nextItems = exists ? items.filter((id) => id !== productId) : [...items, productId];
  saveStoredItems(key, nextItems);
  return nextItems;
}

function removeStoredItem(key, productId) {
  const items = getStoredItems(key).filter((id) => id !== productId);
  saveStoredItems(key, items);
  return items;
}

function renderStoredItemsList(containerId, key, emptyMessage, productsMap) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const itemIds = getStoredItems(key);
  const items = itemIds
    .map((id) => productsMap[id])
    .filter(Boolean);

  if (!items.length) {
    container.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  const actionKey = key === 'cartProducts' ? 'removeCart' : 'removeFavorite';
  const actionLabel = key === 'cartProducts' ? 'Retirer du panier' : 'Retirer des favoris';

  container.innerHTML = items.map((product) => {
    const productName = product.name || 'Produit sans nom';
    const productImage = product.image || 'https://via.placeholder.com/120x100?text=Produit';
    const productPrice = product.price
      ? `${Number(product.price).toLocaleString('fr-FR')} TND`
      : 'Prix non renseigné';

    return `
      <article class="collection-item">
        <img src="${productImage}" alt="${productName}" />
        <div class="collection-item-info">
          <h3>${productName}</h3>
          <p class="price">${productPrice}</p>
        </div>
        <button class="product-btn remove-btn" data-action="${actionKey}" data-product-id="${product.id}">
          ${actionLabel}
        </button>
      </article>
    `;
  }).join('');
}

function updateInteractionSummary(products = []) {
  const cartCountEl = document.getElementById('cartCount');
  const favoriteCountEl = document.getElementById('favoriteCount');
  const cartListEl = document.getElementById('cartList');
  const favoriteListEl = document.getElementById('favoriteList');

  const productsMap = Array.isArray(products)
    ? Object.fromEntries(products.map((product) => [product.id, product]))
    : {};

  if (cartCountEl) cartCountEl.textContent = getStoredItems('cartProducts').length;
  if (favoriteCountEl) favoriteCountEl.textContent = getStoredItems('favoriteProducts').length;

  if (cartListEl) {
    renderStoredItemsList('cartList', 'cartProducts', 'Aucun produit dans le panier.', productsMap);
  }

  if (favoriteListEl) {
    renderStoredItemsList('favoriteList', 'favoriteProducts', 'Aucun produit en favoris.', productsMap);
  }
}

async function loadProducts() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;

  if (!firebaseConfigValid) {
    showGalleryMessage(
      'Configuration Firebase manquante : remplissez public/firebase-config.js avec apiKey, messagingSenderId et appId.'
    );
    return;
  }

  try {
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(productsQuery);
    const products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

    if (!products.length) {
      gallery.innerHTML = '<p>Aucun produit pour le moment.</p>';
      updateInteractionSummary(products);
      return;
    }

    gallery.innerHTML = products.map((product) => {
      const productName = product.name || 'Produit sans nom';
      const productImage = product.image || 'https://via.placeholder.com/300x260?text=Produit';
      const productPrice = product.price
        ? `${Number(product.price).toLocaleString('fr-FR')} TND`
        : 'Prix non renseigné';
      const isInCart = getStoredItems('cartProducts').includes(product.id);
      const isFavorite = getStoredItems('favoriteProducts').includes(product.id);
      const phoneSection = product.phone ? `
        <p class="phone">Tel. <a href="tel:${product.phone}">${product.phone}</a></p>
      ` : '';

      return `
        <article class="product-card">
          <div class="product-image-wrap">
            <img src="${productImage}" alt="${productName}" data-preview="${productImage}" />
          </div>
          <div class="product-info">
            <h3>${productName}</h3>
            <p class="price">${productPrice}</p>
            ${phoneSection}
            <div class="product-actions">
              <button class="product-btn cart-btn" data-action="cart" data-product-id="${product.id}">
                ${isInCart ? 'Retirer du panier' : 'Ajouter au panier'}
              </button>
              <button class="product-btn favorite-btn" data-action="favorite" data-product-id="${product.id}">
                ${isFavorite ? '★ Favori' : '☆ Favori'}
              </button>
              ${product.phone ? `<a href="tel:${product.phone}" class="product-btn">Appeler</a>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    updateInteractionSummary(products);
  } catch (error) {
    console.error('Erreur de chargement des produits Firebase :', error);
    showGalleryMessage(
      'Impossible de charger les produits. Vérifiez la configuration Firebase dans public/firebase-config.js et les règles Firestore.'
    );
  }
}

function initImagePreview() {
  const gallery = document.getElementById('gallery');
  const overlay = document.getElementById('imagePreviewOverlay');
  const previewImage = document.getElementById('previewImage');
  const closePreviewBtn = document.getElementById('closePreviewBtn');

  if (!gallery || !overlay || !previewImage) return;

  gallery.addEventListener('click', (event) => {
    const img = event.target.closest('img[data-preview]');
    if (!img) return;
    previewImage.src = img.getAttribute('data-preview');
    overlay.classList.remove('hidden');
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const productId = button.getAttribute('data-product-id');
    const action = button.getAttribute('data-action');
    if (!productId) return;

    if (action === 'cart') {
      toggleStoredItem('cartProducts', productId);
    } else if (action === 'favorite') {
      toggleStoredItem('favoriteProducts', productId);
    } else if (action === 'removeCart') {
      removeStoredItem('cartProducts', productId);
    } else if (action === 'removeFavorite') {
      removeStoredItem('favoriteProducts', productId);
    }

    updateInteractionSummary();
    loadProducts();
  });

  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      previewImage.src = '';
    });
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      overlay.classList.add('hidden');
      previewImage.src = '';
    }
  });
}

let adminPinValue = '1234';

async function loadAdminPin() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
    if (settingsDoc.exists() && settingsDoc.data().adminPin) {
      adminPinValue = settingsDoc.data().adminPin;
    }
  } catch (error) {
    console.warn('Impossible de charger le code PIN admin.', error);
  }
}

async function loadHeroPhone() {
  const heroPhoneEl = document.querySelector('.hero-phone');
  if (!heroPhoneEl) return;

  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
    if (settingsDoc.exists() && settingsDoc.data().heroPhone) {
      heroPhoneEl.textContent = `Tel. ${settingsDoc.data().heroPhone}`;
    }
  } catch (error) {
    console.warn('Impossible de charger le numéro de téléphone de la bannière.', error);
  }
}

function initInteractionSummaryActions() {
  document.querySelectorAll('.summary-pill[data-target]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const targetId = pill.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function initAdminLogin() {
  const adminPinForm = document.getElementById('adminPinForm');
  const adminPinSection = document.getElementById('adminPinSection');
  const adminLoginForm = document.getElementById('mainLoginForm');
  const adminLoginSection = document.getElementById('adminLoginSection');
  const adminIcon = document.getElementById('adminIcon');
  const adminPinMessage = document.getElementById('adminPinMessage');

  if (adminIcon && adminPinSection) {
    adminIcon.addEventListener('click', (event) => {
      event.stopPropagation();
      adminPinSection.classList.toggle('hidden');
      adminLoginSection?.classList.add('hidden');
      if (!adminPinSection.classList.contains('hidden')) {
        adminPinSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    document.addEventListener('click', (event) => {
      const pinVisible = adminPinSection && !adminPinSection.classList.contains('hidden');
      const loginVisible = adminLoginSection && !adminLoginSection.classList.contains('hidden');
      if (!pinVisible && !loginVisible) return;
      const isInside = (adminPinSection && adminPinSection.contains(event.target)) ||
        (adminLoginSection && adminLoginSection.contains(event.target)) ||
        adminIcon.contains(event.target);
      if (!isInside) {
        adminPinSection.classList.add('hidden');
        adminLoginSection?.classList.add('hidden');
      }
    });
  }

  if (adminPinForm) {
    adminPinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const pinInput = document.getElementById('adminPinInput');
      const enteredPin = pinInput ? pinInput.value.trim() : '';

      if (enteredPin === adminPinValue) {
        adminPinSection.classList.add('hidden');
        if (pinInput) pinInput.value = '';
        window.location.href = 'admin.html';
      } else {
        if (adminPinMessage) {
          adminPinMessage.textContent = 'Code PIN incorrect. Réessayez.';
        }
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      window.location.href = 'login.html';
    });
  }
}

Promise.all([loadProducts(), loadAdminPin()])
  .then(() => {
    initImagePreview();
    initInteractionSummaryActions();
    return loadHeroPhone();
  })
  .catch((error) => {
    console.error('Erreur de chargement de la page:', error);
  });

initAdminLogin();
