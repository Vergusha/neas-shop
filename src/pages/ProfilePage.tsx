import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile } from 'firebase/auth';
import { getDatabase, ref, get, set, onValue, update } from 'firebase/database';
import { FaPencilAlt, FaHeart, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import OrderDetailsComponent from '../components/OrderDetailsComponent';
import AvatarEditor from '../components/AvatarEditor';
import { isAdmin } from '../utils/constants';
import AdminPanel from '../components/AdminPanel';
import { defaultAvatarSVG, handleAvatarError } from '../utils/AvatarHelper';
import { useAuth } from '../utils/AuthProvider';

const ProfilePage: React.FC = () => {
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
  const [showAvatarEditor, setShowAvatarEditor] = useState(false); // Новое состояние для отображения редактора
  const [customUserId, setCustomUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Firebase Realtime Database
  const database = getDatabase();
  const { updateUserAvatar } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('User is logged in:', user);
      setNickname(user.displayName || '');
      setAvatarURL(user.photoURL || defaultAvatarSVG);
      setUserId(user.uid);
      fetchUserProfile();
      fetchOrderHistory();
    } else {
      console.log('No user logged in, restoring from localStorage');
      // Restore data from localStorage if user is not available
      const savedNickname = localStorage.getItem('nickname');
      const savedFirstName = localStorage.getItem('firstName'); // Changed from realName
      const savedLastName = localStorage.getItem('lastName'); // Added lastName
      const savedPhoneNumber = localStorage.getItem('phoneNumber');
      const savedAvatarURL = localStorage.getItem('avatarURL');
      const savedFavorites = localStorage.getItem('favorites');
      const savedUserId = localStorage.getItem('userId');
      if (savedNickname) setNickname(savedNickname);
      if (savedFirstName) setFirstName(savedFirstName); // Update firstName
      if (savedLastName) setLastName(savedLastName); // Update lastName
      if (savedPhoneNumber) setPhoneNumber(savedPhoneNumber);
      if (savedAvatarURL) setAvatarURL(savedAvatarURL);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedUserId) setUserId(savedUserId);
    }
  }, [user]);

  // Separate useEffect for fetching order history even when user info is loaded from localStorage
  useEffect(() => {
    // If userId is available (either from user object or localStorage), fetch order history
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
          setCustomUserId(emailPrefix); // Используем emailPrefix как ID
          setAvatarURL(data.avatarURL || defaultAvatarSVG);
          setPreviewAvatar(data.avatarURL || defaultAvatarSVG);

          // Обновляем локальное хранилище
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  // Add new useEffect for localStorage sync
  useEffect(() => {
    // Try to restore from localStorage on mount
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      const userData = JSON.parse(savedProfile);
      setCustomUserId(userData.customUserId || '');
      // ...other state updates if needed
    }
  }, []);

  const fetchOrderHistory = async () => {
    console.log("Fetching order history for userId:", userId);
    
    if (userId) {
      const ordersRef = ref(database, `orders/${userId}`);
      try {
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          // Convert the object to an array and sort by date (newest first)
          const ordersArray = Object.values(ordersData).sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          console.log('Order history data:', ordersArray);
          setOrderHistory(ordersArray);
        } else {
          console.log('No order history data found for user ID:', userId);
          setOrderHistory([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrderHistory([]);
      }
    } else {
      // For non-logged-in users, try to get anonymous orders
      console.log("No userId available, checking for anonymous orders");
      const anonymousOrders = JSON.parse(localStorage.getItem('anonymousOrders') || '[]');
      if (anonymousOrders.length > 0) {
        console.log("Found anonymous orders:", anonymousOrders);
        setOrderHistory(anonymousOrders);
      } else {
        console.log("No anonymous orders found");
        setOrderHistory([]);
      }
    }
  };

  const checkNicknameAvailability = async (newNickname: string): Promise<boolean> => {
    if (newNickname === nickname) return true; // Если никнейм не изменился
    
    const db = getDatabase();
    const nicknameRef = ref(db, `nicknames/${newNickname.toLowerCase()}`);
    const snapshot = await get(nicknameRef);
    return !snapshot.exists();
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Проверяем доступность никнейма
      const isNicknameAvailable = await checkNicknameAvailability(nickname);
      if (!isNicknameAvailable) {
        throw new Error('This nickname is already taken');
      }

      // Получаем emailPrefix для ID пользователя
      const emailPrefix = user.email?.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/\s+/g, '-');

      if (!emailPrefix) throw new Error('Invalid email');

      const db = getDatabase();
      const userRef = ref(db, `users/${emailPrefix}`);
      
      // Если никнейм изменился, обновляем nicknames
      if (nickname !== user.displayName) {
        // Удаляем старый никнейм
        if (user.displayName) {
          await set(ref(db, `nicknames/${user.displayName.toLowerCase()}`), null);
        }
        // Добавляем новый никнейм
        await set(ref(db, `nicknames/${nickname.toLowerCase()}`), user.uid);
      }

      // Обновляем данные пользователя
      const updatedUserData = {
        nickname,
        firstName,
        lastName,
        phoneNumber,
        avatarURL: previewAvatar,
        lastUpdated: new Date().toISOString(),
      };

      // Обновляем Firebase Auth профиль
      await updateProfile(user, {
        displayName: nickname,
        photoURL: previewAvatar
      });

      // Обновляем данные в базе
      await update(userRef, updatedUserData);

      // Обновляем локальное хранилище
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

      // Используем uid пользователя вместо email prefix
      const userRef = ref(database, `users/${user.uid}`);
      
      // Сначала обновляем базу данных
      await update(userRef, {
        avatarURL: imageData,
        lastUpdated: new Date().toISOString()
      });

      // Затем обновляем через AuthProvider
      await updateUserAvatar(imageData);

      // Обновляем локальное состояние
      setPreviewAvatar(imageData);
      setAvatarURL(imageData);

      // Диспатчим событие обновления аватара
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { avatarURL: imageData }
      }));

      console.log('Avatar updated successfully');
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    } finally {
      setIsUploading(false);
      setShowAvatarEditor(false);
    }
  };

  // Обновляем useEffect для синхронизации аватара
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

  // Добавляем слушатель изменений в базе данных
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
          
          // Update localStorage with new data
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleFavoriteClick = (productId: string) => {
    let updatedFavorites;
    if (favorites.includes(productId)) {
      updatedFavorites = favorites.filter(id => id !== productId);
    } else {
      updatedFavorites = [...favorites, productId];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    // Add debug logging when toggling order
    if (expandedOrderId !== orderId) {
      const order = orderHistory.find((o: any) => o.id === orderId);
      console.log('Toggling order details for:', orderId);
      console.log('Order data:', order);
      
      // Check if order has required properties
      if (order && (!order.items || !Array.isArray(order.items))) {
        console.error('Order is missing items array:', order);
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      
      {/* Profile section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <div className="relative">
            <div className="avatar">
              <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden bg-neutral-content">
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : (
                  <img
                    src={previewAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={handleAvatarClick}
                    onError={(e) => handleAvatarError(e)}
                  />
                )}
              </div>
            </div>
            <button 
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary-focus transition-colors"
              onClick={handleAvatarClick}
            >
              <FaPencilAlt className="w-4 h-4" />
            </button>
          </div>
          
          <div className="ml-4">
            <h2 className="text-xl font-bold">{nickname || `${firstName} ${lastName}`.trim()}</h2>
            <p className="text-sm text-gray-500">ID: {customUserId}</p>
            <FaHeart
              className="w-5 h-5 ml-2 cursor-pointer"
              fill={favorites.includes('product-id') ? 'red' : 'none'}
              stroke="red"
              onClick={() => handleFavoriteClick('product-id')}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4 flex items-center">
            <label htmlFor="nickname" className="block text-gray-700 w-1/3">Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-2/3 input input-bordered"
              disabled={!isEditing}
            />
            <FaPencilAlt
              className="w-5 h-5 ml-2 cursor-pointer"
              onClick={() => setIsEditing(true)}
            />
          </div>

          <div className="mb-4 flex items-center">
            <label htmlFor="firstName" className="block text-gray-700 w-1/3">First Name</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-2/3 input input-bordered"
              disabled={!isEditing}
            />
          </div>

          <div className="mb-4 flex items-center">
            <label htmlFor="lastName" className="block text-gray-700 w-1/3">Last Name</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-2/3 input input-bordered"
              disabled={!isEditing}
            />
          </div>

          <div className="mb-4 flex items-center">
            <label htmlFor="phoneNumber" className="block text-gray-700 w-1/3">Phone Number</label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-2/3 input input-bordered"
              disabled={!isEditing}
            />
          </div>
        </div>

        {isEditing && (
          <button 
            onClick={handleUpdateProfile} 
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="loading loading-spinner"></span> : 'Save Changes'}
          </button>
        )}
      </div>
      
      {/* Admin Panel - now before order history */}
      {user && isAdmin(user.email) && (
        <div className="mt-8 mb-8">
          <AdminPanel />
        </div>
      )}
      
      {/* Order History - now after admin panel */}
      <div className="bg-white p-4 rounded-lg shadow-md mt-8">
        <h2 className="text-xl font-bold mb-4">Order History</h2>
        {orderHistory.length > 0 ? (
          <ul className="space-y-4">
            {orderHistory.map((order, index) => (
              <li key={order.id || index} className="border rounded-lg overflow-hidden">
                {/* Order summary row (always visible) */}
                <div 
                  className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div>
                    <p className="font-semibold">Order #{order.orderNumber || `${index + 1}`}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.date).toLocaleDateString()} | 
                      {order.items?.length || 0} items | 
                      Total: {order.total?.toFixed(2) || 0} NOK
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-2 px-2 py-1 rounded-full text-xs ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status || 'N/A'}
                    </span>
                    {expandedOrderId === order.id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>
                
                {/* Expanded order details */}
                {expandedOrderId === order.id && (
                  <div className="border-t p-4">
                    {/* Add a try-catch wrapper to catch render errors */}
                    {(() => {
                      try {
                        return <OrderDetailsComponent order={order} />;
                      } catch (error) {
                        console.error('Error rendering order details:', error);
                        return (
                          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <p>Error displaying order details. Please try again later.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No order history available.</p>
        )}
      </div>
      
      {/* Компонент AvatarEditor */}
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