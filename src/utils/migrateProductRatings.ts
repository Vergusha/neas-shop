import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import { defaultAvatarSVG, getBestAvatarUrl } from './AvatarHelper';

// Add this interface at the top of the file
interface ProductData {
  rating: number;
  reviewCount: number;
  [key: string]: any; // For any other properties
}

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
        const productData = docSnap.data() as ProductData;
        
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

// Improved function to update user avatars in reviews
export const updateReviewAvatars = async () => {
  try {
    console.log('Starting update of user avatars in reviews...');
    const database = getDatabase();
    
    // Get all users to access their avatar URLs
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      console.log('No users found in database');
      return;
    }
    
    const users = usersSnapshot.val();
    const userAvatars: Record<string, string> = {};
    
    // Create map of user IDs to avatar URLs
    for (const [userId, userData] of Object.entries(users)) {
      try {
        // Try to get avatar for each user using our helper
        const mockedUser = {
          uid: userId,
          ...userData as any
        };
        const avatarUrl = getBestAvatarUrl(mockedUser);
        
        if (avatarUrl && avatarUrl !== defaultAvatarSVG) {
          userAvatars[userId] = avatarUrl;
        }
      } catch (error) {
        console.error(`Error getting avatar for user ${userId}:`, error);
      }
    }
    
    console.log(`Found avatar URLs for ${Object.keys(userAvatars).length} users`);
    
    // Get all product reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (!reviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const productsData = reviewsSnapshot.val();
    let updatedReviewsCount = 0;
    
    // Process each product's reviews
    for (const [productId, productReviews] of Object.entries(productsData)) {
      console.log(`Processing reviews for product ${productId}`);
      const reviews = productReviews as Record<string, any>;
      
      for (const [reviewId, review] of Object.entries(reviews)) {
        const userId = review.userId;
        
        // If we have this user's avatar URL and the review doesn't have a valid avatar
        if (userId && userAvatars[userId] && 
            (!review.userAvatar || 
             review.userAvatar === '' || 
             review.userAvatar === defaultAvatarSVG || 
             review.userAvatar.includes('data:image/svg+xml;base64'))) {
          console.log(`- Updating avatar for review ${reviewId} by user ${userId}`);
          await set(ref(database, `productReviews/${productId}/${reviewId}/userAvatar`), userAvatars[userId]);
          updatedReviewsCount++;
        }
      }
    }
    
    console.log(`Avatar update completed. Updated ${updatedReviewsCount} reviews.`);
  } catch (error) {
    console.error('Error updating avatars in reviews:', error);
  }
};

/**
 * Utility function to refresh all user avatars in reviews from user profiles
 * This can be called from the admin panel to update reviews with the most recent avatars
 */
export const refreshAllAvatarsInReviews = async () => {
  try {
    console.log('Starting avatar refresh operation for all reviews...');
    const database = getDatabase();
    
    // Get all users with their avatar URLs
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      console.log('No users found in database');
      return;
    }
    
    // Create a map of user IDs to their avatar URLs
    const userAvatars: Record<string, string> = {};
    const users = usersSnapshot.val();
    
    Object.entries(users).forEach(([userId, userData]: [string, any]) => {
      // Take avatarURL if it exists in user data
      if (userData.avatarURL) {
        userAvatars[userId] = userData.avatarURL;
      }
    });
    
    console.log(`Found avatar URLs for ${Object.keys(userAvatars).length} users`);
    
    // Get all reviews across all products
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (!reviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const productsReviews = reviewsSnapshot.val();
    let updatedCount = 0;
    
    // Process each product's reviews
    for (const [productId, productReviews] of Object.entries(productsReviews)) {
      const reviews = productReviews as Record<string, any>;
      
      // Process each review for this product
      for (const [reviewId, review] of Object.entries(reviews)) {
        const userId = review.userId;
        
        // If we have an avatar URL for this user and it's different from the one in the review
        if (userId && userAvatars[userId] && (!review.userAvatar || review.userAvatar !== userAvatars[userId])) {
          console.log(`Updating avatar for review ${reviewId} by user ${userId}`);
          
          // Update the review with the latest avatar URL
          await set(ref(database, `productReviews/${productId}/${reviewId}/userAvatar`), userAvatars[userId]);
          updatedCount++;
        }
      }
    }
    
    console.log(`Avatar refresh completed! Updated ${updatedCount} reviews with fresh avatar URLs.`);
    return updatedCount;
  } catch (error) {
    console.error('Error refreshing avatars in reviews:', error);
    throw error;
  }
};

// Function to ensure all reviews have required fields
export const validateReviewFields = async () => {
  try {
    console.log('Starting validation of review fields...');
    const database = getDatabase();
    
    // Get all product reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (!reviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const productsData = reviewsSnapshot.val();
    let fixedReviewsCount = 0;
    
    // Required fields for a review
    const requiredFields = {
      userId: '',
      productId: '',
      userName: 'Anonymous',
      rating: 5,
      text: '',
      date: new Date().toISOString(),
      userAvatar: '',
      helpful: 0
    };
    
    // Process each product's reviews
    for (const [productId, productReviews] of Object.entries(productsData)) {
      console.log(`Validating reviews for product ${productId}`);
      const reviews = productReviews as Record<string, any>;
      
      for (const [reviewId, review] of Object.entries(reviews)) {
        let needsUpdate = false;
        const updatedReview = { ...review };
        
        // Check for missing fields
        Object.entries(requiredFields).forEach(([field, defaultValue]) => {
          if (updatedReview[field] === undefined) {
            needsUpdate = true;
            updatedReview[field] = field === 'productId' ? productId : defaultValue;
            console.log(`- Adding missing field '${field}' to review ${reviewId}`);
          }
        });
        
        if (needsUpdate) {
          await set(ref(database, `productReviews/${productId}/${reviewId}`), updatedReview);
          fixedReviewsCount++;
        }
      }
    }
    
    console.log(`Review validation completed. Fixed ${fixedReviewsCount} reviews.`);
  } catch (error) {
    console.error('Error validating review fields:', error);
  }
};

// Function to clean up reviews from deleted users
export const cleanupDeletedUserReviews = async () => {
  try {
    console.log('Starting cleanup of reviews from deleted users...');
    const database = getDatabase();
    
    // Get all users
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      console.log('No users found in database');
      return;
    }
    
    const users = usersSnapshot.val();
    const validUserIds = new Set(Object.keys(users));
    
    console.log(`Found ${validUserIds.size} valid users`);
    
    // Get all product reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (!reviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const productsData = reviewsSnapshot.val();
    let removedReviewsCount = 0;
    
    // Process each product's reviews
    for (const [productId, productReviews] of Object.entries(productsData)) {
      console.log(`Processing reviews for product ${productId}`);
      const reviews = productReviews as Record<string, any>;
      
      for (const [reviewId, review] of Object.entries(reviews)) {
        const userId = review.userId;
        
        // If the user doesn't exist anymore, remove the review
        if (userId && !validUserIds.has(userId)) {
          console.log(`- Removing review ${reviewId} from deleted user ${userId}`);
          await set(ref(database, `productReviews/${productId}/${reviewId}`), null);
          removedReviewsCount++;
        }
      }
    }
    
    console.log(`Cleanup completed. Removed ${removedReviewsCount} reviews from deleted users.`);
    
    // If reviews were removed, update product ratings
    if (removedReviewsCount > 0) {
      await recalculateAllProductRatings();
    }
  } catch (error) {
    console.error('Error cleaning up reviews:', error);
  }
};

// Helper function to recalculate all product ratings
export const recalculateAllProductRatings = async () => {
  try {
    console.log('Recalculating all product ratings...');
    const database = getDatabase();
    
    // Get all product reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    if (!reviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const productsData = reviewsSnapshot.val();
    let updatedProductsCount = 0;
    
    // Process each product
    for (const [productId, productReviews] of Object.entries(productsData)) {
      const reviews = productReviews as Record<string, any>;
      const reviewsArray = Object.values(reviews);
      
      if (reviewsArray.length === 0) {
        continue;
      }
      
      // Calculate average rating
      const totalRating = reviewsArray.reduce((sum, review) => sum + (review.rating || 0), 0);
      const averageRating = totalRating / reviewsArray.length;
      
      // Update in Realtime Database
      await update(ref(database, `products/${productId}`), {
        rating: averageRating,
        reviewCount: reviewsArray.length
      });
      
      // Try to update in Firestore
      try {
        const collections = ['mobile', 'products', 'tv'];
        let updated = false;
        
        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, productId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, {
              rating: averageRating,
              reviewCount: reviewsArray.length
            });
            updated = true;
            break;
          }
        }
        
        if (updated) {
          updatedProductsCount++;
        }
      } catch (error) {
        console.error(`Error updating Firestore for product ${productId}:`, error);
      }
    }
    
    console.log(`Ratings recalculation completed. Updated ${updatedProductsCount} products.`);
  } catch (error) {
    console.error('Error recalculating ratings:', error);
  }
};

// Function to reset all product ratings to zero
export const resetAllProductRatings = async () => {
  try {
    console.log('Starting reset of all product ratings...');
    const database = getDatabase();
    
    // Step 1: Reset in Realtime Database
    const productsRef = ref(database, 'products');
    const productsSnapshot = await get(productsRef);
    
    if (productsSnapshot.exists()) {
      const productsData = productsSnapshot.val();
      let resetCount = 0;
      
      for (const [productId, productData] of Object.entries(productsData)) {
        const typedProductData = productData as ProductData;
        if (typedProductData && (typedProductData.rating !== 0 || typedProductData.reviewCount !== 0)) {
          await update(ref(database, `products/${productId}`), {
            rating: 0,
            reviewCount: 0
          });
          resetCount++;
        }
      }
      
      console.log(`Reset ${resetCount} products in Realtime Database`);
    }
    
    // Step 2: Reset in Firestore
    const collections = ['mobile', 'products', 'tv'];
    let firestoreResetCount = 0;
    
    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const querySnapshot = await getDocs(collectionRef);
      
      for (const docSnap of querySnapshot.docs) {
        const productData = docSnap.data() as ProductData;
        if (productData.rating !== 0 || productData.reviewCount !== 0) {
          await updateDoc(doc(db, collectionName, docSnap.id), {
            rating: 0,
            reviewCount: 0
          });
          firestoreResetCount++;
        }
      }
    }
    
    console.log(`Reset ${firestoreResetCount} products in Firestore`);
    console.log('Product ratings reset completed successfully!');
  } catch (error) {
    console.error('Error resetting product ratings:', error);
  }
};

// Function to check and repair product ratings based on actual reviews
export const verifyAndRepairProductRatings = async () => {
  try {
    console.log('Starting verification of product ratings...');
    const database = getDatabase();
    
    // Get all products
    const productsRef = ref(database, 'products');
    const productsSnapshot = await get(productsRef);
    
    if (!productsSnapshot.exists()) {
      console.log('No products found');
      return;
    }
    
    const products = productsSnapshot.val();
    
    // Get all reviews
    const reviewsRef = ref(database, 'productReviews');
    const reviewsSnapshot = await get(reviewsRef);
    
    // Map to store actual reviews count and rating by product
    const actualReviewStats: Record<string, {count: number, totalRating: number}> = {};
    
    if (reviewsSnapshot.exists()) {
      const reviewsData = reviewsSnapshot.val();
      
      // Calculate actual review stats for each product
      for (const [productId, productReviews] of Object.entries(reviewsData)) {
        const reviews = productReviews as Record<string, any>;
        const reviewsArray = Object.values(reviews);
        
        if (reviewsArray.length > 0) {
          const totalRating = reviewsArray.reduce((sum, review) => sum + (review.rating || 0), 0);
          actualReviewStats[productId] = {
            count: reviewsArray.length,
            totalRating: totalRating
          };
        } else {
          // Product has reviews node but no actual reviews
          actualReviewStats[productId] = {
            count: 0,
            totalRating: 0
          };
        }
      }
    }
    
    // Check and update products
    let fixedCount = 0;
    let mismatchCount = 0;
    
    for (const [productId, productData] of Object.entries(products)) {
      const typedProductData = productData as ProductData;
      // Check if product has stored rating but no actual reviews
      if (!actualReviewStats[productId] && 
          (typedProductData.rating !== 0 || typedProductData.reviewCount !== 0)) {
        console.log(`Product ${productId} has rating but no reviews - resetting`);
        await update(ref(database, `products/${productId}`), {
          rating: 0,
          reviewCount: 0
        });
        fixedCount++;
        continue;
      }
      
      // Check for mismatch between stored and actual values
      if (actualReviewStats[productId]) {
        const { count, totalRating } = actualReviewStats[productId];
        const actualRating = count > 0 ? totalRating / count : 0;
        
        // If there's a significant difference or review count mismatch
        if (Math.abs(actualRating - typedProductData.rating) > 0.01 || 
            typedProductData.reviewCount !== count) {
          console.log(`Product ${productId} rating mismatch - fixing`);
          console.log(`  Stored: ${typedProductData.rating.toFixed(2)} (${typedProductData.reviewCount} reviews)`);
          console.log(`  Actual: ${actualRating.toFixed(2)} (${count} reviews)`);
          
          await update(ref(database, `products/${productId}`), {
            rating: count > 0 ? actualRating : 0,
            reviewCount: count
          });
          mismatchCount++;
        }
      }
    }
    
    console.log(`Fixed ${fixedCount} products with no reviews`);
    console.log(`Corrected ${mismatchCount} products with rating mismatches`);
    console.log('Verification completed!');
  } catch (error) {
    console.error('Error verifying product ratings:', error);
  }
};
