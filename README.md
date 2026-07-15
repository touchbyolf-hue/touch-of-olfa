# Touch by Olfa

Application de gestion de produits avec interface admin, galerie client et stockage Firebase.

## Structure
- `public/` : interface cliente et administration statique.
- `public/firebase-config.js` : config Firebase à remplir.
- `server.js`, `storage.js`, `data.json` : backend Node/Express existant, mais pas nécessaire pour la version Firebase statique.

## Utilisation Firebase
1. Créez un projet Firebase.
2. Activez Firestore.
3. Activez Firebase Authentication (Email/Mot de passe).
4. Ajoutez un utilisateur admin via la console Firebase.
5. Copiez la configuration Web Firebase dans `public/firebase-config.js`.

    Dans la console Firebase :
    - Ouvrez Paramètres du projet.
    - Sous "Vos applications", ajoutez une application Web ou sélectionnez l'application existante.
    - Copiez les valeurs `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` et `appId`.
    - Collez-les dans `public/firebase-config.js`.

## Déploiement statique
- Pour GitHub Pages, vous pouvez servir les fichiers `public/` depuis une branche ou dossier `docs/`.
- Pour Firebase Hosting, définissez la cible publique sur `public`.

## Local
Vous pouvez tester localement avec un serveur simple ou avec `npm start` :
```bash
npm install
npm start
```
Puis ouvrez `http://localhost:3000`.

## Notes importantes
- La version statique utilise Firebase Firestore et Firebase Auth côté client.
- Ne mettez pas vos clés secrètes Firebase Admin (comme `firebase-service-account.json`) dans le front-end ni dans un dépôt public.
- `public/index.html` est la page principale, `public/login.html` est la page de connexion admin.
- Si vous utilisez GitHub Pages, vous pouvez rediriger la racine vers `public/index.html`.
