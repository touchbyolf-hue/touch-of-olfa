import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
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
      <button class="delete-btn" data-id="${product.id}">Supprimer</button>
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

    if (!auth.currentUser) {
      message.textContent = 'Vous devez être connecté en tant qu\'admin pour ajouter un produit.';
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
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'products'), payload);
      message.textContent = 'Produit ajouté avec succès.';
      form.reset();
      loadAdminProducts();
    } catch (error) {
      const errorDetails = error?.message || error?.code || 'Erreur inconnue';
      message.textContent = `Impossible d'ajouter le produit : ${errorDetails}`;
      console.error('Ajout produit échoué', error);
    }
  });
}

if (adminList) {
  adminList.addEventListener('click', async (event) => {
    const id = event.target.dataset.id;
    if (!id || !event.target.classList.contains('delete-btn')) return;

    try {
      await deleteDoc(doc(db, 'products', id));
      loadAdminProducts();
    } catch (error) {
      console.error('Impossible de supprimer le produit.', error);
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
