import { ref, set, get } from 'firebase/database';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { database, db } from '../firebaseConfig';

export const updatePopularProducts = async () => {
  try {
    // Собираем данные о взаимодействии с продуктами (клики, добавления в корзину, избранное)
    const statsRef = ref(database, 'productStats');
    const statsSnapshot = await get(statsRef);
    
    if (!statsSnapshot.exists()) {
      console.log('No product stats found');
      return;
    }
    
    const stats = statsSnapshot.val();
    
    // Преобразуем объект в массив и рассчитываем общий score для каждого продукта
    const productsWithScore = Object.entries(stats)
      .map(([id, data]: [string, any]) => {
        // Рассчитываем score на основе различных метрик взаимодействия
        const clickWeight = 1;
        const cartWeight = 5;
        const favoriteWeight = 3;
        
        const clickCount = data.clickCount || 0;
        const cartCount = data.cartCount || 0;
        const favoriteCount = data.favoriteCount || 0;
        
        const score = (clickCount * clickWeight) + 
                      (cartCount * cartWeight) + 
                      (favoriteCount * favoriteWeight);
                      
        return {
          id,
          score,
          lastInteraction: data.lastInteraction || new Date().toISOString()
        };
      })
      .sort((a, b) => b.score - a.score) // Сортируем по убыванию score
      .slice(0, 20); // Ограничиваем количество популярных продуктов
    
    // Проверяем существование продуктов в Firestore (некоторые могли быть удалены)
    const validProducts = [];
    const collections = ['products', 'mobile', 'tv', 'gaming'];
    
    for (const product of productsWithScore) {
      let found = false;
      
      for (const collectionName of collections) {
        if (found) break;
        
        try {
          const productDoc = await getDoc(doc(db, collectionName, product.id));
          if (productDoc.exists()) {
            found = true;
            validProducts.push(product);
          }
        } catch (err) {
          console.error(`Error checking product ${product.id} in ${collectionName}:`, err);
        }
      }
    }
    
    // Сохраняем обновленную информацию о популярных продуктах
    const popularProductsRef = ref(database, 'popularProducts');
    
    // Преобразуем массив в объект, где ключами являются ID продуктов
    const popularProductsData = validProducts.reduce((acc, product) => {
      acc[product.id] = {
        score: product.score,
        lastUpdated: new Date().toISOString()
      };
      return acc;
    }, {});
    
    await set(popularProductsRef, popularProductsData);
    
    console.log(`Successfully updated ${validProducts.length} popular products`);
    return validProducts;
  } catch (error) {
    console.error('Error updating popular products:', error);
    throw error;
  }
};

export default updatePopularProducts;
