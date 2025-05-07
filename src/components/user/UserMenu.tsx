import React, { useState, useEffect } from 'react';
import { User, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import UserAvatar from './UserAvatar';
import { useAuth } from '../../utils/AuthProvider';
import { getTheme } from '../../utils/themeUtils';
import { defaultAvatarSVG } from '../../utils/AvatarHelper';

const UserMenu: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const { user } = useAuth();
  const currentTheme = getTheme();

  // Click outside effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

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

  // Аватар с проверкой авторизации
  const renderUserAvatar = () => {
    // Показываем аватар только если пользователь авторизован
    if (!user) {
      return <User size={24} className="text-white" />;
    }
    const avatarUrl = user.photoURL || localStorage.getItem('avatarURL') || defaultAvatarSVG;
    return (
      <div className="w-8 h-8">
        <UserAvatar photoURL={avatarUrl} />
      </div>
    );
  };

  return (
    <div className="relative user-menu-container">
      <button 
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="flex items-center justify-center w-10 h-10 transition-all duration-300 ease-in-out rounded-full hover:bg-white/10"
      >
        {renderUserAvatar()}
      </button>

      {/* User menu dropdown */}
      {userMenuOpen && (
        <div className={`absolute right-0 z-20 w-64 mt-2 overflow-hidden transition-all duration-300 ${
          currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-xl animate-fade-in-down`}>
          {user ? (
            <>
              <div className={`px-6 pt-4 pb-3 bg-gradient-to-r ${currentTheme === 'dark' ? 'from-gray-700 to-[#95c672]' : 'from-[#003d2d] to-[#95c672]'}`}>
                <div className="flex items-center gap-3">
                  <img 
                    src={user.photoURL || localStorage.getItem('avatarURL') || defaultAvatarSVG}
                    alt={user.displayName || 'User'} 
                    className="object-cover w-12 h-12 border-2 border-white rounded-full shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = defaultAvatarSVG;
                    }}
                  />
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
                  className={`flex items-center px-6 py-3 text-sm transition-colors ${
                    currentTheme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 mr-3 rounded-full ${currentTheme === 'dark' ? 'bg-[rgba(149,198,114,0.15)]' : 'bg-[rgba(0,61,45,0.15)]'}`}>
                    <User size={16} className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003d2d]'}`} />
                  </div>
                  <span className={`font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Profile</span>
                </a>
                <button
                  onClick={handleSignOut}
                  className={`flex items-center w-full px-6 py-3 text-sm text-left transition-colors ${
                    currentTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
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
              <div className={`px-6 pt-4 pb-3 bg-gradient-to-r ${currentTheme === 'dark' ? 'from-gray-700 to-[#95c672]' : 'from-[#003d2d] to-[#95c672]'}`}>
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
                  className={`flex items-center px-6 py-3 text-sm transition-colors ${
                    currentTheme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 mr-3 rounded-full ${currentTheme === 'dark' ? 'bg-[rgba(149,198,114,0.15)]' : 'bg-[rgba(0,61,45,0.15)]'}`}>
                    <LogIn size={16} className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003d2d]'}`} />
                  </div>
                  <span className={`font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Sign In</span>
                </a>
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    setUserMenuOpen(false);
                    navigate('/register');
                  }}
                  className={`flex items-center px-6 py-3 text-sm transition-colors ${
                    currentTheme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 mr-3 rounded-full ${currentTheme === 'dark' ? 'bg-[rgba(149,198,114,0.15)]' : 'bg-[rgba(0,61,45,0.15)]'}`}>
                    <User size={16} className={`${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003d2d]'}`} />
                  </div>
                  <span className={`font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Register</span>
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMenu;