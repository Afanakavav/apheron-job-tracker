# 🔐 Setup GitHub Secrets - Istruzioni Rapide

## Metodo Veloce

### 1. TEST_USER_EMAIL e TEST_USER_PASSWORD

Vai su: **GitHub → Repository → Settings → Secrets and variables → Actions**

Aggiungi questi secrets (usa i valori dal tuo file `.env`):

- **Name:** `TEST_USER_EMAIL`
- **Value:** (il valore di TEST_USER_EMAIL dal tuo .env)

- **Name:** `TEST_USER_PASSWORD`  
- **Value:** (il valore di TEST_USER_PASSWORD dal tuo .env)

### 2. FIREBASE_TOKEN

Esegui nel terminale:
```bash
firebase login:ci
```

Copia il token che appare e aggiungilo come secret:
- **Name:** `FIREBASE_TOKEN`
- **Value:** (il token copiato)

### 3. FIREBASE_SERVICE_ACCOUNT (Opzionale)

1. Vai su Firebase Console → Project Settings → Service accounts
2. Clicca "Generate new private key"
3. Copia tutto il JSON e incollalo come secret:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** (tutto il contenuto JSON)

---

**Tempo stimato:** 5 minuti

