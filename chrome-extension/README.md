# Apheron Job Tracker - Chrome Extension

Estensione Chrome per salvare posizioni di lavoro con un click direttamente dai job boards.

## 🚀 Installazione

### Per Sviluppo (Modalità Sviluppatore)

1. Apri Chrome e vai a `chrome://extensions/`
2. Attiva "Modalità sviluppatore" (toggle in alto a destra)
3. Clicca "Carica estensione non pacchettizzata"
4. Seleziona la cartella `chrome-extension/`
5. L'estensione è ora installata!

### Per Produzione

1. Crea un account su [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Prepara le icone (16x16, 48x48, 128x128)
3. Crea un file ZIP della cartella `chrome-extension/`
4. Carica su Chrome Web Store

## 📋 Funzionalità

- ✅ Salvataggio posizioni con un click da LinkedIn, Indeed, Glassdoor
- ✅ Estrazione automatica dati posizione (titolo, azienda, descrizione)
- ✅ Sincronizzazione con app Apheron
- ✅ Popup per gestione connessione

## 🔧 Setup

### 1. Creare le Icone

Crea le icone nella cartella `icons/`:
- `icon-16.png` (16x16px)
- `icon-48.png` (48x48px)
- `icon-128.png` (128x128px)

Puoi usare l'icona dell'app Apheron e ridimensionarla.

### 2. Configurare Autenticazione

L'estensione usa `chrome.storage.sync` per salvare:
- `userId`: ID utente Firebase
- `token`: Token di autenticazione

Questi vengono salvati quando l'utente si connette dall'app web.

### 3. Testare

1. Installa l'estensione in modalità sviluppatore
2. Vai su una pagina LinkedIn job (es: https://www.linkedin.com/jobs/view/...)
3. Dovresti vedere il pulsante "💾 Salva in Apheron"
4. Clicca per salvare la posizione

## 🔐 Autenticazione

L'estensione richiede che l'utente sia autenticato nell'app web. 

**Opzione 1: Manuale**
- L'utente apre l'app web
- Si logga
- L'app salva `userId` e `token` in `chrome.storage.sync`

**Opzione 2: Automatica (da implementare)**
- L'estensione apre popup OAuth
- L'utente si autentica
- L'estensione salva le credenziali

## 📝 Note

- L'estensione funziona solo su pagine job di LinkedIn, Indeed, Glassdoor
- I selettori CSS potrebbero cambiare quando i siti aggiornano il layout
- Richiede manutenzione periodica per adattarsi ai cambiamenti dei siti

## 🐛 Troubleshooting

**Il pulsante non appare:**
- Verifica che la pagina sia una pagina job (controlla URL)
- Apri la console (F12) e verifica errori
- Controlla che i selettori CSS siano ancora validi

**Errore "User not authenticated":**
- Apri l'app web e fai login
- L'app dovrebbe salvare automaticamente le credenziali
- Ricarica la pagina del job board

**Errore nel salvataggio:**
- Verifica la connessione internet
- Controlla che l'API endpoint sia raggiungibile
- Verifica i permessi dell'estensione
