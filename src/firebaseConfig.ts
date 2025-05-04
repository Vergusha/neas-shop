import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged,
  signOut,
  signInWithCustomToken 
} from "firebase/auth";

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

// For development environments, you can enable local emulators
if (window.location.hostname === "localhost") {
  try {
    // Uncomment to use emulators
    // connectFirestoreEmulator(db, "localhost", 8080);
  } catch (e) {
    console.error("Failed to connect to emulators:", e);
  }
}

// Set persistence to local to help with auth token persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// Global auth state tracker
let isRefreshingAuth = false;

// Listen for auth state changes
const unsubscribeAuthListener = onAuthStateChanged(auth, (user) => {
  if (user) {
    // When user is signed in, refresh the token every 30 minutes
    // to prevent token expiration issues
    let tokenRefreshInterval: number;
    
    const refreshToken = async () => {
      if (isRefreshingAuth) return;
      
      try {
        isRefreshingAuth = true;
        const newToken = await user.getIdToken(true);
        console.log("Auth token refreshed successfully");
        isRefreshingAuth = false;
        return newToken;
      } catch (error) {
        console.error("Error refreshing token:", error);
        isRefreshingAuth = false;
        
        // If we can't refresh the token, force sign out and sign back in
        try {
          await signOut(auth);
          // Redirect to login page or show a toast notification
          window.location.href = '/login?error=session-expired';
        } catch (signOutError) {
          console.error("Error signing out after token refresh failure:", signOutError);
        }
      }
    };
    
    // Initial token refresh
    refreshToken();
    
    // Set up interval for token refresh - every 50 minutes 
    // (Firebase tokens usually expire after 60 minutes)
    tokenRefreshInterval = window.setInterval(refreshToken, 50 * 60 * 1000);
    
    // Clear interval when user signs out
    return () => {
      if (tokenRefreshInterval) window.clearInterval(tokenRefreshInterval);
    };
  }
});

export { app, db, auth, database };

/**
 * Force reauthentication of the current user to refresh Firestore access
 */
export async function forceReauthentication(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  
  try {
    // Force token refresh
    await currentUser.getIdToken(true);
    return true;
  } catch (error) {
    console.error("Failed to refresh authentication token:", error);
    return false;
  }
}

export function handleFirestoreError(error: any): string {
  console.error('Firestore Error:', error);
  
  if (error.code === 'permission-denied') {
    // Force token refresh when permission denied
    forceReauthentication().catch(e => console.error('Error during forced reauthentication:', e));
    return "Permission denied: You might need to sign out and sign back in to refresh your session.";
  }
  
  if (error.code === 'unauthenticated') {
    // Force token refresh when unauthenticated
    forceReauthentication().catch(e => console.error('Error during forced reauthentication:', e));
    return "Authentication required: Please sign in again.";
  }
  
  return error.message || "An error occurred with the database.";
}

export async function ensureFirestoreAccess(): Promise<boolean> {
  if (!auth.currentUser) {
    console.warn('No user is signed in');
    return false;
  }
  
  try {
    // Force token refresh
    await auth.currentUser.getIdToken(true);
    
    // Check if custom token refresh is needed
    const tokenExpiryTime = auth.currentUser.metadata.lastSignInTime ? 
      new Date(auth.currentUser.metadata.lastSignInTime).getTime() + (45 * 60 * 1000) :  // 45 minutes
      0;
      
    if (Date.now() > tokenExpiryTime) {
      console.log("Token may be stale, performing full reauthentication");
      await forceReauthentication();
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    
    // Try to sign out and have the user sign in again
    try {
      await signOut(auth);
      window.location.href = '/login?error=auth-refresh-failed';
    } catch (e) {
      console.error('Error during forced sign out:', e);
    }
    
    return false;
  }
}