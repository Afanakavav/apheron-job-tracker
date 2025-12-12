# ⚡ Setup Email Gratuito - 5 Minuti

## 🆓 SendGrid/Twilio - 100 Email/Giorno GRATIS

**Nota:** SendGrid è parte di Twilio, quindi vedrai l'interfaccia Twilio. Funziona allo stesso modo!

### Step 1: Crea Account
👉 [https://signup.sendgrid.com/](https://signup.sendgrid.com/) o [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)

### Step 2: Crea API Key
1. Dashboard Twilio → **Email API** → **Settings** → **API Keys**
   (oppure cerca "SendGrid" nel menu)
2. **Create API Key** → Nome: `apheron-job-tracker`
3. Permissions: **Full Access** (o solo "Mail Send")
4. **COPIA LA CHIAVE** ⚠️ (la vedrai solo una volta!)

### Step 3: Configura Firebase

**Firebase Console:**
1. [Firebase Console](https://console.firebase.google.com/)
2. Progetto → **Functions** → **Configuration** → **Secrets**
3. **Add Secret:**
   - `SENDGRID_API_KEY` = (la tua API key)
   - `SENDGRID_FROM_EMAIL` = `noreply@apheron.io`

### Step 4: Deploy
```bash
cd functions
npm install @sendgrid/mail
firebase deploy --only functions:processEmailNotifications
```

### Step 5: Test
Crea una notifica email nell'app → Attendi 5 minuti → Controlla email!

---

**✅ Fatto! Le email verranno inviate automaticamente ogni 5 minuti.**

Vedi `SENDGRID-SETUP-QUICK.md` per dettagli completi.

