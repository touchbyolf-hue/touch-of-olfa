# Firebase setup

The site keeps the same frontend. The server chooses the database automatically:

- Firebase Firestore when Firebase credentials are configured.
- `data.json` as a local fallback when Firebase is not configured.

## 1. Create the service account key

In Firebase Console:

1. Open the project `touch-of-olfa`.
2. Go to Project settings.
3. Open Service accounts.
4. Click Generate new private key.
5. Save the downloaded JSON file as `firebase-service-account.json` in this project folder.

This file is ignored by Git in `.gitignore`.

## 2. Create `.env`

Copy `.env.example` to `.env`, then keep:

```env
SESSION_SECRET=change-this-secret
FIREBASE_PROJECT_ID=touch-of-olfa
```

If the service account file is named `firebase-service-account.json` and placed in the project folder, no other value is required.

## 3. Configure the Firebase web app

1. In Firebase Console, open Project settings.
2. Under "Your apps", add a new Web app or select the existing Web app.
3. Copy the Web app config values for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
4. Paste them into `public/firebase-config.js`.

## 4. Start the site

```bash
npm start
```

Open:

```text
http://localhost:3000
```

In the admin page, the status will show:

- `Base: Firebase` when Firestore is active.
- `Base: fichier local JSON` when the app is still using `data.json`.

## Firestore structure

The app stores data here:

```text
touchByOlfa/main/meta/admin
touchByOlfa/main/meta/settings
touchByOlfa/main/products/{productId}
```

On the first Firebase start, existing data from `data.json` is copied into Firestore.
