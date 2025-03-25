import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Функция для обновления ключевых слов только для игровых продуктов
export const updateGamingKeywords = async () => {
  try {
    const collectionName = 'gaming';
    const productsRef = collection(db, collectionName);
    const snapshot = await getDocs(productsRef);
    let updatedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const productData = docSnap.data();
      console.log(`Updating keywords for ${collectionName}/${docSnap.id}:`, productData.name);
      
      const keywords: string[] = [];
      
      // Добавляем ключевые слова из имени продукта
      if (productData.name) {
        // Разбиваем имя на слова
        const nameWords = productData.name.toLowerCase().split(/\s+/);
        for (const word of nameWords) {
          if (word.length > 2) {
            keywords.push(word);
          }
        }
      }
      
      // Добавляем бренд и модель
      if (productData.brand) {
        const brand = productData.brand.toLowerCase();
        keywords.push(brand);
        
        if (productData.model) {
          const model = productData.model.toLowerCase();
          keywords.push(model);
          keywords.push(`${brand} ${model}`);
          
          // Добавляем части модели для более точного поиска
          // Например, для "V3 Pro" добавляем "v3" и "pro" отдельно
          const modelParts = model.split(/\s+/);
          for (const part of modelParts) {
            if (part.length >= 2) {
              keywords.push(part);
              keywords.push(`${brand} ${part}`);
            }
          }
        }
      }
      
      // Добавляем версию/память, если она есть
      if (productData.memory && productData.memory.length > 0) {
        keywords.push(productData.memory.toLowerCase());
        
        // Если память содержит версию (например "V3"), добавляем её отдельно
        if (productData.memory.toLowerCase().includes('v3')) {
          keywords.push('v3');
        }
        if (productData.memory.toLowerCase().includes('pro')) {
          keywords.push('pro');
        }
      }
      
      // Основные геймерские ключевые слова
      keywords.push('gaming', 'game', 'gamer');
      
      // Добавляем тип устройства - критическое ключевое слово
      if (productData.deviceType) {
        const deviceType = productData.deviceType.toLowerCase();
        keywords.push(deviceType);
        
        // Ограниченный набор переводов для поддержки локализованного поиска
        // без создания слишком большого количества вариантов
        const deviceTypeMap = {
          'mouse': ['мышь', 'игровая мышь'],
          'keyboard': ['клавиатура', 'игровая клавиатура'],
          'headset': ['наушники', 'гарнитура'],
          'controller': ['геймпад', 'джойстик'],
          'mousepad': ['коврик'],
          'chair': ['кресло']
        };
        
        if (deviceTypeMap[deviceType]) {
          keywords.push(...deviceTypeMap[deviceType]);
        }
        
        // Добавляем бренд + тип устройства (важно для поиска)
        if (productData.brand) {
          keywords.push(`${productData.brand.toLowerCase()} ${deviceType}`);
        }
      }
      
      // Тип подключения может быть важен для поиска
      if (productData.connectivity) {
        const connectivity = productData.connectivity.toLowerCase();
        keywords.push(connectivity);
        
        // Минимальный набор переводов
        if (connectivity === 'wired') {
          keywords.push('проводной');
        } else if (connectivity === 'wireless') {
          keywords.push('беспроводной');
        }
      }
      
      // Удаляем дубликаты и пустые значения
      const uniqueKeywords = Array.from(new Set(
        keywords.filter(k => k && k.trim().length > 1)
      )).map(k => k.trim());
      
      // Логируем для проверки
      console.log(`Keywords for ${docSnap.id}:`, uniqueKeywords);
      
      await updateDoc(doc(db, collectionName, docSnap.id), {
        searchKeywords: uniqueKeywords,
        updatedAt: new Date().toISOString()
      });
      
      updatedCount++;
    }
    
    console.log(`Successfully updated ${updatedCount} gaming products with optimized keywords`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating gaming keywords:', error);
    throw error;
  }
};

export default updateGamingKeywords;
