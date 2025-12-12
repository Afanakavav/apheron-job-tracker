# 🚀 Setup SendGrid Gratuito - Guida Rapida

## ⚡ Setup in 5 Minuti

### 1. Crea Account SendGrid/Twilio (GRATIS)
👉 [https://signup.sendgrid.com/](https://signup.sendgrid.com/) o [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)

**Nota:** SendGrid è parte di Twilio (acquisito nel 2016), quindi vedrai l'interfaccia Twilio. Funziona esattamente allo stesso modo!

- **Piano gratuito:** 100 email/giorno
- Verifica email e telefono

### 2. Crea API Key
1. Dashboard Twilio/SendGrid → **Email API** → **Settings** → **API Keys**
   (oppure cerca "SendGrid" nel menu laterale)
2. **Create API Key**
3. Nome: `apheron-job-tracker`
4. Permissions: **Full Access** (o solo "Mail Send")
5. **COPIA LA CHIAVE** (la vedrai solo una volta!)

### 3. Verifica Sender (Opzionale ma Consigliato)
1. Dashboard → **Email API** → **Settings** → **Sender Authentication**
   (oppure cerca "SendGrid" → "Sender Authentication")
2. Clicca **Verify a Single Sender**
3. Email: `noreply@apheron.io` (o la tua email)
4. Compila il form e verifica l'email ricevuta

**Nota:** Se non verifichi un sender, potresti avere limitazioni. È consigliato verificare almeno un'email.

### 4. Configura Firebase

#### Metodo 1: Firebase Console (Più Facile) ✅

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Progetto: `apheron-job-tracker`
3. **Functions** → **Configuration** → **Secrets**
4. Clicca **Add Secret**
5. Nome: `SENDGRID_API_KEY`
6. Valore: (incolla la tua API key)
7. Clicca **Add Secret** di nuovo
8. Nome: `SENDGRID_FROM_EMAIL`
9. Valore: `noreply@apheron.io` (o l'email verificata)

#### Metodo 2: Firebase CLI

```bash
# Installa Firebase CLI se non l'hai già
npm install -g firebase-tools

# Login
firebase login

# Configura secrets (Firebase Functions v2)
firebase functions:secrets:set SENDGRID_API_KEY
# (incolla la tua API key quando richiesto)

firebase functions:secrets:set SENDGRID_FROM_EMAIL
# (incolla: noreply@apheron.io)
```

### 5. Installa Dipendenza

```bash
cd functions
npm install @sendgrid/mail
```

**Nota:** La dipendenza è già aggiunta al `package.json`, quindi basta eseguire:
```bash
cd functions
npm install
```

### 6. Deploy Cloud Function

La funzione è già configurata per SendGrid! Basta deploy:

```bash
firebase deploy --only functions:processEmailNotifications
```

### 7. Test

1. Crea una notifica email nell'app
2. Imposta `scheduledFor` a una data passata
3. Attendi max 5 minuti (o controlla i log)

**Controlla i log:**
```bash
firebase functions:log --only processEmailNotifications
```

---

## ✅ Verifica Funzionamento

1. **Controlla SendGrid Dashboard:**
   - Vai su **Activity** → **Email Activity**
   - Dovresti vedere le email inviate

2. **Controlla Firebase Logs:**
   ```bash
   firebase functions:log
   ```
   Cerca: `✅ Email sent via SendGrid`

3. **Test Manuale:**
   - Crea una notifica con `scheduledFor` = ora attuale
   - Attendi 5 minuti
   - Controlla la tua email

---

## 🆓 Limiti Piano Gratuito

- ✅ **100 email/giorno** (reset ogni giorno)
- ✅ **Illimitato** numero di contatti
- ✅ **API completa**
- ✅ **Tracking email** (opzionale)

**Per la maggior parte degli utenti, 100 email/giorno sono più che sufficienti!**

---

## 🔧 Troubleshooting

### Errore: "SENDGRID_API_KEY not found"
- Verifica che il secret sia configurato in Firebase Console
- Riavvia la funzione dopo aver aggiunto il secret

### Errore: "Sender email not verified"
- Verifica il sender in SendGrid Dashboard
- Usa l'email verificata in `SENDGRID_FROM_EMAIL`

### Email non arriva
- Controlla spam/promozioni
- Verifica che `scheduledFor` sia nel passato
- Controlla i log Firebase per errori

---

## 📚 Risorse

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Free Tier](https://sendgrid.com/pricing/)
- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env)

---

**🎉 Setup completato! Le email verranno inviate automaticamente ogni 5 minuti.**

