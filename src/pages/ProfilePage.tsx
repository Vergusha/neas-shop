import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebaseConfig';
import { FaPencilAlt, FaHeart } from 'react-icons/fa';

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
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('User profile data:', data);
        setRealName(data.realName || '');
        setPhoneNumber(data.phoneNumber || '');
        setAvatarURL(data.avatarURL || defaultAvatarSVG);
        setNickname(data.nickname || ''); // Ensure nickname is set from database
      } else {
        console.log('No user profile data found');
      }
    }
  };

  const fetchOrderHistory = async () => {
    if (user) {
      const ordersRef = ref(database, `orders/${user.uid}`);
      const snapshot = await get(ordersRef);
      if (snapshot.exists()) {
        console.log('Order history data:', snapshot.val());
        setOrderHistory(Object.values(snapshot.val()));
      } else {
        console.log('No order history data found');
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (user) {
      try {
        let avatarBase64 = avatarURL;
        if (avatar) {
          avatarBase64 = await convertToBase64(avatar);
        }
        await updateProfile(user, {
          displayName: nickname,
          photoURL: avatarBase64,
        });
        await set(ref(database, `users/${user.uid}`), {
          realName,
          phoneNumber,
          avatarURL: avatarBase64,
          nickname, // Ensure nickname is stored in the database
        });
        setAvatarURL(avatarBase64);
        alert('Profile updated successfully');
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
    // Save data to localStorage
    localStorage.setItem('nickname', nickname);
    localStorage.setItem('realName', realName);
    localStorage.setItem('phoneNumber', phoneNumber);
    localStorage.setItem('avatarURL', avatarURL);
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
    document.getElementById('avatarInput')?.click();
  };

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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <div className="relative">
            <div className="avatar">
              <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img
                  src={avatarURL}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full cursor-pointer object-cover"
                  onClick={handleAvatarClick}
                />
              </div>
            </div>
            <input
              type="file"
              id="avatarInput"
              style={{ display: 'none' }}
              onChange={(e) => setAvatar(e.target.files ? e.target.files[0] : null)}
            />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold">{nickname || realName}</h2>
            <p>User ID: {userId}</p>
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
          <ul>
            {orderHistory.map((order, index) => (
              <li key={order.id || index} className="mb-2">
                <div className="p-4 border rounded-lg">
                  <p><strong>Order ID:</strong> {order.id}</p>
                  <p><strong>Date:</strong> {order.date}</p>
                  <p><strong>Total:</strong> {order.total} NOK</p>
                  <p><strong>Status:</strong> {order.status}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No order history available.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;