import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, image, name, description, price }) => {
  const userId = 'user123'; // Replace with actual user ID from authentication context
  const favoritesKey = `favorites_${userId}`;
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    setIsFavorite(favorites.some((product: ProductCardProps) => product.id === id));
  }, [id, favoritesKey]);

  const handleFavoriteClick = () => {
    const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    if (isFavorite) {
      const updatedFavorites = favorites.filter((product: ProductCardProps) => product.id !== id);
      localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
      setIsFavorite(false);
    } else {
      favorites.push({ id, image, name, description, price });
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  return (
    <div className="relative card card-compact bg-base-100 shadow-2xl transform transition-transform duration-300 hover:scale-105">
      <figure className="overflow-hidden">
        <img src={image} alt={name} className="w-full h-48 object-contain transition-transform duration-300 hover:scale-110" />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{name}</h2>
        <p>{description}</p>
        <div className="card-actions justify-end">
          <span className="text-xl font-bold">{Number(price).toFixed(2)} NOK</span>
        </div>
      </div>
      <button
        className={`absolute top-2 right-2 p-1 rounded-full ${isFavorite ? 'text-red-500' : 'text-gray-500'}`}
        onClick={handleFavoriteClick}
      >
        <Heart size={24} />
      </button>
    </div>
  );
};

export default ProductCard;