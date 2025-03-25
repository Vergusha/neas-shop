import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  brand?: string;
  deviceType?: string;
  collection?: string;
  description?: string;
  model?: string;
  color?: string;
  connectivity?: string;
  modelNumber?: string;
  memory?: string;
}

const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Исправляем получение параметра запроса - проверяем оба варианта 'q' и 'query'
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
        
        // Создаем несколько вариантов поискового запроса для повышения шансов на совпадение
        const queryVariants = [
          q,                          // оригинальный запрос
          q.replace(/\s+/g, ''),     // запрос без пробелов
          ...q.split(/\s+/)           // запрос разбитый на отдельные слова
        ];
        const uniqueQueryVariants = Array.from(new Set(queryVariants));
        console.log(`🔍 Query variants: ${uniqueQueryVariants.join(', ')}`);
        
        // Специальная обработка для поиска Razer V3
        if (q.includes('v3') || q.includes('pro')) {
          console.log('Detected V3/Pro search term, checking for Razer products');
          
          const gamingCollectionRef = collection(db, 'gaming');
          const gamingSnapshot = await getDocs(gamingCollectionRef);
          
          const razerV3Products: Product[] = [];
          
          gamingSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.brand && 
                data.brand.toLowerCase() === 'razer' && 
                ((data.model && 
                  (data.model.toLowerCase().includes('v3') || 
                   data.model.toLowerCase().includes('pro'))) || 
                 (data.name && 
                  (data.name.toLowerCase().includes('v3') || 
                   data.name.toLowerCase().includes('pro'))) ||
                 (data.memory && data.memory.toLowerCase().includes('v3')))) {
              
              console.log(`Found Razer V3/Pro match: ${doc.id} - ${data.name}`);
              razerV3Products.push({
                ...data,
                id: doc.id,
                name: data.name || 'Unnamed Product',
                price: data.price || 0,
                image: data.image || '',
                brand: data.brand || '',
                collection: 'gaming'
              });
            }
          });
          
          if (razerV3Products.length > 0) {
            console.log(`Found ${razerV3Products.length} Razer V3/Pro products`);
            setProducts(razerV3Products);
            setLoading(false);
            return;
          }
        }
        
        // Проверяем наличие конкретного ID в запросе
        if (q.includes('deathadder') || q.includes('razer-deathadder')) {
          console.log('Detected specific product search for DeathAdder');
          
          // Прямой поиск по ID
          const specificId = 'razer-deathadder-wiredwireless-2022-black';
          try {
            const specificDoc = await getDoc(doc(db, 'gaming', specificId));
            if (specificDoc.exists()) {
              const data = specificDoc.data();
              console.log(`Found specific product by ID: ${specificId}`, data);
              setProducts([{
                id: specificId,
                name: data.name || 'Razer DeathAdder',
                price: data.price || 0,
                image: data.image || '',
                brand: data.brand || 'Razer',
                deviceType: data.deviceType || '',
                collection: 'gaming',
                description: data.description || '',
                model: data.model || '',
                color: data.color || '',
                connectivity: data.connectivity || '',
                modelNumber: data.modelNumber || '',
                memory: data.memory || ''
              }]);
              setLoading(false);
              return;
            } else {
              console.log(`Product with ID ${specificId} not found directly`);
            }
          } catch (err) {
            console.error(`Error fetching specific product ${specificId}:`, err);
          }
        }
        
        // Особая обработка для запросов, содержащих 'razer'
        if (q.includes('razer')) {
          console.log('Razer search detected, focusing on gaming collection first');
          
          // Сначала получаем игровые продукты от Razer
          const gamingCollectionRef = collection(db, 'gaming');
          const gamingSnapshot = await getDocs(gamingCollectionRef);
          
          const razerProducts: Product[] = [];
          
          gamingSnapshot.forEach(doc => {
            const data = doc.data();
            const brand = (data.brand || '').toLowerCase();
            
            // Находим все продукты Razer в gaming коллекции
            if (brand.includes('razer')) {
              razerProducts.push({
                ...data, // Включаем все поля из документа
                id: doc.id,
                name: data.name || 'Unnamed Product',
                price: data.price || 0,
                image: data.image || '',
                brand: data.brand || '',
                collection: 'gaming'
              });
            }
          });
          
          if (razerProducts.length > 0) {
            console.log(`Found ${razerProducts.length} Razer products`);
            setProducts(razerProducts);
            setLoading(false);
            return;
          }
        }
        
        // Стандартный поиск по всем коллекциям
        const collections = ['products', 'mobile', 'tv', 'gaming'];
        let allResults: Product[] = [];
        
        for (const collectionName of collections) {
          const collectionRef = collection(db, collectionName);
          const querySnapshot = await getDocs(collectionRef);
          
          console.log(`Checking ${querySnapshot.size} documents in "${collectionName}" collection`);
          
          querySnapshot.forEach(doc => {
            const data = doc.data();
            
            // Сначала проверяем searchKeywords
            if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
              const keywordsMatch = uniqueQueryVariants.some(variant => 
                data.searchKeywords.some((keyword: string) => {
                  if (!keyword || typeof keyword !== 'string') return false;
                  const match = keyword.toLowerCase().includes(variant);
                  if (match) {
                    console.log(`✅ Keyword match found in ${collectionName}/${doc.id}: "${keyword}" matches "${variant}"`);
                  }
                  return match;
                })
              );
              
              if (keywordsMatch) {
                console.log(`✅ Adding product by keyword match: ${collectionName}/${doc.id} - ${data.name}`);
                allResults.push({
                  ...data,
                  id: doc.id,
                  name: data.name || 'Unnamed Product',
                  price: data.price || 0,
                  image: data.image || '',
                  brand: data.brand || '',
                  deviceType: data.deviceType || '',
                  collection: collectionName
                });
                return; // продолжаем проверку других документов
              }
            }
            
            // Если нет совпадения по ключевым словам, проверяем другие поля
            const name = (data.name || '').toLowerCase();
            const brand = (data.brand || '').toLowerCase();
            const model = (data.model || '').toLowerCase();
            const deviceType = (data.deviceType || '').toLowerCase();
            
            // Проверяем каждый вариант запроса
            const matchFound = uniqueQueryVariants.some(variant => 
              name.includes(variant) || 
              brand.includes(variant) || 
              model.includes(variant) || 
              deviceType.includes(variant) || 
              `${brand} ${model}`.includes(variant) || 
              `${brand} ${deviceType}`.includes(variant)
            );
            
            if (matchFound) {
              console.log(`✅ Adding product by field match: ${collectionName}/${doc.id} - ${data.name}`);
              allResults.push({
                ...data,
                id: doc.id,
                name: data.name || 'Unnamed Product',
                price: data.price || 0,
                image: data.image || '',
                brand: data.brand || '',
                deviceType: data.deviceType || '',
                collection: collectionName
              });
            }
          });
        }
        
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