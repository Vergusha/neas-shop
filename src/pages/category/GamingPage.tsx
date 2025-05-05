import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import ProductFilters from '../../components/product/ProductFilters';
import { Product } from '../../types/product';
import { getTheme } from '../../utils/themeUtils';
import CategoryLayout from '../../components/layout/CategoryLayout';
import FilterButton from '../../components/ui/FilterButton';
import { useFilters } from '../../contexts/FilterContext';
import CategoryPageWrapper from '../../components/layout/CategoryPageWrapper';

const GamingPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

  // Get filter context for showFilters state
  const { showFilters, setShowFilters } = useFilters();

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

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
    
    window.addEventListener('favoritesUpdated', loadFavorites);
    return () => window.removeEventListener('favoritesUpdated', loadFavorites);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'gaming'));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          category: 'gaming',
          name: doc.data().name || 'Unnamed Product',
          description: doc.data().description || 'No description available',
          price: Number(doc.data().price) || 0,
          image: doc.data().image || ''
        })) as Product[];

        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching gaming products:', error);
        setError('Error fetching gaming products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleToggleFavorite = (product: Product) => {
    let updatedFavorites: any[] = [];
    const storedFavorites = localStorage.getItem('favorites');
    
    if (storedFavorites) {
      updatedFavorites = JSON.parse(storedFavorites);
    }
    
    const isFavorite = favorites.includes(product.id || '');
    
    if (isFavorite) {
      updatedFavorites = updatedFavorites.filter((item: any) => item.id !== product.id);
      setFavorites(favorites.filter(id => id !== product.id));
    } else {
      updatedFavorites.push(product);
      setFavorites([...favorites, product.id || '']);
    }
    
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  const handleAddToCart = (product: Product) => {
    let cart: any[] = [];
    const storedCart = localStorage.getItem('cart');
    
    if (storedCart) {
      cart = JSON.parse(storedCart);
    }
    
    const existingProduct = cart.find((item: any) => item.id === product.id);
    
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
  };

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
      category="gaming"
      products={products}
      onFiltersReady={setDisplayedProducts}
    >
      <CategoryLayout>
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {displayedProducts.length} products found
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayedProducts.map(product => (
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
            ) : (
              <div className="p-8 text-center bg-white rounded-lg shadow-md">
                <p className="text-gray-500">No products found matching the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      </CategoryLayout>
    </CategoryPageWrapper>
  );
};

export default GamingPage;