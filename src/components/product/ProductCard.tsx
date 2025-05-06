import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { getTheme } from '../../utils/themeUtils';
import Rating from '../ui/Rating';
import { Product } from '../../types/product';
import { useProductCard } from '../../contexts/ProductCardContext';
import { formatProductDescription } from '../../utils/productUtils';

interface ProductCardProps {
  product: Product;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  showRating?: boolean;
  showStock?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite: propIsFavorite,
  onToggleFavorite: propToggleFavorite,
  onAddToCart: propAddToCart,
  showRating,
  showStock,
}) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Получаем функции и настройки из контекста
  const {
    handleToggleFavorite: contextToggleFavorite,
    handleAddToCart: contextAddToCart,
    isFavorite: isProductFavorite,
    defaultProps
  } = useProductCard();

  // Используем пропсы, если они переданы, иначе используем значения из контекста
  const effectiveShowRating = showRating !== undefined ? showRating : defaultProps.showRating;
  const effectiveShowStock = showStock !== undefined ? showStock : defaultProps.showStock;
  const effectiveIsFavorite = propIsFavorite !== undefined ? propIsFavorite : isProductFavorite(product.id || '');
  const effectiveToggleFavorite = propToggleFavorite || contextToggleFavorite;
  const effectiveAddToCart = propAddToCart || contextAddToCart;

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Format product description using the utility function
  const formatDescription = (description: string | undefined): JSX.Element | null => {
    if (!description) return null;
    
    // Convert description with # markers to a formatted list
    const formattedDescription = formatProductDescription(description, true);
    
    if (typeof formattedDescription === 'string') {
      return <span>{formattedDescription}</span>;
    }
    
    // Return an actual list with line breaks
    return (
      <ul className="pl-3 list-disc">
        {formattedDescription.slice(0, 3).map((item, index) => (
          <li key={index} className="text-xs">{item}</li>
        ))}
      </ul>
    );
  };

  // Function to format product name with all details
  const getFormattedProductName = (product: Product): string => {
    if (product.formattedName) {
      return product.formattedName;
    }

    // Категория должна быть строго строкой
    const collection = typeof product.collection === 'string' ? product.collection : '';
    const category = typeof product.category === 'string' ? product.category : '';
    
    // Мобильные устройства
    if (collection === 'mobile' || category === 'mobile') {
      return `${product.brand || ''} ${product.model || ''} ${product.modelNumber || ''} ${product.memory || ''} ${product.color || ''}`.trim();
    }
    
    // Ноутбуки
    if (collection === 'laptops' || category === 'laptops') {
      if (product.brand === 'Apple') {
        return `${product.brand} ${product.model} ${product.processor?.replace('Apple ', '')} ${product.ram} ${product.storageType} ${product.color}`.trim();
      } else {
        return `${product.brand || ''} ${product.model || ''} ${product.processor || ''} ${product.ram || ''} ${product.storageType || ''}`.trim();
      }
    }
    
    // Телевизоры
    if (collection === 'tv' || category === 'tv') {
      const size = product.diagonal || product.screenSize || '';
      return `${product.brand || ''} ${size ? size + '"' : ''} ${product.displayType || ''} ${product.resolution || ''} ${product.model || ''}`.trim();
    }
    
    // Игровые устройства
    if (collection === 'gaming' || category === 'gaming') {
      return `${product.brand || ''} ${product.model || ''} ${product.modelNumber || ''} ${product.connectivity || ''} ${product.deviceType || ''} ${product.color || ''}`.trim();
    }
    
    // Аудио устройства
    if (collection === 'audio' || category === 'audio') {
      return `${product.brand || ''} ${product.model || ''} ${product.subtype || ''} ${product.color || ''}`.trim();
    }
    
    // Если ничего не подходит, возвращаем оригинальное имя или сочетание бренда и модели
    return product.name || `${product.brand || ''} ${product.model || ''} ${product.color || ''}`.trim() || 'Unnamed Product';
  };

  return (
    <div
      className={`group relative h-full rounded-lg overflow-hidden shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
        currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'
      }`}
    >
      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          effectiveToggleFavorite(product);
        }}
        className="absolute top-2 right-2 z-10 bg-transparent border-none outline-none"
        style={{ boxShadow: 'none', borderRadius: 0, padding: 0, background: 'none' }}
        aria-label={effectiveIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={20}
          className={effectiveIsFavorite ? 'fill-red-500 text-red-500' : currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-500'}
        />
      </button>

      {/* Product Link */}
      <Link to={`/product/${product.id}`} className="flex flex-col h-full">
        {/* Product Image */}
        <div className={`relative h-40 overflow-hidden ${currentTheme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
          <img
            src={product.image || '/placeholder-image.jpg'}
            alt={getFormattedProductName(product)}
            className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Product Details */}
        <div className="flex flex-col flex-grow p-4 pt-3">
          {/* Brand & Name */}
          <div className="mb-1">
            <span className={`text-xs uppercase font-semibold ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {product.brand || ''}
            </span>
            <h3 className={`text-sm font-medium line-clamp-2 min-h-[2.5rem] ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
              {getFormattedProductName(product)}
            </h3>
            {effectiveShowRating && (
              <div className="flex items-center mt-1 space-x-1">
                <Rating value={product.rating || 0} readonly size="small" />
                {product.reviewCount ? (
                  <span className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({product.reviewCount})
                  </span>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Product Description */}
          <div className={`mt-2 mb-2 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDescription(product.description)}
          </div>

          {/* Price & Details */}
          <div className="pt-2 mt-auto">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className={`text-lg font-bold ${currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003D2D]'}`}>
                  {product.price ? `${product.price} NOK` : 'Price on request'}
                </span>
                
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {product.originalPrice} NOK
                  </span>
                )}
              </div>
              
              {effectiveShowStock && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  product.inStock 
                    ? currentTheme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                    : currentTheme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
                }`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart Button */}
          <div className="mt-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                effectiveAddToCart(product);
              }}
              disabled={!product.inStock}
              className={`w-full py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                product.inStock
                  ? currentTheme === 'dark'
                    ? 'bg-[#95c672] text-gray-900 hover:bg-[#85b662]'
                    : 'bg-[#003D2D] text-white hover:bg-[#004D3D]'
                  : currentTheme === 'dark'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={16} />
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;