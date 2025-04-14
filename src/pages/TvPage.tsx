import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaFilter } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import { applyFilters } from '../utils/filterUtils';
import { getTheme } from '../utils/themeUtils';
import CategoryLayout from '../components/CategoryLayout'; // Import CategoryLayout

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  category?: string;
  memory?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  searchKeywords?: string[];
  clickCount?: number;
}

interface FilterValue {
  value: string | number;
  count: number;
}

interface FilterOption {
  name: string;
  key: string;
  values: FilterValue[];
  type?: 'range' | 'checkbox';
  min?: number;
  max?: number;
}

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

  // Add effect to listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{filteredProducts.length} products found</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="w-full">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
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