import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import { Product } from '../../types/product'; // Переименуем импорт для ясности

const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Обновляем типизацию продуктов, чтобы они точно соответствовали интерфейсу Product
  const ensureRequiredFields = (data: any, docId: string, collectionName: string): Product => {
    return {
      ...data,
      id: docId,
      name: data.name || 'Unnamed Product',
      price: data.price || 0,
      image: data.image || '',
      description: data.description || '', // Обязательное поле
      brand: data.brand || '',
      deviceType: data.deviceType || '',
      collection: collectionName
    };
  };

  useEffect(() => {
    const searchQuery = searchParams.get('q') || searchParams.get('query') || '';
    setQuery(searchQuery);

    if (!searchQuery) {
      setLoading(false);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const q = searchQuery.toLowerCase().trim();
        
        // Добавляем логирование для отладки
        console.log(`🔍 Searching for "${q}" with parameter types (q and query)`);
        
        // Разбиваем поисковый запрос на отдельные слова для более точного поиска
        const searchWords = q.split(/\s+/).filter(word => word.length > 0);
        console.log(`🔍 Search words: ${searchWords.join(', ')}`);
        
        // Создаем несколько вариантов поискового запроса для совместимости со старой логикой
        const queryVariants = [
          q,                       // оригинальный запрос
          q.replace(/\s+/g, ''),   // запрос без пробелов
          ...searchWords            // запрос разбитый на отдельные слова
        ];
        const uniqueQueryVariants = Array.from(new Set(queryVariants));
        console.log(`🔍 Query variants: ${uniqueQueryVariants.join(', ')}`);

        // Проверяем, содержит ли запрос ключевые слова iPhone
        const isIphoneSearch = q.includes('iphone');
        const isIphone15Search = isIphoneSearch && q.includes('15');
        const isIphoneProSearch = isIphoneSearch && q.includes('pro');
        
        // Особая обработка для запросов iPhone
        if (isIphoneSearch) {
          console.log('Detected iPhone search, focusing on mobile collection first');
          
          const mobileCollectionRef = collection(db, 'mobile');
          const mobileSnapshot = await getDocs(mobileCollectionRef);
          
          const iPhoneProducts: Product[] = [];
          
          mobileSnapshot.forEach(doc => {
            const data = doc.data();
            const brand = (data.brand || '').toLowerCase();
            const name = (data.name || '').toLowerCase();
            const model = (data.model || '').toLowerCase();
            
            if (brand === 'apple' && name.includes('iphone')) {
              // Если ищем iPhone 15 Pro, находим соответствующие модели
              if (isIphone15Search && isIphoneProSearch) {
                if (name.includes('15') && name.includes('pro')) {
                  console.log(`Found iPhone 15 Pro match: ${doc.id} - ${data.name}`);
                  iPhoneProducts.push(ensureRequiredFields(data, doc.id, 'mobile'));
                }
              }
              // Если ищем iPhone 15 (любая модель)
              else if (isIphone15Search) {
                if (name.includes('15') || model.includes('15')) {
                  console.log(`Found iPhone 15 match: ${doc.id} - ${data.name}`);
                  iPhoneProducts.push(ensureRequiredFields(data, doc.id, 'mobile'));
                }
              }
              // Если просто ищем iPhone Pro
              else if (isIphoneProSearch) {
                if (name.includes('pro') || model.includes('pro')) {
                  console.log(`Found iPhone Pro match: ${doc.id} - ${data.name}`);
                  iPhoneProducts.push(ensureRequiredFields(data, doc.id, 'mobile'));
                }
              }
              // Если просто ищем iPhone любой модели
              else {
                console.log(`Found iPhone match: ${doc.id} - ${data.name}`);
                iPhoneProducts.push(ensureRequiredFields(data, doc.id, 'mobile'));
              }
            }
          });
          
          if (iPhoneProducts.length > 0) {
            console.log(`Found ${iPhoneProducts.length} iPhone products`);
            setProducts(iPhoneProducts);
            setLoading(false);
            return;
          }
        }
        
        // Если специальная обработка не сработала или нет результатов, выполняем обычный поиск
        let allResults: Product[] = [];
        const collections = ['products', 'mobile', 'tv', 'gaming', 'laptops', 'audio'];
        
        console.log(`Searching across collections: ${collections.join(', ')}`);
        
        for (const collectionName of collections) {
          const collectionRef = collection(db, collectionName);
          const querySnapshot = await getDocs(collectionRef);
          
          console.log(`Checking ${querySnapshot.size} documents in "${collectionName}" collection`);
          
          querySnapshot.forEach(doc => {
            const data = doc.data();
            const name = (data.name || '').toLowerCase();
            const brand = (data.brand || '').toLowerCase();
            const model = (data.model || '').toLowerCase();
            const deviceType = (data.deviceType || '').toLowerCase();
            const memory = (data.memory || '').toLowerCase();
            const color = (data.color || '').toLowerCase();
            const description = (data.description || '').toLowerCase();
            
            // Объединяем все поля в один текст для поиска
            const combinedText = `${brand} ${name} ${model} ${memory} ${color} ${deviceType} ${description}`;
            
            // Если хотя бы 50% слов из запроса найдены, считаем товар соответствующим
            // Более гибкая проверка, чем .every()
            let matchCount = 0;
            searchWords.forEach(word => {
              if (combinedText.includes(word)) {
                matchCount++;
              }
            });
            
            // Товар подходит, если более половины слов из запроса найдено
            // или если найдено хотя бы одно слово при поиске из 1-2 слов
            const matchThreshold = searchWords.length <= 2 ? 1 : Math.ceil(searchWords.length / 2);
            
            if (matchCount >= matchThreshold) {
              console.log(`✅ Found matching product: ${data.name} in ${collectionName} (matched ${matchCount}/${searchWords.length} words)`);
              allResults.push(ensureRequiredFields(data, doc.id, collectionName));
            }
            // Дополнительно проверяем соответствие ключевых слов из базы
            else if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
              const keywordsLower = data.searchKeywords.map((k: string) => k.toLowerCase());
              let keywordMatches = 0;
              
              searchWords.forEach(word => {
                if (keywordsLower.some(k => k.includes(word))) {
                  keywordMatches++;
                }
              });
              
              if (keywordMatches >= matchThreshold) {
                console.log(`✅ Keyword match found in ${collectionName}/${doc.id}: Matched ${keywordMatches}/${searchWords.length} keywords`);
                allResults.push(ensureRequiredFields(data, doc.id, collectionName));
              }
            }
          });
        }
        
        // Сортируем результаты по релевантности
        allResults.sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const aBrand = (a.brand || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const bBrand = (b.brand || '').toLowerCase();
          
          // Проверяем точное соответствие названия
          if (aName.includes(q) && !bName.includes(q)) return -1;
          if (!aName.includes(q) && bName.includes(q)) return 1;
          
          // Проверяем точное соответствие бренда
          if (aBrand.includes(q) && !bBrand.includes(q)) return -1;
          if (!aBrand.includes(q) && bBrand.includes(q)) return 1;
          
          return 0;
        });
        
        console.log(`📊 Search found ${allResults.length} results`);
        setProducts(allResults);
      } catch (error) {
        console.error('❌ Error searching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchParams]);

  // Обновляем обработчик формы для поддержки обоих параметров
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchParams({ q: query }); // Используем 'q' для единообразия
  };

  return (
    <div className="container py-8 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Search Results</h1>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow input input-bordered"
            placeholder="Search products..."
          />
          <button type="submit" className="ml-2 btn btn-primary">Search</button>
        </div>
      </form>
      
      {loading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <>
          <p className="mb-4 text-gray-600">{products.length} results found for "{query}"</p>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p>No products found matching your search criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchResultsPage;