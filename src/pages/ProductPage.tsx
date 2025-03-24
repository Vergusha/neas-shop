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
      if (!id) {
        console.error("Product ID is undefined");
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching product with ID: ${id}`);
        
        // Try to get product from each collection until we find it
        const collections = ['mobile', 'products', 'tv'];
        let foundProduct: ProductData | null = null;
        
        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log(`Found product in ${collectionName} collection:`, docSnap.data());
            foundProduct = {
              ...docSnap.data(),
              id: id, // Explicitly add the ID to the product data
              collection: collectionName // Store the collection name
            } as ProductData;
            
            // Clear any previous collection
            sessionStorage.removeItem('lastProductCollection');
            // Set the new collection
            sessionStorage.setItem('lastProductCollection', collectionName);
            console.log('Saved collection to sessionStorage:', collectionName);
            
            break;
          }
        }
        
        if (foundProduct) {
          setProduct(foundProduct);
          
          // Collect all available images
          const images: string[] = [];
          if (foundProduct.image) images.push(foundProduct.image);
          if (foundProduct.image2) images.push(foundProduct.image2);
          if (foundProduct.image3) images.push(foundProduct.image3);
          
          // Check if there are any other numbered image fields
          for (let i = 4; i <= 10; i++) {
            const imageKey = `image${i}` as keyof typeof foundProduct;
            if (foundProduct[imageKey]) {
              images.push(foundProduct[imageKey] as string);
            }
          }
          
          setProductImages(images);
          setCurrentImageIndex(0); // Reset to first image
          
          // Fetch color variants for this product
          await fetchColorVariants(foundProduct);
        } else {
          console.error("Product not found in any collection");
        }
      } catch (error) {
        console.error("Error fetching product: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    
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
    if (!currentProduct.brand || !currentProduct.model || !currentProduct.modelNumber) {
      console.log("Missing brand, model, or modelNumber - cannot fetch color variants");
      return;
    }
    
    try {
      // We'll look for products with the same brand, model, AND modelNumber but different colors
      const collections = ['mobile', 'products', 'tv'];
      const variants: Array<{id: string, color: string, image: string}> = [];
      
      // First add current product to variants
      if (currentProduct.color) {
        variants.push({
          id: currentProduct.id,
          color: currentProduct.color,
          image: currentProduct.image
        });
      }
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        // Create a composite query that matches exact brand, model, AND modelNumber
        const q = query(
          collectionRef,
          where('brand', '==', currentProduct.brand),
          where('model', '==', currentProduct.model),
          where('modelNumber', '==', currentProduct.modelNumber)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnapshot) => {
          // Skip if this is the current product
          if (docSnapshot.id === id) return;
          
          const data = docSnapshot.data();
          if (data.color) {
            // Check if we already have this color in our variants
            const existingVariant = variants.find(v => 
              v.color.toLowerCase() === data.color.toLowerCase()
            );
            
            if (!existingVariant) {
              console.log(`Found variant: ${data.color} (${docSnapshot.id})`);
              variants.push({
                id: docSnapshot.id,
                color: data.color,
                image: data.image || ''
              });
            }
          }
        });
      }
      
      // Sort variants alphabetically by color name
      variants.sort((a, b) => a.color.localeCompare(b.color));
      
      console.log(`Found ${variants.length} color variants for product ${currentProduct.id}:`, 
        variants.map(v => v.color).join(', '));
        
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

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if the product is already in the cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === id);
    
    if (existingItemIndex >= 0) {
      // Update quantity if the product is already in cart
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.push({
        id,
        quantity,
        name: product.name,
        price: product.price,
        image: product.image
      });
      
      // Track adding to cart only for new items (not for increasing quantity)
      trackProductInteraction(id, {
        incrementCart: true,
        userId: auth.currentUser?.uid || null
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Dispatch custom event to update cart count in header with product name
    const event = new CustomEvent('cartUpdated', { 
      detail: { item: product.name } 
    });
    window.dispatchEvent(event);
    
    // Show success message
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

  // Функция для форматирования имени продукта
  const formatProductName = (product: any): string => {
    const parts = [];
    if (product.brand) parts.push(product.brand);
    if (product.model) parts.push(product.model);
    if (product.modelNumber) parts.push(product.modelNumber);
    if (product.memory) parts.push(product.memory);
    if (product.color) parts.push(product.color);
    
    return parts.length > 0 
      ? parts.join(' ') 
      : product.name || 'Unnamed Product';
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
          <ul className="list-disc pl-5 space-y-1 mt-2">
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (!product) {
    return <div className="text-center">Product not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      {/* Pass collection info to session storage for breadcrumbs to use */}
      {product?.collection && (
        <div style={{ display: 'none' }}>
          {(() => {
            sessionStorage.setItem('lastProductCollection', product.collection);
            return null;
          })()}
        </div>
      )}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/5 mb-4 md:mb-0">
            {/* Image carousel */}
            <div className="relative">
              {/* Main image */}
              <div className="w-full h-[400px] relative">
                {productImages.length > 0 && (
                  <img 
                    src={productImages[currentImageIndex]} 
                    alt={`${product?.name} - Image ${currentImageIndex + 1}`} 
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* Navigation arrows - only show if we have multiple images */}
                {productImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md"
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
                        className="w-full h-full object-contain"
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
            <h1 className="text-2xl font-bold mb-4">{formatProductName(product)}</h1>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
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
                  <p className="text-xs text-gray-500 mt-1">
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
                  title={isAuthenticated ? 'Add to cart' : 'Login required to add to cart'}
                >
                  <ShoppingCart size={18} />
                  <span className="text-sm font-medium">
                    {isAuthenticated ? 'Add to Cart' : 'Login'}
                  </span>
                  {addedToCart && (
                    <span className="absolute inset-0 bg-green-500/20 animate-ping rounded-lg"></span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Success message with animation */}
            {addedToCart && (
              <div className="animate-fade-in-down rounded-lg bg-green-100 border border-green-200 p-3 text-green-700 text-center mb-6">
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