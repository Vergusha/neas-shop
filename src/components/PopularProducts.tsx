import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { database, db } from '../firebaseConfig';
import ProductCard from './ProductCard';

interface ProductData {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  createdAt?: string;
}

const PopularProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Получаем популярные продукты из Realtime Database (не требует авторизации)
        // вместо получения из Firestore для конкретного пользователя
        const popularRef = ref(database, 'popularProducts');
        const snapshot = await get(popularRef);
        
        if (snapshot.exists()) {
          const popularIds = Object.keys(snapshot.val());
          
          if (popularIds.length === 0) {
            // Если нет популярных продуктов, просто показываем пустой список
            setProducts([]);
            setLoading(false);
            return;
          }
          
          // Получаем данные о продуктах из Firestore или Realtime Database
          const productPromises = popularIds.map(async (id) => {
            try {
              // Сначала пробуем получить из Realtime Database
              const productRef = ref(database, `products/${id}`);
              const productSnapshot = await get(productRef);
              
              if (productSnapshot.exists()) {
                const productData = productSnapshot.val();
                return {
                  id,
                  ...productData
                };
              }
              
              // Если не нашли в Realtime Database, ищем в Firestore
              const collections = ['mobile', 'products', 'tv'];
              for (const collectionName of collections) {
                try {
                  const docRef = doc(db, collectionName, id);
                  const docSnap = await getDoc(docRef);
                  
                  if (docSnap.exists()) {
                    return {
                      id,
                      ...docSnap.data()
                    };
                  }
                } catch (e) {
                  // Игнорируем ошибки для отдельных коллекций
                  console.warn(`Error fetching from ${collectionName}:`, e);
                }
              }
              
              // Если продукт не найден, возвращаем null
              return null;
            } catch (err) {
              console.error(`Error fetching product ${id}:`, err);
              return null;
            }
          });
          
          const fetchedProducts = await Promise.all(productPromises);
          // Фильтруем null и убираем дубликаты по id
          const validProducts = fetchedProducts
            .filter((p): p is ProductData => p !== null)
            .filter((p, index, self) => 
              index === self.findIndex((t) => t.id === p.id)
            );
          
          setProducts(validProducts);
        } else {
          // Если популярные продукты не найдены, используем запасной вариант:
          // получаем последние добавленные продукты
          const fallbackProducts = await fetchRecentProducts();
          setProducts(fallbackProducts);
        }
      } catch (err) {
        console.error('Error fetching popular products:', err);
        setError('Failed to load popular products. Please try again later.');
        
        // Пытаемся загрузить запасной вариант, если основной метод не сработал
        try {
          const fallbackProducts = await fetchRecentProducts();
          if (fallbackProducts.length > 0) {
            setProducts(fallbackProducts);
            setError(null); // Сбрасываем ошибку, если запасной вариант сработал
          }
        } catch (fallbackErr) {
          console.error('Error fetching fallback products:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopularProducts();
  }, []);
  
  // Запасной метод получения продуктов: последние добавленные
  const fetchRecentProducts = async (): Promise<ProductData[]> => {
    try {
      // Получаем последние добавленные продукты из Firestore
      const recentProducts: ProductData[] = [];
      
      const collections = ['mobile', 'products', 'tv'];
      for (const collectionName of collections) {
        try {
          const q = query(
            collection(db, collectionName),
            orderBy('createdAt', 'desc'),
            limit(4)
          );
          
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            recentProducts.push({
              id: doc.id,
              ...doc.data()
            } as ProductData);
          });
        } catch (e) {
          console.warn(`Error fetching recent from ${collectionName}:`, e);
        }
      }
      
      // Если мы получили продукты из нескольких коллекций, 
      // сортируем их по дате создания и берем только первые 8
      if (recentProducts.length > 0) {
        return recentProducts
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // От новых к старым
          })
          .slice(0, 8); // Берем только первые 8
      }
      
      return [];
    } catch (err) {
      console.error('Error in fallback products fetch:', err);
      return [];
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default PopularProducts;