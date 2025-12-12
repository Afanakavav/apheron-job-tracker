# 🧪 Test Email Notifications

## ✅ Configurazione Completata

**Secrets configurati:**
- ✅ `SENDGRID_API_KEY` = Configurato
- ✅ `SENDGRID_FROM_EMAIL` = `info@apheron.io`
- ✅ Sender verificato in Twilio/SendGrid: `info@apheron.io`

**Funzione deployata:**
- ✅ `processEmailNotifications` - Eseguita ogni 5 minuti

## 🧪 Come Testare

### Metodo 1: Creare Notifica di Test nell'App

1. Vai nell'app Apheron Job Tracker
2. Crea una nuova notifica email (se disponibile nell'interfaccia)
3. Imposta `scheduledFor` a una data/ora passata
4. Attendi max 5 minuti
5. Controlla la tua email `info@apheron.io`

### Metodo 2: Creare Notifica Manualmente in Firestore

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Progetto → **Firestore Database**
3. Crea un documento nella collection `email_notifications`:

```json
{
  "userId": "TUO_USER_ID",
  "subject": "Test Email Notification",
  "body": "Questa è una email di test da Apheron Job Tracker!",
  "status": "pending",
  "scheduledFor": [Timestamp - imposta a ora attuale o passato],
  "createdAt": [Timestamp - ora attuale],
  "recipient": "info@apheron.io"
}
```

4. Attendi max 5 minuti
5. Controlla:
   - Email in `info@apheron.io`
   - Status del documento in Firestore (dovrebbe diventare `sent`)
   - Log Firebase Functions

### Metodo 3: Controllare Log Firebase

```bash
firebase functions:log --only processEmailNotifications
```

Cerca:
- `📧 Processing email notifications...`
- `✅ Email sent via SendGrid to info@apheron.io`
- `✅ Email processing complete: X sent, Y failed`

### Metodo 4: Controllare Twilio/SendGrid Dashboard

1. Vai su [Twilio Console](https://console.twilio.com/)
2. **Email API** → **Activity** → **Email Activity**
3. Dovresti vedere le email inviate

## 🔍 Verifica Funzionamento

### Controlla Status Notifica in Firestore

Dopo l'invio, il documento dovrebbe avere:
- `status`: `sent` (o `failed` se c'è un errore)
- `sentAt`: Timestamp dell'invio
- `error`: (solo se `status` è `failed`)

### Controlla Log Firebase

```bash
firebase functions:log --only processEmailNotifications --limit 20
```

Messaggi attesi:
- ✅ `📧 Processing email notifications...`
- ✅ `📬 Found X pending notifications to process`
- ✅ `✅ Email sent via SendGrid to info@apheron.io`
- ✅ `✅ Email processing complete: X sent, Y failed`

### Controlla Email

Controlla la casella `info@apheron.io` (e anche spam/promozioni).

## 🐛 Troubleshooting

### Email non arriva

1. **Controlla spam/promozioni**
2. **Verifica sender in Twilio:**
   - Twilio Console → Email API → Settings → Sender Authentication
   - Assicurati che `info@apheron.io` sia verificato
3. **Controlla log Firebase:**
   ```bash
   firebase functions:log --only processEmailNotifications
   ```
4. **Verifica secrets:**
   ```bash
   firebase functions:secrets:access SENDGRID_API_KEY
   firebase functions:secrets:access SENDGRID_FROM_EMAIL
   ```

### Errore: "SENDGRID_API_KEY not found"

- Verifica che i secrets siano configurati:
  ```bash
  firebase functions:secrets:access SENDGRID_API_KEY
  ```
- Riavvia la funzione dopo aver aggiunto secrets

### Errore: "Sender email not verified"

- Verifica il sender in Twilio Console
- Assicurati che `info@apheron.io` sia verificato
- Usa l'email verificata in `SENDGRID_FROM_EMAIL`

### Status rimane "pending"

- Controlla che `scheduledFor` sia nel passato
- Verifica i log per errori
- Controlla che la funzione sia attiva (ogni 5 minuti)

## ✅ Test Completato

Quando vedi:
- ✅ Email ricevuta in `info@apheron.io`
- ✅ Status in Firestore = `sent`
- ✅ Log Firebase mostrano `✅ Email sent via SendGrid`

**La configurazione è completa e funzionante!** 🎉

