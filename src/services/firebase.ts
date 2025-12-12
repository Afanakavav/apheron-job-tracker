// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

// Initialize services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Ensure we use the same region where Cloud Functions are deployed
export const functions = getFunctions(app, 'europe-west1');

export default app;
