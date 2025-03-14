import { Search, ShoppingCart, Heart, User, Bell } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import Toast from './Toast';

const logoColor = '#F0E965'; // Цвет логотипа

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [notificationItem, setNotificationItem] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      try {
        const collections = ['mobile', 'products']; // Add all collections you want to search
        let results: any[] = [];

        for (const collectionName of collections) {
          const q = query(
            collection(db, collectionName),
            where('name', '>=', searchQuery),
            where('name', '<=', searchQuery + '\uf8ff')
          );
          const querySnapshot = await getDocs(q);
          const collectionResults = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          results = [...results, ...collectionResults];
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error fetching search results: ", error);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(storedFavorites);
    
    // Get cart items count
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((total: number, item: any) => total + item.quantity, 0);
      setCartItemCount(count);
    };
    
    updateCartCount();
    
    // Add event listener to update cart count when storage changes
    window.addEventListener('storage', updateCartCount);
    
    // Custom event for cart updates
    const handleCartUpdate = (e: Event) => {
      updateCartCount();
      
      // Show notification when item is added to cart
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.item) {
        setNotificationItem(customEvent.detail.item);
        setShowCartNotification(true);
        setTimeout(() => setShowCartNotification(false), 3000);
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  useEffect(() => {
    // Function to handle clicks outside the search component
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node) &&
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleFavoriteClick = () => {
    navigate('/favorites');
  };

  const handleCartClick = () => {
    navigate('/cart');
  };

  const toggleCartPreview = () => {
    setCartOpen(!cartOpen);
  };

  // Function to get cart items for preview
  const getCartItems = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return cart.slice(0, 3); // Get first 3 items for preview
  };

  return (
    <header className="bg-[#003D2D] shadow-md relative">
      <div className="container mx-auto py-2">
        <div className="flex items-center justify-between">
          {/* Logo - Left aligned */}
          <a href="/" className="logo-animation">
            <img
              src={logo}
              alt="Logo"
              className="h-8 w-auto md:h-10"
            />
          </a>
          
          {/* Right side with search and icons */}
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative w-64 md:w-80">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Искать товары..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) {
                      setShowResults(true);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-full px-4 py-2 pl-10 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
              </form>
              {showResults && searchResults.length > 0 && (
                <div 
                  ref={searchResultsRef}
                  className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-20"
                >
                  {searchResults.map((result) => (
                    <div key={result.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => navigate(`/product/${result.id}`)}>
                      <img src={result.image} alt={result.name} className="w-8 h-8 inline-block mr-2" />
                      <span>{result.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Icon buttons in a row - Adjusted for consistent alignment */}
            <div className="flex items-center gap-2">
              {/* Favorites button */}
              <button onClick={handleFavoriteClick} className="btn btn-ghost btn-circle">
                <Heart size={32} className="text-white" />
              </button>
              
              {/* Cart button with dropdown */}
              <div className="relative pt-2"> {/* Added padding-top here */}
                <button 
                  onClick={toggleCartPreview} 
                  className="btn btn-ghost btn-circle relative"
                >
                  <ShoppingCart size={32} className="text-white" />
                  {cartItemCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      {cartItemCount}
                    </div>
                  )}
                </button>
                
                {/* Cart preview dropdown */}
                {cartOpen && cartItemCount > 0 && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-xl z-20">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Your Cart ({cartItemCount} items)</h3>
                    </div>
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {getCartItems().map((item: any, index: number) => (
                        <div key={index} className="flex items-center p-2 hover:bg-gray-100 border-b">
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
                          <div className="ml-2 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} × {item.price} NOK</p>
                          </div>
                        </div>
                      ))}
                      
                      {cartItemCount > 3 && (
                        <p className="text-xs text-center text-gray-500 mt-2">
                          and {cartItemCount - 3} more items...
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50">
                      <button 
                        onClick={() => {
                          setCartOpen(false);
                          handleCartClick();
                        }}
                        className="w-full btn btn-primary btn-sm"
                      >
                        View Cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* User button */}
              <button 
                onClick={() => user ? navigate('/profile') : navigate('/login')} 
                className="btn btn-ghost btn-circle"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-content flex items-center justify-center">
                  {user && user.photoURL ? (
                    <img src={user.photoURL} alt="user avatar" className="rounded-full w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-neutral" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cart notification toast */}
      {showCartNotification && (
        <Toast 
          message={`Added to cart: ${notificationItem}`}
          type="success"
          onClose={() => setShowCartNotification(false)}
        />
      )}
    </header>
  );
};

export default Header;