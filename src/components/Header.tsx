import { Search, ShoppingCart, Heart, User } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

const logoColor = '#F0E965'; // Цвет логотипа

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const navigate = useNavigate();
  const auth = getAuth();

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(storedFavorites);
    
    // Get cart items count
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((total: number, item: any) => total + item.quantity, 0);
      setCartItemCount(count);
    };
    
    updateCartCount();
    
    // Add event listener to update cart count when storage changes
    window.addEventListener('storage', updateCartCount);
    
    // Custom event for cart updates
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setShowProfileMenu(false);
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleFavoriteClick = () => {
    navigate('/favorites');
  };

  const handleCartClick = () => {
    navigate('/cart');
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
            onClick={handleFavoriteClick}
          >
            <Heart size={24} />
          </button>
          <button
            className="p-2 transition text-white icon-animation relative"
            style={{ transition: 'color 0.3s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            onClick={handleCartClick}
          >
            <ShoppingCart size={24} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              className="p-2 transition text-white icon-animation"
              style={{ transition: 'color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <User size={24} />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {user ? (
                  <div className="p-4">
                    <p className="mb-2">Hello, {user.email}</p>
                    <button
                      className="btn btn-primary w-full mb-2"
                      onClick={handleProfile}
                    >
                      Profile
                    </button>
                    <button
                      className="btn btn-primary w-full"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="p-4">
                    <button
                      className="btn btn-primary w-full mb-2"
                      onClick={() => navigate('/login')}
                    >
                      Login
                    </button>
                    <button
                      className="btn btn-secondary w-full"
                      onClick={() => navigate('/register')}
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;