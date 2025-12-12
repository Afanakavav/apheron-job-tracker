# Guida Configurazione Google Calendar API

Questa guida ti aiuterà a configurare Google Calendar API per l'integrazione con Apheron Job Tracker.

> ✅ **STATO CONFIGURAZIONE**: Il file `.env` è stato creato con il Client ID corretto. 
> Verifica che il server di sviluppo sia riavviato per caricare le variabili d'ambiente.

## 📋 Prerequisiti

- Accesso a [Google Cloud Console](https://console.cloud.google.com/)
- Progetto Firebase: `apheron-job-tracker`
- Credenziali OAuth 2.0 già configurate (per Gmail)

---

## 🔧 Passo 1: Abilitare Google Calendar API

### 1.1 Accedi a Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Assicurati di essere nel progetto corretto: **apheron-job-tracker**
   - Se non lo vedi, usa il menu a tendina in alto per selezionarlo

### 1.2 Abilita l'API

1. Nel menu laterale sinistro, vai su **"API e servizi"** → **"Libreria"**
   - Oppure vai direttamente a: https://console.cloud.google.com/apis/library
2. Nella barra di ricerca, digita: **"Google Calendar API"**
3. Clicca sul risultato **"Google Calendar API"**
4. Clicca sul pulsante **"ABILITA"** (o **"ENABLE"** se l'interfaccia è in inglese)
5. Attendi qualche secondo per l'abilitazione

✅ **Verifica**: Dovresti vedere un messaggio di conferma e il pulsante cambierà in "GESTISCI" (o "MANAGE")

---

## 🔑 Passo 2: Aggiungere gli Scope Calendar alle Credenziali OAuth

### 2.1 Accedi alle Credenziali OAuth

1. Nel menu laterale, vai su **"API e servizi"** → **"Credenziali"**
   - Oppure vai direttamente a: https://console.cloud.google.com/apis/credentials
2. Trova la credenziale OAuth 2.0 Client ID che usi per l'applicazione
   - Dovrebbe essere di tipo **"Applicazione Web"** o **"Web application"**
   - Se non la vedi, potrebbe essere necessario crearne una nuova

### 2.2 Modifica le Credenziali OAuth

1. Clicca sul nome della credenziale OAuth 2.0 per aprirla
2. Scorri fino alla sezione **"Schermate di consenso OAuth"** (o **"OAuth consent screen"**)

### 2.3 Configura la Schermata di Consenso (se necessario)

1. Se non l'hai già fatto, configura la schermata di consenso:
   - Tipo utente: **"Esterno"** (o **"External"**)
   - Nome app: **"Apheron Job Tracker"**
   - Email di supporto: la tua email
   - Dominio sviluppatore: il tuo dominio (opzionale)
   - Clicca **"SALVA E CONTINUA"**

2. Nella sezione **"Scope"**:
   - Clicca **"AGGIUNGI O RIMUOVI SCOPE"**
   - Cerca e aggiungi questi scope:
     - ✅ `https://www.googleapis.com/auth/calendar`
     - ✅ `https://www.googleapis.com/auth/calendar.events`
   - Clicca **"AGGIORNA"** e poi **"SALVA E CONTINUA"**

3. Aggiungi utenti di test (se l'app è in modalità test):
   - Aggiungi il tuo indirizzo email
   - Clicca **"SALVA E CONTINUA"**

4. Rivedi e pubblica (se necessario)

### 2.4 Verifica gli Scope nelle Credenziali

1. Torna a **"API e servizi"** → **"Credenziali"**
2. Clicca sulla tua OAuth 2.0 Client ID
3. Verifica che nella sezione **"ID client OAuth 2.0"** ci sia:
   - **ID client**: questo è il valore che userai per `VITE_GOOGLE_CLIENT_ID`
   - **Segreto client**: non necessario per questa integrazione (usiamo Google Identity Services)

---

## 🔐 Passo 3: Configurare VITE_GOOGLE_CLIENT_ID

### 3.1 Trova il Client ID

1. In **"API e servizi"** → **"Credenziali"** (o nella sezione "Google Auth Platform" → "Client")
2. Trova la tua OAuth 2.0 Client ID
   - **Usa**: "Apheron Job Tracker - Web Client" (quello creato manualmente per la tua app)
   - **Non usare**: "Web client (auto created by Google Service)" (quello creato automaticamente)
3. Clicca sull'icona di copia accanto all'**"ID client"** per copiarlo
   - Esempio: `812993750047-hlifvupj95gfdp63h9ndorudgbhd8ka0.apps.googleusercontent.com`

### 3.2 Crea/Aggiorna il file .env

1. **Apri il terminale** nella root del progetto `apheron-job-tracker`
   - Su Windows: PowerShell o CMD
   - Su Mac/Linux: Terminal

2. **Crea il file `.env`** (se non esiste):
   ```bash
   # Windows (PowerShell)
   New-Item -Path .env -ItemType File
   
   # Mac/Linux
   touch .env
   ```
   
   Oppure crealo manualmente con il tuo editor di testo preferito.

3. **Apri il file `.env`** e aggiungi questa riga:
   ```env
   VITE_GOOGLE_CLIENT_ID=812993750047-hlifvupj95gfdp63h9ndorudgbhd8ka0.apps.googleusercontent.com
   ```
   
   **Usa il Client ID di "Apheron Job Tracker - Web Client"** (non quello auto-creato)

4. **IMPORTANTE**: 
   - Non aggiungere spazi prima o dopo il `=`
   - Non usare virgolette intorno al Client ID
   - Non aggiungere spazi alla fine della riga
   - Il file `.env` è già nel `.gitignore`, quindi non verrà committato

5. **Salva il file** (Ctrl+S o Cmd+S)

### 3.3 Verifica la Configurazione

1. Riavvia il server di sviluppo se è in esecuzione:
   ```bash
   # Ferma il server (Ctrl+C)
   # Poi riavvialo
   npm run dev
   ```

2. Verifica che la variabile sia caricata:
   - Apri la console del browser (F12)
   - Vai alla tab "Console"
   - Non dovresti vedere errori relativi a `VITE_GOOGLE_CLIENT_ID`

---

## ✅ Verifica Finale

### Test della Configurazione

1. **Avvia l'applicazione**:
   ```bash
   npm run dev
   ```

2. **Vai alla pagina Calendario**:
   - Accedi all'app
   - Vai su "Calendario" nel menu

3. **Testa la connessione**:
   - Clicca sul pulsante **"Connetti Google Calendar"** (o **"Connect Google Calendar"**)
   - Dovresti vedere un popup di autorizzazione Google
   - Autorizza l'accesso a Google Calendar
   - Dovresti vedere un messaggio di successo

4. **Testa la sincronizzazione**:
   - Clicca sul pulsante **"Sincronizza Google Calendar"**
   - Dovresti vedere un messaggio con il numero di eventi sincronizzati

---

## 🐛 Risoluzione Problemi

### Errore: "API not enabled"
- **Soluzione**: Assicurati di aver abilitato "Google Calendar API" nel Passo 1

### Errore: "Invalid client ID"
- **Soluzione**: 
  - Verifica che `VITE_GOOGLE_CLIENT_ID` nel file `.env` sia corretto
  - Riavvia il server di sviluppo
  - Verifica che non ci siano spazi o caratteri extra nel file `.env`

### Errore: "Access blocked: This app's request is invalid"
- **Soluzione**: 
  - Verifica che gli scope Calendar siano aggiunti nella schermata di consenso OAuth
  - Assicurati che l'app non sia in modalità test o aggiungi il tuo email come utente di test

### Errore: "The OAuth client was not found"
- **Soluzione**: 
  - Verifica di essere nel progetto corretto in Google Cloud Console
  - Verifica che il Client ID sia corretto

### Popup di autorizzazione non si apre
- **Soluzione**: 
  - Verifica che i popup non siano bloccati dal browser
  - Prova in modalità incognito
  - Verifica la console del browser per errori JavaScript

---

## 📝 Note Importanti

1. **Sicurezza**: 
   - Il file `.env` contiene informazioni sensibili
   - Non committarlo mai nel repository Git
   - Assicurati che sia nel `.gitignore`

2. **Ambiente di Produzione**:
   - Per produzione, configura le variabili d'ambiente nella piattaforma di hosting
   - Per Firebase Hosting, usa Firebase Functions config
   - Per Vercel/Netlify, usa le variabili d'ambiente nel dashboard

3. **Limitazioni**:
   - Google Calendar API ha limiti di quota
   - Quota predefinita: 1.000.000 richieste/giorno
   - Per la maggior parte degli usi, questo è più che sufficiente

4. **Revoca Accesso**:
   - Gli utenti possono revocare l'accesso da: https://myaccount.google.com/permissions
   - In questo caso, dovranno riconnettersi

---

## 🔗 Link Utili

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#calendar)
- [Firebase Documentation](https://firebase.google.com/docs)

---

## 📞 Supporto

Se incontri problemi durante la configurazione:
1. Controlla la console del browser per errori
2. Verifica i log di Google Cloud Console
3. Consulta la documentazione ufficiale di Google Calendar API

