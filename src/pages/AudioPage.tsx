import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import { Product } from '../types/product';
import { FaFilter } from 'react-icons/fa'; // Import FaFilter
import CategoryLayout from '../components/CategoryLayout'; // Import CategoryLayout
import { getTheme } from '../utils/themeUtils'; // Import getTheme

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

  // Listen for theme changes
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

  if (loading) {
    return (
      <CategoryLayout>
        <div className="flex justify-center items-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </CategoryLayout>
    );
  }

  return (
    <CategoryLayout title="Audio Products">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm text-gray-500">{filteredProducts.length} products found</span>
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
              filters={filters}
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
                  <ProductCard key={product.id} product={product} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8">No products found matching your filters.</p>
          )}
        </div>
      </div>
    </CategoryLayout>
  );
};

export default AudioPage;