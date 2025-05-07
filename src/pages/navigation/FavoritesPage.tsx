import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { getDatabase, ref, get, onValue } from 'firebase/database';
import { db, database } from '../../firebaseConfig';
import ProductCard from '../../components/product/ProductCard';
import { getAuth } from 'firebase/auth';
import { Product } from '../../types/product';
import { useProductCard } from '../../contexts/ProductCardContext';
import { updateFavoriteCache } from '../../utils/favoritesService';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleToggleFavorite, handleAddToCart, isFavorite } = useProductCard();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        await updateFavoriteCache();

        let favoriteProducts: Product[] = [];
        
        if (user) {
          // Для авторизованных пользователей используем Firebase
          const favRef = ref(database, `users/${user.uid}/favorites`);
          const snapshot = await get(favRef);
          
          if (snapshot.exists()) {
            const favorites = snapshot.val();
            const collections = ['mobile', 'tv', 'gaming', 'laptops', 'audio'];
            
            // Группируем продукты по коллекциям для оптимизации запросов
            const productsByCollection: { [key: string]: string[] } = {};
            
            Object.entries(favorites).forEach(([id, data]: [string, any]) => {
              const collection = data.collection || 'products';
              if (!productsByCollection[collection]) {
                productsByCollection[collection] = [];
              }
              productsByCollection[collection].push(id);
            });
            
            // Загружаем продукты из каждой коллекции
            for (const [collectionName, ids] of Object.entries(productsByCollection)) {
              const batchSize = 10;
              for (let i = 0; i < ids.length; i += batchSize) {
                const batchIds = ids.slice(i, i + batchSize);
                const q = query(
                  collection(db, collectionName),
                  where(documentId(), 'in', batchIds)
                );
                const querySnapshot = await getDocs(q);
                
                querySnapshot.docs.forEach(doc => {
                  const productData = doc.data();
                  if (productData) {
                    favoriteProducts.push({
                      id: doc.id,
                      ...productData,
                      collection: collectionName
                    } as Product);
                  }
                });
              }
            }

            // Сортируем по времени добавления
            favoriteProducts.sort((a, b) => {
              const dateA = favorites[a.id]?.addedAt || '';
              const dateB = favorites[b.id]?.addedAt || '';
              return dateB.localeCompare(dateA);
            });
          }
        } else {
          // Для неавторизованных пользователей
          const storedFavorites = localStorage.getItem('favorites');
          if (storedFavorites) {
            const parsedFavorites = JSON.parse(storedFavorites);
            const allProductIds = parsedFavorites.map((fav: any) => fav.id);
            const collections = ['mobile', 'tv', 'gaming', 'laptops', 'audio', 'products'];

            for (const collectionName of collections) {
              if (allProductIds.length === 0) break;

              const batchSize = 10;
              for (let i = 0; i < allProductIds.length; i += batchSize) {
                const batchIds = allProductIds.slice(i, i + batchSize);
                const q = query(
                  collection(db, collectionName),
                  where(documentId(), 'in', batchIds)
                );
                
                try {
                  const querySnapshot = await getDocs(q);
                  querySnapshot.docs.forEach(doc => {
                    const productData = doc.data();
                    if (productData) {
                      const parsedFavoriteData = parsedFavorites.find((f: any) => f.id === doc.id);
                      favoriteProducts.push({
                        id: doc.id,
                        ...productData,
                        collection: collectionName,
                        addedAt: parsedFavoriteData?.addedAt
                      } as Product);
                      
                      // Удаляем найденный ID из списка поиска
                      const index = allProductIds.indexOf(doc.id);
                      if (index > -1) {
                        allProductIds.splice(index, 1);
                      }
                    }
                  });
                } catch (error) {
                  console.error(`Error fetching products from ${collectionName}:`, error);
                }
              }
            }

            // Сортируем по времени добавления
            favoriteProducts.sort((a, b) => {
              const dateA = a.addedAt || '';
              const dateB = b.addedAt || '';
              return dateB.localeCompare(dateA);
            });
          }
        }
        
        setFavorites(favoriteProducts);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    // Подписываемся на изменения в Firebase
    let unsubscribe: (() => void) | undefined;
    
    if (user) {
      const favRef = ref(database, `users/${user.uid}/favorites`);
      unsubscribe = onValue(favRef, () => {
        fetchFavorites();
      });
    }

    // Слушаем события обновления избранного
    const handleFavoritesUpdated = () => {
      fetchFavorites();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

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
              onToggleFavorite={handleToggleFavorite}
              onAddToCart={handleAddToCart}
              showRating={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
