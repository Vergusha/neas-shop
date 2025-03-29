import React, { useState, useEffect } from 'react';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import Rating from './Rating'; // Add this import
import ProductImageCarousel from './ProductImageCarousel';
import { trackProductInteraction } from '../utils/productTracking';
import { getFavoriteStatus, toggleFavorite } from '../utils/favoritesService';
import { formatMacBookName, formatAudioName, formatMobileName, formatTVName } from '../utils/productFormatting';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    brand?: string;
    model?: string;
    category?: string;
    collection?: string;
    image2?: string;
    image3?: string;
    image4?: string;
    image5?: string;
    deviceType?: string;
    color?: string;
    connectivity?: string;
    memory?: string;
    diagonal?: string;
    screenSize?: string;
    resolution?: string;
    refreshRate?: string;
    displayType?: string;
    modelNumber?: string;
    rating?: number;
    reviewCount?: number;
    [key: string]: any;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product: initialProduct }) => {
  // Normalize the product data
  const normalizedProduct = {
    ...initialProduct,
    brand: initialProduct.brand || '',
    model: initialProduct.model || '',
    price: typeof initialProduct.price === 'number' ? initialProduct.price : 
           typeof initialProduct.price === 'string' ? parseFloat(initialProduct.price) : 0,
    id: initialProduct.id || '',
    name: initialProduct.name || 'Unnamed Product',
    description: initialProduct.description || '',
    image: initialProduct.image || '',
    deviceType: initialProduct.deviceType || '',
    color: initialProduct.color || '',
    connectivity: initialProduct.connectivity || '',
    memory: initialProduct.memory || ''
  };
  
  const [product, setProduct] = useState(normalizedProduct);
  const auth = getAuth();
  const user = auth.currentUser;
  
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cartButtonFlash, setCartButtonFlash] = useState(false);

  // Check if product is in favorites when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const isFav = await getFavoriteStatus(product.id);
      setIsFavorite(isFav);
    };

    checkFavoriteStatus();
    
    const handleFavoritesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.productId === product.id) {
        setIsFavorite(customEvent.detail.isFavorite);
      }
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
  }, [product.id]);

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
    // No need to track here as it will be tracked in ProductPage
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
    e.preventDefault(); // Add this
    e.stopPropagation(); // Add this
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Используем единый ключ для корзины
    const cartKey = 'cart';
    
    // Получаем текущую корзину
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        collection: product.collection || 'uncategorized'
      });
      
      // Отслеживаем добавление в корзину только для новых товаров
      trackProductInteraction(product.id, {
        incrementCart: true,
        userId: user.uid
      });
    }

    // Сохраняем корзину в localStorage
    localStorage.setItem(cartKey, JSON.stringify(cart));
    setIsInCart(true);
    setCartButtonFlash(true);
    setTimeout(() => setCartButtonFlash(false), 500);
    
    // Уведомляем приложение об обновлении корзины
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Add this
    e.stopPropagation(); // Add this
    
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const productData = {
        category: product.category || 'uncategorized',
        name: product.name || 'Product',
        image: product.image || '',
        price: product.price || 0
      };

      const newIsFavorite = await toggleFavorite(product.id, productData);
      setIsFavorite(newIsFavorite);
      
      if (newIsFavorite) {
        trackProductInteraction(product.id, {
          incrementFavorite: true,
          userId: user.uid
        });
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      alert('Failed to update favorites');
    }
  };

  const formatProductDetails = (product: typeof normalizedProduct) => {
    // Ensure we have non-null values before formatting
    const safeProduct = {
      ...product,
      model: product.model || '',
      brand: product.brand || '',
      color: product.color || ''
    };

    // Special formatting for MacBooks
    if (product.category === 'laptops' && product.brand === 'Apple') {
      const macBookName = formatMacBookName(safeProduct);
      return <span className="font-medium">{macBookName}</span>;
    }

    // Special formatting for Audio products
    if (product.collection === 'audio') {
      const audioName = formatAudioName(product);
      return <span className="font-medium">{audioName}</span>;
    }

    // Special formatting for Mobile products
    if (product.collection === 'mobile') {
      return <span className="font-medium">{formatMobileName(product)}</span>;
    }
    
    // Special formatting for TV products using the correct format with all required fields
    if (product.collection === 'tv' || product.category === 'tv') {
      const tvName = formatTVName({
        brand: product.brand,
        diagonal: product.diagonal,
        screenSize: product.screenSize,
        resolution: product.resolution,
        refreshRate: product.refreshRate, // Make sure refreshRate is passed
        displayType: product.displayType,
        model: product.model,
        modelNumber: product.modelNumber
      });
      console.log('Formatted TV name:', tvName); // Debug log
      return <span className="font-medium">{tvName}</span>;
    }

    const details = [];
    
    if (product.brand) details.push(
      <span key="brand" className="font-medium text-primary">{product.brand}</span>
    );
    
    if (product.model) details.push(
      <span key="model" className="font-medium">{product.model}</span>
    );
    
    // Добавляем deviceType для игровых товаров
    if (product.deviceType) details.push(
      <span key="deviceType" className="font-medium">{product.deviceType}</span>
    );
    
    // Добавляем connectivity, если оно есть
    if (product.connectivity) details.push(
      <span key="connectivity" className="text-sm text-gray-600">{product.connectivity}</span>
    );
    
    if (product.modelNumber) details.push(
      <span key="modelNumber" className="font-medium">{product.modelNumber}</span>
    );
    
    if (product.memory) details.push(
      <span key="memory" className="font-medium">{product.memory}</span>
    );
    
    if (product.color) details.push(
      <span key="color" className="font-medium">{product.color}</span>
    );

    return details.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {details}
      </div>
    ) : (
      <span className="font-medium">{product.name}</span>
    );
  };

  // Функция для обработки описания с маркерами
  const formatDescription = (description: string) => {
    if (!description) return null;
    
    // Проверяем, содержит ли описание маркеры списка
    if (description.includes('•')) {
      // Разбиваем текст на элементы списка по символу •
      const listItems = description.split('•').filter(item => item.trim().length > 0);
      
      if (listItems.length > 0) {
        // Ограничиваем количество элементов до 3
        const displayItems = listItems.slice(0, 3);
        const hasMore = listItems.length > 3;
        
        return (
          <ul className="list-disc pl-4 text-xs text-gray-500 space-y-0.5 max-h-24 overflow-hidden">
            {displayItems.map((item, index) => (
              <li key={index}>{item.trim()}</li>
            ))}
            {hasMore && <li className="text-gray-400">...</li>}
          </ul>
        );
      }
    }
    
    // Если нет маркеров, возвращаем обычный текст с ограничением в 3 строки
    return <p className="text-xs text-gray-500 line-clamp-3">{description}</p>;
  };

  return (
    <Link to={`/product/${product.id}`} className="block h-full">
      <div className="product-card-wrapper">
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 product-card h-[420px] sm:h-[450px] lg:h-[480px] flex flex-col">
          <figure className="relative pt-4 px-3 sm:px-6 h-40 sm:h-48 lg:h-56">
            <ProductImageCarousel 
              images={getProductImages()} 
              productName={product.name}
              onClick={handleClick}
            />
            <div className="absolute top-6 right-3 sm:right-6 flex flex-col gap-2">
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
          
          <div className="card-body p-4 sm:p-6 flex flex-col flex-1">
            <div className="h-6 flex items-center gap-2">
              <Rating value={product.rating || 0} size="sm" />
              <span className="text-xs text-gray-500">
                {(product.reviewCount && product.reviewCount > 0) ? 
                  `${(product.rating || 0).toFixed(1)} (${product.reviewCount})` : 
                  "No reviews"}
              </span>
            </div>
            
            <div className="min-h-[2.5rem] text-sm sm:text-base"> 
              {formatProductDetails(product)}
            </div>
            
            <div className="flex-1 overflow-hidden text-xs sm:text-sm"> 
              {formatDescription(product.description)}
            </div>
            
            <div className="mt-2 text-lg sm:text-xl"> 
              <span className="font-bold">
                {typeof product.price === 'number' 
                  ? product.price.toFixed(2) 
                  : Number(product.price).toFixed(2)} NOK
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;