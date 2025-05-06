import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { Product } from '../types/product';

// Добавляем кэш для быстрой проверки статуса избранного без обращений к Firebase
const favoriteCache = new Map<string, boolean>();

// Обновляем кэш из Firebase или localStorage
export const updateFavoriteCache = async (): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const favRef = ref(database, `users/${user.uid}/favorites`);
    const snapshot = await get(favRef);
    if (snapshot.exists()) {
      const favorites = snapshot.val();
      favoriteCache.clear();
      Object.keys(favorites).forEach(id => {
        favoriteCache.set(id, true);
      });
    } else {
      favoriteCache.clear();
    }
  } else {
    try {
      const storedFavorites = localStorage.getItem('favorites') || '[]';
      const parsedFavorites = JSON.parse(storedFavorites);
      favoriteCache.clear();
      
      if (Array.isArray(parsedFavorites)) {
        if (parsedFavorites.length > 0) {
          if (typeof parsedFavorites[0] === 'string') {
            // Массив ID
            parsedFavorites.forEach(id => favoriteCache.set(id, true));
          } else if (typeof parsedFavorites[0] === 'object' && parsedFavorites[0].id) {
            // Массив объектов
            parsedFavorites.forEach(item => favoriteCache.set(item.id, true));
          }
        }
      }
    } catch (error) {
      console.error('Error parsing favorites for cache:', error);
    }
  }
};

// Инициализируем кэш при загрузке
updateFavoriteCache();

// Мониторим изменения избранного для авторизованных пользователей
export const setupFavoritesListener = (): (() => void) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) return () => {};
  
  const favRef = ref(database, `users/${user.uid}/favorites`);
  return onValue(favRef, (snapshot) => {
    if (snapshot.exists()) {
      const favorites = snapshot.val();
      favoriteCache.clear();
      Object.keys(favorites).forEach(id => {
        favoriteCache.set(id, true);
      });
    } else {
      favoriteCache.clear();
    }
  });
};

// Получение статуса избранного с использованием кэша для оптимизации
export const getFavoriteStatus = async (productId: string): Promise<boolean> => {
  // Сначала проверяем кэш для мгновенного ответа
  if (favoriteCache.has(productId)) {
    return favoriteCache.get(productId) || false;
  }
  
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
    const snapshot = await get(favRef);
    const result = snapshot.exists();
    favoriteCache.set(productId, result);
    return result;
  } else {
    const storedFavorites = localStorage.getItem('favorites') || '[]';
    try {
      const parsedFavorites = JSON.parse(storedFavorites);
      let result = false;
      
      if (Array.isArray(parsedFavorites)) {
        if (parsedFavorites.length > 0) {
          if (typeof parsedFavorites[0] === 'string') {
            // Массив ID
            result = parsedFavorites.includes(productId);
          } else if (typeof parsedFavorites[0] === 'object') {
            // Массив объектов
            result = parsedFavorites.some((item: any) => item.id === productId);
          }
        }
      }
      
      favoriteCache.set(productId, result);
      return result;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }
};

export const toggleFavorite = async (
  productId: string,
  productData: Product | null
): Promise<boolean> => {
  const auth = getAuth();
  const user = auth.currentUser;

  try {
    if (user) {
      const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
      const snapshot = await get(favRef);
      
      if (snapshot.exists()) {
        // Сначала обновляем кэш и UI для мгновенного отклика
        favoriteCache.delete(productId);
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: false, immediate: true } 
        }));
        
        // Затем выполняем операцию с Firebase (будет выполняться в фоне)
        await set(favRef, null);
        return false;
      } else {
        // Сначала обновляем кэш и UI для мгновенного отклика
        favoriteCache.set(productId, true);
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: true, immediate: true } 
        }));
        
        if (productData) {
          // Затем сохраняем в Firebase
          await set(favRef, {
            addedAt: new Date().toISOString(),
            id: productId, // Добавляем id как часть объекта для упрощения работы
            ...productData
          });
        }
        
        return true;
      }
    } else {
      // Обработка локально для неавторизованных пользователей
      let favoritesList: any[] = [];
      const storedFavorites = localStorage.getItem('favorites') || '[]';
      
      try {
        favoritesList = JSON.parse(storedFavorites);
      } catch (e) {
        console.error('Error parsing favorites:', e);
        favoritesList = [];
      }

      // Определяем текущий тип хранения (массив ID или массив объектов)
      let storageType: 'id' | 'object' = 'id';
      
      if (favoritesList.length > 0) {
        if (typeof favoritesList[0] === 'object') {
          storageType = 'object';
        }
      }

      const isCurrentlyFavorite = storageType === 'id' 
        ? favoritesList.includes(productId)
        : favoritesList.some((item: any) => item.id === productId);

      let updatedFavorites: any[];
      
      if (isCurrentlyFavorite) {
        // Удаляем из избранного
        updatedFavorites = storageType === 'id'
          ? favoritesList.filter((id: string) => id !== productId)
          : favoritesList.filter((item: any) => item.id !== productId);
        
        favoriteCache.delete(productId);
      } else {
        // Добавляем в избранное, сохраняя текущий формат
        if (storageType === 'id') {
          updatedFavorites = [...favoritesList, productId];
        } else {
          updatedFavorites = [...favoritesList, productData];
        }
        
        favoriteCache.set(productId, true);
      }
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      
      // Оповещаем UI об изменении
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { productId, isFavorite: !isCurrentlyFavorite, immediate: true }
      }));
      
      return !isCurrentlyFavorite;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};
