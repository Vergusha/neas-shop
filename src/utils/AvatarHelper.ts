/**
 * Helper functions for handling user avatars across the application
 */

// Default avatar SVG as base64 - simple user icon
export const defaultAvatarSVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZDAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxNSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik01MCA1MGMtMTUgMC0zMCAxNS0zMCAzMHMxNSAzMCAzMCAzMCAzMC0xNSAzMC0zMFM2NSA1MCA1MCA1MHptMCA1MGMtMTAgMC0xOCA4LTE4IDE4czggMTggMTggMThjMTAuMSAwIDE4LTggMTgtMThzLTgtMTgtMTgtMTh6IiBmaWxsPSIjZmZmIi8+PC9zdmc+';

// Constants for localStorage keys
export const AVATAR_KEY = 'avatarURL';
export const USER_PROFILE_KEY = 'userProfile';

/**
 * Gets the user's best available avatar URL from various sources
 * @param userObj The Firebase user object
 * @returns The best available avatar URL or default avatar if none found
 */
export const getBestAvatarUrl = (userObj: any): string => {
  if (!userObj) return defaultAvatarSVG;
  
  // First check if user has photoURL directly
  if (userObj.photoURL) return userObj.photoURL;
  
  // Try to get from localStorage
  try {
    // First try full user profile
    const savedProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      if (profileData.avatarURL) {
        return profileData.avatarURL;
      }
    }
    
    // Then try standalone avatarURL
    const savedAvatarURL = localStorage.getItem(AVATAR_KEY);
    if (savedAvatarURL) {
      return savedAvatarURL;
    }
  } catch (error) {
    console.error('Error getting avatar from localStorage:', error);
  }
  
  // Default to the SVG avatar if nothing found
  return defaultAvatarSVG;
};

/**
 * Gets the latest avatar URL from Firebase for a user
 * @param userId The Firebase user ID
 * @returns Promise resolving to the avatar URL or null if not found
 */
export const getLatestFirebaseAvatar = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    // Import Firebase dependencies dynamically to avoid circular imports
    const { ref, get } = await import('firebase/database');
    const { database } = await import('../firebaseConfig');
    
    // Get user data from Realtime Database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.avatarURL) {
        return userData.avatarURL;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting latest Firebase avatar:', error);
    return null;
  }
};

/**
 * Forces a synchronization of avatars between Firebase and localStorage
 * @param userId The Firebase user ID
 */
export const syncAvatarFromFirebase = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const avatarUrl = await getLatestFirebaseAvatar(userId);
    if (avatarUrl) {
      updateAvatarUrl(avatarUrl, userId);
      console.log('Avatar synced successfully from Firebase');
    }
  } catch (error) {
    console.error('Error syncing avatar from Firebase:', error);
  }
};

/**
 * Handles errors loading avatar images by setting a default
 * @param event The error event from img onError
 */
export const handleAvatarError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = event.currentTarget;
  // Only update if not already using the default to prevent loops
  if (!target.src.includes('data:image/svg+xml;base64')) {
    target.src = defaultAvatarSVG;
  }
};

/**
 * Updates the avatar URL in both local storage locations
 * @param url The new avatar URL to store
 * @param userId Optional user ID to include in the event payload
 */
export const updateAvatarUrl = (url: string, userId?: string): void => {
  try {
    // Update standalone avatarURL
    localStorage.setItem(AVATAR_KEY, url);
    
    // Update in userProfile if it exists
    const savedProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      profileData.avatarURL = url;
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
    }
    
    // Dispatch event for real-time updates across components
    window.dispatchEvent(new CustomEvent('avatarUpdated', { 
      detail: { 
        avatarURL: url,
        userId
      }
    }));
  } catch (error) {
    console.error('Error updating avatar in localStorage:', error);
  }
};

/**
 * Creates props for an avatar image element
 * @param url The avatar URL
 * @param alt Alternative text
 * @param className CSS classes
 * @returns Props object for an img element
 */
export const getAvatarProps = (url: string, alt: string, className: string = "w-10 h-10 rounded-full object-cover") => {
  return {
    src: url || defaultAvatarSVG,
    alt,
    className,
    onError: handleAvatarError
  };
};

export default {
  defaultAvatarSVG,
  getBestAvatarUrl,
  handleAvatarError,
  updateAvatarUrl,
  getAvatarProps,
  AVATAR_KEY,
  USER_PROFILE_KEY,
  getLatestFirebaseAvatar,
  syncAvatarFromFirebase
};
