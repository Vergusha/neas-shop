import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { FaSearch, FaShoppingCart, FaUser } from 'react-icons/fa';
import { ProductSearchResult } from '../types/product';
import { getTheme, setTheme } from '../utils/themeUtils'; // Import the theme utils

const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [currentTheme, setCurrentTheme] = useState(getTheme());

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

  useEffect(() => {
    // Initialize theme from localStorage
    setCurrentTheme(getTheme());
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

  // Theme toggle handler
  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setCurrentTheme(newTheme);
    
    // Add event to notify app that theme has changed
    window.dispatchEvent(new Event('themeChanged'));
  };

  return (
    <nav className={`${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-4`}>
      <div className="container flex items-center justify-between mx-auto">
        <Link to="/" className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'} text-lg font-bold`}>Shop</Link> {/* Изменено с text-white на text-primary */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className={`input input-bordered input-sm w-64 ${
              currentTheme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : ''
            }`}
            placeholder="Search products..."
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="absolute top-0 right-0 mt-2 mr-2"
          >
            <FaSearch className={currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-500'} />
          </button>
          {isLoading && <div className="absolute top-0 right-0 mt-2 mr-2"><span className="loading loading-spinner loading-sm"></span></div>}
          {searchResults.length > 0 && (
            <div className={`absolute left-0 mt-2 w-full shadow-lg rounded-lg z-10 ${
              currentTheme === 'dark' ? 'bg-gray-800 border border-gray-600' : 'bg-white'
            }`}>
              <ul>
                {searchResults.map(result => (
                  <li key={result.id} className={`p-2 ${currentTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <Link to={`/product/${result.id}`} className="flex items-center">
                      <img src={result.image} alt={result.name} className="object-cover w-10 h-10 mr-2" />
                      <div>
                        <p className={`text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-200' : ''}`}>{result.name}</p>
                        <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{result.brand}</p>
                        <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{result.price} NOK</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Theme toggle button */}
          <label className="swap swap-rotate">
            <input 
              type="checkbox" 
              className="theme-controller" 
              value="synthwave" 
              checked={currentTheme !== 'light'}
              onChange={handleThemeToggle}
            />
            {/* sun icon */}
            <svg
              className={`swap-off h-6 w-6 fill-current ${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24">
              <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
            </svg>
            {/* moon icon */}
            <svg
              className={`swap-on h-6 w-6 fill-current ${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24">
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
            </svg>
          </label>

          <Link to="/cart" className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'} relative`}> {/* Заменен цвет #eebbca на #95c672 */}
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">{cartCount}</span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/profile" className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'}`}><FaUser /></Link> {/* Заменен цвет #eebbca на #95c672 */}
              <Link 
                to="/admin" 
                className="btn btn-secondary btn-sm"
              >
                Admin Panel
              </Link>
              <button onClick={handleLogout} className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'}`}>Logout</button> {/* Заменен цвет #eebbca на #95c672 */}
            </>
          ) : (
            <Link to="/login" className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-primary'}`}>Login</Link> {/* Заменен цвет #eebbca на #95c672 */}
          )}
        </div>
      </div>
      <ul className={`menu ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}> {/* Добавлен text-gray-800 */}
        <li><Link to="/mobile">Mobile Phones</Link></li>
        <li><Link to="/tv-audio">TVs</Link></li>
        <li><Link to="/gaming">Gaming</Link></li>
        <li><Link to="/laptops">Laptops</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;