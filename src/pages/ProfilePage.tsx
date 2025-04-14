import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile } from 'firebase/auth';
import { getDatabase, ref, get, onValue, update } from 'firebase/database';
import { FaPencilAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import OrderDetailsComponent from '../components/OrderDetailsComponent';
import AvatarEditor from '../components/AvatarEditor';
import { isAdmin } from '../utils/constants';
import AdminPanel from '../components/AdminPanel';
import { defaultAvatarSVG, handleAvatarError } from '../utils/AvatarHelper';
import { useAuth } from '../utils/AuthProvider';
import { getTheme } from '../utils/themeUtils';

const ProfilePage: React.FC = () => {
  // Add current theme state
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const auth = getAuth();
  const user = auth.currentUser;
  const [nickname, setNickname] = useState(user?.displayName || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarURL, setAvatarURL] = useState(user?.photoURL || defaultAvatarSVG);
  const [isEditing, setIsEditing] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('favorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });
  const [userId, setUserId] = useState(user?.uid || '');
  const [previewAvatar, setPreviewAvatar] = useState(user?.photoURL || defaultAvatarSVG);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [customUserId, setCustomUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const database = getDatabase();
  const { updateUserAvatar } = useAuth();

  useEffect(() => {
    if (user) {
      setNickname(user.displayName || '');
      setAvatarURL(user.photoURL || defaultAvatarSVG);
      setUserId(user.uid);
      fetchUserProfile();
      fetchOrderHistory();
    } else {
      const savedNickname = localStorage.getItem('nickname');
      const savedFirstName = localStorage.getItem('firstName');
      const savedLastName = localStorage.getItem('lastName');
      const savedPhoneNumber = localStorage.getItem('phoneNumber');
      const savedAvatarURL = localStorage.getItem('avatarURL');
      const savedFavorites = localStorage.getItem('favorites');
      const savedUserId = localStorage.getItem('userId');
      const savedCart = localStorage.getItem('cart');
      if (savedNickname) setNickname(savedNickname);
      if (savedFirstName) setFirstName(savedFirstName);
      if (savedLastName) setLastName(savedLastName);
      if (savedPhoneNumber) setPhoneNumber(savedPhoneNumber);
      if (savedAvatarURL) setAvatarURL(savedAvatarURL);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedUserId) setUserId(savedUserId);
      if (savedCart) setCart(JSON.parse(savedCart));
    }
  }, [user]);

  useEffect(() => {
    if (userId) {
      fetchOrderHistory();
    }
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('nickname', nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem('firstName', firstName);
  }, [firstName]);

  useEffect(() => {
    localStorage.setItem('lastName', lastName);
  }, [lastName]);

  useEffect(() => {
    localStorage.setItem('phoneNumber', phoneNumber);
  }, [phoneNumber]);

  useEffect(() => {
    localStorage.setItem('avatarURL', avatarURL);
  }, [avatarURL]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, user]);

  const fetchUserProfile = async () => {
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');
      
      const db = getDatabase();
      const userRef = ref(db, `users/${emailPrefix}`);
      
      try {
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setNickname(data.nickname || '');
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setPhoneNumber(data.phoneNumber || '');
          setCustomUserId(emailPrefix);
          setAvatarURL(data.avatarURL || defaultAvatarSVG);
          setPreviewAvatar(data.avatarURL || defaultAvatarSVG);
          
          if (data.cart) {
            setCart(data.cart);
            localStorage.setItem('cart', JSON.stringify(data.cart));
          }

          localStorage.setItem('userProfile', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      const userData = JSON.parse(savedProfile);
      setCustomUserId(userData.customUserId || '');
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');
      
      const cartRef = ref(database, `users/${emailPrefix}/cart`);
      
      const unsubscribe = onValue(cartRef, (snapshot) => {
        if (snapshot.exists()) {
          const cartData = snapshot.val();
          setCart(cartData);
          localStorage.setItem('cart', JSON.stringify(cartData));
        }
      });

      return () => unsubscribe();
    }
  }, [user, database]);

  const fetchOrderHistory = async () => {
    if (userId) {
      const ordersRef = ref(database, `orders/${userId}`);
      try {
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          const ordersArray = Object.values(ordersData).sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setOrderHistory(ordersArray);
        } else {
          setOrderHistory([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrderHistory([]);
      }
    } else {
      const anonymousOrders = JSON.parse(localStorage.getItem('anonymousOrders') || '[]');
      if (anonymousOrders.length > 0) {
        setOrderHistory(anonymousOrders);
      } else {
        setOrderHistory([]);
      }
    }
  };

  const checkNicknameAvailability = async (newNickname: string): Promise<boolean> => {
    if (newNickname === nickname) return true;
    
    const db = getDatabase();
    const nicknameRef = ref(db, `nicknames/${newNickname.toLowerCase()}`);
    const snapshot = await get(nicknameRef);
    return !snapshot.exists();
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      const isNicknameAvailable = await checkNicknameAvailability(nickname);
      if (!isNicknameAvailable) {
        throw new Error('This nickname is already taken');
      }

      const emailPrefix = user.email?.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');

      if (!emailPrefix) throw new Error('Invalid email');

      const db = getDatabase();
      const userRef = ref(db, `users/${emailPrefix}`);

      // Обновляем профиль с проверкой длины URL аватара
      const updatedUserData = {
        nickname,
        firstName,
        lastName,
        phoneNumber,
        avatarURL: previewAvatar,
        lastUpdated: new Date().toISOString(),
      };

      // Обновляем Firebase Auth профиль только если URL не слишком длинный
      if (previewAvatar.length <= 1024) {
        await updateProfile(user, {
          displayName: nickname,
          photoURL: previewAvatar
        });
      } else {
        console.warn('Avatar URL too long for Auth profile, updating only in database');
      }

      // Обновляем базу данных в любом случае
      await update(userRef, updatedUserData);

      const currentData = JSON.parse(localStorage.getItem('userProfile') || '{}');
      localStorage.setItem('userProfile', JSON.stringify({
        ...currentData,
        ...updatedUserData
      }));

      alert('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    setShowAvatarEditor(true);
  };

  const handleAvatarEditorCancel = () => {
    setShowAvatarEditor(false);
  };

  const handleAvatarEditorSave = async (imageData: string) => {
    try {
      setIsUploading(true);
      
      if (!user?.uid) {
        throw new Error('No user ID found');
      }

      const userRef = ref(database, `users/${user.uid}`);
      
      await update(userRef, {
        avatarURL: imageData,
        lastUpdated: new Date().toISOString()
      });

      await updateUserAvatar(imageData);

      setPreviewAvatar(imageData);
      setAvatarURL(imageData);

      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { avatarURL: imageData }
      }));
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    } finally {
      setIsUploading(false);
      setShowAvatarEditor(false);
    }
  };

  useEffect(() => {
    const syncAvatar = () => {
      if (user?.photoURL) {
        setPreviewAvatar(user.photoURL);
        setAvatarURL(user.photoURL);
      } else {
        const savedAvatarURL = localStorage.getItem('avatarURL');
        if (savedAvatarURL) {
          setPreviewAvatar(savedAvatarURL);
          setAvatarURL(savedAvatarURL);
        } else {
          setPreviewAvatar(defaultAvatarSVG);
          setAvatarURL(defaultAvatarSVG);
        }
      }
    };

    syncAvatar();
    
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.avatarURL) {
        setPreviewAvatar(customEvent.detail.avatarURL);
        setAvatarURL(customEvent.detail.avatarURL);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('storage', syncAvatar);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('storage', syncAvatar);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCustomUserId(data.customUserId || '');
          if (data.avatarURL) {
            setPreviewAvatar(data.avatarURL);
            setAvatarURL(data.avatarURL);
            localStorage.setItem('avatarURL', data.avatarURL);
          }
          
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    if (expandedOrderId !== orderId) {
      const order = orderHistory.find((o: any) => o.id === orderId);
      if (order && (!order.items || !Array.isArray(order.items))) {
        console.error('Order is missing items array:', order);
      }
    }
  };

  return (
    <div className="container py-8 mx-auto">
      <h1 className={`mb-8 text-3xl font-bold ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>My Profile</h1>
      
      {/* Profile Card */}
      <div className={`p-6 mb-8 rounded-xl shadow-md ${currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'}`}>
        <div className="flex flex-col items-center md:flex-row md:items-start">
          {/* Avatar Section */}
          <div className="relative mb-6 md:mb-0 md:mr-8">
            <div className="avatar">
              <div className="w-32 h-32 overflow-hidden rounded-full ring ring-[#003D2D] ring-offset-2">
                {isUploading ? (
                  <div className={`flex items-center justify-center w-full h-full ${currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : (
                  <img
                    src={previewAvatar}
                    alt="Avatar"
                    className="object-cover w-full h-full transition-all duration-200 cursor-pointer hover:opacity-80"
                    onClick={handleAvatarClick}
                    onError={(e) => handleAvatarError(e)}
                  />
                )}
              </div>
            </div>
            <button 
              onClick={handleAvatarClick}
              className="absolute bottom-0 right-0 p-2 text-white transition-colors rounded-full shadow-lg bg-[#003D2D] hover:bg-[#004D3D]"
            >
              <FaPencilAlt className="w-4 h-4" />
            </button>
          </div>

          {/* User Info Section */}
          <div className="flex-grow">
            <div className="flex flex-col items-center mb-6 md:items-start">
              <h2 className={`mb-2 text-2xl font-bold ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {nickname || `${firstName} ${lastName}`.trim() || 'User'}
              </h2>
              <p className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>ID: {customUserId}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Form Fields */}
              <div className="space-y-4">
                <div className="relative">
                  <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nickname
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 transition-colors border rounded-lg outline-none 
                        ${currentTheme === 'dark' 
                          ? 'bg-gray-700 text-gray-200 border-gray-600 disabled:bg-gray-800' 
                          : 'disabled:bg-gray-50 focus:border-[#003D2D]'}`}
                    />
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="absolute right-2 top-2 text-[#003D2D] hover:text-[#004D3D]"
                      >
                        <FaPencilAlt className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 transition-colors border rounded-lg outline-none 
                      ${currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600 disabled:bg-gray-800' 
                        : 'disabled:bg-gray-50 focus:border-[#003D2D]'}`}
                  />
                </div>

                <div>
                  <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 transition-colors border rounded-lg outline-none 
                      ${currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600 disabled:bg-gray-800' 
                        : 'disabled:bg-gray-50 focus:border-[#003D2D]'}`}
                  />
                </div>

                <div>
                  <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 transition-colors border rounded-lg outline-none 
                      ${currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600 disabled:bg-gray-800' 
                        : 'disabled:bg-gray-50 focus:border-[#003D2D]'}`}
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className={`px-6 py-2 rounded-lg 
                    ${currentTheme === 'dark'
                      ? 'text-gray-300 border border-gray-500 hover:bg-gray-700'
                      : 'text-[#003D2D] border border-[#003D2D] hover:bg-gray-50'}`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className={`px-6 py-2 text-white rounded-lg 
                    ${currentTheme === 'dark'
                      ? 'bg-[#95c672] hover:bg-[#7fb356]'
                      : 'bg-[#003D2D] hover:bg-[#004D3D]'}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Panel Section */}
      {user && isAdmin(user.email) && (
        <div className={`p-6 mb-8 rounded-xl shadow-md ${currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'}`}>
          <h2 className={`mb-4 text-2xl font-bold ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Admin Panel</h2>
          <AdminPanel />
        </div>
      )}

      {/* Order History Section */}
      <div className={`p-6 rounded-xl shadow-md ${currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'}`}>
        <h2 className={`mb-6 text-2xl font-bold ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Order History</h2>
        {orderHistory.length > 0 ? (
          <div className="space-y-4">
            {orderHistory.map((order, index) => (
              <div key={order.id || index} className={`overflow-hidden border rounded-lg ${currentTheme === 'dark' ? 'border-gray-700' : ''}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer 
                    ${currentTheme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div>
                    <p className="font-semibold">Order #{order.orderNumber || `${index + 1}`}</p>
                    <p className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(order.date).toLocaleDateString()} • 
                      {order.items?.length || 0} items • 
                      Total: {order.total?.toFixed(2) || 0} NOK
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      order.status === 'completed' 
                        ? currentTheme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                        : order.status === 'processing' 
                        ? currentTheme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                        : currentTheme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status || 'N/A'}
                    </span>
                    {expandedOrderId === order.id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {expandedOrderId === order.id && (
                  <div className={`p-4 ${currentTheme === 'dark' ? 'border-t border-gray-700' : 'border-t'}`}>
                    <OrderDetailsComponent order={order} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-center ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No order history available.</p>
        )}
      </div>

      {/* Avatar Editor Modal */}
      {showAvatarEditor && user && (
        <AvatarEditor
          initialImage={avatarURL}
          onSave={handleAvatarEditorSave}
          onCancel={handleAvatarEditorCancel}
        />
      )}
    </div>
  );
};

export default ProfilePage;