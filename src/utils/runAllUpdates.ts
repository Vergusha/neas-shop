import { updateAllProductsSearchKeywords } from './updateSearchKeywords';
import { updateGamingKeywords } from './updateGamingKeywords';
import { updateAudioKeywords } from './updateAudioKeywords';
import { updatePopularProducts } from './updatePopularProducts';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// (Файл удалён как неиспользуемый и устаревший скрипт массового запуска обновлений)

export const checkSearchStatus = async (): Promise<void> => {
  try {
    console.log('Checking search status...');
    
    const collections = ['products', 'mobile', 'tv', 'audio', 'gaming', 'laptops'];
    
    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      let withKeywords = 0;
      let withoutKeywords = 0;
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
          withKeywords++;
        } else {
          withoutKeywords++;
          console.log(`Missing keywords in ${collectionName}/${doc.id}:`, {
            name: data.name,
            subtype: data.subtype
          });
        }
      });
      
      console.log(`Collection ${collectionName}:`, {
        total: querySnapshot.size,
        withKeywords,
        withoutKeywords
      });
    }
  } catch (error) {
    console.error('Error checking search status:', error);
  }
};
