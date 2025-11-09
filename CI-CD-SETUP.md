# CI/CD Setup Guide - Apheron Job Tracker

Questa guida spiega come configurare il pipeline CI/CD per Apheron Job Tracker.

## 📋 Overview

Il progetto utilizza **GitHub Actions** per:
- ✅ Eseguire test automatici su ogni push/PR
- ✅ Build dell'applicazione
- ✅ Deploy automatico su Firebase (solo su `main`)

## 🚀 Setup Iniziale

### 1. Configurare GitHub Secrets

Vai su GitHub → Settings → Secrets and variables → Actions e aggiungi:

#### Test Credentials
- `TEST_USER_EMAIL`: Email dell'account di test Firebase
- `TEST_USER_PASSWORD`: Password dell'account di test

#### Firebase Deploy
- `FIREBASE_TOKEN`: Token Firebase per deploy
  ```bash
  firebase login:ci
  ```
- `FIREBASE_SERVICE_ACCOUNT`: JSON del service account Firebase
  - Vai su Firebase Console → Project Settings → Service Accounts
  - Genera nuova chiave privata
  - Copia il contenuto JSON

### 2. Creare Account di Test

1. Vai su Firebase Console → Authentication
2. Crea un nuovo utente con:
   - Email: `test@apheron.io` (o quello che preferisci)
   - Password: sicura ma semplice per i test
3. Aggiungi le credenziali ai GitHub Secrets

### 3. Configurare Workflows

I workflow sono già configurati in `.github/workflows/`:
- `ci.yml`: Pipeline completa (test → build → deploy)
- `test.yml`: Solo test su multipli OS

## 📁 Struttura Workflows

### `ci.yml` - Pipeline Completa

```yaml
Jobs:
  1. test      → Esegue test Playwright
  2. build     → Build dell'applicazione
  3. deploy    → Deploy su Firebase (solo main)
```

**Trigger:**
- Push su `main` o `develop`
- Pull Request su `main` o `develop`

### `test.yml` - Test Multi-OS

```yaml
Jobs:
  test (ubuntu)   → Test su Linux
  test (windows)  → Test su Windows
  test (macos)    → Test su macOS
```

**Trigger:**
- Push su `main` o `develop`
- Pull Request
- Manuale (workflow_dispatch)

## 🔧 Configurazione Locale

### Variabili d'Ambiente

Crea un file `.env` (non committare!):

```env
TEST_USER_EMAIL=test@apheron.io
TEST_USER_PASSWORD=YourTestPassword123!
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173
```

### Eseguire Test Localmente

```bash
# Test base
npm test

# Test E2E
npm run test:e2e

# Test Chrome Extension
npm run test:extension

# Test in CI mode
CI=true npm test
```

## 📊 Monitoraggio

### GitHub Actions Dashboard

Vai su GitHub → Actions per vedere:
- Status dei workflow
- Log dettagliati
- Artifacts (report test, build, etc.)

### Test Results

I report dei test vengono salvati come artifacts:
- `playwright-report/`: Report HTML interattivo
- `test-results/`: Screenshot e video dei test falliti

## 🐛 Troubleshooting

### Test Falliscono in CI

1. **Verifica credenziali test:**
   ```bash
   # Testa localmente con le stesse credenziali
   TEST_USER_EMAIL=test@apheron.io TEST_USER_PASSWORD=password npm test
   ```

2. **Controlla timeout:**
   - I test in CI possono essere più lenti
   - Aumenta timeout in `playwright.config.ts` se necessario

3. **Verifica Firebase:**
   - Assicurati che l'account di test esista
   - Controlla le regole Firestore

### Deploy Fallisce

1. **Verifica Firebase Token:**
   ```bash
   firebase login:ci
   ```

2. **Controlla Service Account:**
   - Deve avere permessi di deploy
   - JSON deve essere valido

3. **Verifica Project ID:**
   - Deve corrispondere a `apheron-job-tracker`

## 🔐 Sicurezza

### Best Practices

1. **Non committare:**
   - `.env` file
   - Credenziali hardcoded
   - Firebase service account JSON

2. **Usa Secrets:**
   - Tutte le credenziali in GitHub Secrets
   - Non loggare secrets nei workflow

3. **Account di Test:**
   - Usa account dedicato per test
   - Non usare account di produzione
   - Limita permessi dell'account di test

## 📈 Metriche

### Coverage Attuale

- ✅ Test base: 10 test passati
- ✅ Test E2E: 4 test (creazione → modifica → eliminazione)
- ✅ Test Extension: Validazione file e manifest
- ⏭️ Test con autenticazione: 8 test skipped (richiedono setup)

### Prossimi Passi

1. Aumentare coverage test
2. Aggiungere test per tutte le funzionalità
3. Integrare code coverage reporting
4. Aggiungere performance testing

## 🎯 Comandi Utili

```bash
# Eseguire test specifici
npm test -- tests/e2e/networking-flow.spec.ts

# Test con UI
npm run test:ui

# Test in headed mode
npm run test:headed

# Visualizzare report
npm run test:report

# Test solo su Chromium
npm test -- --project=chromium

# Test con retry
npm test -- --retries=2
```

## 📚 Risorse

- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [Firebase Hosting Deploy Action](https://github.com/FirebaseExtended/action-hosting-deploy)

---

**Ultimo aggiornamento**: ${new Date().toLocaleDateString('it-IT')}

