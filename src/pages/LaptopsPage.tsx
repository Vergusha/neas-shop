import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import CategoryLayout from '../components/CategoryLayout';
import { getTheme } from '../utils/themeUtils';
import { Product } from '../types/product';

interface FilterOption {
  value: string;
  count: number;
}

const LaptopsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]); // Added missing state
  const [filters, setFilters] = useState<Array<{ id: string; name: string; values: FilterOption[] }>>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Fetch laptops data
  useEffect(() => {
    const fetchLaptops = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const laptopsCollection = collection(db, 'laptops');
        const laptopsSnapshot = await getDocs(laptopsCollection);
        const laptopsList = laptopsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || 'Unnamed Product',
          description: doc.data().description || 'No description available',
          price: Number(doc.data().price) || 0,
          image: doc.data().image || '',
          category: 'laptops'
        })) as Product[];
        
        setProducts(laptopsList);
        setFilteredProducts(laptopsList);
        
        // Extract filters from products
        extractFilters(laptopsList);
      } catch (err) {
        console.error('Error fetching laptops:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLaptops();
  }, []);
  
  // Extract filter options from products
  const extractFilters = (products: Product[]) => {
    const brandOptions: Record<string, number> = {};
    const processorOptions: Record<string, number> = {};
    const ramOptions: Record<string, number> = {};
    const storageOptions: Record<string, number> = {};
    
    // Calculate price range
    let minPrice = Number.MAX_VALUE;
    let maxPrice = 0;
    
    products.forEach(product => {
      // Count brand occurrences
      if (product.brand) {
        brandOptions[product.brand] = (brandOptions[product.brand] || 0) + 1;
      }
      
      // Count processor occurrences
      if (product.processor) {
        processorOptions[product.processor] = (processorOptions[product.processor] || 0) + 1;
      }
      
      // Count RAM occurrences
      if (product.ram) {
        ramOptions[product.ram] = (ramOptions[product.ram] || 0) + 1;
      }
      
      // Count storage occurrences
      if (product.storage) {
        storageOptions[product.storage] = (storageOptions[product.storage] || 0) + 1;
      }
      
      // Update price range
      const price = Number(product.price);
      if (!isNaN(price)) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });
    
    // Round price range
    minPrice = Math.floor(minPrice / 100) * 100;
    maxPrice = Math.ceil(maxPrice / 100) * 100;
    
    // Create filter arrays
    const extractedFilters = [
      {
        id: 'price',
        name: 'Price Range',
        values: [],
        type: 'range',
        min: minPrice,
        max: maxPrice
      },
      {
        id: 'brand',
        name: 'Brand',
        values: Object.entries(brandOptions).map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value))
      },
      {
        id: 'processor',
        name: 'Processor',
        values: Object.entries(processorOptions).map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value))
      },
      {
        id: 'ram',
        name: 'RAM',
        values: Object.entries(ramOptions).map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
            // Sort by RAM size (assuming format like "8GB")
            const numA = parseInt(a.value.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.value.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
          })
      },
      {
        id: 'storage',
        name: 'Storage',
        values: Object.entries(storageOptions).map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
            // Sort by storage size (assuming format like "512GB")
            const numA = parseInt(a.value.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.value.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
          })
      }
    ];
    
    setFilters(extractedFilters);
  };
  
  // Handle filter changes
  const handleFilterChange = (filterId: string, values: string[] | [number, number]) => {
    const newSelectedFilters = { ...selectedFilters };
    
    if (filterId === 'price' && Array.isArray(values) && values.length === 2) {
      newSelectedFilters[filterId] = values.map(String);
    } else {
      newSelectedFilters[filterId] = Array.isArray(values) 
        ? values.map(String)
        : [String(values)];
    }
    
    // Remove empty filter selections
    Object.keys(newSelectedFilters).forEach(key => {
      if (newSelectedFilters[key].length === 0) {
        delete newSelectedFilters[key];
      }
    });
    
    setSelectedFilters(newSelectedFilters);
    
    // Update active filters list for display
    const newActiveFilters: string[] = [];
    Object.entries(newSelectedFilters).forEach(([filterId, values]) => {
      if (filterId === 'price' && values.length === 2) {
        newActiveFilters.push(`Price: ${values[0]} - ${values[1]}`);
      } else {
        values.forEach(value => {
          const filterName = filters.find(f => f.id === filterId)?.name || filterId;
          newActiveFilters.push(`${filterName}: ${value}`);
        });
      }
    });
    
    setActiveFilters(newActiveFilters);
    
    // Apply filters to products
    applyFilters(newSelectedFilters);
  };
  
  // Apply filters to products
  const applyFilters = (selectedFilters: Record<string, string[]>) => {
    const filtered = products.filter(product => {
      return Object.entries(selectedFilters).every(([filterId, values]) => {
        if (!values.length) return true;
        
        // Handle price range filter
        if (filterId === 'price' && values.length === 2) {
          const [min, max] = values.map(Number);
          const productPrice = Number(product.price);
          return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
        }
        
        // Handle other filters
        const productValue = String(product[filterId as keyof Product] || '');
        return values.includes(productValue);
      });
    });
    
    setFilteredProducts(filtered);
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
          <span className="text-sm text-gray-500">{filteredProducts.length} products found</span>
          {activeFilters.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <span key={index} className="badge badge-sm bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {filter}
                </span>
              ))}
            </div>
          )}
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
              selectedFilters={selectedFilters}
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
            <div className="col-span-full text-center py-8">
              No products found matching the selected filters.
            </div>
          )}
        </div>
      </div>
    </CategoryLayout>
  );
};

export default LaptopsPage;
