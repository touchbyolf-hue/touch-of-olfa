import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Remplacez les valeurs ci-dessous par votre configuration Firebase Web.
// ProjectId, authDomain et storageBucket sont spécifiques à votre projet.
export const firebaseConfig = {
  apiKey: 'AIzaSyCpdn8KP_GNpY11tnobYOKS3L3xa33pAFI',
  authDomain: 'touch-of-olfa.firebaseapp.com',
  databaseURL: 'https://touch-of-olfa-default-rtdb.firebaseio.com',
  projectId: 'touch-of-olfa',
  storageBucket: 'touch-of-olfa.firebasestorage.app',
  messagingSenderId: '972132725185',
  appId: '1:972132725185:web:25ec950a4b09134fd97f40',
  measurementId: 'G-1LVD5GXLRK'
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value === 'string' && value.startsWith('REPLACE_'))
  .map(([key]) => key);

export const firebaseConfigValid = missingKeys.length === 0;
if (!firebaseConfigValid) {
  console.error(
    'Firebase config incomplete: remplissez public/firebase-config.js avec les valeurs Web SDK Firebase.',
    missingKeys
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
