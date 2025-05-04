import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import ProductFilters from '../../components/product/ProductFilters';
import CategoryLayout from '../../components/layout/CategoryLayout';
import FilterButton from '../../components/ui/FilterButton';
import { getTheme } from '../../utils/themeUtils';
import { Product } from '../../types/product';

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<Array<{ id: string; name: string; values: any[] }>>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [favorites, setFavorites] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
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
        setFilteredProducts(mobileList);
      } catch (err) {
        console.error('Error fetching mobile products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const productsRef = collection(db, 'mobile');
        const snapshot = await getDocs(productsRef);
        
        // Track filter counts
        const filterCounts: Record<string, Record<string, number>> = {
          brand: {},
          memory: {},
          color: {},
        };
        
        // For price range
        let minPrice = Infinity;
        let maxPrice = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip rating and reviewCount properties
          if (data.brand) {
            filterCounts.brand[data.brand] = (filterCounts.brand[data.brand] || 0) + 1;
          }
          if (data.memory) {
            filterCounts.memory[data.memory] = (filterCounts.memory[data.memory] || 0) + 1;
          }
          if (data.color) {
            filterCounts.color[data.color] = (filterCounts.color[data.color] || 0) + 1;
          }
          
          // Track price range
          if (data.price) {
            const price = Number(data.price);
            if (!isNaN(price)) {
              minPrice = Math.min(minPrice, price);
              maxPrice = Math.max(maxPrice, price);
            }
          }
        });
        
        // Round min down to nearest 100 and max up to nearest 100
        const roundedMinPrice = Math.floor(minPrice / 100) * 100;
        const roundedMaxPrice = Math.ceil(maxPrice / 100) * 100;

        // Create filters with count information
        const filtersList = [
          {
            id: 'price',
            name: 'Price',
            values: [],
            type: 'range' as const,
            min: roundedMinPrice,
            max: roundedMaxPrice
          },
          { 
            id: 'brand', 
            name: 'Brand', 
            values: Object.entries(filterCounts.brand).map(([value, count]) => ({
              value,
              count
            })).sort((a, b) => a.value.localeCompare(b.value))
          },
          { 
            id: 'memory', 
            name: 'Memory', 
            values: Object.entries(filterCounts.memory).map(([value, count]) => ({
              value,
              count
            })).sort((a, b) => a.value.localeCompare(b.value))
          },
          { 
            id: 'color', 
            name: 'Color', 
            values: Object.entries(filterCounts.color).map(([value, count]) => ({
              value,
              count
            })).sort((a, b) => a.value.localeCompare(b.value))
          },
        ];

        setFilters(filtersList);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    if (!products.length) return;

    const filtered = products.filter(product => {
      return Object.entries(selectedFilters).every(([filterId, values]) => {
        if (!values.length) return true;
        
        // Handle price range filter
        if (filterId === 'price' && values.length === 2) {
          const [min, max] = values.map(Number);
          const productPrice = Number(product.price);
          return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
        }
        
        // Regular filters
        const productValue = String(product[filterId as keyof Product] || '').toLowerCase();
        return values.some(value => productValue === value.toLowerCase());
      });
    });

    console.log('Filtered products:', filtered.length); // Debug log
    setFilteredProducts(filtered);
  }, [products, selectedFilters]);

  const handleFilterChange = (filterId: string, values: string[] | [number, number]) => {
    const newSelectedFilters = { ...selectedFilters };
    
    if (filterId === 'price' && Array.isArray(values) && values.length === 2) {
      newSelectedFilters[filterId] = values.map(String);
    } else {
      newSelectedFilters[filterId] = Array.isArray(values) 
        ? values.map(String)
        : [String(values)];
    }
    
    setSelectedFilters(newSelectedFilters);
  };

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
    <CategoryLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm text-gray-500">{filteredProducts.length} products found</span>
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
              filters={filters}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        <div className={`${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => (
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
  );
};

export default MobilePage;