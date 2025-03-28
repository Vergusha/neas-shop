import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { Heart, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'; 
import Rating from '../components/Rating';
import Reviews from '../components/Reviews';
import ColorVariantSelector from '../components/ColorVariantSelector';
import { trackProductInteraction } from '../utils/productTracking';
import { getFavoriteStatus, toggleFavorite } from '../utils/favoritesService';
import { formatMacBookName, formatAudioName } from '../utils/productFormatting'; // Updated import

// Импортируем необходимые модули для авторизации
import { getAuth } from 'firebase/auth';

// Update ProductData to include additional images
interface ProductData {
  rating: number;
  reviewCount: number;
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  image2?: string; // Additional image
  image3?: string; // Additional image
  color?: string;
  collection?: string; // Add collection field
  brand?: string;
  model?: string;
  modelNumber?: string;
  memory?: string;
  category: string;
  // Laptop specific
  processor?: string;
  graphicsCard?: string;
  screenSize?: string;
  storageType?: string;
  ram?: string;
  operatingSystem?: string;
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  
  // New state for image slider and color variants
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [colorVariants, setColorVariants] = useState<Array<{id: string, color: string, image: string}>>([]);

  // Добавляем проверку состояния авторизации
  const auth = getAuth();
  const isAuthenticated = Boolean(auth.currentUser);

  useEffect(() => {
    // Track page view when product ID changes
    if (id) {
      trackProductInteraction(id, {
        incrementClick: true,
        userId: auth.currentUser?.uid || null
      });
    }
    
    // Ensure the page scrolls to top when loaded
    window.scrollTo(0, 0);
  }, [id]); // Re-execute when product ID changes

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);

        // Сначала проверяем все возможные коллекции для поиска товара
        const collections = ['laptops', 'gaming', 'tv', 'audio', 'mobile'];
        
        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const productData = { 
              id: docSnap.id, 
              ...docSnap.data(),
              collection: collectionName // Добавляем информацию о коллекции
            } as ProductData;
            setProduct(productData);
            
            // Получаем все изображения продукта
            const images = [productData.image];
            if (productData.image2) images.push(productData.image2);
            if (productData.image3) images.push(productData.image3);
            setProductImages(images);

            // Если это ноутбук, загружаем цветовые варианты
            if (collectionName === 'laptops') {
              await fetchColorVariants(productData);
            }
            
            return; // Выходим после нахождения продукта
          }
        }

        // Если продукт не найден ни в одной коллекции
        throw new Error('Product not found');
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    // Check if product is in favorites
    const checkFavoriteStatus = async () => {
      if (id) {
        const isFav = await getFavoriteStatus(id);
        setIsFavorite(isFav);
      }
    };

    checkFavoriteStatus();

    const handleFavoritesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.productId === id) {
        setIsFavorite(customEvent.detail.isFavorite);
      }
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);

    // Listen for updates from Realtime Database
    if (id) {
      const productRef = ref(database, `products/${id}`);
      const unsubscribe = onValue(productRef, (snapshot) => {
        if (snapshot.exists()) {
          const productData = snapshot.val();
          if (productData.rating !== undefined && productData.reviewCount !== undefined) {
            setProduct((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                rating: productData.rating,
                reviewCount: productData.reviewCount
              };
            });
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [id]);

  // Function to fetch color variants
  const fetchColorVariants = async (currentProduct: ProductData) => {
    if (!currentProduct.brand || !currentProduct.model || !currentProduct.processor || !currentProduct.modelNumber) {
      console.log("Missing required fields for color variants:", {
        brand: currentProduct.brand,
        model: currentProduct.model,
        processor: currentProduct.processor,
        modelNumber: currentProduct.modelNumber
      });
      return;
    }
    
    try {
      const collectionRef = collection(db, 'laptops');
      
      // Создаем массив условий, исключая undefined значения
      const conditions = [
        where('brand', '==', currentProduct.brand),
        where('model', '==', currentProduct.model)
      ];

      if (currentProduct.processor) {
        conditions.push(where('processor', '==', currentProduct.processor));
      }
      if (currentProduct.modelNumber) {
        conditions.push(where('modelNumber', '==', currentProduct.modelNumber));
      }

      const q = query(collectionRef, ...conditions);
      
      const querySnapshot = await getDocs(q);
      const variants: Array<{id: string, color: string, image: string}> = [];

      console.log(`Found ${querySnapshot.size} potential variants`);

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Check if this is a valid variant with matching specs
        const isMatchingVariant = 
          data.ram === currentProduct.ram &&
          data.storageType === currentProduct.storageType &&
          data.screenSize === currentProduct.screenSize;

        if (isMatchingVariant) {
          console.log(`Found matching variant: ${data.color}`);
          variants.push({
            id: docSnapshot.id,
            color: data.color || '',
            image: data.image || ''
          });
        }
      });

      variants.sort((a, b) => a.color.localeCompare(b.color));
      console.log('Final variants:', variants);
      setColorVariants(variants);

    } catch (error) {
      console.error("Error fetching color variants:", error);
    }
  };

  // Function to handle color variant selection
  const handleColorVariantSelect = (variantId: string) => {
    if (variantId !== id) {
      // При переходе к новому цветовому варианту не нужно показывать индикатор загрузки заранее,
      // так как это вызывает перерисовку и возможную вспышку интерфейса
      
      // Используем navigate без опции replace: true для лучшей работы с историей браузера
      navigate(`/product/${variantId}`);
      
      // Не нужно явно вызывать scrollTo, React Router сам обработает это
    }
  };

  // Also listen for the custom event
  useEffect(() => {
    const handleRatingUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.productId === id) {
        setProduct((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            rating: customEvent.detail.rating,
            reviewCount: customEvent.detail.reviewCount
          };
        });
      }
    };
    
    window.addEventListener('productRatingUpdated', handleRatingUpdate);
    return () => window.removeEventListener('productRatingUpdated', handleRatingUpdate);
  }, [id]);

  // Function to toggle favorite status
  const toggleFavoriteStatus = async () => {
    if (!id || !product) return;
    
    if (!isAuthenticated) {
      const confirmLogin = window.confirm('You need to be logged in to add items to favorites. Would you like to log in now?');
      if (confirmLogin) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/login');
      }
      return;
    }
    
    try {
      const productData = {
        category: product.collection || 'uncategorized',
        name: product.name,
        image: product.image,
        price: product.price
      };

      const newIsFavorite = await toggleFavorite(id, productData);
      
      if (newIsFavorite) {
        trackProductInteraction(id, {
          incrementFavorite: true,
          userId: auth.currentUser?.uid || null
        });
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      alert('Failed to update favorites');
    }
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const addToCart = () => {
    if (!product || !id) return;
  
    // Проверяем, авторизован ли пользователь
    if (!isAuthenticated) {
      // Если пользователь не авторизован, показываем уведомление и перенаправляем на страницу входа
      const confirmLogin = window.confirm('You need to be logged in to add items to cart. Would you like to log in now?');
      if (confirmLogin) {
        // Сохраняем текущий URL, чтобы вернуться после авторизации
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/login');
      }
      return;
    }
  
    // Используем единый ключ для корзины
    const cartKey = 'cart';
    
    // Получаем текущую корзину
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Проверяем, есть ли товар уже в корзине
    const existingItemIndex = cart.findIndex((item: any) => item.id === id);
    
    if (existingItemIndex >= 0) {
      // Обновляем количество, если товар уже в корзине
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Добавляем новый товар в корзину
      cart.push({
        id,
        quantity,
        name: product.name,
        price: product.price,
        image: product.image,
        collection: product.collection || 'uncategorized'
      });
      
      // Отслеживаем добавление в корзину только для новых товаров
      trackProductInteraction(id, {
        incrementCart: true,
        userId: auth.currentUser?.uid || null
      });
    }
    
    // Сохраняем корзину в localStorage
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    // Уведомляем о добавлении товара в корзину
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { item: product.name } 
    }));
    
    // Показываем сообщение об успешном добавлении
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  // Methods for image navigation
  const nextImage = () => {
    if (productImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    if (productImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const goToImage = (index: number) => {
    if (index >= 0 && index < productImages.length) {
      setCurrentImageIndex(index);
    }
  };

  // Функция для форматирования описания товара
  const formatDescription = (description: string) => {
    if (!description) return null;
    
    // Проверяем, содержит ли описание маркеры списка
    if (description.includes('•')) {
      // Разбиваем текст на элементы списка по символу •
      const listItems = description.split('•').filter(item => item.trim().length > 0);
      
      if (listItems.length > 0) {
        return (
          <ul className="pl-5 mt-2 space-y-1 list-disc">
            {listItems.map((item, index) => (
              <li key={index} className="text-gray-700">{item.trim()}</li>
            ))}
          </ul>
        );
      }
    }
    
    // Если нет маркеров, возвращаем обычный текст
    return <p className="mt-2 text-gray-700">{description}</p>;
  };

  const formatTitle = (product: ProductData): string => {
    // Логируем данные продукта для отладки
    console.log('Formatting title for product:', product);

    // Существующий код для форматирования MacBook
    if (product.category === 'laptops' && product.brand === 'Apple') {
      return formatMacBookName(product);
    }

    // Существующий код для форматирования аудио
    if (product.collection === 'audio') {
      return formatAudioName(product);
    }

    // Для мобильных устройств формируем полное название в определенном порядке
    if (product.collection === 'mobile') {
      // Создаем массив компонентов названия в правильном порядке
      const nameComponents = [
        product.brand || '', // Бренд (например, Motorola)
        product.model || '', // Модель (например, Moto G84)
        product.modelNumber || '', // Номер модели, если есть
        product.memory || '', // Память (например, 256GB)
        product.color || '' // Цвет (например, Marshmallow Blue)
      ];
      
      // Фильтруем пустые значения и объединяем в строку
      const fullName = nameComponents
        .filter(component => component && component.trim() !== '')
        .join(' ');
      
      // Логируем результат для отладки
      console.log('Generated mobile product full name:', fullName);
      
      // Если сгенерированное название пустое, возвращаем исходное название продукта
      return fullName || product.name;
    }

    // Возвращаем стандартное название для других типов товаров
    return product.name;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (!product) {
    return <div className="text-center">Product not found</div>;
  }

  return (
    <div className="container py-8 mx-auto">
      {/* Pass collection info to session storage for breadcrumbs to use */}
      {product?.collection && (
        <div style={{ display: 'none' }}>
          {(() => {
            sessionStorage.setItem('lastProductCollection', product.collection);
            return null;
          })()}
        </div>
      )}
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row">
          <div className="w-full mb-4 md:w-2/5 md:mb-0">
            {/* Image carousel */}
            <div className="relative">
              {/* Main image */}
              <div className="w-full h-[400px] relative">
                {productImages.length > 0 && (
                  <img 
                    src={productImages[currentImageIndex]} 
                    alt={`${product?.name} - Image ${currentImageIndex + 1}`} 
                    className="object-contain w-full h-full"
                  />
                )}
                
                {/* Navigation arrows - only show if we have multiple images */}
                {productImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute p-2 transform -translate-y-1/2 rounded-full shadow-md left-2 top-1/2 bg-white/80 hover:bg-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute p-2 transform -translate-y-1/2 rounded-full shadow-md right-2 top-1/2 bg-white/80 hover:bg-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnail navigation - only show if we have multiple images */}
              {productImages.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {productImages.map((image, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => goToImage(idx)}
                      className={`w-16 h-16 border-2 rounded-md overflow-hidden ${
                        idx === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img 
                        src={image} 
                        alt={`Thumbnail ${idx + 1}`} 
                        className="object-contain w-full h-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Color variant selector */}
            <ColorVariantSelector 
              variants={colorVariants}
              currentVariantId={id || ''}
              onSelectVariant={handleColorVariantSelect}
            />
          </div>
          
          <div className="w-full md:w-3/5 md:pl-8">
            {/* Переместим кнопку избранного в блок с рейтингом */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Rating value={product?.rating || 0} />
                <span className="text-sm text-gray-600">
                  {product?.rating ? product.rating.toFixed(1) : "0"} 
                  ({product?.reviewCount || 0} reviews)
                </span>
              </div>
              <button 
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                onClick={toggleFavoriteStatus}
                title={isAuthenticated ? 'Add to favorites' : 'Login required to add to favorites'}
              >
                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            
            {/* Заголовок продукта теперь без кнопки избранного */}
            <h1 className="mb-4 text-2xl font-bold">{formatTitle(product)}</h1>
            
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-semibold">Description</h3>
              {formatDescription(product?.description || '')}
            </div>

            {/* Удалили секцию Product Specifications */}
            
            {/* Обновленный блок с ценой - меняем цвет на точный цвет логотипа #003D2D */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-[#003D2D] to-[#005040] rounded-lg transform -rotate-1 scale-105"></div>
              <div className="relative bg-white py-3 px-4 rounded-lg border-2 border-[#003D2D] shadow-md">
                <p className="text-2xl font-bold text-gray-900">
                  {Number(product?.price).toFixed(2)} <span className="text-[#003D2D]">NOK</span>
                </p>
                {product?.price > 1000 && (
                  <p className="mt-1 text-xs text-gray-500">
                    or {(product.price / 12).toFixed(2)} NOK/month with 12-month payment plan
                  </p>
                )}
              </div>
            </div>
            
            {/* Quantity selector and Add to cart button in one row */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center">
                  <button 
                    className="w-10 h-10 flex items-center justify-center text-[#003D2D] hover:bg-[#003D2D] hover:text-white border-2 border-r-0 border-[#003D2D] rounded-l-lg transition-all duration-200 active:scale-95"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} className="stroke-[2.5]" />
                  </button>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, ''));
                        if (!isNaN(val) && val > 0) {
                          setQuantity(val);
                        } else if (e.target.value === '') {
                          setQuantity(1);
                        }
                      }}
                      className="w-12 h-10 text-center border-y-2 border-[#003D2D] focus:outline-none text-[#003D2D] font-medium [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="1"
                    />
                  </div>
                  <button 
                    className="w-10 h-10 flex items-center justify-center text-[#003D2D] hover:bg-[#003D2D] hover:text-white border-2 border-l-0 border-[#003D2D] rounded-r-lg transition-all duration-200 active:scale-95"
                    onClick={incrementQuantity}
                  >
                    <Plus size={16} className="stroke-[2.5]" />
                  </button>
                </div>

                <button 
                  onClick={addToCart}
                  disabled={!isAuthenticated}
                  className={`
                    px-6 h-10 rounded-lg transition-all duration-200
                    flex items-center gap-2 relative overflow-hidden
                    ${isAuthenticated 
                      ? 'bg-[#003D2D] hover:bg-[#004D3D] text-white active:scale-95'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                  title={isAuthenticated ? 'Add to cart' : 'Login'}
                >
                  <ShoppingCart size={18} />
                  <span className="text-sm font-medium">
                    {isAuthenticated ? 'Add to Cart' : 'Login'}
                  </span>
                  {addedToCart && (
                    <span className="absolute inset-0 rounded-lg bg-green-500/20 animate-ping"></span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Success message with animation */}
            {addedToCart && (
              <div className="p-3 mb-6 text-center text-green-700 bg-green-100 border border-green-200 rounded-lg animate-fade-in-down">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Added to cart successfully!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Reviews section - pass the ID explicitly */}
      {product && id && (
        <div>
          <Reviews productId={id} />
        </div>
      )}
    </div>
  );
};

export default ProductPage;