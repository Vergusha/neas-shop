import React, { createContext, useState, useContext, useEffect } from 'react';
import { Product } from '../types/product';
import { getAuth } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { updateFavoriteCache, getFavoriteStatus } from '../utils/favoritesService';

// Определение типа контекста
interface ProductCardContextType {
  // Базовые функции
  handleToggleFavorite: (product: Product) => void;
  handleAddToCart: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  
  // Настройки карточки товара
  defaultProps: {
    showRating: boolean;
    showStock: boolean;
  };
  
  // Состояния
  favorites: string[];
  forceUpdate: () => void; // Добавляем функцию для принудительного обновления
}

// Создание контекста с начальными значениями
const ProductCardContext = createContext<ProductCardContextType>({
  handleToggleFavorite: () => {},
  handleAddToCart: () => {},
  isFavorite: () => false,
  defaultProps: {
    showRating: true,
    showStock: true,
  },
  favorites: [],
  forceUpdate: () => {}
});

// Хук для использования контекста в компонентах
export const useProductCard = () => useContext(ProductCardContext);

// Провайдер контекста
export const ProductCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  // Добавляем счетчик обновлений для форсированного ререндеринга
  const [updateCounter, setUpdateCounter] = useState(0);
  const auth = getAuth();

  // Функция для принудительного обновления контекста
  const forceUpdate = () => setUpdateCounter(prev => prev + 1);

  // Загружаем избранные товары из localStorage или Firebase при инициализации
  useEffect(() => {
    const loadFavoritesFromCache = async () => {
      // Обновляем кэш избранного перед чтением
      await updateFavoriteCache();
      
      const user = auth.currentUser;
      
      if (user) {
        // Для авторизованных пользователей используем Firebase и слушаем изменения в реальном времени
        const favRef = ref(database, `users/${user.uid}/favorites`);
        
        return onValue(favRef, (snapshot) => {
          if (snapshot.exists()) {
            const favoritesData = snapshot.val();
            const favoriteIds = Object.keys(favoritesData);
            setFavorites(favoriteIds);
            
            // Обновляем кэш при получении обновлений из Firebase
            updateFavoriteCache();
          } else {
            setFavorites([]);
          }
        });
      } else {
        // Для неавторизованных пользователей используем localStorage
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
          try {
            const parsedFavorites = JSON.parse(storedFavorites);
            // Обрабатываем оба формата: массив ID или массив объектов
            if (parsedFavorites.length > 0) {
              if (typeof parsedFavorites[0] === 'string') {
                // Если это просто массив ID
                setFavorites(parsedFavorites);
              } else if (typeof parsedFavorites[0] === 'object' && parsedFavorites[0].id) {
                // Если это массив объектов с id
                setFavorites(parsedFavorites.map((fav: any) => fav.id));
              } else {
                setFavorites([]);
              }
            } else {
              setFavorites([]);
            }
          } catch (error) {
            console.error('Error parsing favorites:', error);
            setFavorites([]);
          }
        }
      }
    };

    const unsubscribe = loadFavoritesFromCache();
    
    // Слушаем события обновления избранного
    const handleFavoritesUpdated = (e: Event) => {
      // Вызываем forceUpdate для обновления UI
      forceUpdate();
      
      // Если пользователь не авторизован, обновляем избранное из localStorage
      if (!auth.currentUser) {
        loadFavoritesFromCache();
      }
      
      // Всегда обновляем кэш при получении события
      updateFavoriteCache();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    
    // Отписываемся от слушателей при размонтировании
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [auth.currentUser]);

  // Проверка, находится ли товар в избранном с использованием кэша
  const isFavorite = (productId: string): boolean => {
    // Проверяем сначала локальный массив favorites
    if (favorites.includes(productId)) {
      return true;
    }
    
    // Также проверяем кэш в favoritesService для синхронизации между компонентами
    // Используем синхронную проверку для избежания задержек в UI
    try {
      // Проверяем напрямую из localStorage для неавторизованных пользователей
      if (!auth.currentUser) {
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
          const parsedFavorites = JSON.parse(storedFavorites);
          if (Array.isArray(parsedFavorites)) {
            if (parsedFavorites.length > 0) {
              if (typeof parsedFavorites[0] === 'string') {
                return parsedFavorites.includes(productId);
              } else if (typeof parsedFavorites[0] === 'object') {
                return parsedFavorites.some((item: any) => item.id === productId);
              }
            }
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
    
    return false;
  };

  // Обработчик добавления/удаления из избранного
  const handleToggleFavorite = async (product: Product) => {
    if (!product.id) return;
    
    const productId = product.id;
    const productIsFavorite = isFavorite(productId);
    
    try {
      const user = auth.currentUser;
      
      // Немедленно обновляем UI - оптимистичное обновление
      if (productIsFavorite) {
        setFavorites(prev => prev.filter(id => id !== productId));
      } else {
        setFavorites(prev => [...prev, productId]);
      }
      
      // Вызываем функцию toggleFavorite из favoritesService для обработки данных
      const { toggleFavorite } = await import('../utils/favoritesService');
      await toggleFavorite(productId, productIsFavorite ? null : product);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Откатываем изменения при ошибке
      if (productIsFavorite) {
        setFavorites(prev => [...prev, productId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== productId));
      }
    }
  };

  // Обработчик добавления товара в корзину
  const handleAddToCart = (product: Product) => {
    let cart: any[] = [];
    const storedCart = localStorage.getItem('cart');
    
    if (storedCart) {
      cart = JSON.parse(storedCart);
    }
    
    // Проверяем, есть ли товар уже в корзине
    const existingProduct = cart.find((item: any) => item.id === product.id);
    
    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Оповещаем другие компоненты
    const event = new CustomEvent('cartUpdated', {
      detail: { item: product.name || 'Product' }
    });
    window.dispatchEvent(event);
  };

  // Общие настройки карточки товара по умолчанию
  const defaultProps = {
    showRating: true,
    showStock: true,
  };

  // Значения, предоставляемые контекстом
  const contextValue: ProductCardContextType = {
    handleToggleFavorite,
    handleAddToCart,
    isFavorite,
    defaultProps,
    favorites,
    forceUpdate
  };

  return (
    <ProductCardContext.Provider value={contextValue}>
      {children}
    </ProductCardContext.Provider>
  );
};

export default ProductCardContext;