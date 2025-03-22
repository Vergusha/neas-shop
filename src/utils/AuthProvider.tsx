import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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
  
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // User is signed in
            console.log("AuthProvider: User is signed in:", firebaseUser.email);
            
            // Get additional user data from database
            const userRef = ref(database, `users/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            const dbData = snapshot.exists() ? snapshot.val() : {};
            
            // Combine Firebase Auth user with database data
            const userData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || dbData.nickname || null,
              photoURL: firebaseUser.photoURL || dbData.avatarURL || null,
              customUserId: dbData.customUserId,
              ...dbData
            };
            
            // Store in context
            setUser(userData);
            
            // Store in localStorage
            localStorage.setItem('userProfile', JSON.stringify(userData));

            // Check if email is verified
            if (firebaseUser.emailVerified) {
              // Update emailVerified status in Realtime Database
              const emailPrefix = firebaseUser.email?.split('@')[0].toLowerCase()
                .replace(/[^a-z0-9-_]/g, '')
                .replace(/\s+/g, '-');
                
              const userRef = ref(database, `users/${emailPrefix}`);
              await update(userRef, {
                isEmailVerified: true,
                emailVerifiedAt: new Date().toISOString()
              });
            }
          } else {
            // User is signed out
            console.log("AuthProvider: User is signed out");
            setUser(null);
          }
        } catch (err) {
          console.error("Error in auth state change handler:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setLoading(false);
        }
      }
    );
    
    return () => unsubscribe();
  }, []);

  const updateUserAvatar = async (avatarURL: string) => {
    if (!user) return;

    try {
      const emailPrefix = user.email?.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');
      
      if (!emailPrefix) return;

      const userRef = ref(database, `users/${emailPrefix}`);
      await update(userRef, { avatarURL });

      setUser(prev => prev ? { ...prev, photoURL: avatarURL } : null);
      localStorage.setItem('userProfile', JSON.stringify({ 
        ...user, 
        photoURL: avatarURL 
      }));
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, updateUserAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
