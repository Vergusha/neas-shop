import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import ProductFilters from '../../components/product/ProductFilters';
import FilterButton from '../../components/ui/FilterButton';
import { applyFilters } from '../../utils/filterUtils';
import { getTheme } from '../../utils/themeUtils';
import CategoryLayout from '../../components/layout/CategoryLayout';
import { Product } from '../../types/product';
import { FilterOption, FilterValue } from '../../utils/filterUtils';

// Добавляем функцию getUniqueValues
const getUniqueValues = (products: Product[], key: keyof Product): FilterValue[] => {
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

  // Остальные фильтры
  const brandFilter = {
    name: 'Brand',
    key: 'brand',
    type: 'checkbox' as const,
    values: getUniqueValues(products, 'brand')
  };

  // Добавляем priceFilter первым в массив
  return [priceFilter, brandFilter /* ...остальные фильтры */];
};

const TvPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme()); // Add currentTheme state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Add effect to listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Загружаем избранные товары из localStorage
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [tvSnapshot, audioSnapshot] = await Promise.all([
          getDocs(collection(db, 'tv')),
          getDocs(collection(db, 'audio'))
        ]);

        const tvList = tvSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const audioList = audioSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const combinedList = [...tvList, ...audioList] as Product[];

        setProducts(combinedList);

        const filters = createFilters(combinedList);
        setAvailableFilters(filters);

        setFilteredProducts(combinedList);
      } catch (err) {
        console.error('Error fetching TV & Audio products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Update filtered products when filters change
  useEffect(() => {
    const filtered = applyFilters(products, activeFilters);
    setFilteredProducts(filtered);
  }, [products, activeFilters]);

  const handleFilterChange = (filterKey: string, values: string[] | [number, number]) => {
    // Create a new copy of active filters
    const newActiveFilters = { ...activeFilters };
    
    if (filterKey === 'price' && Array.isArray(values) && values.length === 2) {
      // Handle price range filter
      newActiveFilters[filterKey] = values as [number, number];
    } else if (Array.isArray(values) && !Array.isArray(values[0])) {
      // Regular checkbox filters
      if (values.length === 0) {
        // If no values selected, remove the filter
        delete newActiveFilters[filterKey];
      } else {
        // Create a new Set from the selected values
        newActiveFilters[filterKey] = new Set(values.map(val => {
          // Try to convert to number if it's numeric
          const num = Number(val);
          return isNaN(num) ? val : num;
        }));
      }
    }
    
    setActiveFilters(newActiveFilters);
  };

  // Обработчик добавления/удаления из избранного
  const handleToggleFavorite = (product: Product) => {
    let updatedFavorites: any[] = [];
    const storedFavorites = localStorage.getItem('favorites');
    
    if (storedFavorites) {
      updatedFavorites = JSON.parse(storedFavorites);
    }
    
    const isFavorite = favorites.includes(product.id || '');
    
    if (isFavorite) {
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
          <span className="text-sm text-gray-500 dark:text-gray-400">{filteredProducts.length} products found</span>
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
            <div className="py-10 text-center">
              <p className="text-gray-500">No products match your selection.</p>
              <button 
                onClick={() => setActiveFilters({})} 
                className="mt-4 btn btn-outline btn-primary"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </CategoryLayout>
  );
};

export default TvPage;