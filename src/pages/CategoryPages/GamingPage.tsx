import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import ProductFilters from '../../components/product/ProductFilters';
import { Product } from '../../types/product';
import { FilterOption } from '../../utils/filterUtils';
import { getTheme } from '../../utils/themeUtils';
import CategoryLayout from '../../components/layout/CategoryLayout';
import FilterButton from '../../components/ui/FilterButton';

const getUniqueValues = (products: Product[], key: keyof Product): { value: string | number; count: number }[] => {
  const counts: Record<string, number> = {};
  
  products.forEach(product => {
    const value = product[key];
    if (typeof value === 'string' || typeof value === 'number') {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => String(a.value).localeCompare(String(b.value)));
};

const createFilters = (products: Product[]): FilterOption[] => {
  // Добавляем ценовой фильтр первым
  const priceFilter: FilterOption = {
    name: 'Price',
    key: 'price',
    type: 'range',
    min: Math.min(...products.map(p => p.price)),
    max: Math.max(...products.map(p => p.price)),
    values: []
  };

  // Добавляем остальные фильтры
  const brandFilter = {
    name: 'Brand',
    key: 'brand',
    type: 'checkbox' as const,
    values: getUniqueValues(products, 'brand')
  };

  const deviceTypeFilter = {
    name: 'Device Type',
    key: 'deviceType',
    type: 'checkbox' as const,
    values: getUniqueValues(products, 'deviceType')
  };

  const connectivityFilter = {
    name: 'Connectivity',
    key: 'connectivity',
    type: 'checkbox' as const,
    values: getUniqueValues(products, 'connectivity')
  };

  return [priceFilter, brandFilter, deviceTypeFilter, connectivityFilter];
};

const GamingPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

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
          collection: 'gaming'
        })) as Product[];

        setProducts(productsData);
        const filters = createFilters(productsData);
        setAvailableFilters(filters);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error fetching gaming products:', error);
        setError('Error fetching gaming products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value instanceof Set) {
        filtered = filtered.filter(product => value.has(product[key as keyof Product]));
      } else if (Array.isArray(value)) {
        const [min, max] = value;
        filtered = filtered.filter(product => product.price >= min && product.price <= max);
      }
    });

    setFilteredProducts(filtered);
  }, [products, activeFilters]);

  const handleFilterChange = (filterKey: string, values: string[] | [number, number]) => {
    const newActiveFilters = { ...activeFilters };
    
    newActiveFilters[filterKey] = Array.isArray(values) && values.length === 2 && typeof values[0] === 'number'
      ? values as [number, number]
      : new Set(values.map(v => String(v)));
    
    setActiveFilters(newActiveFilters);
  };

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
    <CategoryLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredProducts.length} products found
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
              filters={availableFilters}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        <div className={`${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => (
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
  );
};

export default GamingPage;