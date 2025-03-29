import { updateAllProductsSearchKeywords } from './updateSearchKeywords';
import { updateGamingKeywords } from './updateGamingKeywords';
import { updateAudioKeywords } from './updateAudioKeywords';
import { updatePopularProducts } from './updatePopularProducts';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const runAllUpdates = async (): Promise<void> => {
  try {
    console.log('Starting comprehensive update of all products...');
    let totalUpdated = 0;
    
    // First check initial status
    console.log('Initial status:');
    await checkSearchStatus();
    
    // Update all products' keywords
    console.log('Updating general keywords...');
    await updateAllProductsSearchKeywords();
    totalUpdated++;
    
    // Run collection-specific updates
    console.log('Updating gaming keywords...');
    await updateGamingKeywords();
    totalUpdated++;
    
    console.log('Updating audio keywords...');
    await updateAudioKeywords();
    totalUpdated++;
    
    // Update popular products
    console.log('Updating popular products...');
    await updatePopularProducts();
    totalUpdated++;
    
    // Final status check
    console.log('Final status:');
    await checkSearchStatus();
    
    console.log(`All updates completed successfully! Updated ${totalUpdated} collections.`);
  } catch (error) {
    console.error('Error during product updates:', error);
    throw error;
  }
};

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

export default runAllUpdates;
