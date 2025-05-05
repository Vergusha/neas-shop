import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getDatabase, ref, get } from 'firebase/database';

// Кэш для имен пользователей, чтобы уменьшить количество запросов к Firebase
const userNameCache: Record<string, string> = {};
// Кэш для запросов в процессе выполнения
const pendingRequests: Record<string, Promise<string>> = {};

/**
 * Gets the user's display name from the user profile in Firestore
 * Falls back to Firebase Auth's displayName if profile can't be found
 */
export async function fetchUserDisplayName(userId: string): Promise<string> {
  // Если имя пользователя уже в кэше, возвращаем его
  if (userNameCache[userId]) {
    return userNameCache[userId];
  }

  // Если запрос уже в процессе, не делаем повторный запрос
  if (pendingRequests[userId]) {
    return pendingRequests[userId];
  }

  // Создаем новый запрос и сохраняем его в pendingRequests
  const requestPromise = (async () => {
    try {
      // Сначала пробуем получить имя из Realtime Database, где хранятся профили
      const database = getDatabase();
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const name = userData.nickname || 
                     (userData.firstName && userData.lastName ? 
                      `${userData.firstName} ${userData.lastName}` : 
                      userData.firstName || userData.displayName);
        
        if (name) {
          userNameCache[userId] = name;
          return name;
        }
      }
      
      // Если не нашли в Realtime Database, пробуем Firestore
      const userProfileRef = doc(db, 'userProfiles', userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const userData = userProfileSnap.data();
        
        // Возвращаем первое ненулевое значение в порядке предпочтения
        const name = userData.nickname || 
               userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : 
               userData.firstName || 
               userData.displayName;
        
        if (name) {
          userNameCache[userId] = name;
          return name;
        }
      }
      
      // Если профиль не существует, используем Firebase Auth
      const auth = getAuth();
      if (auth.currentUser?.uid === userId && auth.currentUser?.displayName) {
        userNameCache[userId] = auth.currentUser.displayName;
        return auth.currentUser.displayName;
      }
      
      // Если ничего не нашли, возвращаем "Пользователь"
      userNameCache[userId] = 'Пользователь';
      return 'Пользователь';
    } catch (error) {
      console.error('Error getting user display name:', error);
      userNameCache[userId] = 'Пользователь';
      return 'Пользователь';
    } finally {
      // Удаляем промис из списка ожидающих
      delete pendingRequests[userId];
    }
  })();

  // Сохраняем промис в pendingRequests
  pendingRequests[userId] = requestPromise;
  return requestPromise;
}

/**
 * Gets the user's display name synchronously (for UI components)
 * This returns a placeholder while the async operation completes
 */
export function getUserDisplayName(userId: string): string {
  const auth = getAuth();
  
  // Проверяем кэш сначала
  if (userNameCache[userId]) {
    return userNameCache[userId];
  }
  
  // Если это текущий пользователь, проверяем информацию профиля в localStorage
  if (auth.currentUser?.uid === userId) {
    // Пробуем получить nickname из localStorage, если доступно
    const userProfileStr = localStorage.getItem('userProfile');
    if (userProfileStr) {
      try {
        const userProfile = JSON.parse(userProfileStr);
        const name = userProfile.nickname || 
                     (userProfile.firstName && userProfile.lastName ? 
                      `${userProfile.firstName} ${userProfile.lastName}` : 
                      userProfile.firstName);
        
        if (name) {
          userNameCache[userId] = name;
          return name;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
    
    // Используем displayName из Firebase Auth
    if (auth.currentUser.displayName) {
      userNameCache[userId] = auth.currentUser.displayName;
      return auth.currentUser.displayName;
    }
  }
  
  // Запускаем асинхронное получение имени в фоне
  fetchUserDisplayName(userId).then(name => {
    userNameCache[userId] = name;
    // Вызываем событие обновления имени пользователя
    window.dispatchEvent(new CustomEvent('userNameUpdated', { 
      detail: { userId, name }
    }));
  });
  
  // Возвращаем временное значение
  return userNameCache[userId] || 'Пользователь';
}