const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const dataFile = path.join(__dirname, 'data.json');
const ROOT_COLLECTION = 'touchByOlfa';
const APP_DOC = 'main';
const META_COLLECTION = 'meta';
const PRODUCTS_COLLECTION = 'products';
const FIREBASE_TIMEOUT_MS = 8000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), FIREBASE_TIMEOUT_MS);
    })
  ]);
}

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }

  const localServiceAccount = path.join(__dirname, 'firebase-service-account.json');
  if (fs.existsSync(localServiceAccount)) {
    return require(localServiceAccount);
  }

  return undefined;
}

function createFirebaseDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccount = parseServiceAccount();

  if (serviceAccount === undefined && !projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }

  if (!getApps().length) {
    const credential = serviceAccount
      ? cert(serviceAccount)
      : applicationDefault();

    initializeApp({
      credential,
      projectId: projectId || (serviceAccount && serviceAccount.project_id)
    });
  }

  return getFirestore();
}

function createFileStorage(initialDataFactory) {
  function loadData() {
    if (!fs.existsSync(dataFile)) {
      const initialData = initialDataFactory();
      fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }

    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }

  function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  }

  return {
    type: 'json',
    async getData() {
      return loadData();
    },
    async saveData(data) {
      saveData(data);
    }
  };
}

function mergeData(initialData, savedData) {
  return {
    ...initialData,
    ...savedData,
    admin: {
      ...initialData.admin,
      ...(savedData.admin || {})
    },
    settings: {
      ...initialData.settings,
      ...(savedData.settings || {})
    },
    products: Array.isArray(savedData.products) ? savedData.products : []
  };
}

function getLocalSeed(initialDataFactory) {
  const initialData = initialDataFactory();
  if (!fs.existsSync(dataFile)) {
    return initialData;
  }

  return mergeData(initialData, JSON.parse(fs.readFileSync(dataFile, 'utf8')));
}

function createFirebaseStorage(initialDataFactory) {
  const db = createFirebaseDb();
  if (!db) return null;

  const rootRef = db.collection(ROOT_COLLECTION).doc(APP_DOC);
  const adminRef = rootRef.collection(META_COLLECTION).doc('admin');
  const settingsRef = rootRef.collection(META_COLLECTION).doc('settings');
  const productsRef = rootRef.collection(PRODUCTS_COLLECTION);

  async function readFirebaseData() {
    const initialData = initialDataFactory();
    const [rootDoc, adminDoc, settingsDoc, productsSnapshot] = await Promise.all([
      rootRef.get(),
      adminRef.get(),
      settingsRef.get(),
      productsRef.get()
    ]);

    return {
      initialized: rootDoc.exists,
      data: mergeData(initialData, {
      admin: adminDoc.exists ? adminDoc.data() : undefined,
      settings: settingsDoc.exists ? settingsDoc.data() : undefined,
      products: productsSnapshot.docs.map((doc) => doc.data())
      })
    };
  }

  async function writeFirebaseData(data) {
    const batch = db.batch();
    batch.set(rootRef, { initializedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(adminRef, data.admin);
    batch.set(settingsRef, data.settings);

    const existingProducts = await productsRef.get();
    const currentIds = new Set((data.products || []).map((product) => String(product.id)));

    for (const doc of existingProducts.docs) {
      if (!currentIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    }

    for (const product of data.products || []) {
      batch.set(productsRef.doc(String(product.id)), product);
    }

    await batch.commit();
  }

  return {
    type: 'firebase',
    async getData() {
      const { initialized, data } = await readFirebaseData();

      if (!initialized) {
        const seededData = getLocalSeed(initialDataFactory);
        await writeFirebaseData(seededData);
        return seededData;
      }

      return data;
    },
    async saveData(data) {
      await writeFirebaseData(data);
    }
  };
}

function createStorage(initialDataFactory) {
  const fileStorage = createFileStorage(initialDataFactory);

  try {
    const firebaseStorage = createFirebaseStorage(initialDataFactory);
    if (firebaseStorage) {
      let activeType = 'firebase';

      return {
        get type() {
          return activeType;
        },
        async getData() {
          if (activeType !== 'firebase') {
            return fileStorage.getData();
          }

          try {
            return await withTimeout(firebaseStorage.getData(), 'Firebase getData');
          } catch (error) {
            activeType = 'json';
            console.warn('Firebase indisponible, utilisation du fichier data.json.', error.message);
            return fileStorage.getData();
          }
        },
        async saveData(data) {
          if (activeType !== 'firebase') {
            return fileStorage.saveData(data);
          }

          try {
            return await withTimeout(firebaseStorage.saveData(data), 'Firebase saveData');
          } catch (error) {
            activeType = 'json';
            console.warn('Firebase indisponible, sauvegarde dans data.json.', error.message);
            return fileStorage.saveData(data);
          }
        }
      };
    }
  } catch (error) {
    console.warn('Firebase non configure, utilisation du fichier data.json.', error.message);
  }

  return fileStorage;
}

module.exports = { createStorage };
