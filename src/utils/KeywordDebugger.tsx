import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

interface MatchedProduct {
  id: string;
  name: string;
  brand: string;
  collection: string;
  keywords: string[];
  matchedKeywords: string[];
}

const KeywordDebugger: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<MatchedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const searchByKeyword = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    setResults([]);
    
    try {
      const collections = ['products', 'mobile', 'tv', 'gaming'];
      const matchedProducts: MatchedProduct[] = [];
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const searchKeywords = data.searchKeywords || [];
          
          // Проверяем совпадение по ключевым словам
          if (Array.isArray(searchKeywords)) {
            const matchedKeywords = searchKeywords.filter(
              (keyword: string) => keyword && 
              typeof keyword === 'string' && 
              keyword.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            if (matchedKeywords.length > 0) {
              matchedProducts.push({
                id: doc.id,
                name: data.name || 'Unnamed Product',
                brand: data.brand || '',
                collection: collectionName,
                keywords: searchKeywords,
                matchedKeywords
              });
            }
          }
        });
      }
      
      setResults(matchedProducts);
    } catch (error) {
      console.error('Error searching by keyword:', error);
      setErrorMsg('An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-4 text-xl font-bold">Search Keyword Debugger</h1>
      
      <div className="flex mb-4">
        <input
          type="text"
          className="flex-grow p-2 border border-gray-300 rounded-l"
          placeholder="Enter keyword to search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchByKeyword()}
        />
        <button
          className="px-4 py-2 text-white bg-blue-500 rounded-r hover:bg-blue-600"
          onClick={searchByKeyword}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {errorMsg && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded">{errorMsg}</div>}
      
      {results.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Found {results.length} products with matching keywords</h2>
          <div className="space-y-4">
            {results.map((product, index) => (
              <div key={index} className="p-4 bg-white rounded shadow">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">ID: {product.id}</div>
                <div className="text-sm text-gray-500">Collection: {product.collection}</div>
                <div className="mt-2">
                  <div className="text-sm font-medium">Matched Keywords:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.matchedKeywords.map((keyword: string, i: number) => (
                      <span key={i} className="px-2 py-1 text-sm text-white bg-green-500 rounded">{keyword}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <details>
                    <summary className="text-sm text-blue-500 cursor-pointer">Show all keywords ({product.keywords.length})</summary>
                    <div className="flex flex-wrap gap-1 p-2 mt-1 bg-gray-100 rounded">
                      {product.keywords.map((keyword: string, i: number) => (
                        <span key={i} className="px-2 py-1 text-xs bg-gray-200 rounded">{keyword}</span>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="mt-2">
                  <button 
                    onClick={() => handleProductClick(product.id)}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    View Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && searchTerm && <div className="p-4 text-center text-gray-500">No products found with this keyword.</div>
      )}
    </div>
  );
};

export default KeywordDebugger;
