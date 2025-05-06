import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { getDatabase, ref, get, set, remove, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getUserDisplayName } from '../utils/userProfileUtils';

// Определение типов данных для отзывов
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  helpful: number;
}

// Определение типа контекста для отзывов
interface ReviewContextType {
  reviews: Review[];
  userReviews: Review[];
  loadingReviews: boolean;
  productRating: number;
  reviewsCount: number;
  addReview: (productId: string, rating: number, comment: string) => Promise<void>;
  updateReview: (productId: string, reviewId: string, rating: number, comment: string) => Promise<void>;
  deleteReview: (productId: string, reviewId: string) => Promise<void>;
  getUserReview: (productId: string) => Review | undefined;
  getProductReviews: (productId: string) => Promise<void>;
  formatReviewDate: (timestamp: string) => string;
}

const ReviewContext = createContext<ReviewContextType>({
  reviews: [],
  userReviews: [],
  loadingReviews: false,
  productRating: 0,
  reviewsCount: 0,
  addReview: async () => {},
  updateReview: async () => {},
  deleteReview: async () => {},
  getUserReview: () => undefined,
  getProductReviews: async () => {},
  formatReviewDate: () => '',
});

export const useReviews = () => useContext(ReviewContext);

export const ReviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [productRating, setProductRating] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  
  const auth = getAuth();
  const database = getDatabase();

  // Инициализация структуры базы данных при монтировании компонента
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const rootRef = ref(database, 'productReviews');
        const snapshot = await get(rootRef);
        
        if (!snapshot.exists()) {
          // Если структура не существует, создаем её
          await set(rootRef, {});
          console.log('Initialized reviews database structure');
        }
      } catch (error) {
        console.error('Error initializing database structure:', error);
      }
    };
    
    initializeDatabase();
  }, [database]);

  // Загружаем отзывы пользователя при изменении авторизации
  useEffect(() => {
    const loadUserReviews = async () => {
      if (auth.currentUser) {
        try {
          const userReviewsRef = ref(database, 'productReviews');
          const snapshot = await get(userReviewsRef);
          
          if (snapshot.exists()) {
            const allReviews: Review[] = [];
            
            // Проходим по всем продуктам
            snapshot.forEach((productSnapshot) => {
              const productReviews = productSnapshot.val();
              if (productReviews) {
                // Находим отзывы текущего пользователя
                Object.entries(productReviews).forEach(([reviewId, review]: [string, any]) => {
                  if (review.userId === auth.currentUser?.uid) {
                    allReviews.push({
                      id: reviewId,
                      productId: productSnapshot.key || '',
                      ...review
                    });
                  }
                });
              }
            });
            
            setUserReviews(allReviews);
          }
        } catch (error) {
          console.error('Error loading user reviews:', error);
        }
      } else {
        setUserReviews([]);
      }
    };
    
    loadUserReviews();
  }, [auth.currentUser, database]);

  const getProductReviews = async (productId: string) => {
    if (!productId) {
      console.error('ProductId is required to load reviews');
      return;
    }

    setLoadingReviews(true);
    try {
      const reviewsRef = ref(database, `productReviews/${productId}`);
      const snapshot = await get(reviewsRef);
      
      if (snapshot.exists()) {
        const reviewsData = snapshot.val();
        const reviewsList = Object.entries(reviewsData).map(([id, data]: [string, any]) => ({
          id,
          productId,
          ...data
        }));
        
        setReviews(reviewsList);
        
        // Вычисляем средний рейтинг
        const total = reviewsList.reduce((sum, review) => sum + review.rating, 0);
        setProductRating(total / reviewsList.length);
        setReviewsCount(reviewsList.length);
      } else {
        // Если отзывов нет, создаем пустую структуру для продукта
        await set(reviewsRef, {});
        setReviews([]);
        setProductRating(0);
        setReviewsCount(0);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      setReviews([]);
      setProductRating(0);
      setReviewsCount(0);
    } finally {
      setLoadingReviews(false);
    }
  };

  const addReview = async (productId: string, rating: number, comment: string) => {
    if (!auth.currentUser) throw new Error('Must be logged in to add a review');
    
    // Проверяем, нет ли уже отзыва от этого пользователя
    const existingReview = reviews.find(review => review.userId === auth.currentUser?.uid);
    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }
    
    const reviewData: Omit<Review, 'id'> = {
      productId,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Anonymous',
      userAvatar: auth.currentUser.photoURL || '',
      rating,
      comment,
      createdAt: new Date().toISOString(),
      helpful: 0
    };
    
    const newReviewRef = ref(database, `productReviews/${productId}/${Date.now()}`);
    await set(newReviewRef, reviewData);
    
    // Обновляем список отзывов
    await getProductReviews(productId);
  };

  const updateReview = async (productId: string, reviewId: string, rating: number, comment: string) => {
    if (!auth.currentUser) throw new Error('Must be logged in to update a review');
    
    const reviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
    const snapshot = await get(reviewRef);
    
    if (!snapshot.exists()) throw new Error('Review not found');
    
    const reviewData = snapshot.val();
    if (reviewData.userId !== auth.currentUser.uid) {
      throw new Error('Can only update your own reviews');
    }
    
    await set(reviewRef, {
      ...reviewData,
      rating,
      comment,
      updatedAt: new Date().toISOString()
    });
    
    // Обновляем список отзывов
    await getProductReviews(productId);
  };

  const deleteReview = async (productId: string, reviewId: string) => {
    if (!auth.currentUser) throw new Error('Must be logged in to delete a review');
    
    const reviewRef = ref(database, `productReviews/${productId}/${reviewId}`);
    const snapshot = await get(reviewRef);
    
    if (!snapshot.exists()) throw new Error('Review not found');
    
    const reviewData = snapshot.val();
    if (reviewData.userId !== auth.currentUser.uid) {
      throw new Error('Can only delete your own reviews');
    }
    
    await remove(reviewRef);
    
    // Обновляем список отзывов
    await getProductReviews(productId);
  };

  const getUserReview = (productId: string) => {
    return reviews.find(review => 
      review.userId === auth.currentUser?.uid && 
      review.productId === productId
    );
  };

  const formatReviewDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const value = {
    reviews,
    userReviews,
    loadingReviews,
    productRating,
    reviewsCount,
    addReview,
    updateReview,
    deleteReview,
    getUserReview,
    getProductReviews,
    formatReviewDate
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};

export default ReviewContext;