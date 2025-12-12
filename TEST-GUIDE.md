# Guida Completa ai Test - Apheron Job Tracker

## 📋 Indice
1. [Test Sito Web (Browser Desktop)](#test-sito-web-browser-desktop)
2. [Test Sito Web (Browser Mobile)](#test-sito-web-browser-mobile)
3. [Test App Mobile (PWA)](#test-app-mobile-pwa)
4. [Test Chrome Extension](#test-chrome-extension)
5. [Test Cross-Platform](#test-cross-platform)

---

## 🌐 Test Sito Web (Browser Desktop)

### 1. Autenticazione
- [ ] **Login**
  - [ ] Accedere con email e password validi
  - [ ] Verificare redirect a Dashboard dopo login
  - [ ] Verificare che le credenziali vengano salvate nell'estensione Chrome
  - [ ] Testare login con credenziali errate (messaggio di errore)
  - [ ] Testare login con email non valida
  - [ ] Testare login con password vuota

- [ ] **Logout**
  - [ ] Verificare logout dalla navbar
  - [ ] Verificare redirect a pagina login dopo logout
  - [ ] Verificare che i dati non siano più accessibili dopo logout

### 2. Dashboard
- [ ] **Visualizzazione**
  - [ ] Verificare caricamento delle statistiche principali
  - [ ] Verificare visualizzazione dei grafici
  - [ ] Verificare lista candidature recenti
  - [ ] Verificare calendario con prossimi colloqui
  - [ ] Verificare skeleton loading durante il caricamento

- [ ] **Personalizzazione Dashboard**
  - [ ] Aprire "Personalizza Dashboard"
  - [ ] Aggiungere un nuovo widget
  - [ ] Rimuovere un widget esistente
  - [ ] Trascinare e riposizionare i widget (drag & drop)
  - [ ] Ridimensionare i widget
  - [ ] Verificare che le modifiche vengano salvate e persistano al refresh

- [ ] **Widget Interattivi**
  - [ ] Cliccare su una statistica per filtrare le candidature
  - [ ] Interagire con i grafici (hover, click)
  - [ ] Cliccare su una candidatura nella lista per aprire i dettagli

### 3. Candidature (Applications)
- [ ] **Visualizzazione Kanban**
  - [ ] Verificare colonne: Saved, Applied, Interview, Offer, Rejected, Archived
  - [ ] Verificare drag & drop tra colonne
  - [ ] Verificare aggiornamento automatico dello status dopo drag & drop
  - [ ] Verificare filtri rapidi (Senza risposta, Con colloquio, Da seguire)
  - [ ] Verificare filtro per status
  - [ ] Verificare ricerca per titolo/azienda

- [ ] **Creazione Candidatura**
  - [ ] Aprire form "Nuova Candidatura"
  - [ ] Compilare tutti i campi obbligatori
  - [ ] Aggiungere data colloquio
  - [ ] Aggiungere tag
  - [ ] Aggiungere note
  - [ ] Salvare e verificare che appaia nella colonna corretta
  - [ ] Testare validazione campi obbligatori

- [ ] **Modifica Candidatura**
  - [ ] Aprire dettagli candidatura
  - [ ] Modificare titolo, azienda, status
  - [ ] Aggiungere/modificare data colloquio
  - [ ] Aggiungere/modificare tag
  - [ ] Salvare modifiche e verificare aggiornamento

- [ ] **Eliminazione/Archiviazione**
  - [ ] Archiviare una candidatura
  - [ ] Verificare spostamento in colonna "Archived"
  - [ ] Verificare possibilità di ripristino

- [ ] **Bulk Operations** (se implementate)
  - [ ] Selezionare multiple candidature
  - [ ] Cambiare status in bulk
  - [ ] Esportare candidature selezionate

- [ ] **Funzionalità AI**
  - [ ] Generare email di candidatura
  - [ ] Ottimizzare CV per posizione
  - [ ] Generare cover letter
  - [ ] Analizzare CV
  - [ ] Match CV con posizione

### 4. Networking
- [ ] **Visualizzazione Contatti**
  - [ ] Verificare lista contatti
  - [ ] Verificare filtri (tipo, follow-up necessario)
  - [ ] Verificare ricerca contatti
  - [ ] Verificare skeleton loading

- [ ] **Creazione Contatto**
  - [ ] Aprire form "Aggiungi Contatto"
  - [ ] Compilare tutti i campi
  - [ ] Selezionare tipo contatto (recruiter, HR, etc.)
  - [ ] Impostare reminder follow-up
  - [ ] Salvare e verificare che appaia nella lista

- [ ] **Modifica Contatto**
  - [ ] Aprire dettagli contatto
  - [ ] Modificare informazioni
  - [ ] Aggiungere/modificare note
  - [ ] Collegare a candidatura
  - [ ] Salvare modifiche

- [ ] **Note Contatti**
  - [ ] Aggiungere nota a contatto
  - [ ] Visualizzare storico note
  - [ ] Eliminare nota

- [ ] **Eventi Networking**
  - [ ] Aggiungere evento (colloquio, referral, etc.)
  - [ ] Visualizzare storico eventi
  - [ ] Eliminare evento

- [ ] **Follow-up Automatici**
  - [ ] Verificare notifiche per contatti che necessitano follow-up
  - [ ] Verificare badge con numero contatti da seguire

- [ ] **Import LinkedIn**
  - [ ] Cliccare "Importa da LinkedIn"
  - [ ] Verificare comunicazione con estensione Chrome
  - [ ] Verificare importazione contatti

### 5. CV Manager
- [ ] **Visualizzazione CV**
  - [ ] Verificare lista CV
  - [ ] Verificare filtri (tipo, data)
  - [ ] Verificare ricerca CV

- [ ] **Upload CV**
  - [ ] Caricare nuovo CV
  - [ ] Selezionare categoria
  - [ ] Assegnare a candidatura
  - [ ] Verificare upload e visualizzazione

- [ ] **Gestione CV**
  - [ ] Visualizzare dettagli CV
  - [ ] Scaricare CV
  - [ ] Eliminare CV
  - [ ] Modificare metadati CV

- [ ] **CV Tailoring**
  - [ ] Selezionare CV e posizione
  - [ ] Generare versione ottimizzata
  - [ ] Verificare differenze evidenziate

### 6. Job Search
- [ ] **Ricerca Lavoro**
  - [ ] Inserire keywords
  - [ ] Selezionare location
  - [ ] Applicare filtri (remote, salary, etc.)
  - [ ] Verificare risultati ricerca
  - [ ] Salvare ricerca

- [ ] **Job Alerts**
  - [ ] Creare alert
  - [ ] Configurare frequenza notifiche
  - [ ] Verificare ricezione notifiche
  - [ ] Modificare/eliminare alert

### 7. Analytics
- [ ] **Statistiche**
  - [ ] Verificare grafici applicazioni per status
  - [ ] Verificare grafici per fonte
  - [ ] Verificare grafici temporali
  - [ ] Verificare metriche principali (tasso di risposta, etc.)

- [ ] **Filtri Analytics**
  - [ ] Applicare filtro per periodo
  - [ ] Applicare filtro per status
  - [ ] Verificare aggiornamento grafici

### 8. Settings
- [ ] **Profilo Utente**
  - [ ] Modificare nome
  - [ ] Modificare email
  - [ ] Modificare foto profilo

- [ ] **Preferenze**
  - [ ] Cambiare lingua (IT/EN)
  - [ ] Cambiare tema (Light/Dark/Auto)
  - [ ] Configurare notifiche
  - [ ] Verificare persistenza preferenze

- [ ] **Export & Backup**
  - [ ] Esportare candidature in CSV
  - [ ] Esportare candidature in PDF
  - [ ] Esportare contatti in CSV
  - [ ] Esportare contatti in vCard
  - [ ] Esportare tutti i dati in JSON
  - [ ] Verificare correttezza file esportati

- [ ] **Templates**
  - [ ] Creare nuovo template email
  - [ ] Creare nuovo template cover letter
  - [ ] Modificare template esistente
  - [ ] Eliminare template
  - [ ] Impostare template come default
  - [ ] Verificare variabili template ({{companyName}}, etc.)

- [ ] **Workflows (Automazioni)**
  - [ ] Creare nuovo workflow
  - [ ] Configurare trigger (es: quando status cambia)
  - [ ] Configurare azioni (es: invia email, aggiungi tag)
  - [ ] Attivare/disattivare workflow
  - [ ] Modificare workflow esistente
  - [ ] Eliminare workflow
  - [ ] Testare esecuzione workflow

- [ ] **Gmail Integration**
  - [ ] Connettere account Gmail
  - [ ] Verificare sincronizzazione email inviate
  - [ ] Verificare visualizzazione email nella dashboard
  - [ ] Disconnettere account Gmail

### 9. UI/UX Features
- [ ] **Breadcrumbs**
  - [ ] Verificare visualizzazione breadcrumbs
  - [ ] Cliccare su breadcrumb per navigazione
  - [ ] Verificare breadcrumbs corretti per ogni pagina

- [ ] **Keyboard Shortcuts**
  - [ ] `Ctrl+N`: Aprire form nuova candidatura
  - [ ] `Ctrl+F`: Focus ricerca
  - [ ] `Ctrl+/`: Mostrare shortcuts disponibili
  - [ ] Verificare funzionamento su tutte le pagine

- [ ] **Tooltips**
  - [ ] Hover su pulsanti con tooltip
  - [ ] Verificare contenuto informativo tooltip
  - [ ] Verificare tooltip su funzionalità chiave

- [ ] **Error Handling**
  - [ ] Verificare messaggi di errore user-friendly
  - [ ] Verificare ErrorAlert component
  - [ ] Testare errori di rete
  - [ ] Testare errori di permessi
  - [ ] Verificare retry su errori

- [ ] **Loading States**
  - [ ] Verificare skeleton screens invece di spinner
  - [ ] Verificare loading states su tutte le pagine
  - [ ] Verificare transizioni smooth

- [ ] **Dark Mode**
  - [ ] Cambiare tema da Settings
  - [ ] Verificare applicazione tema su tutte le pagine
  - [ ] Verificare contrasti e leggibilità
  - [ ] Verificare persistenza tema

### 10. Onboarding
- [ ] **Tour Guidato**
  - [ ] Verificare avvio tour al primo accesso
  - [ ] Completare tutti i passaggi del tour
  - [ ] Saltare tour
  - [ ] Verificare che non riappaia dopo completamento

### 11. Performance
- [ ] **Caricamento Pagine**
  - [ ] Verificare tempo di caricamento < 3s
  - [ ] Verificare code splitting (caricamento lazy)
  - [ ] Verificare prefetching su hover menu

- [ ] **Caching**
  - [ ] Verificare caching dati frequenti
  - [ ] Verificare invalidazione cache su modifiche
  - [ ] Verificare Service Worker caching

- [ ] **Ottimizzazioni Immagini**
  - [ ] Verificare lazy loading immagini
  - [ ] Verificare compressione immagini

### 12. Compatibilità Browser
- [ ] **Chrome** (ultime 2 versioni)
- [ ] **Firefox** (ultime 2 versioni)
- [ ] **Safari** (ultime 2 versioni)
- [ ] **Edge** (ultime 2 versioni)
- [ ] Verificare funzionalità core su tutti i browser

---

## 📱 Test Sito Web (Browser Mobile)

### 1. Responsive Design
- [ ] **Layout**
  - [ ] Verificare layout responsive su schermi piccoli
  - [ ] Verificare menu hamburger
  - [ ] Verificare navigazione touch-friendly
  - [ ] Verificare dimensioni touch target (min 44x44px)

### 2. Touch Interactions
- [ ] **Gestures**
  - [ ] Testare swipe su lista candidature
  - [ ] Testare drag & drop su mobile (se supportato)
  - [ ] Testare pinch-to-zoom (se applicabile)

### 3. Mobile-Specific Features
- [ ] **Floating Action Button**
  - [ ] Verificare FAB per nuova candidatura
  - [ ] Verificare posizionamento e visibilità

- [ ] **Form Mobile**
  - [ ] Verificare input type corretti (email, tel, etc.)
  - [ ] Verificare keyboard virtuale appropriato
  - [ ] Verificare date picker mobile

### 4. Performance Mobile
- [ ] **Caricamento**
  - [ ] Verificare tempo caricamento su connessione 3G
  - [ ] Verificare ottimizzazioni immagini mobile
  - [ ] Verificare bundle size ottimizzato

### 5. Compatibilità Mobile Browser
- [ ] **iOS Safari**
- [ ] **Chrome Mobile (Android)**
- [ ] **Samsung Internet**
- [ ] **Firefox Mobile**

---

## 📲 Test App Mobile (PWA)

### 1. Installazione PWA
- [ ] **Installazione**
  - [ ] Verificare prompt installazione
  - [ ] Installare PWA su iOS
  - [ ] Installare PWA su Android
  - [ ] Verificare icona app
  - [ ] Verificare splash screen

### 2. Offline Functionality
- [ ] **Service Worker**
  - [ ] Verificare funzionamento offline
  - [ ] Verificare caching risorse
  - [ ] Verificare sync quando torna online
  - [ ] Verificare strategia cache (Network First, etc.)

### 3. Push Notifications
- [ ] **Notifiche**
  - [ ] Richiedere permesso notifiche
  - [ ] Verificare notifica reminder colloquio
  - [ ] Verificare notifica follow-up contatti
  - [ ] Verificare notifica nuovo job match
  - [ ] Cliccare su notifica e verificare apertura app

### 4. App-like Experience
- [ ] **Fullscreen**
  - [ ] Verificare modalità fullscreen
  - [ ] Verificare assenza barra browser

- [ ] **Navigation**
  - [ ] Verificare navigazione fluida
  - [ ] Verificare assenza refresh completo pagina
  - [ ] Verificare back button funzionante

### 5. Performance PWA
- [ ] **Lighthouse Score**
  - [ ] Performance: > 90
  - [ ] Accessibility: > 90
  - [ ] Best Practices: > 90
  - [ ] SEO: > 90
  - [ ] PWA: > 90

### 6. Installazione su Dispositivi
- [ ] **iOS**
  - [ ] Installare via "Aggiungi alla schermata Home"
  - [ ] Verificare funzionamento come app standalone
  - [ ] Verificare notifiche (se supportate)

- [ ] **Android**
  - [ ] Installare via prompt browser
  - [ ] Verificare funzionamento come app standalone
  - [ ] Verificare notifiche push

---

## 🔌 Test Chrome Extension

### 1. Installazione
- [ ] **Setup**
  - [ ] Caricare estensione in modalità sviluppatore
  - [ ] Verificare icona estensione
  - [ ] Verificare popup estensione

### 2. Connessione con Web App
- [ ] **Credenziali**
  - [ ] Verificare salvataggio credenziali dopo login
  - [ ] Verificare stato "Connesso" nell'estensione
  - [ ] Verificare riconnessione automatica

### 3. Salvataggio Posizioni LinkedIn
- [ ] **LinkedIn Jobs**
  - [ ] Navigare a pagina job LinkedIn
  - [ ] Verificare presenza pulsante "Salva in Apheron"
  - [ ] Cliccare e salvare posizione
  - [ ] Verificare estrazione dati corretta (titolo, azienda, location, descrizione)
  - [ ] Verificare che appaia in "Saved" nel web app
  - [ ] Testare navigazione SPA LinkedIn (da feed a job page)

### 4. Salvataggio da Altri Job Boards
- [ ] **Indeed**
  - [ ] Verificare pulsante su pagina job
  - [ ] Testare salvataggio

- [ ] **Glassdoor**
  - [ ] Verificare pulsante su pagina job
  - [ ] Testare salvataggio

### 5. Import Contatti LinkedIn
- [ ] **Profilo LinkedIn**
  - [ ] Navigare a profilo LinkedIn
  - [ ] Cliccare "Importa Contatto" (se implementato)
  - [ ] Verificare estrazione dati contatto
  - [ ] Verificare salvataggio in Networking

- [ ] **Connections LinkedIn**
  - [ ] Navigare a pagina connections
  - [ ] Testare import multiplo (se implementato)

### 6. Error Handling Extension
- [ ] **Errori**
  - [ ] Testare su pagina non supportata
  - [ ] Testare con estensione disconnessa
  - [ ] Verificare messaggi di errore chiari

---

## 🔄 Test Cross-Platform

### 1. Sincronizzazione Dati
- [ ] **Multi-Device**
  - [ ] Creare candidatura su desktop
  - [ ] Verificare che appaia su mobile
  - [ ] Modificare su mobile
  - [ ] Verificare aggiornamento su desktop

### 2. Consistenza UI
- [ ] **Design System**
  - [ ] Verificare consistenza colori
  - [ ] Verificare consistenza tipografia
  - [ ] Verificare consistenza spacing
  - [ ] Verificare consistenza componenti

### 3. Performance Cross-Platform
- [ ] **Benchmark**
  - [ ] Desktop: Tempo caricamento < 2s
  - [ ] Mobile: Tempo caricamento < 3s
  - [ ] PWA: Tempo caricamento < 2s (cached)

### 4. Accessibilità
- [ ] **WCAG 2.1**
  - [ ] Verificare contrasto colori (min 4.5:1)
  - [ ] Verificare navigazione da tastiera
  - [ ] Verificare screen reader compatibility
  - [ ] Verificare alt text immagini
  - [ ] Verificare labels form

---

## 🧪 Test di Regressione

### Checklist Pre-Deploy
- [ ] Tutti i test sopra completati
- [ ] Nessun errore in console
- [ ] Nessun warning critico
- [ ] Performance accettabili
- [ ] Compatibilità browser verificata
- [ ] Mobile responsiveness verificata
- [ ] PWA installabile e funzionante
- [ ] Chrome Extension funzionante
- [ ] Email notifications funzionanti
- [ ] Export/Backup funzionanti

---

## 📝 Note per i Tester

### Ambiente di Test
- **URL Produzione**: https://apheron-job-tracker.web.app
- **URL Staging**: (se disponibile)
- **Chrome Extension**: Caricare da `chrome-extension/` in modalità sviluppatore

### Account di Test
- Creare account di test in Firebase Auth
- Usare credenziali fornite in `.env` per test automatizzati

### Reporting Bug
Quando trovi un bug, includi:
1. **Descrizione**: Cosa è successo
2. **Steps to Reproduce**: Come riprodurre
3. **Expected Behavior**: Cosa ci si aspettava
4. **Actual Behavior**: Cosa è successo invece
5. **Screenshot/Video**: Se applicabile
6. **Browser/Device**: Browser e versione, dispositivo
7. **Console Errors**: Errori in console (se presenti)

### Priorità Test
1. **Alta**: Autenticazione, Salvataggio Candidature, Chrome Extension
2. **Media**: Networking, CV Manager, Analytics
3. **Bassa**: UI/UX Features, Onboarding, Keyboard Shortcuts

---

## ✅ Template Checklist Rapida

### Test Rapido Pre-Release (15 minuti)
- [ ] Login/Logout funzionante
- [ ] Creare nuova candidatura
- [ ] Salvare posizione da LinkedIn (Chrome Extension)
- [ ] Aggiungere contatto in Networking
- [ ] Cambiare tema (Dark/Light)
- [ ] Esportare dati
- [ ] Verificare mobile responsive
- [ ] Verificare PWA installabile

---

**Ultimo aggiornamento**: Data deploy corrente
**Versione**: 1.0.0

