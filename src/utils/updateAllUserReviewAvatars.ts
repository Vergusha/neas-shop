import { getAuth, updateProfile } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';
import { updateAvatarUrl } from './AvatarHelper';

/**
 * Updates all reviews by the current user with their current avatar
 * This can be run from the console with:
 * import { updateAllUserReviewAvatars } from './utils/updateAllUserReviewAvatars';
 * updateAllUserReviewAvatars();
 */
export const updateAllUserReviewAvatars = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('No user logged in');
    return;
  }
  
  try {
    console.log(`Starting avatar update for all reviews by user ${user.uid}`);
    
    // Get the user's current avatar
    const userRef = ref(database, `users/${user.uid}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists() || !userSnapshot.val().avatarURL) {
      console.error('No avatar found for current user');
      return;
    }
    
    const currentAvatar = userSnapshot.val().avatarURL;
    console.log(`Current user avatar: ${currentAvatar.substring(0, 50)}...`);
    
    // Get all product reviews
    const allReviewsRef = ref(database, 'productReviews');
    const allReviewsSnapshot = await get(allReviewsRef);
    
    if (!allReviewsSnapshot.exists()) {
      console.log('No reviews found in database');
      return;
    }
    
    const products = allReviewsSnapshot.val();
    let updatedCount = 0;
    
    // Loop through each product
    for (const [productId, productReviews] of Object.entries(products)) {
      const reviews = productReviews as Record<string, any>;
      
      // Loop through each review
      for (const [reviewId, review] of Object.entries(reviews)) {
        // If this review is by the current user
        if (review.userId === user.uid) {
          if (review.userAvatar !== currentAvatar) {
            console.log(`Updating avatar for review ${reviewId} in product ${productId}`);
            await set(ref(database, `productReviews/${productId}/${reviewId}/userAvatar`), currentAvatar);
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`Avatar update completed. Updated ${updatedCount} reviews.`);
    
    // Dispatch event to notify components about the avatar update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', { 
        detail: { 
          avatarURL: currentAvatar,
          userId: user.uid
        }
      }));
    }
    
    return updatedCount;
  } catch (error) {
    console.error('Error updating avatars in reviews:', error);
    throw error;
  }
};

/**
 * Call this function to test if the current user's avatar from the database matches what's in Firebase Auth
 */
export const checkUserAvatarConsistency = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('No user logged in');
    return;
  }
  
  try {
    // Get avatar from database
    const userRef = ref(database, `users/${user.uid}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      console.error('User not found in database');
      return;
    }
    
    const databaseAvatar = userSnapshot.val().avatarURL || 'none';
    const authAvatar = user.photoURL || 'none';
    const localStorageAvatar = localStorage.getItem('avatarURL') || 'none';
    
    console.log('Avatar consistency check:');
    console.log(`- Database avatar: ${databaseAvatar.substring(0, 50)}...`);
    console.log(`- Auth avatar: ${authAvatar.substring(0, 50)}...`);
    console.log(`- localStorage avatar: ${localStorageAvatar.substring(0, 50)}...`);
    
    if (databaseAvatar === authAvatar && databaseAvatar === localStorageAvatar) {
      console.log('✅ All avatars are consistent!');
    } else {
      console.log('❌ Avatars are inconsistent!');
      
      // Optionally force them to be consistent
      if (databaseAvatar !== 'none') {
        // Update Auth
        console.log('Updating Auth and localStorage to match database avatar...');
        await updateProfile(user, {
          photoURL: databaseAvatar
        });
        
        // Update localStorage using AvatarHelper function
        updateAvatarUrl(databaseAvatar, user.uid);
        
        console.log('Done! Please refresh the page.');
      }
    }
  } catch (error) {
    console.error('Error checking avatar consistency:', error);
  }
};

/**
 * Updates a user's avatar across all storage locations (Auth, Database, localStorage)
 * @param avatarUrl The new avatar URL to set
 * @param userId Optional user ID (if not provided, uses current user)
 */
export const updateUserAvatar = async (avatarUrl: string, userId?: string) => {
  try {
    const auth = getAuth();
    const user = userId ? null : auth.currentUser; // Only use current user if userId not provided
    const targetUserId = userId || (user ? user.uid : null);
    
    if (!targetUserId) {
      console.error('No user ID provided and no user logged in');
      return false;
    }
    
    console.log(`Updating avatar for user ${targetUserId}`);
    console.log(`New avatar: ${avatarUrl.substring(0, 50)}...`);
    
    // Step 1: Update in Firebase Realtime Database
    await update(ref(database, `users/${targetUserId}`), {
      avatarURL: avatarUrl,
      lastUpdated: new Date().toISOString()
    });
    
    // Step 2: Update in Firebase Auth if it's the current user
    if (user) {
      await updateProfile(user, {
        photoURL: avatarUrl
      });
    }
    
    // Step 3: Update in localStorage
    updateAvatarUrl(avatarUrl, targetUserId);
    
    // Step 4: Update user reviews with new avatar
    const allReviewsRef = ref(database, 'productReviews');
    const allReviewsSnapshot = await get(allReviewsRef);
    
    if (allReviewsSnapshot.exists()) {
      const products = allReviewsSnapshot.val();
      let updatedCount = 0;
      
      // Loop through each product's reviews
      for (const [productId, productReviews] of Object.entries(products)) {
        const reviews = productReviews as Record<string, any>;
        
        for (const [reviewId, review] of Object.entries(reviews)) {
          if (review.userId === targetUserId) {
            await set(ref(database, `productReviews/${productId}/${reviewId}/userAvatar`), avatarUrl);
            updatedCount++;
          }
        }
      }
      
      console.log(`Updated avatar in ${updatedCount} reviews`);
    }
    
    console.log('Avatar update completed successfully');
    return true;
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return false;
  }
};
