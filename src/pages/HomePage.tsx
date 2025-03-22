import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import { extractFilters, applyFilters } from '../utils/filterUtils';

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
}

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        const productList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        setProducts(productList);
        
        // Extract available filters from products
        const filters = extractFilters(productList);
        setAvailableFilters(filters);
        
        // Initialize filtered products
        setFilteredProducts(productList);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch popular products
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const popularCollection = collection(db, 'popularProducts');
        const popularSnapshot = await getDocs(popularCollection);
        const popularList = popularSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        setPopularProducts(popularList);
      } catch (err) {
        console.error('Error fetching popular products:', err);
      } finally {
        setIsPopularLoading(false);
      }
    };

    fetchPopularProducts();
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
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  // Listen for favorites updates
  useEffect(() => {
    const handleFavoritesUpdated = () => {
      console.log('Favorites updated event detected in HomePage');
      // If you're storing favorites in state, update them here
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-primary flex items-center gap-2"
        >
          <FaFilter />
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
            <div className="px-12 sm:px-16 overflow-x-hidden">
              <div className="flex flex-row flex-wrap">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="w-full sm:w-1/2 lg:w-1/3 mb-6">
                    <ProductCard key={product.id} product={product} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="col-span-full text-center py-8">
              No products found matching the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* Popular Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Popular Products</h2>
          
          {isPopularLoading ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-row overflow-x-scroll product-row pb-4">
                {popularProducts.map((product) => (
                  <div key={product.id} className="product-card-wrapper">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;