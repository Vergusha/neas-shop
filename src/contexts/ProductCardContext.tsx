import React, { createContext, useState, useContext, useEffect } from 'react';
import { Product } from '../types/product';
import { getAuth } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';

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
});

// Хук для использования контекста в компонентах
export const useProductCard = () => useContext(ProductCardContext);

// Провайдер контекста
export const ProductCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const auth = getAuth();

  // Загружаем избранные товары из localStorage или Firebase при инициализации
  useEffect(() => {
    const loadFavorites = async () => {
      const user = auth.currentUser;
      
      if (user) {
        // Для авторизованных пользователей используем Firebase и слушаем изменения в реальном времени
        const favRef = ref(database, `users/${user.uid}/favorites`);
        
        // Используем onValue вместо get для мониторинга изменений в реальном времени
        return onValue(favRef, (snapshot) => {
          if (snapshot.exists()) {
            const favoritesData = snapshot.val();
            const favoriteIds = Object.keys(favoritesData);
            setFavorites(favoriteIds);
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

    const unsubscribe = loadFavorites();
    
    // Слушаем события обновления избранного для неавторизованных пользователей
    const handleFavoritesUpdated = () => {
      if (!auth.currentUser) {
        loadFavorites();
      }
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

  // Проверка, находится ли товар в избранном
  const isFavorite = (productId: string): boolean => {
    return favorites.includes(productId);
  };

  // Обработчик добавления/удаления из избранного
  const handleToggleFavorite = async (product: Product) => {
    if (!product.id) return;
    
    const productId = product.id;
    const productIsFavorite = isFavorite(productId);
    
    try {
      const user = auth.currentUser;
      
      if (user) {
        // Для авторизованных пользователей используем Firebase
        const favRef = ref(database, `users/${user.uid}/favorites/${productId}`);
        
        if (productIsFavorite) {
          // Удаляем из избранного в Firebase
          await import('../utils/favoritesService').then(({ toggleFavorite }) => {
            toggleFavorite(productId, null);
          });
        } else {
          // Добавляем в избранное в Firebase
          await import('../utils/favoritesService').then(({ toggleFavorite }) => {
            toggleFavorite(productId, product);
          });
        }
      } else {
        // Для неавторизованных пользователей используем localStorage
        let updatedFavorites: any[] = [];
        const storedFavorites = localStorage.getItem('favorites') || '[]';
        
        try {
          updatedFavorites = JSON.parse(storedFavorites);
        } catch (e) {
          console.error('Error parsing favorites:', e);
        }
        
        // Обрабатываем случай, когда updatedFavorites может быть массивом ID или массивом объектов
        if (productIsFavorite) {
          // Удаляем из избранного
          if (updatedFavorites.length > 0 && typeof updatedFavorites[0] === 'string') {
            // Если массив ID
            updatedFavorites = updatedFavorites.filter((id: string) => id !== productId);
          } else {
            // Если массив объектов
            updatedFavorites = updatedFavorites.filter((item: any) => item.id !== productId);
          }
          
          setFavorites(favorites.filter(id => id !== productId));
        } else {
          // Добавляем в избранное
          if (updatedFavorites.length > 0 && typeof updatedFavorites[0] === 'string') {
            // Если массив ID, сохраняем согласованный формат
            updatedFavorites.push(productId);
          } else {
            // Если массив объектов или пустой массив, используем объекты
            updatedFavorites.push(product);
          }
          
          setFavorites([...favorites, productId]);
        }
        
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        
        // Оповещаем другие компоненты
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
          detail: { productId, isFavorite: !productIsFavorite } 
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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
  };

  return (
    <ProductCardContext.Provider value={contextValue}>
      {children}
    </ProductCardContext.Provider>
  );
};

export default ProductCardContext;