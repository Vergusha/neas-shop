import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FavoritesButtonProps = {
  user: any;
  currentTheme: 'light' | 'dark' | 'synthwave';
};

const FavoritesButton: React.FC<FavoritesButtonProps> = ({ user, currentTheme }) => {
  const navigate = useNavigate();

  const handleFavoriteClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/favorites');
  };

  return (
    <button 
      onClick={handleFavoriteClick} 
      className={`flex items-center justify-center w-10 h-10 transition-all duration-300 ease-in-out rounded-full hover:bg-white/10 ${!user ? 'opacity-50' : ''}`}
      title={!user ? 'Please login to use favorites' : 'Favorites'}
    >
      <Heart size={24} className="text-white" />
    </button>
  );
};

export default FavoritesButton;