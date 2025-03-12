import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdKE4Qpl1YGMMcU7-dtqPAjsqo0Bn43h4",
  authDomain: "neas-shop-e878c.firebaseapp.com",
  projectId: "neas-shop-e878c",
  storageBucket: "neas-shop-e878c.appspot.com",
  messagingSenderId: "1002686912721",
  appId: "1:1002686912721:web:40d4f887f2fa21e1f64df0",
  measurementId: "G-FWPSN8XKZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };