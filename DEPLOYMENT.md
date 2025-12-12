# 🚀 Deployment Guide - Apheron Job Tracker

## 📍 Production URLs

### Primary Domain
**https://myjobs.apheron.io** ⭐  
*Custom domain principale*

### Fallback Domain
**https://apheron-job-tracker.web.app**  
*Firebase default URL (redirects to primary)*

---

## 🔥 Firebase Configuration

### Project Details
- **Project ID:** `apheron-job-tracker`
- **Project Name:** Apheron Job Tracker
- **Region:** `eur3` (Europe West)
- **Plan:** Spark (Free tier)

### Services Used
- ✅ **Firebase Hosting** - Static web hosting
- ✅ **Firebase Authentication** - User auth (Email/Password)
- ✅ **Cloud Firestore** - NoSQL database
- ✅ **Cloud Storage** - File storage (CVs, documents)
- ✅ **Cloud Functions** - Serverless functions (future)
- ✅ **Google Analytics** - Analytics tracking

---

## 🌐 DNS Configuration

### Domain Registrar: Register.it
**Domain:** `apheron.io`

### DNS Records for myjobs.apheron.io

```
Type:  A
Host:  myjobs.apheron.io
Value: 199.36.158.100
TTL:   900
```

**SSL Verification Record (ACME Challenge):**
```
Type:  TXT
Host:  _acme-challenge.myjobs.apheron.io
Value: x0vvqjGa_Bwhpbi5vyEDtvgllsFz6kPZSltWBcfYPho
TTL:   900
```
*Note: Can be removed after SSL is provisioned*

---

## 🔐 SSL Certificate

- **Provider:** Firebase Hosting (Let's Encrypt)
- **Auto-renewal:** Yes
- **Status:** Automatic after DNS verification
- **Time:** 24-48 hours max (usually 1-2 hours)

---

## 📊 Google Analytics

### GA4 Property #2: Job Tracker
- **Property Name:** Apheron Job Tracker
- **Property ID:** `G-XXXXXXXXX` *(to be created)*
- **Stream:** myjobs.apheron.io
- **Data Collection:** Enhanced measurement enabled

### GA4 Property #1: Main Site
- **Domains:** apheron.io, italian-lessons-dublin
- **Separate from Job Tracker**

---

## 🛠️ Build & Deploy

### Prerequisites
```bash
node >= 18.x
npm >= 9.x
firebase-tools >= 13.x
```

### Environment Variables
Create `.env.local` (not committed to git):
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

### Build Command
```bash
npm run build
```

### Deploy Command
```bash
firebase deploy --only hosting
```

### Full Deploy (Hosting + Firestore + Storage rules)
```bash
firebase deploy
```

---

## 📁 Project Structure

```
apheron-job-tracker/
├── public/              # Static assets
│   ├── robots.txt      # SEO: Search engine rules
│   ├── sitemap.xml     # SEO: Site structure
│   └── vite.svg        # Favicon
├── src/                # Source code
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── pages/          # Page components
│   ├── services/       # Firebase & API services
│   ├── styles/         # CSS files
│   └── types.ts        # TypeScript types
├── dist/               # Build output (generated)
├── firebase.json       # Firebase configuration
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── storage.rules       # Storage security rules
└── .env.local          # Environment variables (not in git)
```

---

## 🔄 Redirect Configuration

### Automatic Redirect: .web.app → myjobs.apheron.io

**Status:** ✅ Active (handled automatically by Firebase)  
**Domain:** `myjobs.apheron.io` verified and SSL provisioned

**Note:** Firebase Hosting automatically redirects:
- `apheron-job-tracker.web.app` → `myjobs.apheron.io`
- `apheron-job-tracker.firebaseapp.com` → `myjobs.apheron.io`

**No manual redirect configuration needed in `firebase.json`**

**Benefits:**
- 🔍 SEO: Prevents duplicate content
- 🎨 Branding: Consistent URL
- 📊 Analytics: Centralized metrics

---

## 🔒 Security

### Firestore Security Rules
- ✅ Users can only read/write their own data
- ✅ All collections protected by `userId`
- ✅ Authenticated access only

### Storage Security Rules
- ✅ Users can only access their own files
- ✅ Path: `/users/{userId}/cvs/` and `/users/{userId}/documents/`
- ✅ Read/write restricted by authentication

### API Keys
- ✅ Gemini API key stored in `.env.local`
- ✅ Fallback in code for production
- ⚠️ Future: Move to Cloud Functions for better security

---

## 📈 Performance

### Build Optimization
- ✅ Vite build with minification
- ✅ Code splitting (future improvement)
- ✅ Asset optimization

### Caching Strategy
```
Static assets (JS/CSS): 1 year
HTML: No cache (SPA routing)
```

### CDN
- ✅ Firebase Hosting global CDN
- ✅ Automatic edge caching

---

## 🐛 Troubleshooting

### White Screen Issue
**Cause:** Base path mismatch or missing environment variables  
**Solution:** 
- Check `vite.config.ts` → `base: '/'`
- Check `main.tsx` → `<BrowserRouter>` (no basename)
- Verify `.env.local` exists with correct values

### DNS Not Propagating
**Wait:** 5 min - 48 hours (usually 15-30 min)  
**Check:** https://dnschecker.org  
**Verify:** `nslookup myjobs.apheron.io`

### SSL Certificate Pending
**Normal:** Takes 24-48 hours max  
**Check:** Firebase Console → Hosting → Domains  
**Action:** Wait, Firebase handles it automatically

---

## 📞 Support & Resources

### Firebase Console
https://console.firebase.google.com/project/apheron-job-tracker

### Firebase Documentation
https://firebase.google.com/docs

### Register.it DNS Panel
https://www.register.it

### DNS Checker
https://dnschecker.org

### Google Search Console
*(To be configured after domain verification)*

---

## 🗓️ Deployment History

| Date | Version | Changes | Deployed By |
|------|---------|---------|-------------|
| 2025-10-23 | v1.0.0 | Initial deployment | Francesco |
| 2025-10-23 | v1.0.1 | Fix base path for root deployment | Francesco |
| 2025-10-23 | v1.0.2 | Add robots.txt & sitemap.xml | Francesco |
| 2025-10-23 | v1.0.3 | Configure myjobs.apheron.io custom domain | Francesco |
| 2025-10-23 | v1.0.4 | SSL certificate provisioned successfully | Francesco |

---

## ✅ Pre-Deploy Checklist

- [ ] Run `npm run build` locally
- [ ] Check for TypeScript errors
- [ ] Verify `.env.local` exists
- [ ] Test locally with `npm run dev`
- [ ] Commit changes to git
- [ ] Push to GitHub
- [ ] Run `firebase deploy --only hosting`
- [ ] Verify deployment on production URL
- [ ] Check Firebase Console for errors
- [ ] Test all major features

---

## 🚀 Future Improvements

### Short Term
- [x] Enable redirect from .web.app to myjobs.apheron.io ✅
- [ ] Configure Google Analytics GA4
- [ ] Add Google Search Console property
- [ ] Update robots.txt and sitemap.xml with myjobs.apheron.io
- [ ] **⚠️ IMPORTANT: Configure GEMINI_API_KEY in Firebase Functions environment variables**
  - Currently: Cloud Functions use a fallback API key (warning in deployment)
  - Action needed: Set `GEMINI_API_KEY` in Firebase Console → Functions → Configuration → Environment variables
  - This will allow proper deployment of Cloud Functions without warnings

### Medium Term
- [ ] Code splitting for better performance
- [ ] Service Worker for offline support
- [ ] Progressive Web App (PWA) features

### Long Term
- [ ] Email integration (Gmail API)
- [ ] Chrome extension
- [ ] Job search aggregator
- [ ] AI-powered features enhancement

---

## ⚠️ Known Issues & Notes

### Cloud Functions - GEMINI_API_KEY Configuration
**Status:** ⚠️ Warning (non-blocking)  
**Date:** 2025-01-XX

**Issue:**
- Cloud Functions deployment shows warning: `GEMINI_API_KEY not found in environment!`
- Functions currently use a fallback API key and work correctly
- Warning appears during `firebase deploy` but doesn't block hosting deployment

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/apheron-job-tracker/functions)
2. Navigate to Functions → Configuration
3. Add environment variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your Google Gemini API key
4. Redeploy Functions: `firebase deploy --only functions`

**Impact:**
- Current: Functions work with fallback (no breaking changes)
- After fix: Clean deployment without warnings, better security

---

**Last Updated:** 2025-10-23  
**Maintained By:** Francesco Perone  
**Contact:** francesco.perone00@gmail.com

