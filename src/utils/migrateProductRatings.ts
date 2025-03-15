import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getDatabase, ref, set, get } from 'firebase/database';
import { db } from '../firebaseConfig';

/**
 * This utility script will update your existing products to add rating fields.
 * Run this once to migrate your database.
 */
export const migrateProductRatings = async () => {
  try {
    console.log('Starting product ratings migration...');
    
    const collections = ['mobile', 'products', 'tv'];
    const database = getDatabase();
    
    for (const collectionName of collections) {
      console.log(`Processing collection: ${collectionName}`);
      
      const productsRef = collection(db, collectionName);
      const querySnapshot = await getDocs(productsRef);
      
      for (const docSnap of querySnapshot.docs) {
        const productId = docSnap.id;
        const productData = docSnap.data();
        
        // Skip if already has rating in Firestore
        if (productData.rating !== undefined) {
          console.log(`- Skipping ${productId} in Firestore: already has rating`);
        } else {
          console.log(`- Updating ${productId} in Firestore`);
          await updateDoc(doc(db, collectionName, productId), {
            rating: 0,
            reviewCount: 0
          });
        }
        
        // Also update the Realtime Database regardless
        const realtimeRef = ref(database, `products/${productId}`);
        const realtimeSnap = await get(realtimeRef);
        
        if (!realtimeSnap.exists() || realtimeSnap.val().rating === undefined) {
          console.log(`- Updating ${productId} in Realtime Database`);
          await set(realtimeRef, {
            rating: productData.rating || 0,
            reviewCount: productData.reviewCount || 0
          });
        }
        
        // Ensure there's a reviews collection for each product
        await set(ref(database, `productReviews/${productId}`), {});

        // Fix existing reviews by adding the productId field
        try {
          const reviewsRef = ref(database, `productReviews/${productId}`);
          const reviewsSnapshot = await get(reviewsRef);
          
          if (reviewsSnapshot.exists()) {
            const reviewsData = reviewsSnapshot.val();
            let needsUpdate = false;
            
            // Check each review and update if necessary
            Object.entries(reviewsData).forEach(async ([reviewId, reviewData]: [string, any]) => {
              if (!reviewData.productId) {
                needsUpdate = true;
                await set(ref(database, `productReviews/${productId}/${reviewId}/productId`), productId);
              }
            });
            
            if (needsUpdate) {
              console.log(`- Added missing productId to reviews for product ${productId}`);
            }
          }
        } catch (error) {
          console.error(`Error updating reviews for ${productId}:`, error);
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Add a new utility function to clean up duplicate reviews
export const cleanupDuplicateReviews = async () => {
  try {
    console.log('Starting cleanup of duplicate reviews...');
    const database = getDatabase();
    
    // Get all product reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (reviewsSnapshot.exists()) {
      const productsData = reviewsSnapshot.val();
      
      for (const [productId, productReviews] of Object.entries(productsData)) {
        console.log(`Processing reviews for product ${productId}`);
        const reviews = productReviews as Record<string, any>;
        const userReviewMap = new Map<string, {id: string, date: string}>();
        
        // Find duplicate reviews by same user
        for (const [reviewId, review] of Object.entries(reviews)) {
          const userId = review.userId;
          
          // If we already have a review by this user
          if (userReviewMap.has(userId)) {
            const existingReview = userReviewMap.get(userId)!;
            const existingDate = new Date(existingReview.date).getTime();
            const newDate = new Date(review.date).getTime();
            
            if (newDate > existingDate) {
              // This is a newer review, mark the old one for deletion
              console.log(`- Found duplicate review for user ${userId}, keeping newer one`);
              const oldReviewRef = ref(database, `productReviews/${productId}/${existingReview.id}`);
              await set(oldReviewRef, null);
              userReviewMap.set(userId, {id: reviewId, date: review.date});
            } else {
              // This is an older review, delete it
              console.log(`- Found duplicate review for user ${userId}, keeping older one`);
              const oldReviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
              await set(oldReviewRef, null);
            }
          } else {
            userReviewMap.set(userId, {id: reviewId, date: review.date});
          }
        }
      }
    }
    
    console.log('Duplicate review cleanup completed successfully!');
  } catch (error) {
    console.error('Duplicate review cleanup failed:', error);
  }
};
