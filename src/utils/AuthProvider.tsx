import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { database } from '../firebaseConfig';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  customUserId?: string;
  // Add other fields you might need
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: Error | null;
  updateUserAvatar: (avatarURL: string) => Promise<void>; // Add this
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  updateUserAvatar: async () => {} // Add this
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Add a flag to track if we've already processed the avatar
  const [avatarProcessed, setAvatarProcessed] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    const auth = getAuth();
    
    // Configure authentication for enhanced privacy
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Get user data from database
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          let userData: UserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          
          if (snapshot.exists()) {
            const dbUserData = snapshot.val();
            
            // If we have an avatar in the database and it's a long URL, use it instead of Firebase Auth's photoURL
            if (dbUserData.avatarURL && 
                (!firebaseUser.photoURL || dbUserData.avatarURL !== firebaseUser.photoURL)) {
              userData.photoURL = dbUserData.avatarURL;
            }
            
            if (dbUserData.customUserId) {
              userData.customUserId = dbUserData.customUserId;
            }
          }
          
          setUser(userData);
          
          // Store in localStorage for persistence
          if (userData.photoURL) {
            localStorage.setItem('avatarURL', userData.photoURL);
          }
        } catch (err) {
          console.error('Error getting user data:', err);
          setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        }
      } else {
        setUser(null);
        localStorage.removeItem('avatarURL');
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const updateUserAvatar = async (avatarURL: string): Promise<void> => {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    const uid = auth.currentUser.uid;
    
    // If we've already processed this exact URL for this user, don't do it again
    const cacheKey = `${uid}-${avatarURL.substring(0, 50)}`; // Use first 50 chars as a fingerprint
    if (avatarProcessed[cacheKey]) {
      console.log('Avatar update already processed, skipping');
      return;
    }
    
    try {
      // Check if the URL is too long for Firebase Auth (1024 chars is the limit)
      const MAX_FIREBASE_URL_LENGTH = 1024;
      
      setAvatarProcessed(prev => ({...prev, [cacheKey]: true}));
      
      // Update in database regardless of length
      const userRef = ref(database, `users/${uid}`);
      await update(userRef, { avatarURL });
      
      // Update in Firebase Auth only if the URL is short enough
      if (avatarURL.length <= MAX_FIREBASE_URL_LENGTH) {
        try {
          await updateProfile(auth.currentUser, { photoURL: avatarURL });
        } catch (authError) {
          console.warn('Could not update Firebase Auth profile, but database was updated', authError);
        }
      } else {
        console.log('Avatar URL exceeds Firebase length limit. Storing in database only.');
      }
      
      // Update local state
      setUser(prev => prev ? { ...prev, photoURL: avatarURL } : null);
      
      // Store in localStorage for persistence
      localStorage.setItem('avatarURL', avatarURL);
      
      // Update userProfile in localStorage if it exists
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile);
          profileData.avatarURL = avatarURL;
          localStorage.setItem('userProfile', JSON.stringify(profileData));
        } catch (e) {
          console.warn('Error updating userProfile in localStorage:', e);
        }
      }
      
    } catch (err) {
      console.error('Error updating avatar:', err);
      throw err;
    }
  };
  
  const value = {
    user,
    loading,
    error,
    updateUserAvatar
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
