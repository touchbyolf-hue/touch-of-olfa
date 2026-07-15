const form = document.getElementById('productForm');
const nameInput = document.getElementById('name');
const priceInput = document.getElementById('price');
const phoneInput = document.getElementById('phone');
const imageInput = document.getElementById('image');
const previewImg = document.getElementById('preview');
const gallery = document.getElementById('gallery');
const STORAGE_KEY = 'products';

function getProducts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function renderGallery() {
  const products = getProducts();
  if (!products.length) {
    gallery.innerHTML = '<p>Aucun produit pour le moment.</p>';
    return;
  }

  gallery.innerHTML = products.map((product) => `
    <article class="product-card">
      <img src="${product.image || 'https://via.placeholder.com/300x180?text=Produit'}" alt="${product.name}" />
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="price">${Number(product.price).toLocaleString('fr-FR')} FCFA</p>
        <p class="phone">Téléphone : ${product.phone}</p>
      </div>
    </article>
  `).join('');
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    previewImg.src = event.target.result;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      saveProduct(event.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    saveProduct('');
  }
});

function saveProduct(imageData) {
  const products = getProducts();
  products.unshift({
    id: Date.now(),
    name: nameInput.value.trim(),
    price: priceInput.value,
    phone: phoneInput.value.trim(),
    image: imageData
  });
  saveProducts(products);
  renderGallery();
  form.reset();
  previewImg.src = '';
  previewImg.style.display = 'none';
}

renderGallery();
