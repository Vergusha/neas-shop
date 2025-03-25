import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  modelNumber?: string;
  searchKeywords?: string[];
}

// Функция для генерации поисковых ключевых слов из названия продукта
export const generateSearchKeywords = (name: string, modelNumber?: string): string[] => {
  const keywords: string[] = [];
  
  // Обработка основного названия
  const words = name.toLowerCase().split(' ');
  
  // Добавляем отдельные слова
  for (const word of words) {
    if (word.length > 2) {
      keywords.push(word);
    }
  }
  
  // Добавляем комбинации слов
  for (let i = 0; i < words.length; i++) {
    let combined = '';
    for (let j = i; j < words.length; j++) {
      combined += words[j] + ' ';
      keywords.push(combined.trim());
    }
  }

  // Добавляем вариации номера модели, если он указан
  if (modelNumber) {
    keywords.push(modelNumber.toLowerCase());
    // Удаляем пробелы и дефисы для альтернативного поиска
    const cleanModelNumber = modelNumber.toLowerCase().replace(/[\s-]/g, '');
    if (cleanModelNumber !== modelNumber.toLowerCase()) {
      keywords.push(cleanModelNumber);
    }
  }
  
  return Array.from(new Set(keywords)); // удаляем дубликаты
};

// Функция для обновления ключевых слов для всех продуктов
export const updateAllProductsSearchKeywords = async () => {
  try {
    // Получаем все коллекции, включая gaming
    const collectionNames = ['products', 'mobile', 'tv', 'gaming'];
    let updatedCount = 0;
    
    for (const collectionName of collectionNames) {
      const productsRef = collection(db, collectionName);
      const snapshot = await getDocs(productsRef);
      
      for (const docSnap of snapshot.docs) {
        const productData = docSnap.data();
        console.log(`Updating keywords for ${collectionName}/${docSnap.id}:`, {
          name: productData.name,
          brand: productData.brand,
          model: productData.model,
          deviceType: productData.deviceType
        });
        
        // Базовые ключевые слова из имени и номера модели
        let keywords: string[] = [];
        
        // Используем name, если он есть
        if (productData.name) {
          keywords = keywords.concat(generateSearchKeywords(
            productData.name,
            productData.modelNumber || null
          ));
        }
        
        // Добавляем бренд и модель напрямую, так как они часто ищутся
        if (productData.brand) {
          keywords.push(productData.brand.toLowerCase());
          
          // Если есть модель, добавляем комбинацию бренда и модели
          if (productData.model) {
            keywords.push(
              productData.model.toLowerCase(),
              `${productData.brand.toLowerCase()} ${productData.model.toLowerCase()}`
            );
          }
        }
        
        // Специфичные ключевые слова для игровой периферии
        if (collectionName === 'gaming') {
          // Добавляем "игровой", "gaming" и "gamer" для всех игровых продуктов
          keywords.push('gaming', 'игровой', 'игровая', 'gamer', 'геймерский');
          
          // Добавляем тип устройства
          if (productData.deviceType) {
            const deviceType = productData.deviceType.toLowerCase();
            keywords.push(deviceType);
            
            // Добавляем локализованные варианты для типов устройств
            const deviceTranslations: Record<string, string[]> = {
              'mouse': ['мышь', 'мышка', 'gaming mouse', 'игровая мышь', 'мышь для игр'],
              'keyboard': ['клавиатура', 'gaming keyboard', 'игровая клавиатура', 'клавиатура для игр'],
              'headset': ['наушники', 'гарнитура', 'gaming headset', 'игровая гарнитура', 'гарнитура для игр'],
              'controller': ['контроллер', 'геймпад', 'джойстик', 'gamepad', 'joystick', 'игровой контроллер'],
              'mousepad': ['коврик', 'коврик для мыши', 'игровой коврик'],
              'chair': ['кресло', 'игровое кресло', 'gaming chair']
            };
            
            if (deviceTranslations[deviceType]) {
              keywords = keywords.concat(deviceTranslations[deviceType]);
            }
            
            // Добавляем бренд + тип устройства
            if (productData.brand) {
              keywords.push(`${productData.brand.toLowerCase()} ${deviceType}`);
              
              // Если это распространенный бренд, добавляем вариации названия
              if (['razer', 'logitech', 'hyperx', 'steelseries'].includes(productData.brand.toLowerCase())) {
                keywords.push(productData.brand.toLowerCase());
              }
              
              // Например: razer mouse, razer мышь
              if (deviceTranslations[deviceType]) {
                for (const translation of deviceTranslations[deviceType]) {
                  keywords.push(`${productData.brand.toLowerCase()} ${translation}`);
                }
              }
            }
          }
          
          // Добавляем connectivity как ключевое слово
          if (productData.connectivity) {
            const connectivity = productData.connectivity.toLowerCase();
            keywords.push(connectivity);
            
            // Добавляем локализованные варианты для подключения
            const connectivityTranslations: Record<string, string[]> = {
              'wired': ['проводной', 'проводная', 'с проводом'],
              'wireless': ['беспроводной', 'беспроводная', 'без провода', 'wireless']
            };
            
            if (connectivityTranslations[connectivity]) {
              keywords = keywords.concat(connectivityTranslations[connectivity]);
            }
          }
        }
        
        // Удаляем дубликаты и нормализуем ключевые слова
        const uniqueKeywords = Array.from(new Set(keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 1)));
        
        console.log(`Generated ${uniqueKeywords.length} keywords for ${collectionName}/${docSnap.id}:`, uniqueKeywords);
        
        // Обновляем документ с новыми ключевыми словами
        await updateDoc(doc(db, collectionName, docSnap.id), {
          searchKeywords: uniqueKeywords,
          updatedAt: new Date().toISOString()
        });
        
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated search keywords for ${updatedCount} products`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating search keywords:', error);
    throw error;
  }
};
