// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCGoXvIg-Taemqebqe_AxSL7aAtwfFxy_w",
  authDomain: "apheron-job-tracker.firebaseapp.com",
  projectId: "apheron-job-tracker",
  storageBucket: "apheron-job-tracker.firebasestorage.app",
  messagingSenderId: "812993750047",
  appId: "1:812993750047:web:828f3feca930a509d7612a",
  measurementId: "G-Z3HM95PNET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
