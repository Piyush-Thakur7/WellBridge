import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// Safe dynamic config loader
const firebaseConfig = {
  projectId: "gen-lang-client-0469720892",
  appId: "1:212401777574:web:b4479e2501d6c11f987d67",
  apiKey: "AIzaSyCRiaA4wtzMAT3YavoWtUku_sSTmNylsW4",
  authDomain: "gen-lang-client-0469720892.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-wellbridgeai-87ed9685-2bd1-4194-b3a9-0c09f267a5a9",
  storageBucket: "gen-lang-client-0469720892.firebasestorage.app",
  messagingSenderId: "212401777574",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use specified custom database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
