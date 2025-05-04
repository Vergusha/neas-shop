import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from './ProductCard';
import { Product } from '../types/product';
import { getTheme } from '../utils/themeUtils';

const PopularProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      setIsLoading(true);
      try {
        // Первый способ - используем специальную коллекцию популярных товаров
        const popularRef = collection(db, 'popular_products');
        const popularSnapshot = await getDocs(popularRef);
        
        if (!popularSnapshot.empty) {
          const popularProducts = [];
          
          for (const docRef of popularSnapshot.docs) {
            const popularData = docRef.data();
            if (popularData.productId && popularData.collection) {
              // Получаем полные данные о продукте из соответствующей коллекции
              const productRef = doc(db, popularData.collection, popularData.productId);
              const productSnapshot = await getDoc(productRef);
              
              if (productSnapshot.exists()) {
                popularProducts.push({
                  id: productSnapshot.id,
                  ...productSnapshot.data(),
                  collection: popularData.collection,
                });
              }
            }
          }
          
          setProducts(popularProducts);
        } else {
          // Запасной вариант - просто получаем последние добавленные товары
          const recentProductsQuery = query(
            collection(db, 'products'),
            orderBy('createdAt', 'desc'),
            limit(8)
          );
          
          const recentSnapshot = await getDocs(recentProductsQuery);
          const recentProducts = recentSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            collection: 'products',
          }));
          
          setProducts(recentProducts);
        }
      } catch (error) {
        console.error('Error fetching popular products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularProducts();
    
    // Load favorites from localStorage
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      try {
        const parsedFavorites = JSON.parse(storedFavorites);
        setFavorites(parsedFavorites.map((fav: any) => fav.id));
      } catch (error) {
        console.error('Error parsing favorites:', error);
      }
    }
  }, []);

  const handleToggleFavorite = (product: Product) => {
    // Implement favorite toggle functionality
    let updatedFavorites: any[] = [];
    const storedFavorites = localStorage.getItem('favorites');
    
    if (storedFavorites) {
      updatedFavorites = JSON.parse(storedFavorites);
    }
    
    const isFavorite = favorites.includes(product.id || '');
    
    if (isFavorite) {
      // Remove from favorites
      updatedFavorites = updatedFavorites.filter((item: any) => item.id !== product.id);
      setFavorites(favorites.filter(id => id !== product.id));
    } else {
      // Add to favorites
      updatedFavorites.push(product);
      setFavorites([...favorites, product.id || '']);
    }
    
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  const handleAddToCart = (product: Product) => {
    // Implement add to cart functionality
    let cart: any[] = [];
    const storedCart = localStorage.getItem('cart');
    
    if (storedCart) {
      cart = JSON.parse(storedCart);
    }
    
    // Check if product is already in cart
    const existingProduct = cart.find((item: any) => item.id === product.id);
    
    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Dispatch custom event to notify other components
    const event = new CustomEvent('cartUpdated', {
      detail: { item: product.name || 'Product' }
    });
    window.dispatchEvent(event);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className={`py-8 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      <h2 className={`mb-6 text-2xl font-bold text-center ${
        currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'
      }`}>
        Popular Products
      </h2>
      
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={favorites.includes(product.id || '')}
            onToggleFavorite={handleToggleFavorite}
            onAddToCart={handleAddToCart}
            showRating={true}
          />
        ))}
      </div>
    </div>
  );
};

export default PopularProducts;