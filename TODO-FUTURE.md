# 📝 TODO Futuro - Problemi da Risolvere

## ⚠️ Test E2E Networking - Login Automatico

### Problema
Il test `tests/e2e/networking-flow.spec.ts` - "should create, edit, and delete a contact" fallisce perché:

1. **Login automatico non funziona completamente:**
   - La funzione `loginAsTestUser()` non trova il campo email sulla pagina di login
   - La pagina viene caricata ma il campo input non è visibile/trovabile
   - Screenshot salvato in: `test-results/login-page-debug.png`

2. **Pulsante "Aggiungi Contatto" non trovato:**
   - Dopo il login (che fallisce silenziosamente), il test cerca il pulsante ma non lo trova
   - Screenshot salvato in: `test-results/networking-page-debug.png`

### Stato Attuale
- ✅ 3/4 test E2E passano (75% success rate)
- ❌ 1 test fallisce (networking create/edit/delete)
- ⚠️ Login automatico ha problemi con il selettore del campo email

### Soluzioni da Provare

1. **Migliorare selettori login:**
   - Usare selettori più specifici per Material-UI TextField
   - Provare `input[autocomplete="email"]` o selettori basati su label
   - Aggiungere wait per React hydration completa

2. **Usare storage state:**
   - Salvare lo stato di autenticazione dopo il primo login
   - Riutilizzare lo storage state per test successivi
   - Playwright supporta `storageState` option

3. **Test manuale:**
   - Verificare manualmente che il login funzioni
   - Controllare gli screenshot per capire cosa vede Playwright
   - Verificare che il campo email sia effettivamente renderizzato

### File Coinvolti
- `tests/helpers/auth-helper.ts` - Funzione loginAsTestUser
- `tests/e2e/networking-flow.spec.ts` - Test che fallisce
- `src/pages/Login.tsx` - Pagina di login

### Priorità
**Media** - Il sistema funziona al 75%, non è bloccante ma da migliorare.

---

## 📋 Note Aggiuntive

- I test E2E Applications funzionano perfettamente (2/2 passati)
- Il test Networking "add note" funziona (1/2 passati)
- Il problema sembra essere specifico del login automatico e del test networking completo

---

**Data creazione:** ${new Date().toLocaleDateString('it-IT')}
**Status:** ⏸️ In pausa - da risolvere in futuro

