import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/ProductCard';
import ProductFilters from '../../components/ProductFilters';
import FilterButton from '../../components/FilterButton';
import { Product } from '../../types/product';
import { FaFilter } from 'react-icons/fa'; // Import FaFilter
import CategoryLayout from '../../components/CategoryLayout'; // Import CategoryLayout
import { getTheme } from '../../utils/themeUtils'; // Import getTheme

// Remove local FilterOption interface and import it from ProductFilters
type FilterValue = {
  value: string | number;
  count: number;
};

interface FilterOption {
  name: string;
  key?: string;
  values: FilterValue[] | string[];
  type?: 'checkbox' | 'range';
  min?: number;
  max?: number;
}

const AudioPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [favorites, setFavorites] = useState<string[]>([]);

  // Listen for theme changes
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
      setLoading(true);
      try {
        const collectionRef = collection(db, 'audio');
        const querySnapshot = await getDocs(collectionRef);
        const productsData: Product[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        setProducts(productsData);
        setFilteredProducts(productsData);
        setFilters(createFilters(productsData));
      } catch (error) {
        console.error("Error fetching audio products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...products];

      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value instanceof Set) {
          filtered = filtered.filter(product => value.has(product[key]));
        } else if (Array.isArray(value)) {
          const [min, max] = value;
          filtered = filtered.filter(product => product.price >= min && product.price <= max);
        }
      });

      setFilteredProducts(filtered);
    };

    applyFilters();
  }, [activeFilters, products]);

  const handleFilterChange = (filterId: string, values: string[] | [number, number]) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (Array.isArray(values) && values.length === 2 && typeof values[0] === 'number') {
        newFilters[filterId] = values as [number, number];
      } else {
        newFilters[filterId] = new Set(values.map(v => String(v)));
      }
      return newFilters;
    });
  };

  const createFilters = (products: Product[]): FilterOption[] => {
    const getUniqueValues = (key: keyof Product): FilterValue[] => {
      const counts: Record<string, number> = {};
      products.forEach(p => {
        const value = p[key];
        if (typeof value === 'string' || typeof value === 'number') {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => String(a.value).localeCompare(String(b.value)));
    };

    const priceFilter: FilterOption = {
      name: 'Price',
      key: 'price',
      type: 'range',
      min: Math.min(...products.map(p => p.price)),
      max: Math.max(...products.map(p => p.price)),
      values: []
    };

    const brandFilter: FilterOption = {
      name: 'Brand',
      key: 'brand',
      type: 'checkbox',
      values: getUniqueValues('brand')
    };

    return [priceFilter, brandFilter];
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

  return (
    <CategoryLayout title="Audio Products">
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
            <p className="py-8 text-center">No products found matching your filters.</p>
          )}
        </div>
      </div>
    </CategoryLayout>
  );
};

export default AudioPage;