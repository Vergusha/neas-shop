import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface TestResults {
  total: number;
  withKeywords: number;
  withoutKeywords: number;
  keywords: Record<string, number>;
  brands: Record<string, number>;
  deviceTypes: Record<string, number>;
}

/**
 * Утилита для диагностики проблем с поиском игровых товаров
 * Вызывайте эту функцию в консоли браузера, чтобы проверить ключевые слова
 * для товаров из коллекции gaming
 */
export const testGamingSearch = async (): Promise<TestResults> => {
  const results: TestResults = {
    total: 0,
    withKeywords: 0,
    withoutKeywords: 0,
    keywords: {},
    brands: {},
    deviceTypes: {}
  };
  
  try {
    console.log('Testing gaming products search keywords...');
    
    const collectionName = 'gaming';
    const gamesRef = collection(db, collectionName);
    const snapshot = await getDocs(gamesRef);
    
    results.total = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      const searchKeywords = data.searchKeywords || [];
      const brand = data.brand?.toLowerCase() || 'unknown';
      const deviceType = data.deviceType?.toLowerCase() || 'unknown';
      
      // Count products by brand
      if (!results.brands[brand]) {
        results.brands[brand] = 0;
      }
      results.brands[brand] += 1;
      
      // Count products by device type
      if (!results.deviceTypes[deviceType]) {
        results.deviceTypes[deviceType] = 0;
      }
      results.deviceTypes[deviceType] += 1;
      
      if (Array.isArray(searchKeywords) && searchKeywords.length > 0) {
        results.withKeywords++;
        
        // Count keyword types
        searchKeywords.forEach(keyword => {
          if (typeof keyword === 'string') {
            // Categorize keywords
            if (keyword === brand) {
              if (!results.keywords['brand']) {
                results.keywords['brand'] = 0;
              }
              results.keywords['brand'] += 1;
            } else if (keyword === deviceType) {
              if (!results.keywords['deviceType']) {
                results.keywords['deviceType'] = 0;
              }
              results.keywords['deviceType'] += 1;
            } else if (keyword === 'gaming') {
              if (!results.keywords['gaming']) {
                results.keywords['gaming'] = 0;
              }
              results.keywords['gaming'] += 1;
            } else if (keyword.includes(brand)) {
              if (!results.keywords['includes-brand']) {
                results.keywords['includes-brand'] = 0;
              }
              results.keywords['includes-brand'] += 1;
            }
          }
        });
        
        console.log(`[With Keywords] ${docId}: ${data.name} (${brand} ${deviceType}), ${searchKeywords.length} keywords`);
      } else {
        results.withoutKeywords++;
        console.warn(`[NO Keywords] ${docId}: ${data.name} (${brand} ${deviceType})`);
      }
    });
    
    console.log('Testing complete. Results:', results);
    
    // Проверка наличия Razer продуктов
    if (results.brands['razer'] && results.brands['razer'] > 0) {
      console.log(`Found ${results.brands['razer']} Razer products`);
      
      // Дополнительно проверим каждый Razer продукт
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.brand?.toLowerCase() === 'razer') {
          console.log(`Razer product: ${doc.id} - ${data.name}`, {
            deviceType: data.deviceType,
            keywordsCount: data.searchKeywords?.length || 0
          });
        }
      });
    } else {
      console.warn('No Razer products found in gaming collection!');
    }
    
    return results;
  } catch (error) {
    console.error('Error testing gaming search:', error);
    throw error;
  }
};

export default testGamingSearch;
