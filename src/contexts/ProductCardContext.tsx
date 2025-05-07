import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { Product } from '../types/product';
import { getFavoriteStatus, toggleFavorite, updateFavoriteCache } from '../utils/favoritesService';

interface ProductCardContextType {
  handleToggleFavorite: (product: Product) => Promise<void>;
  handleAddToCart: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  defaultProps: {
    showRating: boolean;
    showStock: boolean;
  };
}

const ProductCardContext = createContext<ProductCardContextType | undefined>(undefined);

export const useProductCard = () => {
  const context = useContext(ProductCardContext);
  if (!context) {
    throw new Error('useProductCard must be used within a ProductCardProvider');
  }
  return context;
};

export const ProductCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = getAuth();
  const [updateCounter, setUpdateCounter] = useState(0);

  // Инициализация кэша при загрузке
  useEffect(() => {
    updateFavoriteCache();
  }, []);

  // Подписка на изменения в Firebase для авторизованных пользователей
  useEffect(() => {
    const user = auth.currentUser;
    let unsubscribe: () => void;

    if (user) {
      const favRef = ref(database, `users/${user.uid}/favorites`);
      unsubscribe = onValue(favRef, async () => {
        await updateFavoriteCache();
        setUpdateCounter(prev => prev + 1);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [auth.currentUser]);

  // Настраиваем значения по умолчанию
  const defaultProps = {
    showRating: true,
    showStock: true
  };

  const handleToggleFavorite = async (product: Product) => {
    if (!product.id) return;
    
    try {
      const productId = product.id;
      const currentlyFavorite = getFavoriteStatus(productId);
      
      await toggleFavorite(productId, currentlyFavorite ? null : product);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = (product: Product) => {
    let cart: any[] = [];
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        cart = JSON.parse(storedCart);
      }
      
      const existingProduct = cart.find(item => item.id === product.id);
      
      if (existingProduct) {
        existingProduct.quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      
      const event = new CustomEvent('cartUpdated', {
        detail: { item: product.name || 'Product' }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const isFavorite = (productId: string): boolean => {
    return getFavoriteStatus(productId);
  };

  return (
    <ProductCardContext.Provider value={{ 
      handleToggleFavorite, 
      handleAddToCart, 
      isFavorite,
      defaultProps
    }}>
      {children}
    </ProductCardContext.Provider>
  );
};

export default ProductCardContext;