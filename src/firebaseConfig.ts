import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { app, db, auth, database };

export function handleFirestoreError(error: any): void {
  console.error('Firestore Error:', error);
  // Add your error handling logic here
}

export function setupFirebaseErrorHandling(): void {
  console.log('Setting up Firebase error handling...');
  // Add your setup logic here
}

export function ensureFirestoreAccess(): void {
  console.log('Ensuring Firestore access...');
  // Add your access logic here
}