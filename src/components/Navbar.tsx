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
      if (user) {
        // Используем согласованный ключ для корзины
        const cartKey = `cart_${user.uid}`;
        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        
        // Убедимся, что обрабатываем ситуацию, когда элементы могут не иметь поля quantity
        setCartCount(cart.reduce((count: number, item: any) => count + (item.quantity || 1), 0));
      } else {
        setCartCount(0); // Если пользователь не авторизован, корзина пуста
      }
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    
    // При изменении пользователя также обновляем корзину
    auth.onAuthStateChanged(() => {
      updateCartCount();
    });
    
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, [user]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const collections = ['products', 'mobile', 'tv', 'gaming'];
      let allResults: ProductSearchResult[] = [];
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const q = query.toLowerCase().trim();
        
        const querySnapshot = await getDocs(collectionRef);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const searchKeywords = data.searchKeywords || [];
          
          if (
            searchKeywords.some((keyword: string) => 
              keyword.includes(q)
            ) ||
            (data.name && data.name.toLowerCase().includes(q)) ||
            (data.brand && data.brand.toLowerCase().includes(q)) ||
            (data.model && data.model.toLowerCase().includes(q)) ||
            (data.deviceType && data.deviceType.toLowerCase().includes(q))
          ) {
            allResults.push({
              id: doc.id,
              name: data.name || 'Unnamed Product',
              brand: data.brand || '',
              price: data.price || 0,
              image: data.image || '',
              collection: collectionName,
            });
          }
        });
      }
      
      allResults = allResults
        .sort((a, b) => 
          (a.name.toLowerCase().indexOf(query.toLowerCase()) - 
           b.name.toLowerCase().indexOf(query.toLowerCase())))
        .slice(0, 5);
      
      setSearchResults(allResults);
    } catch (error) {
      console.error("Error searching products:", error);
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