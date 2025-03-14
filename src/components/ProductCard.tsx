import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  onFavoriteChange?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, image, name, description, price, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [addedToCart, setAddedToCart] = useState(false);
  
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
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if the product is already in the cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === id);
    
    if (existingItemIndex >= 0) {
      // Increment quantity if the product is already in cart
      cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item to cart
      cart.push({
        id,
        quantity: 1,
        name,
        price,
        image
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Dispatch custom event to update cart count in header with product name
    const event = new CustomEvent('cartUpdated', { 
      detail: { item: name }
    });
    window.dispatchEvent(event);
    
    // Show success message
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
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
          <div className="card-actions justify-between items-center">
            <span className="text-xl font-bold">{Math.round(price)} NOK</span>
          </div>
          
          {/* Success message */}
          {addedToCart && (
            <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-center py-1 text-sm">
              Added to cart!
            </div>
          )}
        </div>
        {/* Moved shopping cart button to top-left corner */}
        <button
          className="absolute top-2 left-2 p-1 rounded-full bg-white text-primary hover:bg-primary hover:text-white transition-colors"
          onClick={handleAddToCart}
        >
          <ShoppingCart size={24} />
        </button>
        {/* Favorite button remains at top-right corner */}
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