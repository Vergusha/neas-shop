import { ref, increment, update, get } from 'firebase/database';
import { database } from '../firebaseConfig';

// Track product interactions with different types and weights
interface TrackingOptions {
  incrementClick?: boolean;
  incrementFavorite?: boolean;
  incrementCart?: boolean;
  userId?: string | null; // Optional user ID to avoid duplicate counts
}

/**
 * Track product interactions in Firebase
 * Returns a promise that resolves when tracking is complete
 */
export const trackProductInteraction = async (
  productId: string, 
  options: TrackingOptions = {}
): Promise<void> => {
  if (!productId) return;
  
  try {
    const productStatsRef = ref(database, `productStats/${productId}`);
    const updates: Record<string, any> = {};
    
    // Track product view/click
    if (options.incrementClick) {
      updates['clickCount'] = increment(1);
      
      // If we have a userId, also record unique view
      if (options.userId) {
        // Only increment if user hasn't viewed this product before
        const uniqueViewsRef = ref(database, `productStats/${productId}/uniqueViews/${options.userId}`);
        const snapshot = await get(uniqueViewsRef);
        if (!snapshot.exists()) {
          updates[`uniqueViews/${options.userId}`] = true;
          updates['uniqueViewCount'] = increment(1);
        }
      }
    }
    
    // Track favorite action
    if (options.incrementFavorite) {
      updates['favoriteCount'] = increment(1);
    }
    
    // Track add to cart action
    if (options.incrementCart) {
      updates['cartCount'] = increment(1);
    }
    
    // Update total popularity score with weighted values
    // Click: 1 point, Favorite: 3 points, Cart: 5 points
    let popularityIncrement = 0;
    if (options.incrementClick) popularityIncrement += 1;
    if (options.incrementFavorite) popularityIncrement += 3;
    if (options.incrementCart) popularityIncrement += 5;
    
    if (popularityIncrement > 0) {
      updates['popularityScore'] = increment(popularityIncrement);
    }
    
    // Only perform update if we have changes to make
    if (Object.keys(updates).length > 0) {
      await update(productStatsRef, updates);
      
      // Also update the popularProducts reference for easy querying
      const popularRef = ref(database, `popularProducts/${productId}`);
      await update(popularRef, { 
        lastUpdated: new Date().toISOString(),
        score: increment(popularityIncrement)
      });
    }

    // Определение типа продукта по его ID
    let productCollection: 'mobile' | 'gaming' | 'tv' | 'laptops' = 'mobile';
    
    if (productId.includes('apple-macbook') || 
        productId.includes('-processor-') || 
        productId.includes('-ram-')) {
      productCollection = 'laptops';
    } else if (productId.includes('-wireless-') || 
               productId.includes('-wired-') || 
               productId.includes('gaming')) {
      productCollection = 'gaming';
    } else if (productId.includes('-inch-') || 
               productId.includes('-hdr-') || 
               productId.includes('-tv-')) {
      productCollection = 'tv';
    }
    
    // Получаем текущее значение clickCount из updates, или используем 1, если incrementClick установлен
    const currentClickCount = options.incrementClick ? 1 : 0;
    
    // Передаем обновленное значение в processTrackedProduct
    await processTrackedProduct(productId, productCollection, {
      clickCount: currentClickCount,
      lastClickTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking product interaction:', error);
  }
};

/**
 * Get popularity score for a product
 */
export const getProductPopularityScore = async (productId: string): Promise<number> => {
  try {
    const productStatsRef = ref(database, `productStats/${productId}`);
    const snapshot = await get(productStatsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.popularityScore || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting product popularity:', error);
    return 0;
  }
};

// В функции processTrackedProduct добавьте обработку для ноутбуков
export const processTrackedProduct = async (productId: string, 
  collection: 'mobile' | 'gaming' | 'tv' | 'laptops',  // добавление 'laptops'
  clickData: {
    clickCount: number;
    lastClickTimestamp: string;
  }
) => {
  // ...existing code...
};
