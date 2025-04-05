import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ShoppingCart, Heart, User, Bell, MessageSquare, LogOut, LogIn } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Remove 'update' from here
import { db } from '../firebaseConfig';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import Toast from './Toast';
import { getDatabase, ref, get, onValue, update } from 'firebase/database'; // Import update from here
import { app } from '../firebaseConfig';
import { database } from '../firebaseConfig';
import { useAuth } from '../utils/AuthProvider';
import UserAvatar from './UserAvatar';
import '../styles/HeaderStyles.css';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [, setFavorites] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [notificationItem, setNotificationItem] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const auth = getAuth();
  const { user, updateUserAvatar } = useAuth(); // Добавляем updateUserAvatar из контекста

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      try {
        const collections = ['mobile', 'products', 'laptops', 'audio', 'tv', 'gaming']; // Обновляем список коллекций
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

  // Add this function to force refresh the user's avatar
  const refreshUserAvatar = async () => {
    if (!user) return;
    
    try {
      // Get the latest avatar URL from Firebase
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.avatarURL) {
          // Update state with the latest avatar
          await updateUserAvatar(userData.avatarURL);
          
          // Update localStorage
          localStorage.setItem('avatarURL', userData.avatarURL);
          
          // Update userProfile in localStorage if it exists
          const savedProfile = localStorage.getItem('userProfile');
          if (savedProfile) {
            const profileData = JSON.parse(savedProfile);
            profileData.avatarURL = userData.avatarURL;
            localStorage.setItem('userProfile', JSON.stringify(profileData));
          }
          
          console.log('Avatar refreshed from Firebase:', userData.avatarURL);
        }
      }
    } catch (error) {
      console.error('Error refreshing avatar:', error);
    }
  };

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
              await updateUserAvatar(userData.avatarURL);
            }
          }
          
          // Update localStorage with latest user data
          localStorage.setItem('userProfile', JSON.stringify(userData));
          
          // Ensure avatar is refreshed on login
          await refreshUserAvatar();
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // Clear user-related data from localStorage when logged out
        localStorage.removeItem('userProfile');
      }
    });

    return () => unsubscribe();
  }, [auth, updateUserAvatar]);

  // Добавляем слушатель изменений в базе данных
  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.avatarURL && data.avatarURL.length <= 1024) {
            updateUserAvatar(data.avatarURL);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [user, updateUserAvatar]);

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
          updateUserAvatar(customEvent.detail.avatarURL);
        }
        localStorage.setItem('avatarURL', customEvent.detail.avatarURL);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [user, updateUserAvatar]);

  // Оптимизируем эффект для синхронизации аватара
  useEffect(() => {
    if (!user?.email) return;

    const emailPrefix = user.email.split('@')[0].toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/\s+/g, '-');
    
    const userRef = ref(database, `users/${emailPrefix}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.avatarURL && data.avatarURL !== user.photoURL) {
          // Используем setTimeout чтобы избежать множественных обновлений
          setTimeout(() => {
            updateUserAvatar(data.avatarURL).catch(console.error);
          }, 0);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.email, user?.photoURL, updateUserAvatar]);

  // Add notification listener
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const notificationsRef = ref(database, `users/${user.uid}/notifications`);
        
        // Set up listener for notifications
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
          if (snapshot.exists()) {
            const notificationsData = snapshot.val();
            const notificationsList = Object.keys(notificationsData).map(key => ({
              id: key,
              ...notificationsData[key],
              read: notificationsData[key].read || false
            }));
            
            // Sort by date, newest first
            notificationsList.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            setNotifications(notificationsList);
            
            // Count unread notifications
            const unread = notificationsList.filter(notification => !notification.read).length;
            setUnreadNotifications(unread);
          } else {
            setNotifications([]);
            setUnreadNotifications(0);
          }
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
  }, [user]);

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = ref(database, `users/${user.uid}/notifications/${notificationId}`);
      await update(notificationRef, { read: true });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark notification as read
    markNotificationAsRead(notification.id);
    
    // Hide notifications dropdown
    setShowNotifications(false);
    
    // Navigate to product and scroll to the review
    navigate(`/product/${notification.productId}#review-${notification.reviewId}`);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const updates: Record<string, boolean> = {};
      
      notifications.forEach(notification => {
        if (!notification.read) {
          updates[`users/${user.uid}/notifications/${notification.id}/read`] = true;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadNotifications(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Мемоизированный аватар с проверкой авторизации
  const userAvatar = useMemo(() => {
    // Показываем аватар только если пользователь авторизован
    if (!user) {
      return <User size={32} className="text-white" />;
    }
    const avatarUrl = user.photoURL || localStorage.getItem('avatarURL') || null;
    return <UserAvatar photoURL={avatarUrl} />;
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Очищаем все данные пользователя из localStorage
      localStorage.removeItem('userProfile');
      localStorage.removeItem('avatarURL');
      localStorage.removeItem('nickname');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      // Закрываем меню и переходим на главную
      setUserMenuOpen(false);
      navigate('/');
      alert('You have been signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFavoriteClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/favorites');
  };

  const handleCartClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
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

  // Add event listener to close cart dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cartOpen && 
        cartButtonRef.current && 
        cartDropdownRef.current && 
        !cartButtonRef.current.contains(event.target as Node) && 
        !cartDropdownRef.current.contains(event.target as Node)
      ) {
        setCartOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cartOpen]);

  // Add event listener to close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications && 
        notificationsButtonRef.current && 
        notificationsDropdownRef.current && 
        !notificationsButtonRef.current.contains(event.target as Node) && 
        !notificationsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  return (
    <header className="bg-[#003D2D] shadow-md relative">
      <div className="container py-2 sm:py-4">
        {/* Top row: Logo and buttons */}
        <div className="header-top-row">
          {/* Logo */}
          <a href="/" className="header-logo block transition-all duration-500 ease-in-out origin-center transform shrink-0 hover:scale-110">
            <img
              src={logo}
              alt="Logo"
              className="hidden w-auto h-6 sm:block sm:h-8 md:h-10"
            />
            <img
              src="/symbol.svg"
              alt="Logo"
              className="block w-auto h-8 sm:hidden"
            />
          </a>

          {/* Navbar buttons */}
          <div className="header-icons flex items-center gap-1 sm:gap-1">
            {/* Notifications bell */}
            {user && (
              <div className="relative">
                <button 
                  ref={notificationsButtonRef}
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="relative transition-all duration-500 ease-in-out btn btn-ghost btn-circle hover:scale-110"
                >
                  <Bell size={32} className="text-white" />
                  {unreadNotifications > 0 && (
                    <div className="absolute flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full -top-2 -right-2">
                      {unreadNotifications}
                    </div>
                  )}
                </button>
                
                {/* Notifications dropdown */}
                {showNotifications && (
                  <div 
                    ref={notificationsDropdownRef}
                    className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-xl w-80"
                  >
                    <div className="flex items-center justify-between p-3 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="text-xs text-[#003D2D] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="p-2 overflow-y-auto max-h-60">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!notification.read ? 'bg-[#edf7f5]' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`rounded-full p-2 ${!notification.read ? 'bg-[#d5eae6]' : 'bg-gray-100'}`}>
                                <MessageSquare size={16} className={!notification.read ? 'text-[#003D2D]' : 'text-gray-600'} />
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                                  {notification.text}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {new Date(notification.createdAt).toLocaleDateString()} 
                                  {' • '}
                                  {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-[#003D2D] rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Favorites button */}
            <button 
              onClick={handleFavoriteClick} 
              className={`btn btn-ghost btn-circle transition-all duration-500 ease-in-out hover:scale-110 ${!user ? 'opacity-50' : ''}`}
              title={!user ? 'Please login to use favorites' : 'Favorites'}
            >
              <Heart size={32} className="text-white" />
            </button>
            
            {/* Cart button with dropdown */}
            <div className="relative">
              <button 
                ref={cartButtonRef}
                onClick={toggleCartPreview} 
                className="relative transition-all duration-500 ease-in-out btn btn-ghost btn-circle hover:scale-110"
                title="Cart"
              >
                <ShoppingCart size={32} className="text-white" />
                {user && cartItemCount > 0 && (
                  <div className="absolute flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full -top-2 -right-2">
                    {cartItemCount}
                  </div>
                )}
              </button>
              
              {/* Cart preview dropdown */}
              {user && cartOpen && cartItemCount > 0 && (
                <div ref={cartDropdownRef} className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-xl w-80">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Your Cart ({cartItemCount} items)</h3>
                  </div>
                  <div className="p-2 overflow-y-auto max-h-60">
                    {getCartItems().map((item: any, index: number) => (
                      <div key={index} className="flex items-center p-2 border-b hover:bg-gray-100">
                        <img src={item.image} alt={item.name} className="object-contain w-12 h-12" />
                        <div className="flex-1 ml-2">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} × {item.price} NOK</p>
                        </div>
                      </div>
                    ))}
                    
                    {cartItemCount > 3 && (
                      <p className="mt-2 text-xs text-center text-gray-500">
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
                      className="w-full btn btn-neas-green btn-sm"
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
                className="transition-all duration-500 ease-in-out btn btn-ghost btn-circle hover:scale-110"
              >
                {userAvatar}
              </button>

              {/* User menu dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 z-20 w-64 mt-2 overflow-hidden transition-all duration-300 bg-white rounded-lg shadow-xl animate-fade-in-down">
                  {user ? (
                    <>
                      <div className="px-6 pt-4 pb-3 bg-gradient-to-r from-[#003d2d] to-[#95c672]">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || 'User'} 
                              className="object-cover w-12 h-12 border-2 border-white rounded-full shadow-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/avatar-placeholder.png';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 text-xl font-semibold text-white uppercase bg-gray-500 border-2 border-white rounded-full shadow-md">
                              {user.displayName ? user.displayName[0] : user.email?.[0] || '?'}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">
                              {user.displayName || 'User'}
                            </p>
                            <p className="text-xs truncate text-white/90">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        <a
                          href="/profile"
                          onClick={(e) => {
                            e.preventDefault();
                            setUserMenuOpen(false);
                            navigate('/profile');
                          }}
                          className="flex items-center px-6 py-3 text-sm transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full" style={{backgroundColor: 'rgba(149, 198, 114, 0.15)'}}>
                            <User size={16} className="text-[#95c672]" />
                          </div>
                          <span className="font-medium text-gray-700">Profile</span>
                        </a>
                        <button
                          onClick={async () => {
                            await handleSignOut();
                            setUserMenuOpen(false);
                            navigate('/');
                          }}
                          className="flex items-center w-full px-6 py-3 text-sm text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full bg-red-50">
                            <LogOut size={16} className="text-red-500" />
                          </div>
                          <span className="font-medium text-red-500">Sign Out</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-6 pt-4 pb-3 bg-gradient-to-r from-[#003d2d] to-[#95c672]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 text-xl font-semibold text-white bg-gray-500 border-2 border-white rounded-full shadow-md">
                            <User size={24} />
                          </div>
                          <p className="text-sm font-bold text-white">Guest User</p>
                        </div>
                      </div>
                      <div className="py-1">
                        <a
                          href="/login"
                          onClick={(e) => {
                            e.preventDefault();
                            setUserMenuOpen(false);
                            navigate('/login');
                          }}
                          className="flex items-center px-6 py-3 text-sm transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full" style={{backgroundColor: 'rgba(149, 198, 114, 0.15)'}}>
                            <LogIn size={16} className="text-[#95c672]" />
                          </div>
                          <span className="font-medium text-gray-700">Sign In</span>
                        </a>
                        <a
                          href="/register"
                          onClick={(e) => {
                            e.preventDefault();
                            setUserMenuOpen(false);
                            navigate('/register');
                          }}
                          className="flex items-center px-6 py-3 text-sm transition-colors hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-full" style={{backgroundColor: 'rgba(149, 198, 114, 0.15)'}}>
                            <User size={16} className="text-[#95c672]" />
                          </div>
                          <span className="font-medium text-gray-700">Register</span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="header-search-container">
          <form onSubmit={handleSearch} className="relative flex items-center w-full">
            <Search className="absolute text-gray-500 transform -translate-y-1/2 left-3 top-1/2" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for anything..."
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
              className="w-full px-10 py-2 text-black bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          {showResults && searchResults.length > 0 && (
            <div 
              ref={searchResultsRef}
              className="absolute left-0 right-0 z-20 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg search-results-dropdown"
            >
              {searchResults.map((result) => (
                <div key={result.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/product/${result.id}`)}>
                  <img src={result.image} alt={result.name} className="inline-block w-8 h-8 mr-2" />
                  <span>{result.name}</span>
                </div>
              ))}
            </div>
          )}
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