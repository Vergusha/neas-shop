import React from 'react';
import { User, Edit3 } from 'lucide-react';
import defaultAvatar from '../assets/defaultAvatar.svg';

interface UserAvatarProps {
  photoURL: string | null;
  size?: number;
  className?: string;
  isEditing?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = React.memo(({ 
  photoURL, 
  size = 40, 
  className = '',
  isEditing = false
}) => {
  return (
    <div className="relative">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full overflow-hidden ${
        !photoURL ? 'bg-[#003D2D] dark:bg-[#95c672] text-white dark:text-gray-900' : ''
      }`}>
        {photoURL ? (
          <img
            src={photoURL}
            alt="User avatar"
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.src = defaultAvatar;
            }}
          />
        ) : (
          <User size={24} />
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
