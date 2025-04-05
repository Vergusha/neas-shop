import { ref, get, set } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';

export const getFavoriteStatus = async (productId: string): Promise<boolean> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
    const snapshot = await get(favRef);
    return snapshot.exists();
  } else {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.includes(productId);
  }
};

export const toggleFavorite = async (
  productId: string,
  productData: any
): Promise<boolean> => {
  const auth = getAuth();
  const user = auth.currentUser;

  try {
    if (user) {
      const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
      const snapshot = await get(favRef);
      
      if (snapshot.exists()) {
        // First dispatch event with immediate flag for instant UI update
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: false, immediate: true } 
        }));
        
        // Then perform the Firebase update (happens in background)
        await set(favRef, null);
        return false;
      } else {
        // For adding to favorites, we do Firebase operation first to ensure data is saved
        await set(favRef, {
          addedAt: new Date().toISOString(),
          productId,
          ...productData
        });
        
        // Then notify UI
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: true } 
        }));
        return true;
      }
    } else {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const isFavorite = favorites.includes(productId);
      
      if (isFavorite) {
        const updatedFavorites = favorites.filter((id: string) => id !== productId);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: false } 
        }));
        return false;
      } else {
        favorites.push(productId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: true } 
        }));
        return true;
      }
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};
