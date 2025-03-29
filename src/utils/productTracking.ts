import { database } from '../firebaseConfig';
import { ref, increment, update, get, set } from 'firebase/database';
import { findProductCollection } from './productUtils';

// Track product interactions with different types and weights
interface TrackingOptions {
  incrementClick?: boolean;
  incrementFavorite?: boolean;
  incrementCart?: boolean;
  userId?: string | null; // Optional user ID to avoid duplicate counts
}

export const trackProductInteraction = async (
  productId: string, 
  options: TrackingOptions
): Promise<void> => {
  try {
    // Skip tracking if no action to track
    if (!options.incrementClick && !options.incrementFavorite && !options.incrementCart) {
      return;
    }
    
    // Reference to product stats in Realtime Database
    const productStatsRef = ref(database, `productStats/${productId}`);
    
    // Check if we already have tracking data for this product
    const snapshot = await get(productStatsRef);
    
    // If this is a new product, initialize tracking object
    if (!snapshot.exists()) {
      // Determine which collection the product belongs to
      const productData = await findProductCollection(productId);
      
      if (productData) {
        // Initialize product with collection info
        await set(productStatsRef, {
          collection: productData.collection,
          clickCount: options.incrementClick ? 1 : 0,
          favoriteCount: options.incrementFavorite ? 1 : 0,
          cartCount: options.incrementCart ? 1 : 0,
          lastUpdated: new Date().toISOString()
        });
        
        // Also update the collections tracking node
        const collectionStatsRef = ref(database, `collectionStats/${productData.collection}/${productId}`);
        await set(collectionStatsRef, {
          clickCount: options.incrementClick ? 1 : 0,
          favoriteCount: options.incrementFavorite ? 1 : 0,
          cartCount: options.incrementCart ? 1 : 0,
          lastUpdated: new Date().toISOString()
        });
        
        return;
      }
    }
    
    // Prepare update object for existing product
    const updates: Record<string, any> = {
      lastUpdated: new Date().toISOString()
    };
    
    if (options.incrementClick) {
      updates.clickCount = increment(1);
    }
    
    if (options.incrementFavorite) {
      updates.favoriteCount = increment(1);
    }
    
    if (options.incrementCart) {
      updates.cartCount = increment(1);
    }
    
    // Update product stats
    await update(productStatsRef, updates);
    
    // Update collection-specific stats if we know the collection
    if (snapshot.exists() && snapshot.val().collection) {
      const collection = snapshot.val().collection;
      const collectionStatsRef = ref(database, `collectionStats/${collection}/${productId}`);
      await update(collectionStatsRef, updates);
    }
    
  } catch (error) {
    console.error('Error tracking product interaction:', error);
  }
};
