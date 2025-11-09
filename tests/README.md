# Test Automatici - Apheron Job Tracker

Questo progetto utilizza [Playwright](https://playwright.dev/) per i test end-to-end (E2E).

## Setup

1. **Installa le dipendenze:**
   ```bash
   npm install
   ```

2. **Installa i browser di Playwright:**
   ```bash
   npx playwright install
   ```

3. **Configura le credenziali di test:**
   ```bash
   cp .env.example .env
   # Modifica .env con le credenziali del tuo account di test
   ```

## Eseguire i Test

### Test Base
```bash
npm test
```

### Test E2E Completi
```bash
npm run test:e2e
```

### Test Chrome Extension
```bash
npm run test:extension
```

### Test con UI Interattiva
```bash
npm run test:ui
```

### Test in Modalità Headed (con browser visibile)
```bash
npm run test:headed
```

### Test in Modalità Debug
```bash
npm run test:debug
```

### Visualizzare Report dei Test
```bash
npm run test:report
```

## Struttura dei Test

```
tests/
├── auth.spec.ts              # Test di autenticazione
├── navigation.spec.ts        # Test di navigazione tra pagine
├── dashboard.spec.ts         # Test della dashboard
├── applications.spec.ts      # Test gestione candidature
├── networking.spec.ts        # Test gestione contatti/networking
├── chrome-extension.spec.ts  # Test Chrome Extension
├── e2e/
│   ├── networking-flow.spec.ts    # Test E2E completi networking
│   └── applications-flow.spec.ts  # Test E2E completi applications
└── helpers/
    └── auth-helper.ts        # Helper per autenticazione nei test
```

## Configurazione

La configurazione di Playwright si trova in `playwright.config.ts`.

### Variabili d'Ambiente

- `TEST_USER_EMAIL`: Email dell'account di test (default: `test@apheron.io`)
- `TEST_USER_PASSWORD`: Password dell'account di test
- `PLAYWRIGHT_TEST_BASE_URL`: URL base per i test (default: `http://localhost:5173`)
- `CI`: Se impostato, i test vengono eseguiti in modalità CI (con retry e workers limitati)

## Test Coverage

### ✅ Funzionalità Testate

- [x] Autenticazione (login/logout)
- [x] Navigazione tra pagine
- [x] Dashboard (visualizzazione statistiche)
- [x] Networking (creazione, modifica, eliminazione contatti)
- [x] Applications (visualizzazione, creazione candidature)
- [x] E2E Flows completi (CRUD operations)
- [x] Chrome Extension (validazione file e manifest)

### 🔄 Da Implementare

- [ ] Test per CV Manager
- [ ] Test per Analytics
- [ ] Test per Job Search
- [ ] Test per integrazione Gmail
- [ ] Test per integrazione Google Calendar
- [ ] Test per AI Assistant
- [ ] Test per Chrome Extension (funzionalità reali)

## Autenticazione nei Test

I test E2E utilizzano un account di test dedicato. Per configurare:

1. **Crea un account di test in Firebase Auth:**
   - Email: `test@apheron.io` (o quello che preferisci)
   - Password: sicura ma semplice per i test

2. **Aggiungi le credenziali a `.env`:**
   ```env
   TEST_USER_EMAIL=test@apheron.io
   TEST_USER_PASSWORD=YourTestPassword123!
   ```

3. **Oppure usa variabili d'ambiente:**
   ```bash
   TEST_USER_EMAIL=test@apheron.io TEST_USER_PASSWORD=password npm test
   ```

### Helper di Autenticazione

```typescript
import { setupAuthenticatedContext, loginAsTestUser } from './helpers/auth-helper';

test('my test', async ({ page }) => {
  await setupAuthenticatedContext(page);
  // Ora sei autenticato, puoi testare funzionalità protette
});
```

## CI/CD

I test vengono eseguiti automaticamente su GitHub Actions quando:
- Si fa push su `main` o `develop`
- Si apre una Pull Request

### Setup GitHub Actions

1. **Aggiungi secrets su GitHub:**
   - `TEST_USER_EMAIL`: Email account di test
   - `TEST_USER_PASSWORD`: Password account di test
   - `FIREBASE_TOKEN`: Token Firebase per deploy
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON

2. **I workflow sono in `.github/workflows/`:**
   - `ci.yml`: Pipeline completa (test → build → deploy)
   - `test.yml`: Solo test su multipli OS

## Troubleshooting

### I test falliscono con "Page not found"
- Assicurati che il server di sviluppo sia in esecuzione (`npm run dev`)
- Verifica che `PLAYWRIGHT_TEST_BASE_URL` sia corretto

### I test falliscono per timeout
- Aumenta il timeout in `playwright.config.ts`
- Verifica che la connessione internet sia stabile (per Firebase)

### I test falliscono per autenticazione
- Verifica che `TEST_USER_EMAIL` e `TEST_USER_PASSWORD` siano corretti
- Assicurati che l'account di test esista in Firebase Auth
- Controlla che le regole Firestore permettano l'accesso

### I test E2E falliscono
- Verifica che l'account di test abbia i permessi necessari
- Controlla che i dati di test non interferiscano con dati reali
- Usa nomi univoci per i dati di test (es: `Date.now()`)

## Best Practices

1. **Usa selettori stabili**: Preferisci `data-testid` agli selettori CSS complessi
2. **Aspetta il caricamento**: Usa `waitForLoadState('networkidle')` quando necessario
3. **Isola i test**: Ogni test dovrebbe essere indipendente
4. **Pulisci i dati**: Elimina i dati di test dopo ogni test se necessario
5. **Usa fixtures**: Crea fixture riutilizzabili per setup comune
6. **Test E2E**: Usa nomi univoci per evitare conflitti (es: `Date.now()`)

## Contribuire

Quando aggiungi nuove funzionalità:

1. Aggiungi test corrispondenti in `tests/`
2. Per funzionalità complesse, aggiungi test E2E in `tests/e2e/`
3. Assicurati che i test passino prima di fare commit
4. Aggiorna questo README se necessario
