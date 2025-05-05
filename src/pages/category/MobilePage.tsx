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

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

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

  // Load favorites from localStorage
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
    
    // Listen for favorites updates
    window.addEventListener('favoritesUpdated', loadFavorites);
    return () => window.removeEventListener('favoritesUpdated', loadFavorites);
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

  // Handle adding product to favorites
  const handleToggleFavorite = (product: Product) => {
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

  // Handle adding product to cart
  const handleAddToCart = (product: Product) => {
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
                      isFavorite={favorites.includes(product.id || '')}
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