import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import { Product } from '../types/product';
import { FilterOption } from '../utils/filterUtils';
import { getTheme } from '../utils/themeUtils';
import CategoryLayout from '../components/CategoryLayout';

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

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
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

  if (loading) {
    return (
      <CategoryLayout>
        <div className="flex justify-center items-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </CategoryLayout>
    );
  }

  if (error) {
    return (
      <CategoryLayout>
        <div className="text-red-500 text-center py-8">{error}</div>
      </CategoryLayout>
    );
  }

  return (
    <CategoryLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredProducts.length} products found
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-sm flex items-center gap-2"
          style={{ 
            backgroundColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
            borderColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
            color: currentTheme === 'dark' ? '#1f2937' : 'white'
          }}
        >
          <FaFilter className="filter-icon" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No products found matching the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    </CategoryLayout>
  );
};

export default GamingPage;