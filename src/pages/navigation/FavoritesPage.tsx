import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import { getAuth } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { Product } from '../../types/product';
import { useProductCard } from '../../contexts/ProductCardContext';

const FavoritesPage: React.FC = () => {
  // Получаем функции из ProductCardContext
  const { handleToggleFavorite, handleAddToCart } = useProductCard();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // Оптимизированная функция загрузки избранных товаров с кэшированием
  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      let favoriteIds: string[] = [];
      let directProducts: Product[] = [];

      if (user) {
        // Получаем избранные из Firebase Realtime Database
        const favRef = ref(database, `users/${user.uid}/favorites`);
        const snapshot = await get(favRef);
        if (snapshot.exists()) {
          const favoritesData = snapshot.val();
          favoriteIds = Object.keys(favoritesData);
          
          // Проверяем, содержат ли значения полные данные о продуктах
          for (const id of favoriteIds) {
            const productData = favoritesData[id];
            if (productData && typeof productData === 'object' && productData.id) {
              // Если это полные данные о продукте, добавляем их
              directProducts.push(productData as Product);
            }
          }
        }
      } else {
        // Для неавторизованных пользователей используем localStorage
        try {
          const storedFavorites = localStorage.getItem('favorites') || '[]';
          const parsedFavorites = JSON.parse(storedFavorites);
          
          // Проверяем формат данных
          if (parsedFavorites.length > 0) {
            if (typeof parsedFavorites[0] === 'string') {
              // Если это просто массив ID
              favoriteIds = parsedFavorites;
            } else if (typeof parsedFavorites[0] === 'object' && parsedFavorites[0].id) {
              // Если это массив объектов с полными данными
              directProducts = parsedFavorites.map((fav: any) => ({
                id: fav.id,
                name: fav.name || 'Unnamed Product',
                description: fav.description || 'No description',
                price: Number(fav.price) || 0,
                image: fav.image || '',
                brand: fav.brand || '',
                category: fav.category || ''
              }));
              
              // Также извлекаем ID для загрузки дополнительных данных о продуктах
              favoriteIds = parsedFavorites.map((fav: any) => fav.id);
            }
          }
        } catch (error) {
          console.error('Error parsing favorites from localStorage:', error);
          favoriteIds = [];
        }
      }
      
      // Начинаем с любых напрямую доступных продуктов
      const favoriteProducts: Product[] = [...directProducts];
      const productIdMap = new Map(directProducts.map(product => [product.id, true]));
      
      // Определяем, какие ID нужно загрузить из Firestore
      const idsToFetch = favoriteIds.filter(id => !productIdMap.has(id));
      
      if (idsToFetch.length > 0) {
        // Получаем коллекции для загрузки
        const collections = ['mobile', 'tv', 'gaming', 'laptops', 'smart-home', 'data', 'audio'];
        
        // Ограничиваем количество запросов, разбивая ID на группы по 10
        const batchSize = 10;
        for (let i = 0; i < idsToFetch.length; i += batchSize) {
          const batchIds = idsToFetch.slice(i, i + batchSize);
          
          // Параллельно запрашиваем данные из всех коллекций
          const collectionPromises = collections.map(async (collectionName) => {
            const collectionRef = collection(db, collectionName);
            // Используем where in для более эффективной фильтрации
            const q = query(collectionRef, where(documentId(), 'in', batchIds));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              name: doc.data().name || 'Unnamed Product',
              description: doc.data().description || 'No description',
              price: Number(doc.data().price) || 0,
              image: doc.data().image || '',
              brand: doc.data().brand || '',
              category: collectionName
            } as Product));
          });
          
          // Ждем все промисы
          const collectionsResults = await Promise.all(collectionPromises);
          
          // Объединяем результаты
          collectionsResults.forEach(products => {
            products.forEach(product => {
              if (!productIdMap.has(product.id)) {
                favoriteProducts.push(product);
                productIdMap.set(product.id, true);
              }
            });
          });
        }
      }
      
      setFavorites(favoriteProducts);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
    
    // Обработчик событий обновления избранного
    const handleFavoritesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      
      if (customEvent.detail?.immediate && customEvent.detail?.productId && !customEvent.detail?.isFavorite) {
        // Немедленно обновляем UI без повторной загрузки
        setFavorites(prevFavorites => 
          prevFavorites.filter(product => product.id !== customEvent.detail.productId)
        );
      } else {
        // Для не срочных обновлений перезагружаем избранное
        fetchFavorites();
      }
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
  }, [fetchFavorites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">My Favorites</h1>
      
      {favorites.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-xl font-semibold">No favorites yet</h2>
          <p className="text-gray-600">Items you mark as favorite will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isFavorite={true} 
              // Используем ранее полученные функции из контекста
              onToggleFavorite={handleToggleFavorite}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
