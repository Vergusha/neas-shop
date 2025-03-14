import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const FavoritesPage: React.FC = () => {
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Track changes to favorites with this state
  const [favoritesChangeCount, setFavoritesChangeCount] = useState(0);

  // Create a callback function to handle favorite changes
  const handleFavoriteChange = useCallback(() => {
    // Increment counter to trigger re-fetch
    setFavoritesChangeCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        setLoading(true);
        // Get favorite IDs from localStorage
        const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
        
        if (favoriteIds.length === 0) {
          setFavoriteProducts([]);
          setLoading(false);
          return;
        }

        // Fetch each product by ID from Firestore
        const productPromises = favoriteIds.map(async (id: string) => {
          try {
            // Try to fetch from 'products' collection
            const productDoc = await getDoc(doc(db, 'products', id));
            if (productDoc.exists()) {
              return { id, ...productDoc.data() } as Product;
            }
            
            // If not found in 'products', try 'mobile' collection
            const mobileDoc = await getDoc(doc(db, 'mobile', id));
            if (mobileDoc.exists()) {
              return { id, ...mobileDoc.data() } as Product;
            }
            
            return null;
          } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            return null;
          }
        });

        const products = (await Promise.all(productPromises)).filter((p): p is Product => p !== null);
        setFavoriteProducts(products);
      } catch (error) {
        console.error("Error fetching favorite products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteProducts();
  }, [favoritesChangeCount]); // Re-run effect when favoritesChangeCount changes

  if (loading) {
    return <div className="flex justify-center items-center py-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Favorites</h1>
      {favoriteProducts.length === 0 ? (
        <div className="text-center py-8">No favorite products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteProducts.map((product) => (
            <div key={product.id} className="cursor-pointer">
              <ProductCard
                id={product.id}
                image={product.image}
                name={product.name}
                description={product.description}
                price={product.price}
                onFavoriteChange={handleFavoriteChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
