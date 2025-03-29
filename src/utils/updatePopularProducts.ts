import { collection, getDocs } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { db, database } from '../firebaseConfig';

export const updatePopularProducts = async (): Promise<void> => {
  try {
    console.log('Starting to update popular products...');
    
    // Get product tracking data from Realtime Database
    const productStatsRef = ref(database, 'productStats');
    const statsSnapshot = await get(productStatsRef);
    
    if (!statsSnapshot.exists()) {
      console.log('No product stats found in database');
      return;
    }
    
    // Calculate popularity scores based on clicks, favorites, and cart actions
    const products = statsSnapshot.val();
    const productsWithScores = Object.entries(products).map(([id, data]: [string, any]) => {
      // Weights for different actions
      const clickWeight = 1;
      const favoriteWeight = 5;
      const cartWeight = 10;
      
      // Calculate score based on weighted actions
      const clickCount = data.clickCount || 0;
      const favoriteCount = data.favoriteCount || 0;
      const cartCount = data.cartCount || 0;
      
      const score = (clickCount * clickWeight) + 
                    (favoriteCount * favoriteWeight) + 
                    (cartCount * cartWeight);
      
      return {
        id,
        score,
        clickCount,
        favoriteCount,
        cartCount,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Sort by score (highest first)
    productsWithScores.sort((a, b) => b.score - a.score);
    
    // Get the top 100 products
    const topProducts = productsWithScores.slice(0, 100);
    
    // Check if products exist in Firestore collections
    const collections = ['products', 'mobile', 'tv', 'audio', 'gaming', 'laptops'];
    const validProducts = [];
    
    for (const product of topProducts) {
      let found = false;
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const exists = querySnapshot.docs.some(doc => doc.id === product.id);
        
        if (exists) {
          found = true;
          validProducts.push({
            ...product,
            collection: collectionName
          });
          break;
        }
      }
      
      if (!found) {
        console.log(`Product ${product.id} not found in any collection, but has tracking data`);
      }
    }
    
    // Update popularProducts in Realtime Database
    const popularProductsRef = ref(database, 'popularProducts');
    const popularProductsData = validProducts.reduce((obj, product) => {
      obj[product.id] = {
        score: product.score,
        collection: product.collection,
        lastUpdated: product.lastUpdated
      };
      return obj;
    }, {} as Record<string, any>);
    
    await set(popularProductsRef, popularProductsData);
    console.log(`Updated ${validProducts.length} popular products in database`);
    
  } catch (error) {
    console.error('Error updating popular products:', error);
    throw error;
  }
};

export default updatePopularProducts;
