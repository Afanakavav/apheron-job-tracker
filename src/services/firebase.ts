// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// IMPORTANT: Never commit real API keys! Use environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "apheron-job-tracker.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "apheron-job-tracker",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "apheron-job-tracker.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "812993750047",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:812993750047:web:828f3feca930a509d7612a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z3HM95PNET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check for API key protection
// App Check protects your backend resources from abuse
// Even if someone has your API key, they cannot access resources without a valid App Check token
if (typeof window !== 'undefined') {
  try {
    // Get reCAPTCHA site key from environment
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    
    if (recaptchaSiteKey) {
      // Initialize App Check with reCAPTCHA v3
      // In development, App Check uses a debug token (see Firebase Console > App Check > Apps)
      // In production, it uses reCAPTCHA v3 tokens
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true
      });
      
      console.log('✅ Firebase App Check initialized');
    } else {
      console.warn('⚠️ VITE_RECAPTCHA_SITE_KEY not found. App Check not initialized.');
    }
  } catch (error) {
    // App Check is optional - log warning but don't break the app
    console.warn('⚠️ Firebase App Check initialization failed:', error);
    console.warn('   App will work without App Check, but API key protection is reduced');
  }
}

// Initialize services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Ensure we use the same region where Cloud Functions are deployed
export const functions = getFunctions(app, 'europe-west1');

export default app;
