import { Search, ShoppingCart, Heart, User } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const logoColor = '#F0E965'; // Цвет логотипа

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      try {
        const collections = ['mobile', 'products']; // Add all collections you want to search
        let results: any[] = [];

        for (const collectionName of collections) {
          const q = query(
            collection(db, collectionName),
            where('name', '>=', searchQuery),
            where('name', '<=', searchQuery + '\uf8ff')
          );
          const querySnapshot = await getDocs(q);
          const collectionResults = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          results = [...results, ...collectionResults];
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error fetching search results: ", error);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  return (
    <header className="bg-[#003D2D] shadow-md flex items-center">
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
        <div className="flex-1 mx-4 relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Искать товары..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              className="w-full border border-gray-300 rounded-full px-4 py-2 pl-10 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-black" size={20} />
          </form>
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-10">
              {searchResults.map((result) => (
                <div key={result.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => navigate(`/product/${result.id}`)}>
                  <img src={result.image} alt={result.name} className="w-8 h-8 inline-block mr-2" />
                  <span>{result.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Иконки профиля, избранного и корзины */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 transition text-white icon-animation"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
          >
            <Heart size={24} />
          </button>
          <button
            className="p-2 transition text-white icon-animation"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
          >
            <ShoppingCart size={24} />
          </button>
          <button
            className="p-2 transition text-white icon-animation"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
          >
            <User size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;