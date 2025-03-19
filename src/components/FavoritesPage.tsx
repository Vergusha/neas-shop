import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';

// Define your own interface matching the props of ProductCard
interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

// Define the local product interface 
type FavoriteProduct = ProductCardProps;

const FavoritesPage: React.FC = () => {
  const userId = 'user123'; // Replace with actual user ID from authentication context
  const favoritesKey = `favorites_${userId}`;
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    setFavorites(storedFavorites);
  }, [favoritesKey]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Favorites</h1>
      {favorites.length === 0 ? (
        <div className="text-center">No favorite products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((product) => (
            <ProductCard
              key={product.id}
              product={product}  // Pass the entire product object as a single prop
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;