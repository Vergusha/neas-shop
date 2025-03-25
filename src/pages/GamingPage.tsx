import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { Product } from '../types/product';
import DirectRazerLink from '../components/DirectRazerLink';

const GamingPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    deviceType: '',
    brand: '',
    connectivity: '',
  });
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [uniqueDeviceTypes, setUniqueDeviceTypes] = useState<string[]>([]);
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [uniqueConnectivity, setUniqueConnectivity] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'gaming'));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          image: doc.data().image || '',
          name: doc.data().name || '',
          description: doc.data().description || '',
          price: doc.data().price || 0,
          collection: 'gaming'
        })) as Product[];
        
        setProducts(productsData);
        
        // Извлекаем уникальные значения для фильтров
        const deviceTypes = Array.from(new Set(productsData.map(p => p.deviceType || '').filter(Boolean)));
        const brands = Array.from(new Set(productsData.map(p => p.brand || '').filter(Boolean)));
        const connectivities = Array.from(new Set(productsData.map(p => p.connectivity || '').filter(Boolean)));
        
        setUniqueDeviceTypes(deviceTypes);
        setUniqueBrands(brands);
        setUniqueConnectivity(connectivities);
      } catch (error) {
        console.error('Error fetching gaming products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  // Применяем фильтры при их изменении или изменении списка продуктов
  useEffect(() => {
    let result = [...products];
    
    if (filters.deviceType) {
      result = result.filter(p => p.deviceType === filters.deviceType);
    }
    
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand);
    }
    
    if (filters.connectivity) {
      result = result.filter(p => p.connectivity === filters.connectivity);
    }
    
    setFilteredProducts(result);
  }, [filters, products]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      deviceType: '',
      brand: '',
      connectivity: '',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const displayedProducts = filteredProducts.length > 0 ? filteredProducts : products;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Gaming & Peripherals</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-1/4 bg-white p-4 rounded-lg shadow-md h-min">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Filters</h2>
            {(filters.deviceType || filters.brand || filters.connectivity) && (
              <button 
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Device Type Filter */}
          {uniqueDeviceTypes.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Device Type</h3>
              <select 
                value={filters.deviceType}
                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="">All Device Types</option>
                {uniqueDeviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Brand Filter */}
          {uniqueBrands.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Brand</h3>
              <select 
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="">All Brands</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Connectivity Filter */}
          {uniqueConnectivity.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Connectivity</h3>
              <select 
                value={filters.connectivity}
                onChange={(e) => handleFilterChange('connectivity', e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="">All Connectivity Types</option>
                {uniqueConnectivity.map(conn => (
                  <option key={conn} value={conn}>{conn}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Добавляем компонент прямого доступа к Razer продуктам */}
          <div className="mt-6">
            <DirectRazerLink />
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full lg:w-3/4">
          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No products found. Try changing your filters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GamingPage;