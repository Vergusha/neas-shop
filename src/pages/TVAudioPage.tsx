import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';
import CategoryLayout from '../components/CategoryLayout';
import { getTheme } from '../utils/themeUtils';

const TVAudioPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<Array<{ id: string; name: string; values: any[] }>>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // ...existing code for fetching products...

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
    <CategoryLayout title="TV & Audio">
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

export default TVAudioPage;
