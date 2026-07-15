const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { loadEnvFile } = require('./env');
const { createStorage } = require('./storage');

loadEnvFile();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'touch-by-olfa-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    sameSite: 'lax'
  }
}));

function getInitialData() {
  return {
    admin: {
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      address: 'admin'
    },
    settings: {
      heroPhone: '+221 77 123 45 67'
    },
    products: []
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: 'Acces refuse' });
  }

  next();
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const storage = createStorage(getInitialData);
let appData;

async function saveData() {
  await storage.saveData(appData);
}

function normalizeData(data) {
  const initialData = getInitialData();

  appData = {
    ...initialData,
    ...data,
    admin: {
      ...initialData.admin,
      ...(data.admin || {})
    },
    settings: {
      ...initialData.settings,
      ...(data.settings || {})
    },
    products: Array.isArray(data.products) ? data.products : []
  };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/login');
  }

  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/login', (req, res) => {
  const address = normalizeText(req.body.address);
  const username = normalizeText(req.body.username);
  const password = normalizeText(req.body.password);
  const user = appData.admin;
  const loginKey = address || username;

  if (!user || !loginKey || (loginKey !== user.address && loginKey !== user.username) || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Identifiants invalides' });
  }

  req.session.admin = true;
  res.json({ success: true });
});

app.post('/api/admin/update', requireAdmin, asyncHandler(async (req, res) => {
  const currentPassword = normalizeText(req.body.currentPassword);
  const newAddress = normalizeText(req.body.newAddress);
  const newPassword = normalizeText(req.body.newPassword);
  const heroPhone = normalizeText(req.body.heroPhone);
  const user = appData.admin;

  if (!newAddress && !newPassword && !heroPhone) {
    return res.status(400).json({ success: false, message: 'Entrez une nouvelle adresse, un nouveau mot de passe ou un numero.' });
  }

  if ((newAddress || newPassword) && (!currentPassword || !bcrypt.compareSync(currentPassword, user.password))) {
    return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' });
  }

  if (newAddress) {
    user.address = newAddress;
  }

  if (newPassword) {
    user.password = bcrypt.hashSync(newPassword, 10);
  }

  if (heroPhone) {
    appData.settings.heroPhone = heroPhone;
  }

  await saveData();
  res.json({ success: true });
}));

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/products', (req, res) => {
  const products = [...appData.products].sort((a, b) => b.id - a.id);
  res.json(products);
});

app.get('/api/settings', (req, res) => {
  res.json(appData.settings);
});

app.get('/api/storage-status', requireAdmin, (req, res) => {
  res.json({ storage: storage.type });
});

app.post('/api/products', requireAdmin, asyncHandler(async (req, res) => {
  const name = normalizeText(req.body.name);
  const price = normalizeText(req.body.price);
  const phone = normalizeText(req.body.phone);
  const image = normalizeText(req.body.image);

  if (!name && !price && !phone && !image) {
    return res.status(400).json({ success: false, message: 'Ajoutez au moins une information produit.' });
  }

  if (price && Number.isNaN(Number(price))) {
    return res.status(400).json({ success: false, message: 'Le prix doit etre un nombre valide.' });
  }

  const product = {
    id: Date.now(),
    name,
    price,
    phone,
    image
  };

  appData.products.unshift(product);
  await saveData();
  res.json({ success: true, id: product.id });
}));

app.delete('/api/products/:id', requireAdmin, asyncHandler(async (req, res) => {
  appData.products = appData.products.filter((item) => String(item.id) !== req.params.id);
  await saveData();
  res.json({ success: true });
}));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: 'Erreur serveur.' });
});

async function start() {
  normalizeData(await storage.getData());
  await saveData();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Touch by Olfa lance sur http://localhost:${PORT} (${storage.type})`);
  });
}

start().catch((error) => {
  console.error('Impossible de demarrer le serveur.', error);
  process.exit(1);
});
