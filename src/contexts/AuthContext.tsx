import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Create or update user document in Firestore
  const createUserDocument = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user document
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: new Date(),
        settings: {
          theme: 'light',
          emailNotifications: true,
          reminderDays: 7,
          weeklyGoal: 10,
        },
      };
      await setDoc(userRef, newUser);
      return newUser;
    } else {
      return userSnap.data() as User;
    }
  };

  const signup = async (email: string, password: string, _displayName?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDocument(userCredential.user);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await createUserDocument(userCredential.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        const user = await createUserDocument(firebaseUser);
        setCurrentUser(user);
        
        // Save credentials to Chrome extension storage if available
        if (typeof window !== 'undefined') {
          try {
            const token = await firebaseUser.getIdToken();
            
            // Method 1: Try direct chrome.storage access
            if (window.chrome?.storage?.sync) {
              window.chrome.storage.sync.set({
                userId: firebaseUser.uid,
                token: token,
              });
              console.log('✅ Credentials saved to Chrome extension storage (direct)');
            }
            
            // Method 2: Try sending message to extension
            if (window.chrome?.runtime?.id && window.chrome.runtime.sendMessage) {
              window.chrome.runtime.sendMessage({
                action: 'saveCredentials',
                userId: firebaseUser.uid,
                token: token
              }, (response: any) => {
                if (window.chrome?.runtime?.lastError) {
                  console.warn('⚠️ Extension not available:', window.chrome.runtime.lastError.message);
                } else if (response?.success) {
                  console.log('✅ Credentials saved to Chrome extension (via message)');
                }
              });
            }
            
            // Method 3: Try postMessage (if extension injected script)
            if (window.apheronSaveCredentials) {
              window.apheronSaveCredentials(firebaseUser.uid, token);
            }
            
            // Method 4: PostMessage fallback
            window.postMessage({
              type: 'APHERON_SAVE_CREDENTIALS',
              userId: firebaseUser.uid,
              token: token
            }, window.location.origin);
            
          } catch (error) {
            console.warn('Could not save credentials to Chrome extension:', error);
          }
        }
      } else {
        setCurrentUser(null);
        
        // Clear Chrome extension storage on logout
        if (typeof window !== 'undefined' && window.chrome?.storage?.sync) {
          try {
            window.chrome.storage.sync.remove(['userId', 'token']);
            console.log('✅ Credentials cleared from Chrome extension storage');
          } catch (error) {
            console.warn('Could not clear Chrome extension storage:', error);
          }
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

