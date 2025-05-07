import { ref, get, set, onValue, off } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { Product } from '../types/product';

// Добавляем кэш для быстрой проверки статуса избранного без обращений к Firebase
const favoriteCache = new Map<string, boolean>();

// Сохраняем ссылки на слушатели для правильной отписки
let firebaseListener: any = null;

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
    // Для неавторизованных пользователей используем localStorage
    try {
      const storedFavorites = localStorage.getItem('favorites');
      if (storedFavorites) {
        const favorites = JSON.parse(storedFavorites);
        favoriteCache.clear();
        favorites.forEach((fav: any) => {
          const id = typeof fav === 'string' ? fav : fav.id;
          if (id) favoriteCache.set(id, true);
        });
      }
    } catch (error) {
      console.error('Error updating favorite cache:', error);
      favoriteCache.clear();
    }
  }
};

// Настройка слушателя изменений в Firebase
export const setupFavoritesListener = () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const favRef = ref(database, `users/${user.uid}/favorites`);
    
    // Отписываемся от предыдущего слушателя если он есть
    if (firebaseListener) {
      off(favRef, 'value', firebaseListener);
    }

    // Устанавливаем нового слушателя
    firebaseListener = onValue(favRef, (snapshot) => {
      if (snapshot.exists()) {
        const favorites = snapshot.val();
        favoriteCache.clear();
        Object.keys(favorites).forEach(id => {
          favoriteCache.set(id, true);
        });
      } else {
        favoriteCache.clear();
      }
      
      window.dispatchEvent(new Event('favoritesUpdated'));
    });

    return () => {
      if (firebaseListener) {
        off(favRef, 'value', firebaseListener);
        firebaseListener = null;
      }
    };
  }
  return undefined;
};

// Проверка статуса избранного
export const getFavoriteStatus = (productId: string): boolean => {
  return favoriteCache.has(productId);
};

// Функция для добавления/удаления из избранного
export const toggleFavorite = async (productId: string, product: Product | null): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    // Для авторизованных пользователей используем Firebase
    const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
    if (product) {
      // Добавляем в избранное
      await set(favRef, {
        id: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        brand: product.brand,
        category: product.category,
        collection: product.collection,
        addedAt: new Date().toISOString()
      });
    } else {
      // Удаляем из избранного
      await set(favRef, null);
    }
  } else {
    // Для неавторизованных пользователей используем localStorage
    let favorites: any[] = [];
    try {
      const stored = localStorage.getItem('favorites');
      if (stored) favorites = JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing favorites:', error);
    }

    if (product) {
      // Добавляем в избранное
      if (!favorites.some(f => f.id === productId)) {
        favorites.push({
          id: productId,
          name: product.name,
          price: product.price,
          image: product.image,
          brand: product.brand,
          category: product.category,
          collection: product.collection,
          addedAt: new Date().toISOString()
        });
      }
    } else {
      // Удаляем из избранного
      favorites = favorites.filter(f => f.id !== productId);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  // Обновляем кэш после изменений
  await updateFavoriteCache();

  // Уведомляем об изменениях
  const event = new CustomEvent('favoritesUpdated', { 
    detail: { 
      productId,
      isFavorite: !!product,
      immediate: true
    } 
  });
  window.dispatchEvent(event);
};
