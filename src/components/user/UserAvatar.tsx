import React, { useState, useEffect } from 'react';
import { User, Edit3 } from 'lucide-react';
import { defaultAvatarSVG, handleAvatarError } from '../../utils/AvatarHelper';
import { getDatabase, ref, get } from 'firebase/database';

interface UserAvatarProps {
  photoURL?: string | null;
  userId?: string;
  size?: number;
  className?: string;
  isEditing?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = React.memo(({ 
  photoURL, 
  userId,
  size = 40, 
  className = '',
  isEditing = false
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(photoURL || defaultAvatarSVG);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!photoURL && userId) {
        try {
          const database = getDatabase();
          const userRef = ref(database, `users/${userId}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.avatarURL) {
              setAvatarUrl(userData.avatarURL);
            } else {
              setAvatarUrl(defaultAvatarSVG);
            }
          } else {
            setAvatarUrl(defaultAvatarSVG);
          }
        } catch (error) {
          console.error('Failed to fetch user avatar:', error);
          setAvatarUrl(defaultAvatarSVG);
        }
      }
    };
    
    fetchUserAvatar();
  }, [photoURL, userId]);

  return (
    <div className="relative">
      <div className={`flex items-center justify-center rounded-full overflow-hidden ${className}`} 
           style={{ width: `${size}px`, height: `${size}px` }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            className="object-cover w-full h-full"
            onError={handleAvatarError}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-[#003D2D] dark:bg-[#95c672] text-white dark:text-gray-900">
            <User size={size * 0.6} />
          </div>
        )}
      </div>
      {isEditing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
          <Edit3 className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
