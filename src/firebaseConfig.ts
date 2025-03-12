import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // Import getAuth

const firebaseConfig = {
  apiKey: "AIzaSyCdKE4Qpl1YGMMcU7-dtqPAjsqo0Bn43h4",
  authDomain: "neas-shop-e878c.firebaseapp.com",
  databaseURL: "https://neas-shop-e878c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "neas-shop-e878c",
  storageBucket: "neas-shop-e878c.appspot.com",
  messagingSenderId: "1002686912721",
  appId: "1:1002686912721:web:40d4f887f2fa21e1f64df0",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

export { db, database, auth, app };