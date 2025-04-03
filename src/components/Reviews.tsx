import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { ref, get, set, onValue, update, remove } from 'firebase/database';
import { database } from '../firebaseConfig';
import Rating from './Rating';
import { User, Clock, ThumbsUp, Edit, Trash2, MessageSquare, X } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { defaultAvatarSVG, handleAvatarError } from '../utils/AvatarHelper';
import { handleFirestoreError } from '../firebaseConfig';

interface Reply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  date: string;
  isAdmin?: boolean;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
  userAvatar?: string;
  helpful?: number;
  helpfulBy?: string[];
  createdAt?: string;
  replies?: Record<string, Reply>;
}

interface ReviewsProps {
  productId: string;
}

const Reviews: React.FC<ReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const reviewsRef = ref(database, `productReviews/${productId}`);
    
    let unsubscribe: () => void;
    
    try {
      unsubscribe = onValue(reviewsRef, (snapshot) => {
        if (snapshot.exists()) {
          const reviewsData = snapshot.val();
          const reviewKeys = Object.keys(reviewsData);
          
          if (reviewKeys.length === 0) {
            setReviews([]);
            setAverageRating(0);
            resetProductRating();
            return;
          }
          
          const reviewsList: Review[] = reviewKeys.map(key => {
            const review = reviewsData[key];
            return {
              id: key,
              ...review,
              userAvatar: review.userAvatar || ''
            };
          });
          
          reviewsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setReviews(reviewsList);
          
          const totalRating = reviewsList.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(totalRating / reviewsList.length);
          
          if (user) {
            const userReviewData = reviewsList.find(review => 
              review.userId === user.uid
            );
            
            if (userReviewData) {
              setUserReview(userReviewData);
              setNewReviewText(userReviewData.text);
              setNewRating(userReviewData.rating);
            } else {
              setUserReview(null);
              setNewReviewText('');
              setNewRating(5);
            }
          }
        } else {
          setReviews([]);
          setAverageRating(0);
          resetProductRating();
          setUserReview(null);
        }
      }, (error) => {
        console.error('Error listening to reviews:', error);
      });
      
      if (user) {
        const helpfulRef = ref(database, `users/${user.uid}/helpfulReviews`);
        get(helpfulRef).then((snapshot) => {
          if (snapshot.exists()) {
            const helpfulData = snapshot.val();
            const helpfulSet = new Set(Object.keys(helpfulData));
            setHelpfulReviews(helpfulSet);
          }
        }).catch(error => {
          console.error('Error loading helpful reviews:', error);
        });
      }
      
    } catch (error) {
      console.error('Error setting up reviews listener:', error);
    }
    
    return () => {
      try {
        if (unsubscribe) unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from reviews:', error);
      }
    };
  }, [productId, user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setIsAdmin(userData.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const resetProductRating = async () => {
    try {
      await update(ref(database, `products/${productId}`), {
        rating: 0,
        reviewCount: 0
      }).catch(err => console.warn('Error updating realtime DB rating:', err));
      
      const collections = ['mobile', 'products', 'tv'];
      for (const collectionName of collections) {
        try {
          const docRef = doc(db, collectionName, productId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, {
              rating: 0,
              reviewCount: 0
            });
            console.log(`Reset rating in ${collectionName} collection`);
            break;
          }
        } catch (error) {
        }
      }
      
      window.dispatchEvent(new CustomEvent('productRatingUpdated', {
        detail: { 
          productId,
          rating: 0,
          reviewCount: 0
        }
      }));
    } catch (error) {
      console.error('Error resetting product rating:', error);
      handleFirestoreError(error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      setError('You must be signed in to leave a review.');
      return;
    }
    
    if (newReviewText.trim().length < 3) {
      setError('Review text must be at least 3 characters.');
      return;
    }
    
    if (!productId || productId === 'undefined') {
      setError('Invalid product ID. Please reload the page and try again.');
      console.error('Attempted to submit review with invalid productId:', productId);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log("Starting review submission process...");
      console.log("User:", user.uid);
      console.log("Product ID:", productId);
      
      let userAvatarUrl = '';
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.avatarURL) {
            userAvatarUrl = userData.avatarURL;
            console.log('Using avatar directly from database:', userAvatarUrl);
          }
        }
      } catch (dbError) {
        console.error('Error getting avatar from database:', dbError);
      }
      
      if (!userAvatarUrl && user.photoURL) {
        userAvatarUrl = user.photoURL;
        console.log('Using avatar from user.photoURL:', userAvatarUrl);
      }
      
      if (!userAvatarUrl) {
        const savedAvatar = localStorage.getItem('avatarURL');
        if (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') {
          userAvatarUrl = savedAvatar;
          console.log('Using avatar from localStorage:', userAvatarUrl);
        }
      }
      
      if (!userAvatarUrl) {
        userAvatarUrl = defaultAvatarSVG;
        console.log('Using default avatar');
      }
      
      let reviewId: string;
      
      if (isEditing && userReview) {
        reviewId = userReview.id;
        console.log("Updating existing review with ID:", reviewId);
      } else {
        reviewId = `${user.uid.slice(0, 8)}_${Date.now()}`;
        console.log("Creating new review with ID:", reviewId);
      }
      
      const reviewData = {
        userId: user.uid,
        productId: productId,
        userName: user.displayName || 'Anonymous',
        userAvatar: userAvatarUrl,
        rating: newRating,
        text: newReviewText.trim(),
        date: new Date().toISOString(),
        helpful: userReview?.helpful || 0,
        createdAt: (isEditing && userReview?.createdAt) ? userReview.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log("Review data prepared:", reviewData);
      
      const reviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
      await set(reviewRef, reviewData);
      console.log(`Review ${isEditing ? 'updated' : 'saved'} successfully`);
      
      const reviewsRef = ref(database, `productReviews/${productId}`);
      const reviewsSnapshot = await get(reviewsRef);
      
      if (reviewsSnapshot.exists()) {
        console.log("Recalculating rating from all reviews...");
        const reviewsData = reviewsSnapshot.val();
        const allReviews = Object.values(reviewsData) as Array<{rating: number}>;
        const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / allReviews.length;
        const newReviewCount = allReviews.length;
        
        console.log("New average rating:", averageRating);
        console.log("New review count:", newReviewCount);
        
        await update(ref(database, `products/${productId}`), {
          rating: averageRating,
          reviewCount: newReviewCount
        });
        console.log("Updated rating in Realtime Database");
        
        try {
          const collections = ['mobile', 'products', 'tv'];
          let updated = false;
          
          for (const collectionName of collections) {
            const docRef = doc(db, collectionName, productId);
            try {
              const docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                await updateDoc(docRef, {
                  rating: averageRating,
                  reviewCount: newReviewCount
                });
                console.log(`Updated rating in ${collectionName} collection`);
                updated = true;
                break;
              }
            } catch (collectionError) {
              console.log(`Collection ${collectionName} check failed:`, collectionError);
            }
          }
          
          if (!updated) {
            console.log("Product not found in any collection, skipping Firestore update");
          }
          
          window.dispatchEvent(new CustomEvent('productRatingUpdated', {
            detail: { 
              productId,
              rating: averageRating,
              reviewCount: newReviewCount
            }
          }));
        } catch (firestoreError) {
          console.error("Error updating Firestore:", firestoreError);
        }
      }
      
      setUserReview({
        ...reviewData,
        id: reviewId
      });
      setIsEditing(false);
      
      alert(`Your review has been ${isEditing ? 'updated' : 'submitted'} successfully!`);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      setError(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReviewAvatars = async () => {
    if (!user) return;
    
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists() && snapshot.val().avatarURL) {
        const currentAvatar = snapshot.val().avatarURL;
        
        const reviewsRef = ref(database, `productReviews/${productId}`);
        const reviewsSnapshot = await get(reviewsRef);
        
        if (reviewsSnapshot.exists()) {
          const reviewsData = reviewsSnapshot.val();
          
          for (const [reviewId, review] of Object.entries(reviewsData)) {
            const reviewData = review as any;
            
            if (reviewData.userId === user.uid && reviewData.userAvatar !== currentAvatar) {
              console.log(`Updating avatar in review ${reviewId}`);
              await set(ref(database, `productReviews/${productId}/${reviewId}/userAvatar`), currentAvatar);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating review avatars:', error);
    }
  };

  useEffect(() => {
    if (user) {
      updateReviewAvatars();
    }
  }, [user, productId]);

  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.avatarURL && user) {
        console.log('Avatar updated event detected, updating review avatars');
        updateReviewAvatars();
      }
    };
    
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [user]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash && window.location.hash.startsWith('#review-')) {
        const reviewId = window.location.hash.replace('#review-', '');
        const reviewElement = document.getElementById(`review-${reviewId}`);
        
        if (reviewElement) {
          setTimeout(() => {
            reviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            reviewElement.classList.add('highlight-review');
            
            setTimeout(() => {
              reviewElement.classList.remove('highlight-review');
            }, 2000);
          }, 300);
        }
      }
    };
    
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [reviews]);

  const handleDeleteReview = async () => {
    if (!user || !userReview) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const reviewRef = ref(database, `productReviews/${productId}/${userReview.id}`);
      await remove(reviewRef);
      
      const reviewsRef = ref(database, `productReviews/${productId}`);
      const reviewsSnapshot = await get(reviewsRef);
      
      let averageRating = 0;
      let newReviewCount = 0;
      
      if (reviewsSnapshot.exists()) {
        const reviewsData = reviewsSnapshot.val();
        const allReviews = Object.values(reviewsData) as Array<{rating: number}>;
        
        newReviewCount = allReviews.length;
        
        if (newReviewCount > 0) {
          const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
          averageRating = totalRating / newReviewCount;
        }
      }
      
      await update(ref(database, `products/${productId}`), {
        rating: averageRating,
        reviewCount: newReviewCount
      });
      
      try {
        const collections = ['mobile', 'products', 'tv'];
        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, productId);
          try {
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              await updateDoc(docRef, {
                rating: averageRating,
                reviewCount: newReviewCount
              });
              break;
            }
          } catch (collectionError) {
          }
        }
        
        window.dispatchEvent(new CustomEvent('productRatingUpdated', {
          detail: { 
            productId,
            rating: averageRating,
            reviewCount: newReviewCount
          }
        }));
      } catch (firestoreError) {
        console.error("Error updating Firestore:", firestoreError);
      }
      
      setUserReview(null);
      setNewReviewText('');
      setNewRating(5);
      setShowDeleteConfirm(false);
      
      alert("Your review has been deleted successfully!");
    } catch (error) {
      console.error('Error deleting review:', error);
      alert(`Failed to delete review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHelpfulClick = async (reviewId: string) => {
    if (!user) {
      alert('You need to be logged in to mark reviews as helpful');
      return;
    }
    
    try {
      const isCurrentlyHelpful = helpfulReviews.has(reviewId);
      
      if (isCurrentlyHelpful) {
        const helpfulRef = ref(database, `productReviews/${productId}/${reviewId}/helpful`);
        const snapshot = await get(helpfulRef);
        const currentHelpful = snapshot.exists() ? snapshot.val() : 0;
        await set(helpfulRef, Math.max(0, currentHelpful - 1));
        
        const helpfulByRef = ref(database, `productReviews/${productId}/${reviewId}/helpfulBy`);
        const helpfulBySnapshot = await get(helpfulByRef);
        
        if (helpfulBySnapshot.exists()) {
          const helpfulBy = helpfulBySnapshot.val();
          if (Array.isArray(helpfulBy)) {
            const updatedHelpfulBy = helpfulBy.filter(id => id !== user.uid);
            await set(helpfulByRef, updatedHelpfulBy);
          }
        }
        
        const userHelpfulRef = ref(database, `users/${user.uid}/helpfulReviews/${reviewId}`);
        await set(userHelpfulRef, null);
        
        const newHelpfulReviews = new Set(helpfulReviews);
        newHelpfulReviews.delete(reviewId);
        setHelpfulReviews(newHelpfulReviews);
        
      } else {
        const helpfulRef = ref(database, `productReviews/${productId}/${reviewId}/helpful`);
        const snapshot = await get(helpfulRef);
        const currentHelpful = snapshot.exists() ? snapshot.val() : 0;
        await set(helpfulRef, currentHelpful + 1);
        
        const helpfulByRef = ref(database, `productReviews/${productId}/${reviewId}/helpfulBy`);
        const helpfulBySnapshot = await get(helpfulByRef);
        const helpfulBy = helpfulBySnapshot.exists() ? helpfulBySnapshot.val() : [];
        
        if (!Array.isArray(helpfulBy)) {
          await set(helpfulByRef, [user.uid]);
        } else if (!helpfulBy.includes(user.uid)) {
          await set(helpfulByRef, [...helpfulBy, user.uid]);
        }
        
        const userHelpfulRef = ref(database, `users/${user.uid}/helpfulReviews/${reviewId}`);
        await set(userHelpfulRef, {
          productId,
          timestamp: new Date().toISOString()
        });
        
        setHelpfulReviews(prev => new Set(prev).add(reviewId));
      }
      
    } catch (error) {
      console.error('Error updating helpful status:', error);
      alert('Failed to update helpful status. Please try again.');
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!user) {
      alert('You must be signed in to reply to reviews.');
      return;
    }
    
    if (replyText.trim().length < 3) {
      alert('Reply text must be at least 3 characters.');
      return;
    }
    
    setIsSubmittingReply(true);
    
    try {
      let userAvatarUrl = '';
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.avatarURL) {
            userAvatarUrl = userData.avatarURL;
          }
        }
      } catch (dbError) {
        console.error('Error getting avatar from database:', dbError);
      }
      
      if (!userAvatarUrl && user.photoURL) {
        userAvatarUrl = user.photoURL;
      }
      
      if (!userAvatarUrl) {
        const savedAvatar = localStorage.getItem('avatarURL');
        if (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') {
          userAvatarUrl = savedAvatar;
        }
      }
      
      if (!userAvatarUrl) {
        userAvatarUrl = defaultAvatarSVG;
      }
      
      const replyId = `reply_${user.uid.slice(0, 4)}_${Date.now()}`;
      
      const replyData: Reply = {
        id: replyId,
        userId: user.uid,
        userName: isAdmin ? 'Администрация' : (user.displayName || 'Anonymous'),
        userAvatar: userAvatarUrl,
        text: replyText.trim(),
        date: new Date().toISOString(),
        isAdmin: isAdmin
      };
      
      const replyRef = ref(database, `productReviews/${productId}/${reviewId}/replies/${replyId}`);
      await set(replyRef, replyData);
      
      const reviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
      const reviewSnapshot = await get(reviewRef);
      
      if (reviewSnapshot.exists()) {
        const reviewData = reviewSnapshot.val();
        
        if (reviewData.userId && reviewData.userId !== user.uid) {
          let productName = "a product";
          try {
            const productRef = ref(database, `products/${productId}`);
            const productSnapshot = await get(productRef);
            
            if (productSnapshot.exists()) {
              const productData = productSnapshot.val();
              if (productData.name) {
                productName = productData.name;
              }
            }
          } catch (error) {
            console.error('Error getting product name:', error);
          }
          
          const notificationId = `reply_${Date.now()}`;
          const notificationData = {
            id: notificationId,
            type: 'reply',
            text: `${isAdmin ? 'An administrator' : (user.displayName || 'Someone')} replied to your review of ${productName}.`,
            userId: reviewData.userId,
            fromUserId: user.uid,
            fromUserName: isAdmin ? 'Администрация' : (user.displayName || 'Anonymous'),
            productId,
            reviewId,
            replyId,
            read: false,
            createdAt: new Date().toISOString()
          };
          
          const notificationRef = ref(database, `users/${reviewData.userId}/notifications/${notificationId}`);
          await set(notificationRef, notificationData);
        }
      }
      
      setReplyText('');
      setReplyingToId(null);
      
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert(`Failed to submit reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (!user) return;
    
    try {
      const replyRef = ref(database, `productReviews/${productId}/${reviewId}/replies/${replyId}`);
      const snapshot = await get(replyRef);
      
      if (snapshot.exists()) {
        const replyData = snapshot.val();
        
        if (isAdmin || replyData.userId === user.uid) {
          await remove(replyRef);
        } else {
          alert('You can only delete your own replies.');
        }
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert(`Failed to delete reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    const preventAutoScroll = () => {
      if (window.location.hash === '#reviews') {
        window.scrollTo(0, 0);
      }
    };
    
    preventAutoScroll();
    
    if (window.location.hash) {
      const scrollPosition = window.pageYOffset;
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      window.scrollTo(0, scrollPosition);
    }
  }, []);

  return (
    <div className="mt-8" id="reviews">
      <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
            <Rating value={averageRating} size="lg" />
            <div className="text-sm text-gray-500 mt-1">{reviews.length} reviews</div>
          </div>
          
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = reviews.filter(r => Math.floor(r.rating) === stars).length;
              const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={stars} className="flex items-center gap-2 mb-2">
                  <div className="flex items-center w-12">
                    <span className="text-sm font-medium">{stars}</span>
                    <svg className="w-4 h-4 text-yellow-300 ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 20">
                      <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"/>
                    </svg>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-yellow-300 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between w-16">
                    <span className="text-sm">{count}</span>
                    <span className="text-sm text-gray-500">({percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {user ? (
        userReview && !isEditing ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Your Review</h3>
              <div className="flex gap-2">
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={16} className="mr-1" /> Edit
                </button>
                <button 
                  className="btn btn-sm btn-outline btn-error"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} className="mr-1" /> Delete
                </button>
              </div>
            </div>
            
            <div className="mb-2">
              <Rating value={userReview.rating} readonly />
            </div>
            
            <p className="text-gray-700">{userReview.text}</p>
            <p className="text-xs text-gray-500 mt-2">
              Posted on {new Date(userReview.date).toLocaleDateString()}
            </p>
            
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                  <h3 className="font-bold text-lg mb-4">Delete Review</h3>
                  <p className="mb-6">Are you sure you want to delete your review? This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-error"
                      onClick={handleDeleteReview}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-2"></span>
                          Deleting...
                        </>
                      ) : 'Delete Review'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="font-bold mb-4">
              {isEditing ? 'Edit Your Review' : 'Write a Review'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <Rating 
                value={newRating} 
                readonly={false} 
                onChange={setNewRating} 
                size="md"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                className="textarea textarea-bordered w-full h-24"
                placeholder="Share your experience with this product..."
              ></textarea>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              {isEditing && (
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditing(false);
                    setNewReviewText(userReview?.text || '');
                    setNewRating(userReview?.rating || 5);
                  }}
                >
                  Cancel
                </button>
              )}
              <button 
                className="btn btn-primary"
                onClick={handleSubmitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
          <p>Please <a href="/login" className="underline font-medium">sign in</a> to write a review.</p>
        </div>
      )}
      
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review this product!</p>
        ) : (
          reviews.map(review => (
            <div 
              id={`review-${review.id}`} 
              key={review.id} 
              className="bg-white p-6 rounded-lg shadow-md transition-all duration-700"
            >
              <div className="flex justify-between">
                <div className="flex items-center gap-2 mb-2">
                  {review.userAvatar && review.userAvatar !== 'undefined' && review.userAvatar !== 'null' ? (
                    <img 
                      src={review.userAvatar} 
                      alt={review.userName}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      onError={handleAvatarError}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300">
                      <User size={20} className="text-gray-500" />
                    </div>
                  )}
                  <span className="font-medium">{review.userName || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>{new Date(review.date).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mb-2">
                <Rating value={review.rating} readonly size="sm" />
              </div>
              
              <p className="text-gray-700">{review.text}</p>
              
              <div className="flex justify-between mt-4">
                {user && (
                  <button 
                    className={`flex items-center gap-1 text-sm 
                      ${replyingToId === review.id ? 'text-green-600 font-medium' : 'text-green-600 hover:text-green-700'}`}
                    onClick={() => setReplyingToId(replyingToId === review.id ? null : review.id)}
                  >
                    <MessageSquare size={14} />
                    <span>{replyingToId === review.id ? 'Cancel Reply' : 'Reply'}</span>
                  </button>
                )}
                <button 
                  className={`flex items-center gap-1 text-sm 
                    ${helpfulReviews.has(review.id) 
                      ? 'text-primary font-medium' 
                      : 'text-gray-500 hover:text-primary'
                    }`}
                  onClick={() => handleHelpfulClick(review.id)}
                >
                  <ThumbsUp 
                    size={14} 
                    className={helpfulReviews.has(review.id) ? 'fill-primary' : ''}
                  />
                  <span>
                    {helpfulReviews.has(review.id) ? 'Marked as helpful' : 'Helpful'} ({review.helpful || 0})
                  </span>
                </button>
              </div>

              {replyingToId === review.id && user && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Write a reply</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="textarea textarea-bordered w-full h-20 text-sm"
                    placeholder="Write your reply here..."
                  ></textarea>
                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText('');
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={isSubmittingReply || replyText.trim().length < 3}
                    >
                      {isSubmittingReply ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-1"></span>
                          Posting...
                        </>
                      ) : 'Post reply'}
                    </button>
                  </div>
                </div>
              )}

              {review.replies && Object.keys(review.replies).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-green-600" />
                    <span>Replies ({Object.keys(review.replies).length})</span>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                    {Object.values(review.replies).map((reply) => (
                      <div key={reply.id} className={`p-3 rounded-md ${reply.isAdmin ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {reply.userAvatar && reply.userAvatar !== 'undefined' && reply.userAvatar !== 'null' ? (
                              <img 
                                src={reply.userAvatar} 
                                alt={reply.userName}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                onError={handleAvatarError}
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reply.isAdmin ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <User size={16} className="text-white" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-sm">{reply.userName}</span>
                              {reply.isAdmin && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(reply.date).toLocaleDateString()}
                            </span>
                            {(user && (isAdmin || reply.userId === user.uid)) && (
                              <button 
                                className="text-red-400 hover:text-red-600 transition-colors"
                                onClick={() => handleDeleteReply(review.id, reply.id)}
                                title="Delete reply"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mt-1 text-gray-700">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
