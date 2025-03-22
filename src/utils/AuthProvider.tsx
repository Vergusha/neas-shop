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
  
  useEffect(() => {
    const auth = getAuth();
    
    // Настраиваем авторизацию для работы с повышенной приватностью
    auth.settings.appVerificationDisabledForTesting = false;
    
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

            // Добавляем настройки сессии
            document.cookie = `__session=1; path=/; SameSite=Strict; ${
              window.location.protocol === 'https:' ? 'Secure;' : ''
            }`;
          } else {
            // User is signed out - очищаем все данные
            setUser(null);
            localStorage.removeItem('userProfile');
            localStorage.removeItem('avatarURL');
            localStorage.removeItem('nickname');
            localStorage.removeItem('firstName');
            localStorage.removeItem('lastName');
            console.log("AuthProvider: User is signed out, cleared all data");

            // Очищаем куки сессии
            document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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

  // Обновляем пользователя при изменении аватара
  useEffect(() => {
    const handleAvatarUpdate = (e: CustomEvent) => {
      if (e.detail?.avatarURL && user) {
        setUser(prev => prev ? { ...prev, photoURL: e.detail.avatarURL } : null);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
  }, [user]);

  // Оптимизируем функцию обновления аватара
  const updateUserAvatar = React.useCallback(async (newAvatarURL: string) => {
    if (!user?.email) return;

    try {
      const emailPrefix = user.email.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');

      // Проверяем изменился ли URL аватара
      const currentAvatarURL = user.photoURL;
      if (currentAvatarURL === newAvatarURL) {
        return;
      }

      // 1. Сначала обновляем базу данных
      const userRef = ref(database, `users/${emailPrefix}`);
      await update(userRef, {
        avatarURL: newAvatarURL,
        lastUpdated: new Date().toISOString()
      });

      // 2. Обновляем контекст
      setUser(prev => prev ? { ...prev, photoURL: newAvatarURL } : null);

      // 3. Обновляем Auth профиль только если URL не слишком длинный
      const auth = getAuth();
      if (auth.currentUser && newAvatarURL.length <= 1024) {
        try {
          await updateProfile(auth.currentUser, { photoURL: newAvatarURL });
        } catch (err) {
          console.warn('Auth profile photo not updated due to length:', err);
          // Продолжаем выполнение, так как основные данные уже обновлены
        }
      }

      // 4. Обновляем локальное хранилище
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      localStorage.setItem('userProfile', JSON.stringify({
        ...userProfile,
        photoURL: newAvatarURL,
        avatarURL: newAvatarURL
      }));
      localStorage.setItem('avatarURL', newAvatarURL);

    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
  }, [user?.email]);

  return (
    <AuthContext.Provider value={{ user, loading, error, updateUserAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
