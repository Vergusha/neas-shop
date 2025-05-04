import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Gets the user's display name from the user profile in Firestore
 * Falls back to Firebase Auth's displayName if profile can't be found
 */
export async function fetchUserDisplayName(userId: string): Promise<string> {
  try {
    // First try to get the user profile from Firestore
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileSnap = await getDoc(userProfileRef);
    
    if (userProfileSnap.exists()) {
      const userData = userProfileSnap.data();
      
      // Return the first non-empty value in this order of preference
      return userData.nickname || 
             userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : 
             userData.firstName || 
             userData.displayName ||
             'Anonymous User';
    }
    
    // If profile doesn't exist, fall back to Firebase Auth
    const auth = getAuth();
    return auth.currentUser?.displayName || 'Anonymous User';
  } catch (error) {
    console.error('Error getting user display name:', error);
    return 'Anonymous User';
  }
}

/**
 * Gets the user's display name synchronously (for UI components)
 * This returns a placeholder while the async operation completes
 */
export function getUserDisplayName(userId: string): string {
  const auth = getAuth();
  
  // If this is the current user, check for profile information in localStorage
  if (auth.currentUser?.uid === userId) {
    // Try to get nickname from localStorage if available
    const userProfileStr = localStorage.getItem(`userProfile_${userId}`);
    if (userProfileStr) {
      try {
        const userProfile = JSON.parse(userProfileStr);
        const name = userProfile.nickname || 
                     (userProfile.firstName && userProfile.lastName ? 
                      `${userProfile.firstName} ${userProfile.lastName}` : 
                      userProfile.firstName);
        
        if (name) return name;
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Fall back to Firebase Auth displayName
    return auth.currentUser.displayName || 'Anonymous User';
  }
  
  // For other users, return a placeholder
  return 'User';
}