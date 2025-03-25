import { useEffect, useState } from 'react';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { Product } from '../types/product';

const Home = () => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        // Используем правильно индексированный путь
        const popularProductsRef = ref(database, 'popularProducts');
        const query = query(popularProductsRef, orderByChild('score'), limitToLast(6));
        
        const snapshot = await get(query);
        
        if (snapshot.exists()) {
          const productsData = snapshot.val();
          // Преобразуем объект в массив и сортируем по убыванию score
          const productsArray = Object.entries(productsData)
            .map(([key, value]: [string, any]) => ({
              id: key,
              ...value
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
          
          // Загружаем полные данные продуктов из Firestore
          const productsPromises = productsArray.map(async (item) => {
            // Проверяем все коллекции продуктов
            const collections = ['products', 'mobile', 'tv', 'gaming'];
            
            for (const collectionName of collections) {
              try {
                const productDoc = await getDoc(doc(db, collectionName, item.id));
                if (productDoc.exists()) {
                  return {
                    ...productDoc.data(),
                    id: item.id,
                    score: item.score
                  };
                }
              } catch (err) {
                console.error(`Error fetching product ${item.id} from ${collectionName}:`, err);
              }
            }
            
            // Возвращаем базовую информацию, если полные данные не найдены
            return {
              id: item.id,
              name: 'Product not found',
              price: 0,
              image: '',
              score: item.score
            };
          });
          
          const resolvedProducts = await Promise.all(productsPromises);
          setPopularProducts(resolvedProducts);
        } else {
          console.log('No popular products found');
          setPopularProducts([]);
        }
      } catch (error) {
        console.error('Error fetching popular products:', error);
        // В случае ошибки, попробуем загрузить последние добавленные продукты как запасной вариант
        try {
          const fallbackProducts = await fetchLatestProducts();
          setPopularProducts(fallbackProducts);
        } catch (fallbackError) {
          console.error('Error fetching fallback products:', fallbackError);
          setPopularProducts([]);
        }
      }
    };

    fetchPopularProducts();
  }, []);

  return (
    <div className="flex flex-col">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        <section className="hero bg-base-200 py-6 md:py-8 rounded-lg my-4">
          <div className="px-4 md:px-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Welcome to NEAS Shop</h1>
            <p className="mt-2 md:mt-4 text-sm sm:text-base">Find the best electronics and gadgets here.</p>
          </div>
        </section>
        
        <section className="py-6 md:py-8 bg-base-200 rounded-lg">
          <div className="px-4 md:px-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Categories</h2>
            <CategoryList />
          </div>
        </section>
        
        <section className="py-6 md:py-8 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Popular Products</h2>
          {loading ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="px-12 sm:px-16 md:px-20 overflow-x-hidden">
              <div className="flex flex-row flex-nowrap overflow-x-auto pb-4 product-row">
                {popularProducts.length > 0 ? (
                  popularProducts.map(product => (
                    <div key={product.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0">
                      <ProductCard
                        product={product}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-gray-500">No popular products found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
