import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

type SearchBarProps = {
  currentTheme: 'light' | 'dark' | 'synthwave';
  isMobile?: boolean;
};

const SearchBar: React.FC<SearchBarProps> = ({ currentTheme, isMobile = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      try {
        const collections = ['mobile', 'products', 'laptops', 'audio', 'tv', 'gaming']; 
        let results: any[] = [];
        
        // Нечувствительный к регистру поиск
        const lowerQuery = searchQuery.toLowerCase().trim();
        // Разбиваем поисковый запрос на отдельные слова для более точного поиска
        const searchWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);
        
        // Проверяем, содержит ли запрос специальные фразы для iPhone
        const isIphoneSearch = lowerQuery.includes('iphone');
        const isIphone15Search = isIphoneSearch && lowerQuery.includes('15');
        const isIphoneProSearch = isIphoneSearch && lowerQuery.includes('pro');

        for (const collectionName of collections) {
          // Получаем документы из коллекции
          const q = query(
            collection(db, collectionName),
            limit(40)
          );
          const querySnapshot = await getDocs(q);
          
          // Define the type for your items
          type Product = {
            id: string;
            name?: string;
            brand?: string;
            model?: string;
            description?: string;
            memory?: string;
            color?: string;
            // add other fields as needed
          };

          // Фильтруем документы локально
          const collectionResults = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(item => {
              const name = (item.name || '').toLowerCase();
              const brand = (item.brand || '').toLowerCase();
              const model = (item.model || '').toLowerCase();
              const description = (item.description || '').toLowerCase();
              const memory = (item.memory || '').toLowerCase();
              const color = (item.color || '').toLowerCase();
              
              // Специальная обработка для iPhone
              if (isIphoneSearch && brand === 'apple' && name.includes('iphone')) {
                if (isIphone15Search && isIphoneProSearch) {
                  return name.includes('15') && name.includes('pro');
                } else if (isIphone15Search) {
                  return name.includes('15');
                } else if (isIphoneProSearch) {
                  return name.includes('pro');
                } else {
                  return true; // любой iPhone
                }
              }
              
              // Объединяем все поля в один текст для поиска
              const combinedText = `${brand} ${name} ${model} ${description} ${memory} ${color}`;
              
              // Если хотя бы половина слов из запроса найдено, считаем товар соответствующим
              // или если найдено хотя бы одно слово при поиске из 1-2 слов
              let matchCount = 0;
              searchWords.forEach(word => {
                if (combinedText.includes(word)) {
                  matchCount++;
                }
              });
              
              const matchThreshold = searchWords.length <= 2 ? 1 : Math.ceil(searchWords.length / 2);
              
              return matchCount >= matchThreshold;
            });
            
          results = [...results, ...collectionResults];
        }

        // Сортируем результаты - сначала точные соответствия бренду и модели
        results.sort((a, b) => {
          // Для iPhone Pro сначала показываем Pro модели
          if (isIphoneProSearch) {
            const aHasPro = (a.model || '').toLowerCase().includes('pro') || 
                           (a.name || '').toLowerCase().includes('pro');
            const bHasPro = (b.model || '').toLowerCase().includes('pro') || 
                           (b.name || '').toLowerCase().includes('pro');
                           
            if (aHasPro && !bHasPro) return -1;
            if (!aHasPro && bHasPro) return 1;
          }
          
          const aName = (a.name || '').toLowerCase();
          const aBrand = (a.brand || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const bBrand = (b.brand || '').toLowerCase();
          
          // Если точное совпадение с названием
          if (aName.includes(lowerQuery) && !bName.includes(lowerQuery)) return -1;
          if (!aName.includes(lowerQuery) && bName.includes(lowerQuery)) return 1;
          
          return 0;
        });

        // Ограничиваем количество результатов
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error("Error fetching search results: ", error);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  useEffect(() => {
    // Function to handle clicks outside the search component
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node) &&
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?query=${searchQuery}`);
    setShowResults(false);
  };

  // Улучшенный класс для корректного отображения поисковой строки на мобильных/десктопных устройствах
  const containerClassName = isMobile 
    ? "block md:hidden mt-2 w-full" // Видимо только на мобильных (до md), скрыто на больших экранах
    : "hidden md:block w-full md:order-2 md:w-auto md:flex-1 md:mx-4 lg:mx-8 md:mt-0"; // Скрыто на мобильных, видимо от md и выше

  return (
    <div className={containerClassName}>
      <form onSubmit={handleSearch} className="relative flex items-center w-full">
        <Search className={`absolute text-gray-500 transform -translate-y-1/2 left-3 top-1/2 ${currentTheme === 'dark' ? 'text-gray-300' : ''}`} size={20} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for anything..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value) {
              setShowResults(true);
            }
          }}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className={`w-full px-10 py-2 text-black border border-gray-300 rounded-full focus:outline-none focus:ring-2 ${
            currentTheme === 'dark' 
              ? 'bg-gray-800 text-white border-gray-700 focus:ring-[#95c672]' 
              : 'bg-white focus:ring-[#003D2D]'
          }`}
        />
        
        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div 
            ref={searchResultsRef}
            className={`absolute left-0 right-0 z-20 mt-2 rounded-lg shadow-lg search-results-dropdown ${
              currentTheme === 'dark' ? 'bg-[#1f2937] border border-gray-600' : 'bg-white border border-gray-300'
            }`}
          >
            {searchResults.map((result) => (
              <div 
                key={result.id} 
                className={`p-3 cursor-pointer border-b ${
                  currentTheme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-100 border-gray-200'
                }`} 
                onClick={() => navigate(`/product/${result.id}`)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-1 bg-white rounded-sm w-14 h-14">
                    <img src={result.image} alt={result.name} className="object-contain w-full h-full" />
                  </div>
                  <div className="flex-1 pl-4">
                    <div className="flex items-start justify-between">
                      <div className={`font-medium pr-2 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {`${result.brand} ${result.model || ''}`}
                        {result.memory ? ` ${result.memory}` : ''}
                        {result.modelNumber ? ` ${result.modelNumber}` : ''}
                        {result.processor ? ` ${result.processor}` : ''}
                        {result.ram ? ` ${result.ram}` : ''}
                        {result.storageType ? ` ${result.storageType}` : ''}
                        {result.color ? ` ${result.color}` : ''}
                      </div>
                      <div className={`font-semibold whitespace-nowrap ${
                        currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003d2d]'
                      }`}>{result.price} NOK</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;