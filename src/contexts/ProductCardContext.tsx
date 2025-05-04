import React, { createContext, useState, useContext, useEffect } from 'react';
import { Product } from '../types/product';

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

  // Загружаем избранные товары из localStorage при инициализации
  useEffect(() => {
    const loadFavorites = () => {
      const storedFavorites = localStorage.getItem('favorites');
      if (storedFavorites) {
        try {
          const parsedFavorites = JSON.parse(storedFavorites);
          setFavorites(parsedFavorites.map((fav: any) => fav.id));
        } catch (error) {
          console.error('Error parsing favorites:', error);
        }
      }
    };

    loadFavorites();
    
    // Слушаем события обновления избранного
    window.addEventListener('favoritesUpdated', loadFavorites);
    return () => window.removeEventListener('favoritesUpdated', loadFavorites);
  }, []);

  // Проверка, находится ли товар в избранном
  const isFavorite = (productId: string): boolean => {
    return favorites.includes(productId);
  };

  // Обработчик добавления/удаления из избранного
  const handleToggleFavorite = (product: Product) => {
    let updatedFavorites: any[] = [];
    const storedFavorites = localStorage.getItem('favorites');
    
    if (storedFavorites) {
      updatedFavorites = JSON.parse(storedFavorites);
    }
    
    const productIsFavorite = favorites.includes(product.id || '');
    
    if (productIsFavorite) {
      // Удаляем из избранного
      updatedFavorites = updatedFavorites.filter((item: any) => item.id !== product.id);
      setFavorites(favorites.filter(id => id !== product.id));
    } else {
      // Добавляем в избранное
      updatedFavorites.push(product);
      setFavorites([...favorites, product.id || '']);
    }
    
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Оповещаем другие компоненты
    window.dispatchEvent(new Event('favoritesUpdated'));
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