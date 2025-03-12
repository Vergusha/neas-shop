import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';

const SearchResultsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get('query')?.toLowerCase() || ''; // Convert query to lowercase
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const collections = ['mobile', 'products']; // Add all collections you want to search
        let results: any[] = [];

        for (const collectionName of collections) {
          const q = query(
            collection(db, collectionName),
            where('searchKeywords', 'array-contains', queryParam)
          );
          const querySnapshot = await getDocs(q);
          const collectionResults = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          results = [...results, ...collectionResults];
        }

        setProducts(results);
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };

    if (queryParam) {
      fetchProducts();
    }
  }, [queryParam]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Search Results for "{queryParam}"</h1>
      <input
        type="text"
        ref={searchInputRef}
        onFocus={() => setShowSuggestions(true)}
        className="input input-bordered w-full mb-4"
        // ...other props...
      />
      {showSuggestions && (
        <div className="suggestions-dropdown relative">
          <button
            className="absolute top-0 right-0 p-2 text-xl font-bold"
            onClick={() => setShowSuggestions(false)}
          >
            &times;
          </button>
          {products.length === 0 ? (
            <div className="text-center">No products found</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="suggestion-item flex items-center p-2 hover:bg-gray-100">
                <img src={product.image} alt={product.name} className="w-8 h-8 mr-2" />
                <span>{product.name}</span>
              </div>
            ))
          )}
        </div>
      )}
      {products.length === 0 ? (
        <div className="text-center">No products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              image={product.image}
              name={product.name}
              description={product.description}
              price={product.price}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;