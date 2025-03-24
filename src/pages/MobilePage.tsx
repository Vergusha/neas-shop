import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { FaFilter } from 'react-icons/fa';
import ProductFilters from '../components/ProductFilters';

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
}

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<Array<{ id: string; name: string; values: string[] }>>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const mobileCollection = collection(db, 'mobile');
        const mobileSnapshot = await getDocs(mobileCollection);
        const mobileList = mobileSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || 'Unnamed Product',
          description: doc.data().description || 'No description available',
          price: Number(doc.data().price) || 0,
          image: doc.data().image || '',
          brand: doc.data().brand || '',
          memory: doc.data().memory || '',
          color: doc.data().color || '',
          category: 'mobile'
        })) as Product[];
        
        setProducts(mobileList);
        setFilteredProducts(mobileList);
      } catch (err) {
        console.error('Error fetching mobile products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const productsRef = collection(db, 'mobile');
        const snapshot = await getDocs(productsRef);
        
        const uniqueFilters: Record<string, Set<string>> = {
          brand: new Set(),
          memory: new Set(),
          color: new Set(),
        };
        
        // For price range
        let minPrice = Infinity;
        let maxPrice = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.brand) uniqueFilters.brand.add(data.brand);
          if (data.memory) uniqueFilters.memory.add(data.memory);
          if (data.color) uniqueFilters.color.add(data.color);
          
          // Track price range
          if (data.price) {
            const price = Number(data.price);
            if (!isNaN(price)) {
              minPrice = Math.min(minPrice, price);
              maxPrice = Math.max(maxPrice, price);
            }
          }
        });
        
        // Round min down to nearest 100 and max up to nearest 100
        const roundedMinPrice = Math.floor(minPrice / 100) * 100;
        const roundedMaxPrice = Math.ceil(maxPrice / 100) * 100;

        const filtersList = [
          {
            id: 'price',
            name: 'Price',
            values: [],
            type: 'range' as const,
            min: roundedMinPrice,
            max: roundedMaxPrice
          },
          { id: 'brand', name: 'Brand', values: Array.from(uniqueFilters.brand).sort() },
          { id: 'memory', name: 'Memory', values: Array.from(uniqueFilters.memory).sort() },
          { id: 'color', name: 'Color', values: Array.from(uniqueFilters.color).sort() },
        ];

        setFilters(filtersList);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    if (!products.length) return;

    const filtered = products.filter(product => {
      return Object.entries(selectedFilters).every(([filterId, values]) => {
        if (!values.length) return true;
        
        // Handle price range filter
        if (filterId === 'price' && values.length === 2) {
          const [min, max] = values.map(Number);
          const productPrice = Number(product.price);
          return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
        }
        
        // Regular filters
        const productValue = String(product[filterId as keyof Product] || '').toLowerCase();
        return values.some(value => productValue === value.toLowerCase());
      });
    });

    console.log('Filtered products:', filtered.length); // Debug log
    setFilteredProducts(filtered);
  }, [products, selectedFilters]);

  const handleFilterChange = (filterId: string, values: string[] | [number, number]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterId]: Array.isArray(values) ? values.map(String) : values
    } as Record<string, string[]>));
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
        <h1 className="text-2xl font-bold">Mobile Phones</h1>
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
              filters={filters}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        <div className={`${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
          {filteredProducts.length > 0 ? (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
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
    </div>
  );
};

export default MobilePage;