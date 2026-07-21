import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const form = document.getElementById('productForm');
const message = document.getElementById('formMessage');
const accountForm = document.getElementById('accountForm');
const accountMessage = document.getElementById('accountMessage');
const adminList = document.getElementById('adminList');
const storageStatus = document.getElementById('storageStatus');
const adminStatusMessage = document.getElementById('adminStatusMessage');
const heroPhoneField = accountForm ? accountForm.querySelector('input[name="heroPhone"]') : null;
const adminPinField = accountForm ? accountForm.querySelector('input[name="adminPin"]') : null;
const cancelEditBtn = document.getElementById('cancelEditBtn');
let currentEditingProductId = null;

function setAdminStatus(text) {
  if (!adminStatusMessage) return;
  adminStatusMessage.textContent = text;
}

async function loadStorageStatus() {
  if (!storageStatus) return;
  storageStatus.textContent = 'Base: Firebase Firestore';
}

async function loadAdminProducts() {
  if (!adminList) return;

  const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(productsQuery);
  const products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  if (!products.length) {
    adminList.innerHTML = '<p>Aucun produit pour le moment.</p>';
    return;
  }

  adminList.innerHTML = products.map((product) => `
    <div class="admin-item">
      <div>
        <strong>${product.name || 'Produit sans nom'}</strong><br />
        <span>${product.price ? `${Number(product.price).toLocaleString('fr-FR')} TND` : 'Prix non renseigné'}</span>
      </div>
      <div class="admin-item-actions">
        <button class="edit-btn" data-id="${product.id}">Modifier</button>
        <button class="delete-btn" data-id="${product.id}">Supprimer</button>
      </div>
    </div>
  `).join('');
}

async function loadAdminSettings() {
  if (!accountForm) return;

  const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
  if (settingsDoc.exists()) {
    heroPhoneField.value = settingsDoc.data().heroPhone || '';
    if (adminPinField) {
      adminPinField.value = '';
      adminPinField.placeholder = 'Entrez un nouveau code PIN';
    }
  }
}

function resetProductForm() {
  if (!form) return;
  form.reset();
  currentEditingProductId = null;
  const hiddenId = form.querySelector('input[name="productId"]');
  if (hiddenId) hiddenId.value = '';
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
  if (message) message.textContent = '';
}

function fillProductForm(product) {
  if (!form) return;
  const nameField = form.querySelector('input[name="name"]');
  const priceField = form.querySelector('input[name="price"]');
  const phoneField = form.querySelector('input[name="phone"]');
  const idField = form.querySelector('input[name="productId"]');

  if (nameField) nameField.value = product.name || '';
  if (priceField) priceField.value = product.price || '';
  if (phoneField) phoneField.value = product.phone || '';
  if (idField) idField.value = product.id || '';
  currentEditingProductId = product.id || null;
  if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Impossible de lire l\'image.'));
    reader.readAsDataURL(file);
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = form.querySelector('input[type="file"]');
    const idField = form.querySelector('input[name="productId"]');

    if (!auth.currentUser) {
      message.textContent = 'Vous devez être connecté en tant qu\'admin pour gérer un produit.';
      window.location.href = 'login.html';
      return;
    }

    try {
      const image = await readImage(fileInput.files[0]);
      const payload = {
        name: form.querySelector('input[name="name"]').value.trim(),
        price: form.querySelector('input[name="price"]').value.trim(),
        phone: form.querySelector('input[name="phone"]').value.trim(),
        image,
        updatedAt: serverTimestamp()
      };

      if (currentEditingProductId) {
        await updateDoc(doc(db, 'products', currentEditingProductId), payload);
        message.textContent = 'Produit modifié avec succès.';
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), payload);
        message.textContent = 'Produit ajouté avec succès.';
      }

      resetProductForm();
      loadAdminProducts();
    } catch (error) {
      const errorDetails = error?.message || error?.code || 'Erreur inconnue';
      message.textContent = `Impossible d'enregistrer le produit : ${errorDetails}`;
      console.error('Enregistrement produit échoué', error);
    }
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', () => {
    resetProductForm();
  });
}

if (adminList) {
  adminList.addEventListener('click', async (event) => {
    const id = event.target.dataset.id;
    if (!id) return;

    if (event.target.classList.contains('delete-btn')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        loadAdminProducts();
      } catch (error) {
        console.error('Impossible de supprimer le produit.', error);
      }
      return;
    }

    if (event.target.classList.contains('edit-btn')) {
      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        if (productDoc.exists()) {
          fillProductForm({ id: productDoc.id, ...productDoc.data() });
          message.textContent = 'Vous pouvez modifier les informations du produit.';
        }
      } catch (error) {
        console.error('Impossible de charger le produit à modifier.', error);
      }
    }
  });
}

if (accountForm) {
  accountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const heroPhone = heroPhoneField ? heroPhoneField.value.trim() : '';
    const adminPin = adminPinField ? adminPinField.value.trim() : '';

    if (!heroPhone && !adminPin) {
      accountMessage.textContent = 'Entrez un numéro de téléphone ou un nouveau code PIN.';
      return;
    }

    if (!auth.currentUser) {
      accountMessage.textContent = 'Vous devez être connecté en tant qu\'admin pour mettre à jour les paramètres.';
      window.location.href = 'login.html';
      return;
    }

    try {
      const payload = {};
      if (heroPhone) payload.heroPhone = heroPhone;
      if (adminPin) payload.adminPin = adminPin;

      await setDoc(doc(db, 'settings', 'main'), payload, { merge: true });
      accountMessage.textContent = adminPin
        ? 'Le numéro et/ou le code PIN ont été mis à jour.'
        : 'Le numéro de la bannière a été mis à jour.';
      loadAdminSettings();
    } catch (error) {
      const errorDetails = error?.message || error?.code || 'Erreur inconnue';
      accountMessage.textContent = `Impossible de mettre à jour les paramètres : ${errorDetails}`;
      console.error('Mise à jour numéro échouée', error);
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    setAdminStatus('Vous devez vous connecter pour accéder à l\'administration.');
    window.location.href = 'login.html';
    return;
  }

  setAdminStatus(`Connecté en tant que ${user.email}`);
  loadStorageStatus();
  loadAdminProducts();
  loadAdminSettings();
});
