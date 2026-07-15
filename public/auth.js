import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const loginForm = document.getElementById('loginForm');
const message = document.getElementById('message');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const email = form.get('email');
    const password = form.get('password');

    if (!email || !password) {
      message.textContent = 'Veuillez saisir l’email et le mot de passe.';
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'admin.html';
    } catch (error) {
      console.error('Firebase login error:', error);
      message.textContent = `Connexion impossible : ${error.message}`;
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith('login.html')) {
    window.location.href = 'admin.html';
  }
});
