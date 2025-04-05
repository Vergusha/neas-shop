import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import { applyFilters } from '../utils/filterUtils';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);

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
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TV & Audio</h1>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-white btn bg-primary hover:bg-primary-focus"
        >
          <FaFilter />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
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
            <div className="px-12 overflow-x-hidden sm:px-16">
              <div className="flex flex-row flex-wrap">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="w-full mb-6 sm:w-1/2 lg:w-1/3">
                    <ProductCard key={product.id} product={product} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center col-span-full">
              No products found matching the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TvPage;