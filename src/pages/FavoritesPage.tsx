import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';

interface ProductCardProps {
  id: string; // Changed from number to string
  image: string;
  name: string;
  description: string;
  price: number;
}

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<ProductCardProps[]>([]);

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(storedFavorites);
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Favorites</h1>
      {favorites.length === 0 ? (
        <div className="text-center">No favorite products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((product) => (
            product && product.id && (
              <ProductCard
                key={product.id}
                id={product.id}
                image={product.image}
                name={product.name}
                description={product.description}
                price={product.price}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
