import React, { useState, useEffect } from 'react';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import Rating from './Rating'; // Add this import
import ProductImageCarousel from './ProductImageCarousel';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
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
  // Ensure product has required properties with proper types
  const normalizedProduct = {
    ...initialProduct,
    price: typeof initialProduct.price === 'number' ? initialProduct.price : 
           typeof initialProduct.price === 'string' ? parseFloat(initialProduct.price) : 0,
    id: initialProduct.id || '',
    name: initialProduct.name || 'Unnamed Product',
    description: initialProduct.description || '',
    image: initialProduct.image || '',
  };
  
  const [product, setProduct] = useState<Product>(normalizedProduct);
  const auth = getAuth();
  const user = auth.currentUser;
  
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cartButtonFlash, setCartButtonFlash] = useState(false);

  // Check if product is in favorites when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      console.log('Checking favorite status for product:', product.id);
      
      if (user) {
        const favRef = ref(database, `users/${user.uid}/favorites/${product.id}`);
        const snapshot = await get(favRef);
        const isFav = snapshot.exists();
        console.log(`Product ${product.id} favorite status:`, isFav ? 'is favorite' : 'not favorite');
        setIsFavorite(isFav);
      } else {
        // Fallback to localStorage for non-logged in users
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const isFav = favorites.includes(product.id);
        console.log(`Product ${product.id} local favorite status:`, isFav ? 'is favorite' : 'not favorite');
        setIsFavorite(isFav);
      }
    };

    checkFavoriteStatus();
    
    // Also listen for favorites updates from other components
    const handleFavoritesUpdated = () => {
      checkFavoriteStatus();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
  }, [user, product.id]);

  // Listen for rating updates from Realtime Database
  useEffect(() => {
    const productRef = ref(database, `products/${product.id}`);
    
    const unsubscribe = onValue(productRef, (snapshot) => {
      if (snapshot.exists()) {
        const productData = snapshot.val();
        setProduct(prev => ({
          ...prev,
          rating: productData.rating !== undefined ? productData.rating : 0,
          reviewCount: productData.reviewCount !== undefined ? productData.reviewCount : 0
        }));
      } else {
        // If product node doesn't exist, set default values
        setProduct(prev => ({
          ...prev,
          rating: 0,
          reviewCount: 0
        }));
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

  // Collect all available images for the product
  const getProductImages = (): string[] => {
    const images: string[] = [];
    if (product.image) images.push(product.image);
    if (product.image2) images.push(product.image2);
    if (product.image3) images.push(product.image3);
    if (product.image4) images.push(product.image4);
    if (product.image5) images.push(product.image5);
    
    // Check if there are any other numbered image fields
    for (let i = 6; i <= 10; i++) {
      const imageKey = `image${i}` as keyof typeof product;
      if (product[imageKey]) {
        images.push(product[imageKey] as string);
      }
    }
    
    return images;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const cart = JSON.parse(localStorage.getItem(`cart_${user.uid}`) || '[]');
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem(`cart_${user.uid}`, JSON.stringify(cart));
    setIsInCart(true);
    setCartButtonFlash(true);
    setTimeout(() => setCartButtonFlash(false), 500);
    
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const favRef = ref(database, `users/${user.uid}/favorites/${product.id}`);
      if (isFavorite) {
        await set(favRef, null);
      } else {
        await set(favRef, {
          addedAt: new Date().toISOString(),
          productId: product.id,
          category: product.category || 'uncategorized',
          name: product.name || 'Product',
          image: product.image || '',
          price: product.price || 0
        });
      }
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error('Error updating favorites:', error);
      alert(`Failed to update favorites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatProductName = (product: Product): string => {
    const parts = [];
    if (product.brand) parts.push(product.brand);
    if (product.model) parts.push(product.model);
    if (product.modelNumber) parts.push(product.modelNumber);
    if (product.memory) parts.push(product.memory);
    if (product.color) parts.push(product.color);
    
    return parts.join(', ');
  };

  return (
    <div className="product-card-wrapper">
      <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 product-card">
        <figure className="relative pt-4 px-4">
          {/* Replace static image with our new carousel */}
          <ProductImageCarousel 
            images={getProductImages()} 
            productName={product.name}
            onClick={handleClick}
          />
          <div className="absolute top-6 left-6 flex gap-2 card-actions">
            <button
              onClick={handleAddToCart}
              className={`btn btn-circle btn-primary ${!user ? 'opacity-50' : ''} ${isInCart ? 'btn-success' : ''} ${cartButtonFlash ? 'cart-flash' : ''}`}
              title={!user ? 'Please login to add to cart' : 'Add to cart'}
            >
              <FaShoppingCart className={`w-5 h-5 ${cartButtonFlash ? 'text-[#F0E965]' : ''}`} />
            </button>
            <button
              onClick={handleFavoriteClick}
              className={`p-2 hover:scale-110 transition-all ${!user ? 'opacity-50' : ''}`}
              title={!user ? 'Please login to add to favorites' : isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <FaHeart className={`w-5 h-5 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </figure>
        
        <div className="card-body">
          {/* Rating display - show only if there are reviews */}
          <div className="flex items-center gap-2 mb-1">
            <Rating value={product.rating || 0} size="sm" />
            <span className="text-xs text-gray-500">
              {(product.reviewCount && product.reviewCount > 0) ? 
                `${(product.rating || 0).toFixed(1)} (${product.reviewCount})` : 
                "No reviews"}
            </span>
          </div>
          
          <h2 className="card-title cursor-pointer text-lg font-bold hover:text-primary transition-colors" onClick={handleClick}>
            {formatProductName(product)}
          </h2>
          
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
          
          <div className="flex justify-between items-center mt-4">
            <span className="text-xl font-bold">
              {typeof product.price === 'number' 
                ? product.price.toFixed(2) 
                : Number(product.price).toFixed(2)} NOK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;