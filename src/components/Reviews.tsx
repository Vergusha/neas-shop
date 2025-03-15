import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { ref, get, set, onValue, update } from 'firebase/database';
import { database } from '../firebaseConfig';
import Rating from './Rating';
import { User, Clock, ThumbsUp } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
  userAvatar?: string;
  helpful?: number;
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
  
  const auth = getAuth();
  const user = auth.currentUser;

  // Load reviews for this product
  useEffect(() => {
    const reviewsRef = ref(database, `productReviews/${productId}`);
    
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reviewsData = snapshot.val();
        const reviewsList: Review[] = Object.keys(reviewsData).map(key => ({
          id: key,
          ...reviewsData[key]
        }));
        
        // Sort reviews by date (newest first)
        reviewsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setReviews(reviewsList);
        
        // Calculate average rating
        const totalRating = reviewsList.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviewsList.length);
        
        // Check if the current user has already reviewed THIS product
        if (user) {
          // Используем productId в комбинации с userID как ключ обзора
          const userReviewData = reviewsList.find(review => 
            review.userId === user.uid
          );
          
          if (userReviewData) {
            setUserReview(userReviewData);
            // Pre-fill form for editing
            setNewReviewText(userReviewData.text);
            setNewRating(userReviewData.rating);
          } else {
            // Сброс ранее заполненной формы если отзыва на этот товар нет
            setUserReview(null);
            setNewReviewText('');
            setNewRating(5);
          }
        }
      } else {
        setReviews([]);
        setAverageRating(0);
        setUserReview(null);
      }
    });
    
    return () => unsubscribe();
  }, [productId, user]);

  // Improved method to update ratings in both databases and broadcast the update
  const updateProductRating = async (rating: number, reviewCount: number) => {
    try {
      // Update in Realtime Database first
      const productRef = ref(database, `products/${productId}`);
      await update(productRef, {
        rating,
        reviewCount
      });
      
      console.log(`Updated rating in Realtime DB: ${rating.toFixed(2)} from ${reviewCount} reviews`);
      
      // Then try to update in Firestore collections
      const collections = ['mobile', 'products', 'tv'];
      let updated = false;
      
      for (const collectionName of collections) {
        try {
          const docRef = doc(db, collectionName, productId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, {
              rating,
              reviewCount
            });
            console.log(`Updated rating in ${collectionName} collection`);
            updated = true;
            break; // Exit after finding the right collection
          }
        } catch (error) {
          console.error(`Error updating rating in ${collectionName}:`, error);
        }
      }
      
      // If no collection was updated, save the data to the products collection as fallback
      if (!updated) {
        const fallbackRef = doc(db, 'products', productId);
        await updateDoc(fallbackRef, {
          rating,
          reviewCount
        });
      }
      
      // Broadcast the change to update UI components
      window.dispatchEvent(new CustomEvent('productRatingUpdated', {
        detail: { 
          productId,
          rating,
          reviewCount
        }
      }));
    } catch (error) {
      console.error('Error updating product rating:', error);
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
    
    // Validate that productId exists
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
      
      // Create a simple review ID to avoid length issues or special characters
      const reviewId = `${user.uid.slice(0, 8)}_${Date.now()}`;
      
      const reviewData = {
        userId: user.uid,
        productId: productId,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || '',
        rating: newRating,
        text: newReviewText.trim(),
        date: new Date().toISOString(),
        helpful: userReview?.helpful || 0
      };
      
      console.log("Review data prepared:", reviewData);
      
      // Save or update the review
      const reviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
      await set(reviewRef, reviewData);
      console.log("Review saved successfully");
      
      // Recalculate average rating
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
        
        // Update rating in Realtime Database
        await update(ref(database, `products/${productId}`), {
          rating: averageRating,
          reviewCount: newReviewCount
        });
        console.log("Updated rating in Realtime Database");
        
        // Try to update in Firestore
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
              // Continue to try next collection
            }
          }
          
          if (!updated) {
            console.log("Product not found in any collection, skipping Firestore update");
          }
          
          // Broadcast event regardless of Firestore success
          window.dispatchEvent(new CustomEvent('productRatingUpdated', {
            detail: { 
              productId,
              rating: averageRating,
              reviewCount: newReviewCount
            }
          }));
        } catch (firestoreError) {
          console.error("Error updating Firestore:", firestoreError);
          // Continue execution - Realtime DB is our source of truth
        }
      }
      
      // Reset form state
      setUserReview({
        ...reviewData,
        id: reviewId
      });
      setIsEditing(false);
      
      // Show success alert
      alert("Your review has been submitted successfully!");
      
    } catch (error) {
      console.error('Error submitting review:', error);
      setError(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpfulClick = async (reviewId: string) => {
    if (!user) return;
    
    try {
      const helpfulRef = ref(database, `productReviews/${productId}/${reviewId}/helpful`);
      const snapshot = await get(helpfulRef);
      const currentHelpful = snapshot.exists() ? snapshot.val() : 0;
      
      await set(helpfulRef, currentHelpful + 1);
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
      
      {/* Summary section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
            <Rating value={averageRating} size="lg" />
            <div className="text-sm text-gray-500 mt-1">{reviews.length} reviews</div>
          </div>
          
          <div className="flex-1">
            {/* Rating distribution bars */}
            {[5, 4, 3, 2, 1].map(stars => {
              const count = reviews.filter(r => Math.floor(r.rating) === stars).length;
              const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={stars} className="flex items-center gap-2 mb-1">
                  <span className="text-sm w-6">{stars}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm w-12">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Review form */}
      {user ? (
        userReview && !isEditing ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Your Review</h3>
              <button 
                className="btn btn-sm btn-outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
            
            <div className="mb-2">
              <Rating value={userReview.rating} readonly />
            </div>
            
            <p className="text-gray-700">{userReview.text}</p>
            <p className="text-xs text-gray-500 mt-2">
              Posted on {new Date(userReview.date).toLocaleDateString()}
            </p>
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
      
      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review this product!</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between">
                <div className="flex items-center gap-2 mb-2">
                  {review.userAvatar ? (
                    <img 
                      src={review.userAvatar} 
                      alt={review.userName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={16} />
                    </div>
                  )}
                  <span className="font-medium">{review.userName}</span>
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
              
              <div className="flex justify-end mt-4">
                <button 
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
                  onClick={() => handleHelpfulClick(review.id)}
                >
                  <ThumbsUp size={14} />
                  <span>Helpful ({review.helpful || 0})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
