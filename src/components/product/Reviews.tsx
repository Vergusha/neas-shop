import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import Rating from '../ui/Rating';
import UserAvatar from '../user/UserAvatar';
import { getTheme } from '../../utils/themeUtils';
import { useReviews, Review } from '../../contexts/ReviewContext';

interface ReviewsProps {
  productId: string;
  productName?: string;
  collectionName?: string;
}

const Reviews: React.FC<ReviewsProps> = ({ productId, productName = '', collectionName }) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());

  // Используем контекст отзывов
  const {
    reviews,
    loadingReviews,
    productRating,
    reviewsCount,
    addReview,
    updateReview,
    deleteReview,
    getUserReview,
    getProductReviews,
    formatReviewDate
  } = useReviews();

  const auth = getAuth();
  const userReview = auth.currentUser ? getUserReview(productId) : undefined;

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Загружаем отзывы при монтировании компонента
  useEffect(() => {
    getProductReviews(productId);
    
    if (userReview) {
      setUserRating(userReview.rating);
      setUserComment(userReview.comment);
    }
  }, [productId, userReview]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert('You must be logged in to submit a review.');
      return;
    }

    if (userRating === 0) {
      alert('Please select a rating.');
      return;
    }

    setSubmitting(true);

    try {
      if (userReview && editing) {
        // Обновляем существующий отзыв
        await updateReview(userReview.id, userRating, userComment);
        setEditing(false);
      } else {
        // Добавляем новый отзыв
        await addReview(productId, userRating, userComment, collectionName);
        setUserComment('');
        setUserRating(0);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteReview(userReview.id);
      } catch (error) {
        console.error('Error deleting review:', error);
        alert('Failed to delete review. Please try again.');
      }
    }
  };

  const startEditing = () => {
    if (userReview) {
      setUserRating(userReview.rating);
      setUserComment(userReview.comment);
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    if (userReview) {
      setUserRating(userReview.rating);
      setUserComment(userReview.comment);
    }
    setEditing(false);
  };

  if (loadingReviews) {
    return (
      <div className={`py-6 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        Loading reviews...
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className={`text-2xl font-bold mb-4 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
        Customer Reviews
      </h2>

      {reviews.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Rating value={productRating} readonly size="lg" />
            <span className={`text-lg font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              {productRating.toFixed(1)} out of 5
            </span>
          </div>
          <p className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Based on {reviewsCount} review{reviewsCount !== 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <p className={`mb-6 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          This product has no reviews yet.
        </p>
      )}

      {auth.currentUser && !userReview && !editing ? (
        <div className={`mb-8 p-6 rounded-lg border ${
          currentTheme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Write a Review
          </h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Rating
              </label>
              <div className="flex items-center">
                <Rating
                  value={userRating}
                  onChange={setUserRating}
                  size="lg"
                  interactive
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label 
                htmlFor="comment" 
                className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Your Review
              </label>
              <textarea
                id="comment"
                rows={4}
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-[#95c672] focus:ring-[#95c672]' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                }`}
                placeholder="Share your experience with this product..."
              ></textarea>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-md font-medium ${
                currentTheme === 'dark'
                  ? 'bg-[#95c672] text-gray-900 hover:bg-[#85b662]'
                  : 'bg-[#003D2D] text-white hover:bg-[#004D3D]'
              } ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      ) : userReview && editing ? (
        <div className={`mb-8 p-6 rounded-lg border ${
          currentTheme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Edit Your Review
          </h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Rating
              </label>
              <div className="flex items-center">
                <Rating
                  value={userRating}
                  onChange={setUserRating}
                  size="lg"
                  interactive
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label 
                htmlFor="edit-comment" 
                className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Your Review
              </label>
              <textarea
                id="edit-comment"
                rows={4}
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-[#95c672] focus:ring-[#95c672]' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                }`}
              ></textarea>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-md font-medium ${
                  currentTheme === 'dark'
                    ? 'bg-[#95c672] text-gray-900 hover:bg-[#85b662]'
                    : 'bg-[#003D2D] text-white hover:bg-[#004D3D]'
                } ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={submitting}
                className={`px-4 py-2 rounded-md font-medium ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {reviews.length > 0 && (
        <div className="space-y-6">
          {reviews.map((review) => {
            const isUserReview = auth.currentUser && review.userId === auth.currentUser.uid;
            
            return (
              <div 
                key={review.id} 
                className={`p-6 rounded-lg border ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={review.userId} size={40} />
                    <div>
                      <h4 className={`font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {review.userName}
                        {isUserReview && (
                          <span className={`ml-2 text-xs px-2 py-1 rounded ${
                            currentTheme === 'dark' 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            You
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Rating value={review.rating} readonly size="sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isUserReview && !editing && (
                      <div className="flex gap-2">
                        <button
                          onClick={startEditing}
                          className={`text-sm px-3 py-1 rounded ${
                            currentTheme === 'dark' 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDeleteReview}
                          className={`text-sm px-3 py-1 rounded ${
                            currentTheme === 'dark' 
                              ? 'bg-red-900/50 text-red-200 hover:bg-red-900/70' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className={`mt-4 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{review.comment}</p>
                <p className={`mt-2 text-sm ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {formatReviewDate(review.createdAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!auth.currentUser && (
        <div className={`p-4 rounded-lg border ${
          currentTheme === 'dark' 
            ? 'bg-blue-900/20 border-blue-800 text-blue-200' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p>
            Please <a href="/login" className="font-medium underline">sign in</a> to leave a review.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reviews;
