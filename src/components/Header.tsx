import { Search, ShoppingCart, Heart, User } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import Toast from './Toast';
import { getDatabase, ref, get, onValue } from 'firebase/database';
import { app } from '../firebaseConfig'; // Make sure this import exists

const defaultAvatarSVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBkMCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTUwIDUwYy0xNSAwLTMwIDE1LTMwIDMwczE1IDMwIDMwIDMwIDMwLTE1IDMwLTMwUzY1IDUwIDUwIDUwem0wIDUwYy0xMCAwLTE4IDgtMTggMThzOCAxOCAxOCAxOGMxMC4xIDAgMTgtOCAxOC0xOHMtOC0xOC0xOC0xOHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';


const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [, setFavorites] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [notificationItem, setNotificationItem] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.email || "No user");
      if (currentUser) {
        try {
          // Only attempt to get user data from database if we have a user
          const database = getDatabase(app);
          const userRef = ref(database, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          
          let userData: { avatarURL?: string } = {};
          if (snapshot.exists()) {
            userData = snapshot.val();
            if (userData.avatarURL) {
              setUser({
                ...currentUser,
                photoURL: userData.avatarURL
              });
            } else {
              setUser(currentUser);
            }
          } else {
            // In case the database doesn't have the user
            setUser(currentUser);
          }
          
          // Update localStorage with latest user data
          localStorage.setItem('userProfile', JSON.stringify(userData));
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        // Clear user-related data from localStorage when logged out
        localStorage.removeItem('userProfile');
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Добавляем слушатель изменений в базе данных
  useEffect(() => {
    if (user) {
      const database = getDatabase(app);
      const userRef = ref(database, `users/${user.uid}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.avatarURL && data.avatarURL.length <= 1024) {
            setUser((prev: any) => ({
              ...prev,
              photoURL: data.avatarURL
            }));
          }
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.relative')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Обновим useEffect для отслеживания изменений аватара
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.avatarURL) {
        if (user) {
          setUser((prev: any) => ({
            ...prev,
            photoURL: customEvent.detail.avatarURL
          }));
        }
        localStorage.setItem('avatarURL', customEvent.detail.avatarURL);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Explicitly navigate to home page after sign out
      navigate('/');
      // Close user menu
      setUserMenuOpen(false);
      // Show a sign-out notification
      alert('You have been signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  // Упростим функцию рендеринга аватара
  const renderUserAvatar = () => {
    const avatarUrl = user?.photoURL || defaultAvatarSVG;
    console.log('Rendering avatar with URL:', avatarUrl);
    
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden">
        {user ? (
          <img 
            src={avatarUrl}
            alt="User avatar" 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load avatar, using default');
              (e.target as HTMLImageElement).src = defaultAvatarSVG;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <User size={24} className="text-gray-600" />
          </div>
        )}
      </div>
    );
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
              
              {/* User button with dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="btn btn-ghost btn-circle"
                >
                  {renderUserAvatar()}
                </button>

                {/* User menu dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-20">
                    <div className="py-1">
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b">
                            <p className="text-sm font-medium text-gray-900">
                              {user.displayName || 'User'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                          <a
                            href="/profile"
                            onClick={(e) => {
                              e.preventDefault();
                              setUserMenuOpen(false);
                              navigate('/profile');
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Profile
                          </a>
                          <button
                            onClick={async () => {
                              await handleSignOut();
                              setUserMenuOpen(false);
                              navigate('/');
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            Sign Out
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            href="/login"
                            onClick={(e) => {
                              e.preventDefault();
                              setUserMenuOpen(false);
                              navigate('/login');
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Sign In
                          </a>
                          <a
                            href="/register"
                            onClick={(e) => {
                              e.preventDefault();
                              setUserMenuOpen(false);
                              navigate('/register');
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Register
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
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