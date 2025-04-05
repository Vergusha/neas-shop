import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { FaFilter } from 'react-icons/fa';
import { getTheme } from '../utils/themeUtils';

const TVPage: React.FC = () => {
  const [products, setProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    const fetchProducts = async () => {
      const productsRef = collection(db, 'tv');
      const productsSnapshot = await getDocs(productsRef);
      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
    };

    fetchProducts();
  }, []);

  return (
    <div className={`tv-page ${currentTheme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">TVs</h1>
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
        {showFilters && (
          <div className="filters mt-4">
            {/* Add filter options here */}
          </div>
        )}
        <div className="products-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {products.map(product => (
            <div key={product.id} className="product-card p-4 border rounded-lg">
              <img src={product.image} alt={product.name} className="w-full h-48 object-cover mb-2" />
              <h2 className="text-lg font-semibold">{product.name}</h2>
              <p className="text-gray-500">{product.brand}</p>
              <p className="text-gray-700">{product.price} NOK</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TVPage;