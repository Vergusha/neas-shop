import React, { useEffect, useState } from 'react';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from './ProductCard';
import { Product } from '../types/product';
import { getTheme } from '../utils/themeUtils';

interface RelatedProductsProps {
  product: Product;
  excludeId?: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ product, excludeId }) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
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
    const fetchRelatedProducts = async () => {
      setIsLoading(true);
      try {
        if (!product || !product.category) {
          console.warn('Product or product category is missing');
          setRelatedProducts([]);
          setIsLoading(false);
          return;
        }
        
        // Try to find products with the same brand
        const brandQuery = query(
          collection(db, product.category),
          where('brand', '==', product.brand),
          limit(6)
        );
        
        const brandSnapshot = await getDocs(brandQuery);
        let relatedItems = brandSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item) => item.id !== excludeId) as Product[];
        
        // If we don't have enough related products, fetch some from the same category
        if (relatedItems.length < 4) {
          const categoryQuery = query(
            collection(db, product.category),
            limit(8)
          );
          
          const categorySnapshot = await getDocs(categoryQuery);
          const categoryItems = categorySnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((item) => item.id !== excludeId && !relatedItems.find((p) => p.id === item.id)) as Product[];
          
          relatedItems = [...relatedItems, ...categoryItems].slice(0, 6);
        }
        
        setRelatedProducts(relatedItems);
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelatedProducts();

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
  }, [product, excludeId]);

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
      <div className="flex justify-center py-4">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className={`py-6 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      <h2 className={`mb-4 text-xl font-bold ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
        Related Products
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {relatedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={favorites.includes(product.id || '')}
            onToggleFavorite={handleToggleFavorite}
            onAddToCart={handleAddToCart}
            showRating={false}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;