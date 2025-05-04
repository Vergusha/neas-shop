import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp, getDoc, deleteDoc, connectFirestoreEmulator, FirestoreError } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, handleFirestoreError, ensureFirestoreAccess } from '../firebaseConfig';
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
  createdAt: any; // firestore timestamp
  updatedAt?: any; // firestore timestamp
  collectionName?: string;
}

// Определение типа контекста для отзывов
interface ReviewContextType {
  reviews: Review[];
  userReviews: Review[];
  loadingReviews: boolean;
  productRating: number;
  reviewsCount: number;
  addReview: (productId: string, rating: number, comment: string, collectionName?: string) => Promise<void>;
  updateReview: (reviewId: string, rating: number, comment: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  getUserReview: (productId: string) => Review | undefined;
  getProductReviews: (productId: string) => Promise<void>;
  formatReviewDate: (timestamp: any) => string;
}

// Создаем контекст с начальными значениями
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

// Хук для использования контекста в компонентах
export const useReviews = () => useContext(ReviewContext);

// Провайдер контекста
export const ReviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [productRating, setProductRating] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const auth = getAuth();

  // Загружаем отзывы пользователя при изменении авторизации
  useEffect(() => {
    const loadUserReviews = async () => {
      if (auth.currentUser) {
        try {
          try {
            // Try with ordering by createdAt
            const userReviewsQuery = query(
              collection(db, 'reviews'),
              where('userId', '==', auth.currentUser.uid),
              orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(userReviewsQuery);
            const userReviewsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Review[];
            
            setUserReviews(userReviewsList);
          } catch (indexError) {
            console.warn('Firebase index error detected for user reviews, falling back to simple query:', indexError);
            
            // If the index doesn't exist, fall back to a simpler query
            const simpleQuery = query(
              collection(db, 'reviews'),
              where('userId', '==', auth.currentUser.uid)
            );
            
            const snapshot = await getDocs(simpleQuery);
            const userReviewsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Review[];
            
            // Sort locally instead
            userReviewsList.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime(); // Descending order
            });
            
            setUserReviews(userReviewsList);
            
            // Suggest creating the index
            console.info(
              'To improve performance, please create the following Firebase index:\n' +
              'Collection: reviews\n' +
              'Fields: userId (Ascending), createdAt (Descending)\n' +
              'This can be done by clicking the link in the Firebase error message in the console.'
            );
          }
        } catch (error) {
          console.error('Error loading user reviews:', error);
        }
      } else {
        setUserReviews([]);
      }
    };
    
    loadUserReviews();
  }, [auth.currentUser]);

  // Получить отзывы для продукта
  const getProductReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      // First try with ordering by createdAt
      try {
        // Запрашиваем отзывы для продукта
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(reviewsQuery);
        const reviewsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        
        setReviews(reviewsList);
        
        // Рассчитываем средний рейтинг и количество отзывов
        if (reviewsList.length > 0) {
          const totalRating = reviewsList.reduce((sum, review) => sum + review.rating, 0);
          setProductRating(totalRating / reviewsList.length);
          setReviewsCount(reviewsList.length);
          
          // Обновляем рейтинг продукта в соответствующей коллекции
          await updateProductRating(productId, totalRating / reviewsList.length, reviewsList.length, reviewsList[0].collectionName);
        } else {
          setProductRating(0);
          setReviewsCount(0);
        }
      } catch (indexError) {
        console.warn('Firebase index error detected, falling back to simple query without ordering:', indexError);
        
        // If the index doesn't exist, fall back to a simpler query without orderBy
        const simpleQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', productId)
        );
        
        const snapshot = await getDocs(simpleQuery);
        const reviewsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        
        // Sort locally instead
        reviewsList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
        });
        
        setReviews(reviewsList);
        
        if (reviewsList.length > 0) {
          const totalRating = reviewsList.reduce((sum, review) => sum + review.rating, 0);
          setProductRating(totalRating / reviewsList.length);
          setReviewsCount(reviewsList.length);
          
          await updateProductRating(productId, totalRating / reviewsList.length, reviewsList.length, reviewsList[0].collectionName);
          
          // Suggest creating the index
          console.info(
            'To improve performance, please create the following Firebase index:\n' +
            'Collection: reviews\n' +
            'Fields: productId (Ascending), createdAt (Descending)\n' +
            'This can be done by clicking the link in the Firebase error message in the console.'
          );
        } else {
          setProductRating(0);
          setReviewsCount(0);
        }
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Добавить новый отзыв
  const addReview = async (productId: string, rating: number, comment: string, collectionName?: string) => {
    const auth = getAuth();
    
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be logged in to leave a review');
    }
    
    try {
      // Ensure Firestore access with proper authentication
      const hasAccess = await ensureFirestoreAccess();
      if (!hasAccess) {
        throw new Error('Authentication failed. Please sign out and sign back in.');
      }

      // Проверяем, оставлял ли пользователь уже отзыв для этого продукта
      const userReviewQuery = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const existingReview = await getDocs(userReviewQuery);
      
      if (!existingReview.empty) {
        throw new Error('You have already reviewed this product');
      }
      
      // Get user display name from profile utilities
      const userName = getUserDisplayName(auth.currentUser.uid);
      
      // Создаем новый отзыв
      const newReview = {
        productId,
        userId: auth.currentUser.uid,
        userName: userName, // Use the name from our utility function
        userAvatar: auth.currentUser.photoURL || '',
        rating,
        comment,
        createdAt: serverTimestamp(),
        collectionName
      };
      
      // Добавляем отзыв в Firestore
      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      
      // Обновляем локальное состояние
      const reviewWithId = {
        id: docRef.id,
        ...newReview,
      } as Review;
      
      setReviews([reviewWithId, ...reviews]);
      setUserReviews([reviewWithId, ...userReviews]);
      
      // Пересчитываем средний рейтинг
      const updatedReviews = [reviewWithId, ...reviews];
      const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
      const newAvgRating = totalRating / updatedReviews.length;
      
      setProductRating(newAvgRating);
      setReviewsCount(updatedReviews.length);
      
      // Обновляем рейтинг продукта
      await updateProductRating(productId, newAvgRating, updatedReviews.length, collectionName);
      
      // Уведомляем о новом рейтинге
      window.dispatchEvent(new CustomEvent('productRatingUpdated', { 
        detail: { 
          productId, 
          rating: newAvgRating, 
          reviewCount: updatedReviews.length 
        } 
      }));
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding review:', error);
      throw new FirestoreError(
        (error as FirestoreError).code || 'unknown',
        (error as Error).message || 'Failed to add review'
      );
    }
  };

  // Обновить существующий отзыв
  const updateReview = async (reviewId: string, rating: number, comment: string) => {
    const auth = getAuth();
    
    if (!auth.currentUser) {
      throw new Error('You must be logged in to update a review');
    }
    
    try {
      // Ensure Firestore access with proper authentication
      const hasAccess = await ensureFirestoreAccess();
      if (!hasAccess) {
        throw new Error('Authentication failed. Please sign out and sign back in.');
      }
      
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewSnap = await getDoc(reviewRef);
      
      if (!reviewSnap.exists()) {
        throw new Error('Review not found');
      }
      
      const reviewData = reviewSnap.data() as Review;
      
      if (reviewData.userId !== auth.currentUser.uid) {
        throw new Error('You can only update your own reviews');
      }
      
      // Обновляем отзыв
      await updateDoc(reviewRef, {
        rating,
        comment,
        updatedAt: serverTimestamp()
      });
      
      // Обновляем локальное состояние
      const updatedReviews = reviews.map(review => 
        review.id === reviewId 
          ? { ...review, rating, comment, updatedAt: new Date() } 
          : review
      );
      
      const updatedUserReviews = userReviews.map(review => 
        review.id === reviewId 
          ? { ...review, rating, comment, updatedAt: new Date() } 
          : review
      );
      
      setReviews(updatedReviews);
      setUserReviews(updatedUserReviews);
      
      // Пересчитываем средний рейтинг
      const productId = reviewData.productId;
      const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
      const newAvgRating = totalRating / updatedReviews.length;
      
      setProductRating(newAvgRating);
      
      // Обновляем рейтинг продукта
      await updateProductRating(productId, newAvgRating, updatedReviews.length, reviewData.collectionName);
      
      // Уведомляем о новом рейтинге
      window.dispatchEvent(new CustomEvent('productRatingUpdated', { 
        detail: { 
          productId, 
          rating: newAvgRating, 
          reviewCount: updatedReviews.length 
        } 
      }));
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  };

  // Удалить отзыв
  const deleteReview = async (reviewId: string) => {
    const auth = getAuth();
    
    if (!auth.currentUser) {
      throw new Error('You must be logged in to delete a review');
    }
    
    try {
      // Force token refresh to ensure we have a valid token
      await auth.currentUser.getIdToken(true);
      
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewSnap = await getDoc(reviewRef);
      
      if (!reviewSnap.exists()) {
        throw new Error('Review not found');
      }
      
      const reviewData = reviewSnap.data() as Review;
      
      if (reviewData.userId !== auth.currentUser.uid) {
        throw new Error('You can only delete your own reviews');
      }
      
      // Удаляем отзыв
      await deleteDoc(reviewRef);
      
      // Обновляем локальное состояние
      const productId = reviewData.productId;
      const updatedReviews = reviews.filter(review => review.id !== reviewId);
      const updatedUserReviews = userReviews.filter(review => review.id !== reviewId);
      
      setReviews(updatedReviews);
      setUserReviews(updatedUserReviews);
      
      // Пересчитываем средний рейтинг
      if (updatedReviews.length > 0) {
        const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
        const newAvgRating = totalRating / updatedReviews.length;
        
        setProductRating(newAvgRating);
        setReviewsCount(updatedReviews.length);
        
        // Обновляем рейтинг продукта
        await updateProductRating(productId, newAvgRating, updatedReviews.length, reviewData.collectionName);
        
        // Уведомляем о новом рейтинге
        window.dispatchEvent(new CustomEvent('productRatingUpdated', { 
          detail: { 
            productId, 
            rating: newAvgRating, 
            reviewCount: updatedReviews.length 
          } 
        }));
      } else {
        setProductRating(0);
        setReviewsCount(0);
        
        // Сбрасываем рейтинг продукта
        await updateProductRating(productId, 0, 0, reviewData.collectionName);
        
        // Уведомляем о новом рейтинге
        window.dispatchEvent(new CustomEvent('productRatingUpdated', { 
          detail: { 
            productId, 
            rating: 0, 
            reviewCount: 0 
          } 
        }));
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  };

  // Получить отзыв пользователя для продукта
  const getUserReview = (productId: string): Review | undefined => {
    return userReviews.find(review => review.productId === productId);
  };

  // Обновление рейтинга продукта в соответствующей коллекции
  const updateProductRating = async (productId: string, rating: number, reviewCount: number, collectionName?: string) => {
    try {
      // Если коллекция не указана, пробуем найти продукт во всех коллекциях
      if (!collectionName) {
        const collections = ['products', 'mobile', 'tv', 'audio', 'gaming', 'laptops'];
        
        for (const collection of collections) {
          const productRef = doc(db, collection, productId);
          const productSnap = await getDoc(productRef);
          
          if (productSnap.exists()) {
            await updateDoc(productRef, {
              rating,
              reviewCount
            });
            break;
          }
        }
      } else {
        // Если коллекция указана, обновляем продукт напрямую
        const productRef = doc(db, collectionName, productId);
        await updateDoc(productRef, {
          rating,
          reviewCount
        });
      }
    } catch (error) {
      console.error('Error updating product rating:', error);
    }
  };

  // Форматирование даты отзыва
  const formatReviewDate = (timestamp: any): string => {
    if (!timestamp) return '';
    
    let date;
    
    if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // JavaScript Date
      date = timestamp;
    } else {
      // Fallback to current date
      date = new Date();
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Значения, предоставляемые контекстом
  const contextValue: ReviewContextType = {
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
    formatReviewDate,
  };

  return (
    <ReviewContext.Provider value={contextValue}>
      {children}
    </ReviewContext.Provider>
  );
};

export default ReviewContext;