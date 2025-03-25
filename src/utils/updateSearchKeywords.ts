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
        
        if (productData.name) {
          // Генерируем ключевые слова для продукта
          const keywords = generateSearchKeywords(
            productData.name,
            productData.modelNumber || null
          );
          
          // Добавляем дополнительные ключевые слова для специфичных полей в зависимости от категории
          if (collectionName === 'gaming' && productData.deviceType) {
            // Добавляем тип устройства как ключевое слово
            keywords.push(productData.deviceType.toLowerCase());
            
            // Если это мышка, добавляем общие термины для поиска
            if (productData.deviceType.toLowerCase() === 'mouse') {
              keywords.push('mouse', 'мышь', 'мышка', 'gaming mouse', 'игровая мышь');
            }
            
            // Если есть бренд, добавляем комбинацию бренда и типа устройства
            if (productData.brand) {
              keywords.push(
                `${productData.brand.toLowerCase()} ${productData.deviceType.toLowerCase()}`
              );
            }
          }
          
          // Обновляем документ с новыми ключевыми словами
          await updateDoc(doc(db, collectionName, docSnap.id), {
            searchKeywords: keywords,
            updatedAt: new Date().toISOString()
          });
          
          updatedCount++;
        }
      }
    }
    
    console.log(`Successfully updated search keywords for ${updatedCount} products`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating search keywords:', error);
    throw error;
  }
};
