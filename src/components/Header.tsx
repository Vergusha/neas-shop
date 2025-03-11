import { Search, ShoppingCart, Heart, User } from 'lucide-react';
import logo from '../assets/logo.svg';

const Header = () => {
  return (
    <header className="bg-white shadow-md flex items-center"> {/* Убрали h-16, сделали высоту гибкой */}
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        {/* Логотип */}
        <div className="flex items-center">
          <img
            src={logo}
            alt="Logo"
            className="h-8 w-auto md:h-10" // Используем классы Tailwind для размера
          />
          <span className="ml-2 text-xl font-semibold">Neas Shop</span>
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
          <button className="p-2 hover:text-blue-500 transition">
            <User size={24} />
          </button>
          <button className="p-2 hover:text-blue-500 transition">
            <Heart size={24} />
          </button>
          <button className="p-2 hover:text-blue-500 transition">
            <ShoppingCart size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;