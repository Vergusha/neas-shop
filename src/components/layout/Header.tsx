import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.svg';
import { getDatabase, ref, get, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../firebaseConfig';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../utils/AuthProvider';
import Toast from '../ui/Toast';

// Импортируем наши новые компоненты
import SearchBar from '../ui/SearchBar';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationsButton from '../user/NotificationsButton';
import FavoritesButton from '../user/FavoritesButton';
import CartButton from '../user/CartButton';
import UserMenu from '../user/UserMenu';

const Header: React.FC = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [notificationItem, setNotificationItem] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'synthwave'>('light');
  
  const auth = getAuth();
  const { user, updateUserAvatar } = useAuth();

  // Add a ref to track if avatar refresh has already been attempted
  const avatarRefreshAttempted = React.useRef<{[key: string]: boolean}>({});

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

  // Modify the refreshUserAvatar function to prevent repeated refreshes
  const refreshUserAvatar = async () => {
    if (!user) return;
    
    const uid = user.uid;
    // Only attempt refresh once per user session
    if (avatarRefreshAttempted.current[uid]) {
      return;
    }
    
    avatarRefreshAttempted.current[uid] = true;
    
    try {
      // Get the latest avatar URL from Firebase
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.avatarURL && (!user.photoURL || userData.avatarURL !== user.photoURL)) {
          // Update state with the latest avatar (use a small local cache to prevent immediate repeats)
          localStorage.setItem('lastAvatarRefresh', userData.avatarURL);
          
          try {
            await updateUserAvatar(userData.avatarURL);
            console.log('Avatar refreshed from Firebase:', userData.avatarURL.substring(0, 50) + '...');
          } catch (error) {
            // If updateUserAvatar throws, we still want to update localStorage
            localStorage.setItem('avatarURL', userData.avatarURL);
            console.warn('Could not update avatar via Auth provider, but set in localStorage');
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing avatar:', error);
    }
  };

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

  // Optimize the effect for syncing avatar to prevent frequent refreshes
  useEffect(() => {
    if (!user?.email) return;
    
    // Use this effect only on initial authentication
    refreshUserAvatar().catch(console.error);
    
    // Don't need the onValue listener here as it may cause repeated updates
    // The avatar will be refreshed when user logs in 
    
  }, [user?.uid]); // Only depend on user ID, not email or photoURL

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

  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'synthwave' || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Theme toggle handler
  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Also add/remove dark class for additional styling if needed
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    
    // Add event to notify app that theme has changed
    window.dispatchEvent(new Event('themeChanged'));
  };

  return (
    <header className={`shadow-md relative ${
      currentTheme === 'dark' ? 'bg-[#95c672] dark-header' : 'bg-[#003D2D]'
    }`}>
      <div className="container px-4 py-2 mx-auto sm:py-4">
        {/* Top row: Logo, Search, and buttons */}
        <div className="flex flex-wrap items-center justify-between md:flex-nowrap">
          {/* Logo */}
          <a href="/" className="block mb-2 transition-all duration-500 ease-in-out origin-center transform header-logo shrink-0 hover:scale-110 md:mb-0">
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

          {/* Desktop Search bar - используем компонент SearchBar */}
          <SearchBar currentTheme={currentTheme} isMobile={false} />

          {/* Navbar buttons */}
          <div className="flex items-center order-2 gap-1 md:order-3 header-icons sm:gap-2 md:ml-2">
            {/* Theme toggle button - используем компонент ThemeToggle */}
            <ThemeToggle currentTheme={currentTheme} onToggle={handleThemeToggle} />
            
            {/* Notifications bell - используем компонент NotificationsButton */}
            <NotificationsButton 
              user={user} 
              notifications={notifications} 
              unreadCount={unreadNotifications} 
              currentTheme={currentTheme} 
            />
            
            {/* Favorites button - используем компонент FavoritesButton */}
            <FavoritesButton user={user} currentTheme={currentTheme} />
            
            {/* Cart button - используем компонент CartButton */}
            <CartButton user={user} cartItemCount={cartItemCount} currentTheme={currentTheme} />
            
            {/* User menu - используем компонент UserMenu */}
            <UserMenu user={user} currentTheme={currentTheme} />
          </div>
        </div>

        {/* Mobile Search bar - visible only on small screens */}
        <SearchBar currentTheme={currentTheme} isMobile={true} />
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