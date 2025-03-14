import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  onFavoriteChange?: () => void; // Add optional callback
}

const ProductCard: React.FC<ProductCardProps> = ({ id, image, name, description, price, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  
  // Check if product is in favorites on component mount
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.includes(id));
  }, [id]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop event propagation to parent link
    e.stopPropagation();
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    let updatedFavorites;
    if (favorites.includes(id)) {
      // Remove from favorites
      updatedFavorites = favorites.filter((favId: string) => favId !== id);
    } else {
      // Add to favorites
      updatedFavorites = [...favorites, id];
    }
    
    // Save updated favorites to localStorage
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Update local state
    setIsFavorite(!isFavorite);
    
    // Call the callback function if provided
    if (onFavoriteChange) {
      onFavoriteChange();
    }
  };

  return (
    <Link to={`/product/${id}`} className="block">
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
          <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;