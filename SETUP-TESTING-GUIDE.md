# 🚀 Guida Completa Setup Testing - Passo Passo

Questa guida ti accompagna passo-passo nella configurazione completa del sistema di testing.

---

## 📋 STEP 1: Crea Account di Test in Firebase Auth

### Opzione A: Tramite Firebase Console (Consigliato)

1. **Apri Firebase Console:**
   - Vai su https://console.firebase.google.com/
   - Seleziona il progetto `apheron-job-tracker`

2. **Vai alla sezione Authentication:**
   - Nel menu laterale, clicca su **"Authentication"**
   - Clicca sulla tab **"Users"**

3. **Aggiungi nuovo utente:**
   - Clicca sul pulsante **"Add user"** o **"Aggiungi utente"**
   - Inserisci:
     - **Email:** `test@apheron.io` (o un'altra email che preferisci)
     - **Password:** Scegli una password sicura (es: `TestPassword123!`)
   - Clicca su **"Add user"** o **"Aggiungi utente"**

4. **Verifica l'utente:**
   - Dovresti vedere il nuovo utente nella lista
   - L'email non deve essere verificata (va bene per i test)

### Opzione B: Tramite Firebase CLI

```bash
# Installa Firebase CLI se non l'hai già fatto
npm install -g firebase-tools

# Login
firebase login

# Crea utente (richiede Firebase Admin SDK)
# Nota: Questo metodo è più complesso, usa l'Opzione A
```

### ✅ Verifica
- [ ] Utente creato in Firebase Console
- [ ] Email e password annotate da qualche parte (le userai dopo)

---

## 📋 STEP 2: Configura .env con le Credenziali

### 2.1 Crea il file .env

1. **Apri il terminale nella cartella del progetto:**
   ```bash
   cd C:\Users\frape\apheron-job-tracker
   ```

2. **Crea il file .env:**
   ```bash
   # Su Windows PowerShell
   Copy-Item .env.example .env
   
   # Oppure crea manualmente un file chiamato .env
   ```

3. **Apri il file .env con un editor di testo:**
   - Puoi usare VS Code, Notepad++, o qualsiasi editor
   - Il file dovrebbe essere nella root del progetto: `apheron-job-tracker/.env`

### 2.2 Modifica il file .env

Apri `.env` e modifica con le tue credenziali:

```env
# Test User Credentials (per E2E tests)
# Usa le credenziali dell'account che hai appena creato
TEST_USER_EMAIL=test@apheron.io
TEST_USER_PASSWORD=TestPassword123!

# Playwright Configuration
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173
```

**⚠️ IMPORTANTE:**
- Sostituisci `test@apheron.io` con l'email che hai usato
- Sostituisci `TestPassword123!` con la password che hai scelto
- **NON committare questo file su Git!** (è già in .gitignore)

### 2.3 Verifica che .env sia in .gitignore

Controlla che il file `.gitignore` contenga:
```
.env
.env.local
```

### ✅ Verifica
- [ ] File `.env` creato
- [ ] Credenziali inserite correttamente
- [ ] File `.env` non committato su Git

---

## 📋 STEP 3: Aggiungi GitHub Secrets per CI/CD

### 3.1 Accedi a GitHub

1. **Vai sul repository GitHub:**
   - Apri https://github.com/[tuo-username]/apheron-job-tracker
   - (Sostituisci `[tuo-username]` con il tuo username)

### 3.2 Apri le Settings del Repository

1. **Clicca su "Settings"** (in alto nel repository)
2. **Nel menu laterale, clicca su "Secrets and variables"**
3. **Clicca su "Actions"**

### 3.3 Aggiungi i Secrets

Clicca su **"New repository secret"** per ogni secret:

#### Secret 1: TEST_USER_EMAIL
- **Name:** `TEST_USER_EMAIL`
- **Secret:** `test@apheron.io` (o l'email che hai usato)
- Clicca **"Add secret"**

#### Secret 2: TEST_USER_PASSWORD
- **Name:** `TEST_USER_PASSWORD`
- **Secret:** `TestPassword123!` (o la password che hai scelto)
- Clicca **"Add secret"**

#### Secret 3: FIREBASE_TOKEN

1. **Apri il terminale:**
   ```bash
   cd C:\Users\frape\apheron-job-tracker
   ```

2. **Login a Firebase:**
   ```bash
   firebase login:ci
   ```
   - Si aprirà il browser per autorizzare
   - Dopo l'autorizzazione, vedrai un token nel terminale
   - **Copia questo token** (è lungo, assicurati di copiarlo tutto)

3. **Aggiungi su GitHub:**
   - **Name:** `FIREBASE_TOKEN`
   - **Secret:** (incolla il token che hai copiato)
   - Clicca **"Add secret"**

#### Secret 4: FIREBASE_SERVICE_ACCOUNT (Opzionale per deploy)

1. **Vai su Firebase Console:**
   - https://console.firebase.google.com/
   - Seleziona progetto `apheron-job-tracker`
   - Vai su **"Project Settings"** (icona ingranaggio)
   - Tab **"Service accounts"**

2. **Genera nuova chiave:**
   - Clicca su **"Generate new private key"**
   - Conferma cliccando **"Generate key"**
   - Si scaricherà un file JSON

3. **Aggiungi su GitHub:**
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Secret:** (apri il file JSON scaricato, copia tutto il contenuto e incollalo)
   - Clicca **"Add secret"**

### ✅ Verifica
- [ ] `TEST_USER_EMAIL` aggiunto
- [ ] `TEST_USER_PASSWORD` aggiunto
- [ ] `FIREBASE_TOKEN` aggiunto
- [ ] `FIREBASE_SERVICE_ACCOUNT` aggiunto (opzionale)

---

## 📋 STEP 4: Esegui i Test

### 4.1 Prepara l'ambiente

1. **Assicurati di essere nella cartella corretta:**
   ```bash
   cd C:\Users\frape\apheron-job-tracker
   ```

2. **Installa le dipendenze (se non l'hai già fatto):**
   ```bash
   npm install
   ```

3. **Installa i browser di Playwright:**
   ```bash
   npx playwright install chromium
   ```

### 4.2 Avvia il server di sviluppo

**IMPORTANTE:** I test hanno bisogno che il server di sviluppo sia in esecuzione!

1. **Apri un nuovo terminale:**
   - Lascia questo terminale aperto
   - Il server deve rimanere in esecuzione

2. **Avvia il server:**
   ```bash
   npm run dev
   ```

3. **Attendi che il server sia pronto:**
   - Dovresti vedere: `Local: http://localhost:5173/`
   - **NON chiudere questo terminale!**

### 4.3 Esegui i test E2E

**In un NUOVO terminale** (lascia il server in esecuzione):

```bash
# Vai nella cartella del progetto
cd C:\Users\frape\apheron-job-tracker

# Esegui i test E2E
npm run test:e2e
```

### 4.4 Interpreta i risultati

**Se i test passano:**
```
✓ 4 passed
```

**Se alcuni test falliscono:**
- Controlla i messaggi di errore
- Verifica che le credenziali in `.env` siano corrette
- Assicurati che il server sia in esecuzione

**Se vedi errori di autenticazione:**
- Verifica che l'account di test esista in Firebase
- Controlla che email e password in `.env` siano corrette
- Prova a fare login manualmente con quelle credenziali

### 4.5 Visualizza il report (opzionale)

Dopo i test, puoi vedere un report dettagliato:

```bash
npm run test:report
```

Si aprirà un browser con un report HTML interattivo.

### ✅ Verifica
- [ ] Server di sviluppo in esecuzione
- [ ] Test E2E eseguiti
- [ ] Test passati (o errori identificati)

---

## 🎯 Test Disponibili

Ora puoi eseguire diversi tipi di test:

```bash
# Tutti i test
npm test

# Solo test E2E (richiedono autenticazione)
npm run test:e2e

# Solo test Chrome Extension
npm run test:extension

# Test con UI interattiva (consigliato per debug)
npm run test:ui

# Test con browser visibile
npm run test:headed
```

---

## 🐛 Troubleshooting

### Problema: "Test timeout"
**Soluzione:**
- Assicurati che il server sia in esecuzione (`npm run dev`)
- Aumenta i timeout in `playwright.config.ts` se necessario

### Problema: "Authentication failed"
**Soluzione:**
- Verifica che l'account esista in Firebase Console
- Controlla che `.env` abbia le credenziali corrette
- Prova a fare login manualmente con quelle credenziali

### Problema: "Cannot find module"
**Soluzione:**
```bash
npm install
```

### Problema: "Firebase token expired"
**Soluzione:**
```bash
firebase login:ci
# Copia il nuovo token e aggiorna il secret su GitHub
```

---

## ✅ Checklist Finale

Prima di considerare tutto configurato:

- [ ] Account di test creato in Firebase Auth
- [ ] File `.env` creato e configurato
- [ ] GitHub Secrets aggiunti (almeno TEST_USER_EMAIL e TEST_USER_PASSWORD)
- [ ] Server di sviluppo avviato (`npm run dev`)
- [ ] Test E2E eseguiti con successo (`npm run test:e2e`)
- [ ] Report test visualizzato (opzionale)

---

## 🎉 Fatto!

Ora hai:
- ✅ Sistema di testing completo
- ✅ Test E2E funzionanti
- ✅ CI/CD configurato (si attiverà automaticamente su push/PR)
- ✅ Account di test dedicato

**Prossimo passo:** Fai un push su GitHub e verifica che i test si eseguano automaticamente in CI/CD!

---

**Hai bisogno di aiuto?** Controlla:
- `tests/README.md` - Documentazione completa testing
- `CI-CD-SETUP.md` - Guida setup CI/CD
- `TESTING-COMPLETE.md` - Riepilogo implementazione

