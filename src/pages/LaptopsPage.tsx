import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter, FaApple, FaWindows } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import { trackProductInteraction } from '../utils/productTracking';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  processor?: string;
  ram?: string;
  graphicsCard?: string;
  storageType?: string;
  screenSize?: string;
  operatingSystem?: string;
  color?: string;
  category?: string;
}

interface FilterValue {
  value: string | number;
  count: number;
}

interface FilterOption {
  name: string;
  key: string;
  values: FilterValue[];
}

const LaptopsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [filterOsType, setFilterOsType] = useState<'all' | 'mac' | 'windows'>('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const laptopsCollection = collection(db, 'laptops');
        const laptopsSnapshot = await getDocs(laptopsCollection);
        const laptopsList = laptopsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || 'Unnamed Product',
          description: doc.data().description || 'No description available',
          price: Number(doc.data().price) || 0,
          image: doc.data().image || '',
          brand: doc.data().brand || '',
          processor: doc.data().processor || '',
          ram: doc.data().ram || '',
          graphicsCard: doc.data().graphicsCard || '',
          storageType: doc.data().storageType || '',
          screenSize: doc.data().screenSize || '',
          operatingSystem: doc.data().operatingSystem || '',
          color: doc.data().color || '',
          category: 'laptops'
        })) as Product[];
        
        setProducts(laptopsList);
        
        // Generate filters from laptop properties
        const filters = [
          {
            name: 'Brand',
            key: 'brand',
            values: getUniqueValues(laptopsList, 'brand')
          },
          {
            name: 'Processor',
            key: 'processor',
            values: getUniqueValues(laptopsList, 'processor')
          },
          {
            name: 'RAM',
            key: 'ram',
            values: getUniqueValues(laptopsList, 'ram')
          },
          {
            name: 'Storage',
            key: 'storageType',
            values: getUniqueValues(laptopsList, 'storageType')
          },
          {
            name: 'Screen Size',
            key: 'screenSize',
            values: getUniqueValues(laptopsList, 'screenSize')
          },
          {
            name: 'Operating System',
            key: 'operatingSystem',
            values: getUniqueValues(laptopsList, 'operatingSystem')
          },
          {
            name: 'Price',
            key: 'price',
            values: [],
            type: 'range' as const,
            min: Math.min(...laptopsList.map(p => p.price)),
            max: Math.max(...laptopsList.map(p => p.price))
          }
        ];
        
        setAvailableFilters(filters.filter(f => f.values.length > 0 || f.key === 'price'));
        setFilteredProducts(laptopsList);
      } catch (err) {
        console.error('Error fetching laptop products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Function to get unique values for a property across products
  const getUniqueValues = (products: Product[], key: string): FilterValue[] => {
    const counts: Record<string, number> = {};
    
    products.forEach(product => {
      const value = product[key as keyof Product];
      if (typeof value === 'string' && value.trim()) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => String(a.value).localeCompare(String(b.value)));
  };

  // Update filtered products when filters change
  useEffect(() => {
    let filtered = products;
    
    // Apply OS type filter first
    if (filterOsType === 'mac') {
      filtered = filtered.filter(product => 
        product.brand === 'Apple' || 
        (product.operatingSystem && product.operatingSystem.toLowerCase().includes('macos'))
      );
    } else if (filterOsType === 'windows') {
      filtered = filtered.filter(product => 
        product.brand !== 'Apple' && 
        (!product.operatingSystem || !product.operatingSystem.toLowerCase().includes('macos'))
      );
    }
    
    // Then apply other filters
    filtered = filtered.filter(product => {
      return Object.entries(activeFilters).every(([filterKey, filterValues]) => {
        // Handle price range filter
        if (filterKey === 'price' && Array.isArray(filterValues) && filterValues.length === 2) {
          const [min, max] = filterValues;
          return product.price >= min && product.price <= max;
        }
        
        // Handle all other filters
        if (filterValues instanceof Set) {
          if (filterValues.size === 0) return true; // No filter values selected
          
          const productValue = product[filterKey as keyof Product];
          if (typeof productValue === 'string') {
            return filterValues.has(productValue);
          }
        }
        
        return true;
      });
    });
    
    setFilteredProducts(filtered);
  }, [products, activeFilters, filterOsType]);

  const handleFilterChange = (filterKey: string, values: string[] | [number, number]) => {
    const newActiveFilters = { ...activeFilters };
    
    if (filterKey === 'price' && Array.isArray(values) && values.length === 2) {
      newActiveFilters[filterKey] = values;
    } else if (Array.isArray(values)) {
      if (values.length === 0) {
        delete newActiveFilters[filterKey];
      } else {
        newActiveFilters[filterKey] = new Set(values);
      }
    }
    
    setActiveFilters(newActiveFilters);
  };

  // Трекинг взаимодействия с продуктом
  const handleProductClick = (productId: string) => {
    trackProductInteraction(productId, {
      incrementClick: true, 
      userId: 'anonymous' // Можно заменить на реальный userId если пользователь авторизован
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Laptops</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterOsType('all')} 
            className={`btn btn-sm ${filterOsType === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Laptops
          </button>
          <button 
            onClick={() => setFilterOsType('mac')} 
            className={`btn btn-sm ${filterOsType === 'mac' ? 'btn-primary' : 'btn-outline'}`}
          >
            <FaApple className="mr-1" /> MacBook
          </button>
          <button 
            onClick={() => setFilterOsType('windows')} 
            className={`btn btn-sm ${filterOsType === 'windows' ? 'btn-primary' : 'btn-outline'}`}
          >
            <FaWindows className="mr-1" /> Windows
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <FaFilter />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
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
              {filteredProducts.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product.id)}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="col-span-full text-center py-8">
              No laptops found matching the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaptopsPage;
