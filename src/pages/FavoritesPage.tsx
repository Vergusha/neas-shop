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

  useEffect(() => {
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
        const collections = ['mobile', 'tv', 'gaming', 'smart-home', 'data'];
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

    fetchFavorites();

    // Listen for favorites updates
    window.addEventListener('favoritesUpdated', fetchFavorites);
    return () => window.removeEventListener('favoritesUpdated', fetchFavorites);
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
        <div className="text-center">No favorite products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
          {favorites.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
