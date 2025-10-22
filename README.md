# 🚀 Apheron Job Tracker

Un'applicazione completa per gestire la ricerca di lavoro, tracciare candidature, gestire CV e ottenere insights con AI.

## 📋 Caratteristiche

### ✅ Fase 1 - MVP (In Sviluppo)
- [x] Autenticazione multi-user (Email/Password e Google)
- [ ] Dashboard con statistiche
- [ ] Kanban board per candidature
- [ ] Gestione CV multipli
- [ ] Analytics base

### 🔄 Fase 2 - Automazione (TODO)
- [ ] Integrazione Gmail API
- [ ] Chrome Extension
- [ ] Email automation
- [ ] Reminder automatici

### 🤖 Fase 3 - AI (TODO)
- [ ] Google Gemini integration
- [ ] CV Matcher
- [ ] Cover Letter Generator
- [ ] Company Research

### 🔍 Fase 4 - Job Search (TODO)
- [ ] Job aggregator
- [ ] Multi-source search
- [ ] Job alerts
- [ ] Auto-application helper

### 🎯 Fase 5 - Advanced (TODO)
- [ ] Networking CRM
- [ ] Interview prep
- [ ] Market intelligence
- [ ] Salary negotiation helper

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Material-UI (MUI)
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **AI**: Google Gemini API
- **Email**: Gmail API
- **Routing**: React Router v7
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Drag & Drop**: React Beautiful DnD

## 🚀 Setup Iniziale

### 1. Installare dipendenze

```bash
npm install
```

### 2. Configurare Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuovo progetto (o usa uno esistente)
3. Abilita:
   - **Authentication** → Email/Password e Google
   - **Firestore Database** → Modalità produzione
   - **Storage** → Modalità produzione
   - **Functions** (opzionale per ora)

4. Ottieni le credenziali:
   - Vai su Project Settings → General
   - Scorri fino a "Your apps" → Aggiungi app web
   - Copia le credenziali Firebase

5. Sostituisci le credenziali in `src/services/firebase.ts`

### 3. Firestore Security Rules

Vai su Firestore → Rules e incolla:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // CVs collection
    match /cvs/{cvId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Applications collection
    match /applications/{applicationId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Contacts collection
    match /contacts/{contactId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Templates collection
    match /templates/{templateId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Storage Security Rules

Vai su Storage → Rules e incolla:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Firebase Hosting Setup (per deploy su apheron.io/job-tracker)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

Configurazione:
- Public directory: `dist`
- Single-page app: `yes`
- GitHub integration: opzionale

Modifica `firebase.json`:

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

## 💻 Sviluppo

```bash
# Development server
npm run dev

# Build per produzione
npm run build

# Preview build
npm run preview

# Deploy su Firebase
npm run build
firebase deploy
```

## 📁 Struttura Progetto

```
apheron-job-tracker/
├── src/
│   ├── assets/          # Immagini, loghi
│   ├── components/      # Componenti riutilizzabili
│   ├── contexts/        # React Contexts (Auth, Theme, etc)
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Pagine dell'applicazione
│   ├── services/        # Firebase, API services
│   ├── styles/          # CSS globali
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   ├── App.tsx          # Main App component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── .gitignore
├── firebase.json        # Firebase config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔐 Environment Variables (Opzionale)

Crea `.env.local` per variabili sensibili:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 📝 TODO Next Steps

1. ✅ Setup progetto base
2. ⏳ Configurare Firebase
3. ⏳ Implementare Dashboard completa
4. ⏳ Creare Kanban board per candidature
5. ⏳ Implementare gestione CV
6. ⏳ Aggiungere Analytics
7. ⏳ Email integration
8. ⏳ AI features
9. ⏳ Chrome extension

## 🤝 Contributi

Progetto personale di Francesco Perone per gestire la ricerca di lavoro.

## 📄 Licenza

Privato - All rights reserved

---

**Sviluppato con ❤️ da Francesco Perone**
**Domini: apheron.io | Email: francesco.perone00@gmail.com**


