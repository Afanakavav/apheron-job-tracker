# 📧 Email Notifications Setup Guide

## 🆓 Configurazione Gratuita - SendGrid/Twilio (Consigliato)

**SendGrid (ora parte di Twilio) offre 100 email al giorno GRATIS** - perfetto per le notifiche!

**Nota Importante:** SendGrid è stato acquisito da Twilio nel 2016. Quando ti registri, vedrai l'interfaccia Twilio, ma funziona esattamente allo stesso modo. L'API e le funzionalità sono identiche!

### Setup SendGrid/Twilio Gratuito (5 minuti)

#### 1. Crea Account
1. Vai su [https://signup.sendgrid.com/](https://signup.sendgrid.com/) o [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Crea un account gratuito
3. Completa la verifica email e telefono

#### 2. Crea API Key
1. Dashboard Twilio → **Email API** → **Settings** → **API Keys**
   (oppure cerca "SendGrid" nel menu laterale)
2. Clicca **Create API Key**
3. Nome: `apheron-job-tracker`
4. Permissions: **Full Access** (o solo "Mail Send")
5. Clicca **Create & View**
6. **COPIA LA CHIAVE** (la vedrai solo una volta!)

#### 3. Verifica Sender Identity (Opzionale ma Consigliato)
1. Dashboard → **Email API** → **Settings** → **Sender Authentication**
   (oppure cerca "SendGrid" → "Sender Authentication")
2. Clicca **Verify a Single Sender**
3. Compila il form con:
   - Email: `noreply@apheron.io` (o la tua email)
   - Nome: `Apheron Job Tracker`
4. Verifica l'email inviata da Twilio/SendGrid

#### 4. Configura Firebase Functions

**Opzione A: Firebase Console (Consigliato)**
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `apheron-job-tracker`
3. Vai su **Functions** → **Configuration**
4. Aggiungi variabile d'ambiente:
   - Nome: `SENDGRID_API_KEY`
   - Valore: (incolla la tua API key)
5. Aggiungi variabile d'ambiente:
   - Nome: `SENDGRID_FROM_EMAIL`
   - Valore: `noreply@apheron.io` (o l'email verificata)

**Opzione B: Firebase CLI**
```bash
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@apheron.io"
```

#### 5. Installa Dipendenza
```bash
cd functions
npm install @sendgrid/mail
```

#### 6. Deploy
```bash
firebase deploy --only functions:processEmailNotifications
```

#### 7. Test
La funzione gira automaticamente ogni 5 minuti. Per testare subito:
1. Crea una notifica email nel database (via app)
2. Imposta `scheduledFor` a una data passata
3. Controlla i log: `firebase functions:log --only processEmailNotifications`

---

## Configurazione Servizio Email

La Cloud Function `processEmailNotifications` supporta tre opzioni per l'invio di email:

### Opzione 1: SendGrid (Consigliato) - 🆓 GRATIS

1. Crea un account su [SendGrid](https://sendgrid.com)
2. Genera un API Key
3. Configura le variabili d'ambiente in Firebase:

```bash
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@apheron.io"
```

4. Installa la dipendenza (opzionale, verrà installata automaticamente se configurata):
```bash
cd functions
npm install @sendgrid/mail
```

### Opzione 2: Mailgun

1. Crea un account su [Mailgun](https://www.mailgun.com)
2. Configura le variabili d'ambiente:

```bash
firebase functions:config:set mailgun.api_key="YOUR_MAILGUN_API_KEY"
firebase functions:config:set mailgun.domain="YOUR_DOMAIN"
firebase functions:config:set mailgun.from_email="noreply@YOUR_DOMAIN"
```

3. Installa le dipendenze:
```bash
cd functions
npm install mailgun.js form-data
```

### Opzione 3: SMTP (Gmail, Outlook, etc.)

1. Configura le variabili d'ambiente:

```bash
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.secure="false"
firebase functions:config:set smtp.user="your-email@gmail.com"
firebase functions:config:set smtp.pass="your-app-password"
firebase functions:config:set smtp.from="your-email@gmail.com"
```

2. Installa la dipendenza:
```bash
cd functions
npm install nodemailer
```

## Deploy della Cloud Function

```bash
firebase deploy --only functions:processEmailNotifications
```

## Test

La funzione viene eseguita automaticamente ogni 5 minuti. Puoi anche testarla manualmente:

```bash
firebase functions:shell
# Poi esegui:
processEmailNotifications()
```

## Note

- La funzione processa fino a 50 email per esecuzione
- Le email vengono inviate solo se `scheduledFor <= now` e `status === 'pending'`
- Se nessun servizio email è configurato, le email vengono solo loggate (non inviate)

