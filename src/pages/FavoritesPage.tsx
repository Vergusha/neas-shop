import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { getAuth } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { database } from '../firebaseConfig';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  category?: string;
  memory?: string;
  color?: string;
}

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      let favoriteIds: string[] = [];

      if (user) {
        // Get favorites from Realtime Database
        const favRef = ref(database, `users/${user.uid}/favorites`);
        const snapshot = await get(favRef);
        if (snapshot.exists()) {
          favoriteIds = Object.keys(snapshot.val());
        }
      } else {
        // Fallback to localStorage for non-logged in users
        favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
      }

      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Fetch products from all collections
      const collections = ['mobile', 'tv', 'gaming', 'laptops', 'smart-home', 'data']; // Added 'laptops'
      const favoriteProducts: Product[] = [];

      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        
        querySnapshot.docs.forEach(doc => {
          if (favoriteIds.includes(doc.id)) {
            favoriteProducts.push({
              id: doc.id,
              ...doc.data(),
              name: doc.data().name || 'Unnamed Product',
              description: doc.data().description || 'No description',
              price: Number(doc.data().price) || 0,
              image: doc.data().image || '',
              brand: doc.data().brand || '',
              category: collectionName
            } as Product);
          }
        });
      }

      setFavorites(favoriteProducts);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
    
    // Custom event handler for favorites updates
    const handleFavoritesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      
      // If we have immediate flag, update UI immediately without refetching
      if (customEvent.detail?.immediate && customEvent.detail?.productId && !customEvent.detail?.isFavorite) {
        // Remove the product from favorites list immediately
        setFavorites(prevFavorites => 
          prevFavorites.filter(product => product.id !== customEvent.detail.productId)
        );
      } else {
        // For non-immediate updates, refetch all favorites
        fetchFavorites();
      }
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
      
      {favorites.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">No favorites yet</h2>
          <p className="text-gray-600">Items you mark as favorite will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
