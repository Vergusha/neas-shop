import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
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
      const cartKey = 'cart';
      const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
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
      const cleanQuery = query.toLowerCase().trim();
      console.log('🔍 Starting search with query:', cleanQuery);

      // Проверяем аудио коллекцию
      const audioRef = collection(db, 'audio');
      const audioSnapshot = await getDocs(audioRef);
      
      console.log(`📢 Found ${audioSnapshot.size} audio products to check`);
      
      const audioResults: ProductSearchResult[] = [];
      
      audioSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Checking audio product:', {
          id: doc.id,
          name: data.name,
          brand: data.brand,
          model: data.model,
          keywords: data.searchKeywords
        });

        // Проверяем все возможные поля для совпадений
        const searchableFields = [
          data.name,
          data.brand,
          data.model,
          data.subtype,
          data.description,
          ...(data.searchKeywords || [])
        ].map(field => field?.toLowerCase?.() || '');

        const isMatch = searchableFields.some(field => field.includes(cleanQuery));

        if (isMatch) {
          console.log('✅ Found matching audio product:', data.name);
          audioResults.push({
            id: doc.id,
            name: data.name || 'Unknown Product',
            brand: data.brand || '',
            price: data.price || 0,
            image: data.image || '',
            collection: 'audio',
            subtype: data.subtype || '',
            description: data.description || '',
            model: data.model || '',
            color: data.color || '',
            connectivity: data.connectivity || ''
          });
        }
      });

      if (audioResults.length > 0) {
        console.log(`✨ Found ${audioResults.length} matching audio products`);
        setSearchResults(audioResults);
        setIsLoading(false);
        return;
      }

      // Check other collections
      const collections = ['products', 'mobile', 'tv', 'gaming', 'laptops'];
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
          console.log(`Checking document ${doc.id} in ${collectionName}:`, {
            name: data.name,
            subtype: data.subtype,
            collection: collectionName,
            hasKeywords: Boolean(data.searchKeywords)
          });
          
          // Проверяем есть ли поисковые ключевые слова
          if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
            const keywordsMatch = uniqueQueryVariants.some(variant => 
              data.searchKeywords.some((keyword: string) => {
                if (!keyword || typeof keyword !== 'string') return false;
                const match = keyword.toLowerCase().includes(variant);
                if (match) {
                  console.log(`✅ Keyword match in ${collectionName}/${doc.id}: "${keyword}" matches "${variant}"`);
                }
                return match;
              })
            );
            
            if (keywordsMatch) {
              console.log(`Adding product by keyword match: ${collectionName}/${doc.id}`);
              allResults.push({
                id: doc.id,
                name: data.name || 'Unnamed Product',
                brand: data.brand || '',
                price: data.price || 0,
                image: data.image || '',
                collection: collectionName,
                deviceType: data.deviceType || '',
                subtype: data.subtype || '',
                description: data.description || ''
              });
              return;
            }
          }
          
          // Если ключевых слов нет, ищем по основным полям
          const searchableFields = {
            name: (data.name || '').toLowerCase(),
            brand: (data.brand || '').toLowerCase(),
            model: (data.model || '').toLowerCase(),
            deviceType: (data.deviceType || '').toLowerCase(),
            subtype: (data.subtype || '').toLowerCase(),
            description: (data.description || '').toLowerCase()
          };
          
          const matchFound = uniqueQueryVariants.some(variant => 
            Object.values(searchableFields).some(fieldValue => 
              fieldValue.includes(variant)
            ) ||
            `${searchableFields.brand} ${searchableFields.model}`.includes(variant) ||
            `${searchableFields.brand} ${searchableFields.subtype}`.includes(variant)
          );
          
          if (matchFound) {
            console.log(`Adding product by field match: ${collectionName}/${doc.id}`);
            allResults.push({
              id: doc.id,
              name: data.name || 'Unnamed Product',
              brand: data.brand || '',
              price: data.price || 0,
              image: data.image || '',
              collection: collectionName,
              deviceType: data.deviceType || '',
              subtype: data.subtype || '',
              description: data.description || ''
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
    <nav className="bg-gray-100 p-4"> {/* Изменено с bg-gray-800 на bg-gray-100 */}
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-primary text-lg font-bold">Shop</Link> {/* Изменено с text-white на text-primary */}
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
          <Link to="/cart" className="text-primary relative"> {/* Изменено с text-white на text-primary */}
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="text-primary"><FaUser /></Link> {/* Изменено с text-white на text-primary */}
              <Link 
                to="/admin" 
                className="btn btn-secondary btn-sm"
              >
                Admin Panel
              </Link>
              <button onClick={handleLogout} className="text-primary">Logout</button> {/* Изменено с text-white на text-primary */}
            </>
          ) : (
            <Link to="/login" className="text-primary">Login</Link> {/* Изменено с text-white на text-primary */}
          )}
        </div>
      </div>
      <ul className="menu text-gray-800"> {/* Добавлен text-gray-800 */}
        <li><Link to="/mobile">Mobile Phones</Link></li>
        <li><Link to="/tv-audio">TVs</Link></li>
        <li><Link to="/gaming">Gaming</Link></li>
        <li><Link to="/laptops">Laptops</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;