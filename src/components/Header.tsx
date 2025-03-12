import { Search, ShoppingCart, Heart, User } from 'lucide-react';
import logo from '../assets/logo.svg';

const logoColor = '#F0E965'; // Цвет логотипа

const Header = () => {
  return (
    <header className="bg-white shadow-md flex items-center">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        {/* Логотип */}
        <div className="flex items-center">
          <a href="/" className="logo-animation">
            <img
              src={logo}
              alt="Logo"
              className="h-8 w-auto md:h-10"
            />
          </a>
        </div>

        {/* Поиск */}
        <div className="flex-1 mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Искать товары..."
              className="w-full border border-gray-300 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Иконки профиля, избранного и корзины */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 transition"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            <Heart size={24} />
          </button>
          <button
            className="p-2 transition"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            <ShoppingCart size={24} />
          </button>
          <button
            className="p-2 transition"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            <User size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;