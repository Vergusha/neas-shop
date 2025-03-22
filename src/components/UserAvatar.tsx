import React from 'react';
import { User } from 'lucide-react';
import { handleAvatarError } from '../utils/AvatarHelper';

interface UserAvatarProps {
  photoURL: string | null;
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = React.memo(({ 
  photoURL, 
  size = 40, 
  className = ''
}) => {
  return (
    <div 
      className={`rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt="User avatar"
          className="w-full h-full object-cover"
          onError={handleAvatarError}
        />
      ) : (
        <User 
          size={Math.floor(size * 0.6)} 
          className="text-gray-600"
        />
      )}
    </div>
  );
});

export default UserAvatar;
