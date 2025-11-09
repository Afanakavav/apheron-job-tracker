# 🔐 GitHub Secrets - Setup Rapido (5 minuti)

## ⚡ Setup Veloce

### 1. Vai su GitHub
```
https://github.com/[tuo-username]/apheron-job-tracker/settings/secrets/actions
```

### 2. Aggiungi i Secrets

Clicca **"New repository secret"** per ognuno:

#### Secret 1: TEST_USER_EMAIL
- **Name:** `TEST_USER_EMAIL`
- **Value:** (dal tuo file `.env`, riga `TEST_USER_EMAIL=...`)

#### Secret 2: TEST_USER_PASSWORD
- **Name:** `TEST_USER_PASSWORD`
- **Value:** (dal tuo file `.env`, riga `TEST_USER_PASSWORD=...`)

#### Secret 3: FIREBASE_TOKEN
1. Esegui nel terminale:
   ```bash
   firebase login:ci
   ```
2. Copia il token che appare
3. **Name:** `FIREBASE_TOKEN`
4. **Value:** (incolla il token)

#### Secret 4: FIREBASE_SERVICE_ACCOUNT (Opzionale)
1. Firebase Console → Project Settings → Service accounts
2. "Generate new private key"
3. Copia tutto il JSON
4. **Name:** `FIREBASE_SERVICE_ACCOUNT`
5. **Value:** (incolla tutto il JSON)

---

## ✅ Verifica

Dopo aver aggiunto i secrets, fai un push su GitHub e verifica che:
- I test si eseguano automaticamente
- Il deploy funzioni (solo su branch `main`)

---

**Tempo totale:** ~5 minuti

