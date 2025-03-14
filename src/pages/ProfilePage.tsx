import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile } from 'firebase/auth';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { FaPencilAlt, FaHeart, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import OrderDetailsComponent from '../components/OrderDetailsComponent';
import AvatarEditor from '../components/AvatarEditor'; // Импортируем новый компонент
import { createCustomUserId } from '../utils/generateUserId';
import { isAdmin } from '../utils/constants';
import AdminPanel from '../components/AdminPanel';

const defaultAvatarSVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBkMCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTUwIDUwYy0xNSAwLTMwIDE1LTMwIDMwczE1IDMwIDMwIDMwIDMwLTE1IDMwLTMwUzY1IDUwIDUwIDUwem0wIDUwYy0xMCAwLTE4IDgtMTggMThzOCAxOCAxOCAxOGMxMC4xIDAgMTgtOCAxOC0xOHMtOC0xOC0xOC0xOHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';

const ProfilePage: React.FC = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [nickname, setNickname] = useState(user?.displayName || '');
  const [realName, setRealName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
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
      const savedRealName = localStorage.getItem('realName');
      const savedPhoneNumber = localStorage.getItem('phoneNumber');
      const savedAvatarURL = localStorage.getItem('avatarURL');
      const savedFavorites = localStorage.getItem('favorites');
      const savedUserId = localStorage.getItem('userId');
      if (savedNickname) setNickname(savedNickname);
      if (savedRealName) setRealName(savedRealName);
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
    localStorage.setItem('realName', realName);
  }, [realName]);

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
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      try {
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('User profile data:', data);
          
          // If customUserId is missing, create it
          if (!data.customUserId) {
            data.customUserId = createCustomUserId(user.email || '');
            // Save the new customUserId
            await set(userRef, {
              ...data,
              customUserId: data.customUserId
            });
          }
          
          // Update all user data at once
          const userData = {
            realName: data.realName || '',
            phoneNumber: data.phoneNumber || '',
            nickname: data.nickname || '',
            avatarURL: data.avatarURL || defaultAvatarSVG,
            customUserId: data.customUserId
          };

          // Update all states
          setRealName(userData.realName);
          setPhoneNumber(userData.phoneNumber);
          setNickname(userData.nickname);
          setCustomUserId(userData.customUserId);

          if (userData.avatarURL) {
            setAvatarURL(userData.avatarURL);
            setPreviewAvatar(userData.avatarURL);
            // Обновляем photoURL в Firebase Auth
            await updateProfile(user, {
              photoURL: userData.avatarURL
            });
          }
          
          // Save complete user data to localStorage
          localStorage.setItem('userProfile', JSON.stringify(userData));
        } else {
          // If no user data exists, create it
          const userData = {
            email: user.email,
            customUserId: createCustomUserId(user.email || ''),
            createdAt: new Date().toISOString()
          };
          await set(userRef, userData);
          setCustomUserId(userData.customUserId);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        
        // Try to restore from localStorage if fetch fails
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          const userData = JSON.parse(savedProfile);
          setRealName(userData.realName || '');
          setPhoneNumber(userData.phoneNumber || '');
          setNickname(userData.nickname || '');
          setCustomUserId(userData.customUserId || '');
          setAvatarURL(userData.avatarURL || defaultAvatarSVG);
          setPreviewAvatar(userData.avatarURL || defaultAvatarSVG);
        }
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

  const handleUpdateProfile = async () => {
    if (user) {
      try {
        let avatarBase64 = avatarURL;
        if (avatar) {
          setIsUploading(true);
          avatarBase64 = await convertToBase64(avatar);
        }

        // Get existing user data first
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        const existingData = snapshot.exists() ? snapshot.val() : {};

        // Create updated user data object
        const updatedUserData = {
          ...existingData, // Keep existing data
          realName,
          phoneNumber,
          avatarURL: avatarBase64,
          nickname,
          lastUpdated: new Date().toISOString(),
          customUserId: existingData.customUserId || createCustomUserId(user.email || ''), // Keep existing ID or create new if missing
        };

        // Update Firebase Auth profile
        await updateProfile(user, {
          displayName: nickname,
          photoURL: avatarBase64,
        });

        // Update Realtime Database
        await set(userRef, updatedUserData);

        // Update local state
        setAvatarURL(avatarBase64);
        setCustomUserId(updatedUserData.customUserId);

        alert('Profile updated successfully');
        setIsEditing(false);
        setIsUploading(false);

        // Update localStorage
        localStorage.setItem('userProfile', JSON.stringify(updatedUserData));
      } catch (error) {
        console.error('Error updating profile:', error);
        setIsUploading(false);
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
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
      
      if (user) {
        // Get existing user data
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        const existingData = snapshot.exists() ? snapshot.val() : {};

        // Create updated user data object
        const userData = {
          ...existingData, // Keep existing data
          realName,
          phoneNumber,
          nickname,
          avatarURL: imageData,
          lastUpdated: new Date().toISOString(),
        };

        // Save to Realtime Database
        await set(userRef, userData);

        // Update Firebase Auth profile
        await updateProfile(user, {
          photoURL: imageData,
          displayName: nickname
        });

        // Update local state
        setPreviewAvatar(imageData);
        setAvatarURL(imageData);
        
        // Save to localStorage
        localStorage.setItem('avatarURL', imageData);
        localStorage.setItem('userProfile', JSON.stringify(userData));
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
          detail: { avatarURL: imageData, userData } 
        }));

        console.log('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
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
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = defaultAvatarSVG;
                    }}
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
            <h2 className="text-xl font-bold">{nickname || realName}</h2>
            <p className="text-sm text-gray-500">ID: {customUserId}</p>
            <FaHeart
              className="w-5 h-5 ml-2 cursor-pointer"
              fill={favorites.includes('product-id') ? 'red' : 'none'}
              stroke="red"
              onClick={() => handleFavoriteClick('product-id')}
            />
          </div>
        </div>
        
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
          <label htmlFor="realName" className="block text-gray-700 w-1/3">Real Name</label>
          <input
            type="text"
            id="realName"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            className="w-2/3 input input-bordered"
            disabled={!isEditing}
          />
          <FaPencilAlt
            className="w-5 h-5 ml-2 cursor-pointer"
            onClick={() => setIsEditing(true)}
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
          <FaPencilAlt
            className="w-5 h-5 ml-2 cursor-pointer"
            onClick={() => setIsEditing(true)}
          />
        </div>
        
        {isEditing && (
          <button onClick={handleUpdateProfile} className="btn btn-primary w-full">Save Changes</button>
        )}
      </div>
      
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
      
      {/* Admin Panel */}
      {user && isAdmin(user.email) && (
        <div className="mt-8">
          <AdminPanel />
        </div>
      )}
      
      {/* Компонент AvatarEditor */}
      {showAvatarEditor && (
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