import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import Rating from './Rating'; // Add this import

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
  rating?: number;
  reviewCount?: number;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product: initialProduct }) => {
  const [product, setProduct] = useState<Product>(initialProduct);
  const auth = getAuth();
  const user = auth.currentUser;
  
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if product is in favorites when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user) {
        const favRef = ref(database, `users/${user.uid}/favorites/${product.id}`);
        const snapshot = await get(favRef);
        setIsFavorite(snapshot.exists());
      } else {
        // Fallback to localStorage for non-logged in users
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        setIsFavorite(favorites.includes(product.id));
      }
    };

    checkFavoriteStatus();
  }, [user, product.id]);

  // Listen for rating updates from Realtime Database
  useEffect(() => {
    const productRef = ref(database, `products/${product.id}`);
    
    const unsubscribe = onValue(productRef, (snapshot) => {
      if (snapshot.exists()) {
        const productData = snapshot.val();
        if (productData.rating !== undefined && productData.reviewCount !== undefined) {
          setProduct(prev => ({
            ...prev,
            rating: productData.rating,
            reviewCount: productData.reviewCount
          }));
        }
      }
    });
    
    return () => unsubscribe();
  }, [product.id]);
  
  // Also listen for the custom event from other components
  useEffect(() => {
    const handleRatingUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.productId === product.id) {
        setProduct(prev => ({
          ...prev,
          rating: customEvent.detail.rating,
          reviewCount: customEvent.detail.reviewCount
        }));
      }
    };
    
    window.addEventListener('productRatingUpdated', handleRatingUpdate);
    return () => window.removeEventListener('productRatingUpdated', handleRatingUpdate);
  }, [product.id]);

  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    setIsInCart(true);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (user) {
      try {
        const favRef = ref(database, `users/${user.uid}/favorites/${product.id}`);
        if (isFavorite) {
          // Remove from favorites
          await set(favRef, null);
        } else {
          // Add to favorites
          await set(favRef, {
            addedAt: new Date().toISOString(),
            productId: product.id,
            category: product.category
          });
        }
        setIsFavorite(!isFavorite);
        // Dispatch event for updating other components
        window.dispatchEvent(new Event('favoritesUpdated'));
      } catch (error) {
        console.error('Error updating favorites:', error);
      }
    } else {
      // Fallback to localStorage for non-logged in users
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      let updatedFavorites;
      
      if (isFavorite) {
        updatedFavorites = favorites.filter((id: string) => id !== product.id);
      } else {
        updatedFavorites = [...favorites, product.id];
      }
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new Event('favoritesUpdated'));
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
      <figure className="relative pt-4 px-4 cursor-pointer" onClick={handleClick}>
        <img 
          src={product.image} 
          alt={product.name} 
          className="rounded-xl h-48 w-full object-contain"
        />
        <div className="absolute top-6 left-6 flex gap-2"> {/* Changed position to top-left */}
          <button
            onClick={handleAddToCart}
            className={`btn btn-circle btn-primary ${isInCart ? 'btn-success' : ''}`}
          >
            <FaShoppingCart className="w-5 h-5" />
          </button>
          <button
            onClick={handleFavoriteClick}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
          >
            <FaHeart className={`w-5 h-5 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </figure>
      
      <div className="card-body">
        <h2 className="card-title cursor-pointer" onClick={handleClick}>
          {product.name}
          {product.brand && <span className="text-sm text-gray-500">({product.brand})</span>}
        </h2>
        
        {/* Rating display */}
        <div className="flex items-center gap-2">
          <Rating value={product.rating || 0} size="sm" />
          <span className="text-xs text-gray-500">
            {product.rating ? product.rating.toFixed(1) : "0"} 
            ({product.reviewCount || 0})
          </span>
        </div>
        
        {product.memory && (
          <p className="text-sm text-gray-600">{product.memory}</p>
        )}
        
        {product.color && (
          <p className="text-sm text-gray-600">{product.color}</p>
        )}
        
        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mt-4">
          <span className="text-xl font-bold">{product.price.toFixed(2)} NOK</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;