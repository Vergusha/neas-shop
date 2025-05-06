import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import Rating from '../ui/Rating';
import UserAvatar from '../user/UserAvatar';
import { getTheme } from '../../utils/themeUtils';
import { useReviews, Review } from '../../contexts/ReviewContext';
import { getUserDisplayName } from '../../utils/userProfileUtils';
import Toast from '../ui/Toast';
import { handleFirestoreError, ensureFirestoreAccess, forceReauthentication } from '../../firebaseConfig';
import { defaultAvatarSVG } from '../../utils/AvatarHelper';

interface ReviewsProps {
  productId: string;
  productName?: string;
  collectionName?: string;
}

// Расширенный тип Review с локальными свойствами UI
interface UIReview extends Review {
  uiUserName?: string; // локальное имя для отображения
}

const Reviews: React.FC<ReviewsProps> = ({ productId, productName = '', collectionName }) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [authVerified, setAuthVerified] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<'verifying'|'verified'|'failed'>('verifying');
  const [refreshingAuth, setRefreshingAuth] = useState(false);
  const [localReviews, setLocalReviews] = useState<UIReview[]>([]);

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

  // Обновляем локальный список отзывов при изменении основного списка
  useEffect(() => {
    const enhancedReviews = reviews.map(review => {
      // Используем актуальное имя из оригинального объекта отзыва
      const uiUserName = getUserDisplayName(review.userId);
      return {
        ...review,
        uiUserName
      };
    });
    setLocalReviews(enhancedReviews);
  }, [reviews]);

  // Обрабатываем событие обновления имени пользователя
  useEffect(() => {
    const handleUserNameUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { userId, name } = customEvent.detail;
      
      // Обновляем локальные отзывы с новым именем
      setLocalReviews(currentReviews => 
        currentReviews.map(review => 
          review.userId === userId 
            ? { ...review, uiUserName: name } 
            : review
        )
      );
    };
    
    window.addEventListener('userNameUpdated', handleUserNameUpdate);
    return () => window.removeEventListener('userNameUpdated', handleUserNameUpdate);
  }, []);

  // Обрабатываем событие обновления имени пользователя
  useEffect(() => {
    const handleUserNameUpdate = (e: Event) => {
      // Принудительно обновить локальные отзывы, чтобы имя появилось сразу
      setLocalReviews(current => [...current]);
    };
    window.addEventListener('userNameUpdated', handleUserNameUpdate);
    return () => window.removeEventListener('userNameUpdated', handleUserNameUpdate);
  }, []);

  // Verify auth on component mount and when auth state changes
  useEffect(() => {
    const verifyAuth = async () => {
      if (auth.currentUser) {
        try {
          setAuthStatus('verifying');
          const verified = await ensureFirestoreAccess();
          setAuthStatus(verified ? 'verified' : 'failed');
          if (!verified) {
            setError('Authentication issue detected. Please refresh your session or sign out and sign back in.');
          } else {
            setError(null);
          }
        } catch (err) {
          console.error('Auth verification error:', err);
          setAuthStatus('failed');
          setError('Authentication verification failed. Please try refreshing your session.');
        }
      } else {
        setAuthStatus('failed');
      }
    };

    verifyAuth();
    
    // Set up listener for auth changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) verifyAuth();
      else setAuthStatus('failed');
    });

    return () => unsubscribe();
  }, [auth]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleForceRefreshAuth = async () => {
    if (!auth.currentUser) {
      setToastMessage('You must be logged in to refresh your session.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setRefreshingAuth(true);
    try {
      const success = await forceReauthentication();
      if (success) {
        setAuthStatus('verified');
        setToastMessage('Authentication refreshed successfully!');
        setToastType('success');
        setError(null);
      } else {
        setToastMessage('Failed to refresh authentication. Please sign out and sign back in.');
        setToastType('error');
      }
    } catch (error) {
      console.error('Error refreshing authentication:', error);
      setToastMessage('Error refreshing authentication. Please try signing out and back in.');
      setToastType('error');
    } finally {
      setRefreshingAuth(false);
      setShowToast(true);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setToastMessage('You must be logged in to submit a review.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (authStatus !== 'verified') {
      setToastMessage('Authentication issue detected. Please refresh your session first.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (userRating === 0) {
      setToastMessage('Please select a rating.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (userReview && editing) {
        // Обновляем существующий отзыв
        await updateReview(productId, userReview.id, userRating, userComment);
        setEditing(false);
        setToastMessage('Your review was updated successfully!');
      } else {
        // Добавляем новый отзыв
        await addReview(productId, userRating, userComment);
        setUserComment('');
        setUserRating(0);
        setToastMessage('Your review was submitted successfully!');
      }
      setToastType('success');
      setShowToast(true);
      // Сбросить локальные значения после успешной отправки
      setUserRating(0);
      setUserComment('');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      setError(error.message || 'Failed to submit review');
      setToastMessage(error.message || 'Failed to submit review');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteReview(userReview.id);
        setToastMessage('Review deleted successfully.');
        setToastType('success');
        setShowToast(true);
        // Сбросить локальные значения после удаления
        setUserRating(0);
        setUserComment('');
      } catch (error) {
        console.error('Error deleting review:', error);
        setToastMessage('Failed to delete review. Please try again.');
        setToastType('error');
        setShowToast(true);
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login'; // Redirect to login page
      setToastMessage('Signed out successfully. Please sign in again.');
      setToastType('info');
      setShowToast(true);
    } catch (error) {
      console.error('Error signing out:', error);
      setToastMessage('Error signing out. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Используем useCallback для обработчика изменения рейтинга
  const handleRatingChange = useCallback((newRating: number) => {
    setUserRating(newRating);
  }, []);

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

      {showToast && (
        <Toast 
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
          autoClose={5000}
        />
      )}
      
      {auth.currentUser && (
        <div className={`mb-4 flex items-center justify-between p-3 rounded-md ${
          currentTheme === 'dark' 
            ? 'bg-gray-800 text-gray-200 border border-gray-700' 
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              authStatus === 'verifying' ? 'bg-yellow-500' : 
              authStatus === 'verified' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>
              {authStatus === 'verifying' ? 'Verifying permissions...' : 
               authStatus === 'verified' ? 'Authentication verified' : 
               'Authentication issue detected'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleForceRefreshAuth}
              disabled={refreshingAuth || authStatus === 'verifying'}
              className={`px-3 py-1 text-sm rounded ${
                currentTheme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${(refreshingAuth || authStatus === 'verifying') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {refreshingAuth ? 'Refreshing...' : 'Refresh Session'}
            </button>
            <button
              onClick={handleSignOut}
              className={`px-3 py-1 text-sm rounded ${
                currentTheme === 'dark'
                  ? 'bg-red-800 text-white hover:bg-red-700'
                  : 'bg-red-200 text-red-800 hover:bg-red-300'
              }`}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className={`mb-4 p-3 rounded-md ${
          currentTheme === 'dark' 
            ? 'bg-red-900/30 text-red-200 border border-red-800' 
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          <p>{error}</p>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Rating 
              value={productRating} 
              readonly={true} 
              size="lg" 
            />
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
                  onChange={handleRatingChange}
                  interactive={true}
                  readonly={false}
                  size="lg"
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
                  onChange={handleRatingChange}
                  interactive={true}
                  readonly={false}
                  size="lg"
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

      {localReviews.length > 0 && (
        <div className="space-y-6">
          {localReviews.map((review) => {
            const isUserReview = auth.currentUser && review.userId === auth.currentUser.uid;
            const displayName = review.uiUserName || review.userName || 'Пользователь';
            
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
                    <img
                      src={review.userAvatar || defaultAvatarSVG}
                      alt={`${review.userName}'s avatar`}
                      className="object-cover w-10 h-10 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = defaultAvatarSVG;
                      }}
                    />
                    <div>
                      <h4 className={`font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {displayName}
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
                        <Rating 
                          value={review.rating} 
                          readonly={true} 
                          size="sm" 
                        />
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
