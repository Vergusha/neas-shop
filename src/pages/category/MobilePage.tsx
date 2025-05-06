import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import ProductFilters from '../../components/product/ProductFilters';
import CategoryLayout from '../../components/layout/CategoryLayout';
import FilterButton from '../../components/ui/FilterButton';
import { getTheme } from '../../utils/themeUtils';
import { Product } from '../../types/product';
import { useFilters } from '../../contexts/FilterContext';
import CategoryPageWrapper from '../../components/layout/CategoryPageWrapper';
import { useProductCard } from '../../contexts/ProductCardContext';
import { getAuth } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  
  // Используем ProductCardContext вместо локальной реализации избранного
  const { handleToggleFavorite, handleAddToCart, isFavorite } = useProductCard();
  const auth = getAuth();

  // Get filter context for showFilters state
  const { showFilters, setShowFilters } = useFilters();

  // Theme change handler
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Fetch products data
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const mobileCollection = collection(db, 'mobile');
        const mobileSnapshot = await getDocs(mobileCollection);
        const mobileList = mobileSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || 'Unnamed Product',
          description: doc.data().description || 'No description available',
          price: Number(doc.data().price) || 0,
          image: doc.data().image || '',
          brand: doc.data().brand || '',
          memory: doc.data().memory || '',
          color: doc.data().color || '',
          category: 'mobile'
        })) as Product[];
        
        setProducts(mobileList);
      } catch (err) {
        console.error('Error fetching mobile products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Удаляем старые функции handleToggleFavorite и handleAddToCart,
  // так как теперь используем их из контекста

  if (loading) {
    return (
      <CategoryLayout>
        <div className="flex items-center justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </CategoryLayout>
    );
  }

  if (error) {
    return (
      <CategoryLayout>
        <div className="py-8 text-center text-red-500">{error}</div>
      </CategoryLayout>
    );
  }

  return (
    <CategoryPageWrapper
      category="mobile"
      products={products}
      onFiltersReady={setDisplayedProducts}
    >
      <CategoryLayout>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">{displayedProducts.length} products found</span>
          </div>
          <FilterButton 
            showFilters={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            currentTheme={currentTheme}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {showFilters && (
            <div className="md:col-span-1">
              <ProductFilters
                productCount={displayedProducts.length}
                currentTheme={currentTheme}
              />
            </div>
          )}

          <div className={`${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
            {displayedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayedProducts.map(product => (
                  <div key={product.id} className="w-full">
                    <ProductCard 
                      product={product} 
                      // Используем функцию isFavorite из контекста
                      isFavorite={product.id ? isFavorite(product.id) : false}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                      showRating={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center col-span-full">
                No products found matching the selected filters.
              </div>
            )}
          </div>
        </div>
      </CategoryLayout>
    </CategoryPageWrapper>
  );
};

export default MobilePage;