# 🔥 Setup Firebase - Guida Completa

## Passo 1: Creare/Configurare Progetto Firebase

### 1.1 Accedi a Firebase Console
1. Vai su https://console.firebase.google.com/
2. Accedi con il tuo account Google (francesco.perone00@gmail.com)

### 1.2 Crea un nuovo progetto
1. Click su "Add project" o "Crea progetto"
2. Nome progetto: `apheron-job-tracker`
3. Abilita Google Analytics: **Sì** (consigliato)
4. Account Analytics: Seleziona il tuo account o crea nuovo
5. Click "Crea progetto"

## Passo 2: Abilitare Authentication

### 2.1 Email/Password
1. Nel menu laterale → **Authentication**
2. Click "Get started"
3. Tab "Sign-in method"
4. Abilita "Email/Password"
5. Abilita "Email link (passwordless sign-in)" → Opzionale
6. Save

### 2.2 Google Sign-In
1. Sempre in "Sign-in method"
2. Abilita "Google"
3. Project public-facing name: `Apheron Job Tracker`
4. Project support email: `francesco.perone00@gmail.com`
5. Save

### 2.3 Domini Autorizzati
1. Tab "Settings" → "Authorized domains"
2. Aggiungi:
   - `localhost` (già presente)
   - `apheron.io`
   - `*.apheron.io` (tutti i sottodomini)

## Passo 3: Configurare Firestore Database

### 3.1 Creare Database
1. Nel menu laterale → **Firestore Database**
2. Click "Create database"
3. Location: `europe-west1` (Belgio - più vicino all'Italia)
4. Modalità: **Production mode** (più sicuro)
5. Click "Enable"

### 3.2 Creare Collections Iniziali
Vai su Firestore → Data e crea queste collections (vuote per ora):
- `users`
- `cvs`
- `applications`
- `companies`
- `contacts`
- `templates`
- `saved_searches`

### 3.3 Security Rules
1. Tab "Rules"
2. Copia e incolla questo codice:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function per verificare che l'utente sia autenticato
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function per verificare che l'utente sia il proprietario
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - ogni utente può leggere/scrivere solo i propri dati
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // CVs collection
    match /cvs/{cvId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Applications collection
    match /applications/{applicationId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Contacts collection
    match /contacts/{contactId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Templates collection
    match /templates/{templateId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Saved searches collection
    match /saved_searches/{searchId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Click "Publish"

### 3.4 Creare Indexes (quando necessario)
Gli indexes verranno creati automaticamente quando il sistema te lo chiederà. Firebase ti darà un link diretto.

## Passo 4: Configurare Storage

### 4.1 Creare Storage
1. Nel menu laterale → **Storage**
2. Click "Get started"
3. Modalità: **Production mode**
4. Location: `europe-west1` (stesso di Firestore)
5. Click "Done"

### 4.2 Security Rules
1. Tab "Rules"
2. Copia e incolla:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // CVs e documenti degli utenti
    match /users/{userId}/cvs/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Altri documenti degli utenti
    match /users/{userId}/documents/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Avatar/profile pictures
    match /users/{userId}/profile/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

### 4.3 Configurare CORS (se necessario)
Se hai problemi con CORS, crea un file `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Poi esegui (richiede Google Cloud SDK):
```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME.appspot.com
```

## Passo 5: Ottenere le Credenziali

### 5.1 Registrare Web App
1. In Firebase Console, click sull'icona ingranaggio → "Project settings"
2. Scorri fino a "Your apps"
3. Click sull'icona `</>` (Web)
4. App nickname: `Apheron Job Tracker Web`
5. **Abilita Firebase Hosting**: Sì
6. Click "Register app"

### 5.2 Copiare le credenziali
Vedrai un codice simile a questo:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "apheron-job-tracker.firebaseapp.com",
  projectId: "apheron-job-tracker",
  storageBucket: "apheron-job-tracker.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx",
  measurementId: "G-XXXXXXXXXX"
};
```

### 5.3 Aggiornare il codice
Apri `src/services/firebase.ts` e sostituisci le credenziali:

```typescript
const firebaseConfig = {
  apiKey: "TUA_API_KEY",
  authDomain: "TUO_AUTH_DOMAIN",
  projectId: "TUO_PROJECT_ID",
  storageBucket: "TUO_STORAGE_BUCKET",
  messagingSenderId: "TUO_MESSAGING_SENDER_ID",
  appId: "TUO_APP_ID",
  measurementId: "TUO_MEASUREMENT_ID"
};
```

## Passo 6: Setup Firebase CLI (per Hosting e Functions)

### 6.1 Installare Firebase Tools
```bash
npm install -g firebase-tools
```

### 6.2 Login
```bash
firebase login
```

### 6.3 Inizializzare Firebase nel progetto
```bash
cd C:\Users\frape\apheron-job-tracker
firebase init
```

Seleziona:
- ✅ Hosting: Configure files for Firebase Hosting
- ✅ Functions: (opzionale, per Fase 2)

Configurazione:
- Quale progetto? → `apheron-job-tracker`
- Public directory? → `dist`
- Single-page app? → `Yes`
- Setup automatic builds with GitHub? → No (per ora)

### 6.4 Creare firebase.json
Il file `firebase.json` sarà creato automaticamente. Verifica che contenga:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Passo 7: Test Locale

### 7.1 Avviare dev server
```bash
npm run dev
```

### 7.2 Testare autenticazione
1. Apri http://localhost:5173/job-tracker
2. Registra un nuovo utente con email/password
3. Prova login con Google
4. Verifica che funzioni tutto

### 7.3 Verificare su Firebase Console
1. Vai su Authentication → Users
2. Dovresti vedere il tuo utente registrato
3. Vai su Firestore → Data → users
4. Dovresti vedere il documento del tuo utente

## Passo 8: Deploy su Firebase Hosting

### 8.1 Build per produzione
```bash
npm run build
```

### 8.2 Deploy
```bash
firebase deploy --only hosting
```

### 8.3 URL della tua app
Firebase ti darà un URL tipo:
- `https://apheron-job-tracker.web.app`
- `https://apheron-job-tracker.firebaseapp.com`

## Passo 9: Configurare Custom Domain (apheron.io/job-tracker)

### 9.1 Opzione 1: Firebase Hosting Custom Domain
1. Firebase Console → Hosting → "Add custom domain"
2. Domain: `apheron.io`
3. Segui le istruzioni per verificare il dominio
4. Configura DNS records

### 9.2 Opzione 2: Proxy/Redirect
Se `apheron.io` è già hostato altrove, puoi:
- Creare un redirect da `apheron.io/job-tracker` a Firebase URL
- O usare un reverse proxy

## 🎉 Completato!

Ora dovresti avere:
- ✅ Firebase project configurato
- ✅ Authentication attiva
- ✅ Firestore database con security rules
- ✅ Storage configurato
- ✅ App deployata su Firebase Hosting

## 🆘 Troubleshooting

### Errore: "Firebase: Error (auth/unauthorized-domain)"
- Aggiungi il dominio in Authentication → Settings → Authorized domains

### Errore: "Missing or insufficient permissions"
- Verifica che le Firestore rules siano pubblicate correttamente

### Errore: CORS Storage
- Configura CORS come nel Passo 4.3

### Build errors
- Verifica che tutte le dipendenze siano installate: `npm install`
- Pulisci node_modules e reinstalla: `rm -rf node_modules && npm install`

## 📞 Support

Per domande o problemi, contatta Francesco Perone:
- Email: francesco.perone00@gmail.com

---

**Prossimo step**: Tornare al README.md e continuare con lo sviluppo delle features! 🚀


