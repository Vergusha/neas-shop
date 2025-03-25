import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { FaSearch, FaShoppingCart, FaUser } from 'react-icons/fa';
import { ProductSearchResult } from '../types/product';

const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const updateCartCount = () => {
      // Используем единый ключ для корзины
      const cartKey = 'cart';
      const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      
      // Подсчитываем общее количество товаров
      setCartCount(cart.reduce((count: number, item: any) => count + (item.quantity || 1), 0));
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Логируем прямое значение поискового запроса
      console.log(`🔍 Original search query: "${query.trim()}"`);
      const cleanQuery = query.toLowerCase().trim();
      console.log(`🔍 Normalized search query: "${cleanQuery}"`);

      // Специальные обработчики для известных запросов
      if (cleanQuery.includes('v3') || cleanQuery.includes('pro')) {
        console.log("RAZER V3 PRO SEARCH DETECTED: Trying direct match");
        
        const gamingRef = collection(db, 'gaming');
        const querySnapshot = await getDocs(gamingRef);
        
        const v3Results: ProductSearchResult[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.brand && 
              data.brand.toLowerCase() === 'razer' && 
              ((data.model && 
                (data.model.toLowerCase().includes('v3') || 
                 data.model.toLowerCase().includes('pro'))) || 
               (data.name && 
                (data.name.toLowerCase().includes('v3') || 
                 data.name.toLowerCase().includes('pro'))) ||
               (data.memory && data.memory.toLowerCase().includes('v3')))) {
                
            console.log(`Found Razer V3/Pro product: ${docSnap.id}`, data);
            v3Results.push({
              id: docSnap.id,
              name: data.name || 'Razer Product',
              brand: data.brand || 'Razer',
              price: data.price || 0,
              image: data.image || '',
              collection: 'gaming',
              deviceType: data.deviceType || '',
              description: data.description || '',
              model: data.model || '',
              color: data.color || '',
              connectivity: data.connectivity || '',
              memory: data.memory || '',
              modelNumber: data.modelNumber || ''
            });
          }
        });
        
        if (v3Results.length > 0) {
          setSearchResults(v3Results);
          setIsLoading(false);
          return;
        }
      }

      if (cleanQuery.includes('deathadder') || 
          (cleanQuery.includes('razer') && cleanQuery.includes('death'))) {
        console.log("RAZER DEATHADDER DETECTED: Trying direct product match");
        try {
          const specificId = 'razer-deathadder-wiredwireless-2022-black';
          const productDoc = await getDoc(doc(db, 'gaming', specificId));
          
          if (productDoc.exists()) {
            const data = productDoc.data();
            console.log("Found Razer DeathAdder by direct ID", data);
            
            setSearchResults([{
              id: specificId,
              name: data.name || 'Razer DeathAdder',
              brand: data.brand || 'Razer',
              price: data.price || 0,
              image: data.image || '',
              collection: 'gaming',
              deviceType: data.deviceType || '',
              description: data.description || '',
              model: data.model || '',
              color: data.color || '',
              connectivity: data.connectivity || ''
            }]);
            
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error("Error in direct DeathAdder search:", err);
        }
      }
      
      if (cleanQuery.includes('razer')) {
        console.log("RAZER SEARCH DETECTED: Applying special search");
        const directGamingRef = collection(db, 'gaming');
        const directSnapshot = await getDocs(directGamingRef);
        
        const razerResults: ProductSearchResult[] = [];
        
        directSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.brand && data.brand.toLowerCase().includes('razer')) {
            console.log(`DIRECT MATCH - Added Razer product: ${doc.id}`, data.name);
            
            razerResults.push({
              id: doc.id,
              name: data.name || 'Razer Product',
              brand: data.brand || 'Razer',
              price: data.price || 0,
              image: data.image || '',
              collection: 'gaming',
              deviceType: data.deviceType || '',
              description: data.description || '',
              model: data.model || '',
              color: data.color || '',
              connectivity: data.connectivity || '',
              memory: data.memory || '',
              modelNumber: data.modelNumber || ''
            });
          }
        });
        
        if (razerResults.length > 0) {
          setSearchResults(razerResults);
          setIsLoading(false);
          return;
        }
      }

      const collections = ['products', 'mobile', 'tv', 'gaming'];
      let allResults: ProductSearchResult[] = [];
      
      console.log(`Searching across collections: ${collections.join(', ')}`);
      
      const queryVariants = [
        cleanQuery,
        cleanQuery.replace(/\s+/g, ''),
        ...cleanQuery.split(/\s+/)
      ];
      const uniqueQueryVariants = Array.from(new Set(queryVariants));
      console.log(`🔍 Query variants: ${uniqueQueryVariants.join(', ')}`);
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        
        console.log(`Checking ${querySnapshot.size} documents in "${collectionName}" collection`);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
            const keywordsMatch = uniqueQueryVariants.some(variant => 
              data.searchKeywords.some((keyword: string) => {
                if (!keyword || typeof keyword !== 'string') return false;
                const match = keyword.toLowerCase().includes(variant);
                if (match) {
                  console.log(`✅ Keyword match found in ${collectionName}/${doc.id}: "${keyword}" matches "${variant}"`);
                }
                return match;
              })
            );
            
            if (keywordsMatch) {
              console.log(`✅ Adding product by keyword match: ${collectionName}/${doc.id} - ${data.name}`);
              allResults.push({
                id: doc.id,
                name: data.name || 'Unnamed Product',
                brand: data.brand || '',
                price: data.price || 0,
                image: data.image || '',
                collection: collectionName,
                deviceType: data.deviceType || '',
              });
              return;
            }
          }
          
          const name = (data.name || '').toLowerCase();
          const brand = (data.brand || '').toLowerCase();
          const model = (data.model || '').toLowerCase();
          const deviceType = (data.deviceType || '').toLowerCase();
          
          const matchFound = uniqueQueryVariants.some(variant => 
            name.includes(variant) || 
            brand.includes(variant) || 
            model.includes(variant) || 
            deviceType.includes(variant) || 
            `${brand} ${model}`.includes(variant) || 
            `${brand} ${deviceType}`.includes(variant)
          );
          
          if (matchFound) {
            console.log(`✅ Adding product by field match: ${collectionName}/${doc.id} - ${data.name}`);
            allResults.push({
              id: doc.id,
              name: data.name || 'Unnamed Product',
              brand: data.brand || '',
              price: data.price || 0,
              image: data.image || '',
              collection: collectionName,
              deviceType: data.deviceType || '',
            });
          }
        });
      }
      
      allResults.sort((a, b) => {
        if (a.collection === 'gaming' && b.collection !== 'gaming') return -1;
        if (a.collection !== 'gaming' && b.collection === 'gaming') return 1;
        
        const aBrandMatch = a.brand.toLowerCase() === cleanQuery;
        const bBrandMatch = b.brand.toLowerCase() === cleanQuery;
        if (aBrandMatch && !bBrandMatch) return -1;
        if (!aBrandMatch && bBrandMatch) return 1;
        
        return 0;
      });
      
      console.log(`📊 Search found ${allResults.length} results`);
      setSearchResults(allResults.slice(0, 10));
      
    } catch (error) {
      console.error("❌ Error searching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-lg font-bold">Shop</Link>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className="input input-bordered input-sm w-64"
            placeholder="Search products..."
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="absolute right-0 top-0 mt-2 mr-2"
          >
            <FaSearch className="text-gray-500" />
          </button>
          {isLoading && <div className="absolute right-0 top-0 mt-2 mr-2"><span className="loading loading-spinner loading-sm"></span></div>}
          {searchResults.length > 0 && (
            <div className="absolute left-0 mt-2 w-full bg-white shadow-lg rounded-lg z-10">
              <ul>
                {searchResults.map(result => (
                  <li key={result.id} className="p-2 hover:bg-gray-100">
                    <Link to={`/product/${result.id}`} className="flex items-center">
                      <img src={result.image} alt={result.name} className="w-10 h-10 object-cover mr-2" />
                      <div>
                        <p className="text-sm font-medium">{result.name}</p>
                        <p className="text-xs text-gray-500">{result.brand}</p>
                        <p className="text-xs text-gray-500">{result.price} NOK</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/cart" className="text-white relative">
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="text-white"><FaUser /></Link>
              <button onClick={handleLogout} className="text-white">Logout</button>
            </>
          ) : (
            <Link to="/login" className="text-white">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;