import React, { useEffect, useState, useTransition } from 'react'; // Добавляем useTransition
import { useParams, useNavigate } from 'react-router-dom'; // Removing unused useLocation
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { Heart, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'; 
import Rating from '../../components/ui/Rating';
import Reviews from '../../components/product/Reviews';
import ColorVariantSelector from '../../components/product/ColorVariantSelector';
import { trackProductInteraction } from '../../utils/productTracking';
import { getFavoriteStatus, toggleFavorite } from '../../utils/favoritesService';
import { formatMacBookName } from '../../utils/productFormatting'; // Updated import
import { getTheme } from '../../utils/themeUtils'; // Import theme utilities

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
  resolution?: string; // Add resolution field for TVs
  displayType?: string; // Add displayType field for TVs
  refreshRate?: string; // Add refreshRate field for TVs
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition(); // Для плавных переходов
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  
  // New state for image slider and color variants
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [colorVariants, setColorVariants] = useState<Array<{id: string, color: string, image: string}>>([]);

  // Добавляем проверку состояния авторизации
  const auth = getAuth();
  const isAuthenticated = Boolean(auth.currentUser);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

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

  // Оптимизированная функция для предзагрузки данных о цветовых вариантах
  useEffect(() => {
    // Предзагружаем изображения для вариантов, чтобы они были готовы сразу
    colorVariants.forEach(variant => {
      if (variant.image && variant.id !== id) {
        const img = new Image();
        img.src = variant.image;
      }
    });
  }, [colorVariants, id]);

  // Оптимизируем загрузку товара
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      // Добавляем индикатор загрузки только при первой загрузке или при полном изменении товара
      // (не при смене цвета того же товара)
      const isSameProductDifferentColor = product && 
        colorVariants.some(variant => variant.id === id);
      
      if (!isSameProductDifferentColor) {
        setLoading(true);
      }

      try {
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

            // Загружаем цветовые варианты для любого типа товара
            await fetchColorVariants(productData);
            
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

    // Запускаем загрузку внутри startTransition для улучшения UX
    startTransition(() => {
      fetchProduct();
    });
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

  // Function to fetch color variants for any product type
  const fetchColorVariants = async (currentProduct: ProductData) => {
    if (!currentProduct.collection || !currentProduct.brand || !currentProduct.model) {
      console.log("Missing required fields for color variants:", {
        collection: currentProduct.collection,
        brand: currentProduct.brand,
        model: currentProduct.model
      });
      return;
    }
    
    try {
      const collectionRef = collection(db, currentProduct.collection);
      
      // Универсальный метод извлечения базового ID для всех типов продуктов
      const productId = currentProduct.id || '';
      const baseProductId = getBaseProductId(productId);
      
      console.log(`Base product ID for color variants: ${baseProductId}`);
      
      // Создаем более конкретный запрос на основе типа продукта
      let conditions = [
        where('brand', '==', currentProduct.brand),
        where('model', '==', currentProduct.model)
      ];
      
      // Добавляем специфические условия в зависимости от типа продукта
      if (currentProduct.collection === 'mobile') {
        if (currentProduct.memory) {
          conditions.push(where('memory', '==', currentProduct.memory));
        }
      } else if (currentProduct.collection === 'laptops') {
        if (currentProduct.processor) {
          conditions.push(where('processor', '==', currentProduct.processor));
        }
        if (currentProduct.ram) {
          conditions.push(where('ram', '==', currentProduct.ram));
        }
        if (currentProduct.storageType) {
          conditions.push(where('storageType', '==', currentProduct.storageType));
        }
      } else if (currentProduct.collection === 'tv') {
        if (currentProduct.screenSize) {
          conditions.push(where('screenSize', '==', currentProduct.screenSize));
        }
        if (currentProduct.displayType) {
          conditions.push(where('displayType', '==', currentProduct.displayType));
        }
      } else if (currentProduct.collection === 'audio' || currentProduct.collection === 'gaming') {
        // Для аудио и игровых устройств добавляем дополнительную фильтрацию по deviceType
        if (currentProduct.deviceType) {
          conditions.push(where('deviceType', '==', currentProduct.deviceType));
        }
      }

      const q = query(collectionRef, ...conditions);
      const querySnapshot = await getDocs(q);
      const variants: Array<{id: string, color: string, image: string}> = [];

      console.log(`Found ${querySnapshot.size} potential variants to filter`);
      
      // Обрабатываем результаты запроса
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const variantId = docSnapshot.id;
        
        // Получаем базовый ID для текущего варианта
        const currentVariantBaseId = getBaseProductId(variantId);
        
        // Проверяем соответствие базовых ID (исключая различия в цвете)
        const isMatchingVariant = (currentVariantBaseId === baseProductId);
        
        console.log(`Checking variant ${variantId}: base ID match: ${isMatchingVariant}, base: ${currentVariantBaseId} vs ${baseProductId}`);

        if (isMatchingVariant && data.color) {
          const variant = {
            id: docSnapshot.id,
            color: data.color || '',
            image: data.image || ''
          };

          // Добавляем только уникальные варианты по цвету
          if (!variants.some(v => v.color === variant.color)) {
            console.log(`Found matching variant: ${variantId} - ${data.color}`);
            variants.push(variant);
          } else {
            console.log(`Skipping duplicate color: ${data.color}`);
          }
        }
      });

      // Сортируем варианты по названию цвета
      variants.sort((a, b) => a.color.localeCompare(b.color));
      
      console.log(`Final ${variants.length} variants:`, variants.map(v => v.color).join(', '));
      setColorVariants(variants);

    } catch (error) {
      console.error("Error fetching color variants:", error);
    }
  };

  // Функция для получения базового ID продукта без учета цвета
  const getBaseProductId = (productId: string): string => {
    // Разбиваем ID на части
    const parts = productId.split('-');
    console.log(`Original product ID parts:`, parts);
    
    // Находим части, отвечающие за цвет
    const commonColors = ['red', 'blue', 'black', 'white', 'gold', 'silver', 'green', 'yellow', 
                          'pink', 'purple', 'gray', 'grey', 'brown', 'orange', 'violet', 'cyan', 
                          'magenta', 'turquoise', 'crimson', 'navy'];
    
    // Цветовые модификаторы, часто встречающиеся перед названиями цветов
    const colorModifiers = ['ice', 'dark', 'light', 'deep', 'bright', 'pale', 'night', 'midnight', 'sky',
                            'ocean', 'forest', 'emerald', 'royal', 'rose', 'hot', 'electric', 'space', 'cosmic',
                            'graphite', 'titanium', 'pearl', 'aqua', 'neon', 'pastel', 'shadow', 'matte'];
    
    // Строим базовый ID, исключая названия цвета и их модификаторы
    let baseIdParts: string[] = [];
    let skipNextPart = false;
    
    for (let i = 0; i < parts.length; i++) {
      if (skipNextPart) {
        skipNextPart = false;
        continue;
      }
      
      const part = parts[i].toLowerCase();
      let shouldSkip = false;
      
      // Проверяем, является ли часть названием цвета
      if (commonColors.includes(part)) {
        console.log(`Skipping color part: ${part}`);
        shouldSkip = true;
      }
      
      // Проверяем модификатор цвета + следующая часть = цвет
      if (i < parts.length - 1) {
        const nextPart = parts[i + 1].toLowerCase();
        
        // Если текущая часть - модификатор цвета, а следующая - цвет
        if (colorModifiers.includes(part) && commonColors.includes(nextPart)) {
          console.log(`Skipping color modifier '${part}' and color '${nextPart}'`);
          skipNextPart = true; // Пропустим следующую часть (цвет)
          shouldSkip = true;
        }
      }
      
      // Проверяем "edition" и специальные издания
      if (part.includes('edition')) {
        console.log(`Skipping edition part: ${part}`);
        shouldSkip = true;
        
        // Также пропускаем слово перед "edition", если оно не является основным идентификатором модели
        if (i > 0 && !['galaxy', 'iphone', 'pixel', 'xperia', 'redmi', 'mi', 'note', 'pro', 'plus', 'max'].includes(baseIdParts[baseIdParts.length - 1])) {
          const prevPart = baseIdParts.pop(); // Удаляем предыдущую часть
          console.log(`Also skipping preceding word: ${prevPart}`);
        }
      }
      
      // Цветовая серия в названии (например, "blue series")
      if (part === 'series' && i > 0) {
        const prevPart = baseIdParts[baseIdParts.length - 1];
        if (commonColors.includes(prevPart) || colorModifiers.includes(prevPart)) {
          baseIdParts.pop(); // Удаляем предыдущую часть (название цвета)
          console.log(`Skipping color series: ${prevPart} ${part}`);
          shouldSkip = true;
        }
      }
      
      if (!shouldSkip) {
        baseIdParts.push(parts[i]);
      }
    }
    
    // Проверяем последнюю часть на GB/TB (размер памяти) и пропускаем все после неё
    for (let i = 0; i < baseIdParts.length; i++) {
      const part = baseIdParts[i].toLowerCase();
      if (part.match(/^\d+gb$/) || part.match(/^\d+tb$/)) {
        // Нашли указание на память, оставляем всё до этой части включительно
        baseIdParts = baseIdParts.slice(0, i + 1);
        break;
      }
    }
    
    const result = baseIdParts.join('-');
    console.log(`Generated base product ID: ${result}`);
    return result;
  };

  // Function to handle color variant selection
  const handleColorVariantSelect = (variantId: string) => {
    if (variantId !== id) {
      // Используем startTransition для плавного перехода
      startTransition(() => {
        // Используем navigate без опции replace: true для лучшей работы с историей браузера
        navigate(`/product/${variantId}`);
        
        // Не нужно явно вызывать scrollTo, React Router сам обработает это
      });
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
    
    // Check for # markers first (our new format)
    if (description.includes('#')) {
      const listItems = description.split('#').filter(item => item.trim().length > 0);
      
      if (listItems.length > 0) {
        return (
          <ul className="pl-5 mt-2 space-y-1 list-disc">
            {listItems.map((item, index) => (
              <li key={index} className={currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{item.trim()}</li>
            ))}
          </ul>
        );
      }
    }
    
    // Check for legacy bullet points (•) format
    if (description.includes('•')) {
      // Разбиваем текст на элементы списка по символу •
      const listItems = description.split('•').filter(item => item.trim().length > 0);
      
      if (listItems.length > 0) {
        return (
          <ul className="pl-5 mt-2 space-y-1 list-disc">
            {listItems.map((item, index) => (
              <li key={index} className={currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{item.trim()}</li>
            ))}
          </ul>
        );
      }
    }
    
    // Если нет маркеров, возвращаем обычный текст
    return <p className={`mt-2 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{description}</p>;
  };

  const formatTitle = (product: ProductData): string => {
    // Логируем данные продукта для отладки
    console.log('Formatting title for product:', product);

    // Форматирование для MacBook остается прежним
    if (product.category === 'laptops' && product.brand === 'Apple') {
      return formatMacBookName(product);
    }

    // Для ноутбуков (не Apple) формируем полное название
    if (product.category === 'laptops' && product.brand !== 'Apple') {
      const nameComponents = [
        product.brand || '', // Бренд (например, Dell, HP)
        product.model || '', // Модель (например, XPS, Envy)
        product.modelNumber || '', // Номер модели
        product.processor || '', // Процессор
        product.ram || '', // Оперативная память
        product.storageType || '', // Тип хранилища
        product.color || '' // Цвет
      ]
        .filter(component => component && component.trim() !== '')
        .join(' ');
      
      console.log('Generated laptop product full name:', nameComponents);
      return nameComponents || product.name;
    }

    // Форматирование для телевизоров: "Samsung 55" 4K 120Hz QLED QN90B"
    if (product.collection === 'tv') {
      const nameComponents = [
        product.brand || '',                  // Samsung
        product.screenSize ? `${product.screenSize}"` : '', // 55"
        product.resolution || '',             // 4K
        product.refreshRate || '',            // 120Hz
        product.displayType || '',            // QLED
        product.model || '',                  // QN90B
        product.modelNumber || ''             // Model number if available
      ]
        .filter(component => component && component.trim() !== '')
        .join(' ');
      
      console.log('Generated TV product full name:', nameComponents);
      return nameComponents || product.name;
    }

    // Форматирование для аудио: "JBL Tune 520BT Bluetooth headphones, white"
    if (product.collection === 'audio') {
      // Для аудио продуктов используем более лаконичный формат
      const nameComponents = [
        product.brand || '',                  // JBL
        product.model || '',                  // Tune 520BT
        // Используем только тип устройства, без дополнительной информации
        product.description?.split(',')[0]?.split('•')[0]?.trim() || '', // Bluetooth headphones
        product.color ? `, ${product.color}` : '' // , white
      ]
        .filter(component => component && component.trim() !== '')
        .join(' ');
      
      console.log('Generated audio product full name:', nameComponents);
      return nameComponents || product.name;
    }

    // Для мобильных устройств, игровых консолей и телевизоров - оставляем существующую логику
    if (product.collection === 'mobile' || product.collection === 'gaming') {
      // Создаем массив компонентов названия в правильном порядке
      const nameComponents = [
        product.brand || '', // Бренд (например, Motorola, Sony, Samsung)
        product.model || '', // Модель (например, Moto G84, PlayStation 5, QLED)
        product.modelNumber || '', // Номер модели, если есть
        product.memory || '', // Память для мобильных/игровых (например, 256GB, 1TB)
        product.color || '' // Цвет (например, Marshmallow Blue, Black)
      ];
      
      // Фильтруем пустые значения и объединяем в строку
      const fullName = nameComponents
        .filter(component => component && component.trim() !== '')
        .join(' ');
      
      // Логируем результат для отладки
      console.log(`Generated ${product.collection} product full name:`, fullName);
      
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
    return <div className="text-center dark:text-gray-200">Product not found</div>;
  }

  return (
    <div className="container py-8 mx-auto">
      {/* Добавляем индикатор загрузки, который показывается только во время перехода */}
      {isPending && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse"></div>
      )}
      {/* Pass collection info to session storage for breadcrumbs to use */}
      {product?.collection && (
        <div className="hidden">
          {(() => {
            sessionStorage.setItem('lastProductCollection', product.collection);
            return null;
          })()}
        </div>
      )}
      <div className={`p-4 rounded-lg shadow-md ${currentTheme === 'dark' ? 'bg-gray-800 shadow-gray-900' : 'bg-white'}`}>
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
                      type="button"
                      title="Previous image"
                      onClick={prevImage}
                      className={`absolute p-2 transform -translate-y-1/2 rounded-full shadow-md left-2 top-1/2 ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-200' 
                          : 'bg-white/80 hover:bg-white text-gray-700'
                      }`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      type="button"
                      title="Next image"
                      onClick={nextImage}
                      className={`absolute p-2 transform -translate-y-1/2 rounded-full shadow-md right-2 top-1/2 ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-200' 
                          : 'bg-white/80 hover:bg-white text-gray-700'
                      }`}
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
                        idx === currentImageIndex 
                          ? currentTheme === 'dark' ? 'border-[#95c672]' : 'border-blue-500' 
                          : currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
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
            
            {/* Color variant selector - show for any product with variants */}
            {colorVariants.length > 1 && (
              <div className="mt-4">
                <ColorVariantSelector 
                  variants={colorVariants}
                  currentVariantId={id || ''}
                  onSelectVariant={handleColorVariantSelect}
                  isPending={isPending} // Передаем состояние загрузки
                />
              </div>
            )}
          </div>
          
          <div className="w-full md:w-3/5 md:pl-8">
            {/* Переместим кнопку избранного в блок с рейтингом */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Rating value={product?.rating || 0} />
                <span className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {product?.rating ? product.rating.toFixed(1) : "0"} 
                  ({product?.reviewCount || 0} reviews)
                </span>
              </div>
              <button 
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`}
                onClick={toggleFavoriteStatus}
                title={isAuthenticated ? 'Add to favorites' : 'Login required to add to favorites'}
              >
                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            
            {/* Заголовок продукта теперь без кнопки избранного */}
            <h1 className={`mb-4 text-2xl font-bold ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{formatTitle(product)}</h1>
            
            <div className="mb-6">
              <h3 className={`mb-2 text-lg font-semibold ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Description</h3>
              {formatDescription(product?.description || '')}
            </div>

            {/* Обновленный блок с ценой - используем новые CSS классы */}
            <div className={`p-4 mb-4 rounded-lg shadow-sm ${currentTheme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
              <div className={`price-gradient ${currentTheme === 'dark' ? 'opacity-20' : 'opacity-10'}`}></div>
              <div className="product-page-price-container">
                <p className={`text-3xl font-bold ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                  {Number(product?.price).toFixed(2)} <span className={`text-xl ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>NOK</span>
                </p>
                {product?.price > 1000 && (
                  <p className={`mt-1 text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    or {(product.price / 12).toFixed(2)} NOK/month with 12-month payment plan
                  </p>
                )}
              </div>
            </div>
            
            {/* Quantity selector and Add to cart button в одном ряду */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className={`flex items-center ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="mr-3 font-medium">Quantity:</span>
                <div className="flex items-center border rounded">
                  <button 
                    type="button"
                    title="Decrease quantity"
                    className={`px-2 py-1 border-r ${
                      currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600' 
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} className="stroke-[2.5]" />
                  </button>
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
                    className={`w-12 py-1 text-center ${
                      currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                    min="1"
                    placeholder="1"
                    title="Quantity"
                  />
                  <button 
                    type="button"
                    title="Increase quantity"
                    className={`px-2 py-1 border-l ${
                      currentTheme === 'dark' 
                        ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600' 
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={incrementQuantity}
                  >
                    <Plus size={16} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <button
                className={`flex items-center justify-center px-6 py-2 font-medium rounded-lg ${
                  currentTheme === 'dark'
                    ? 'bg-[#95c672] hover:bg-[#86b363] text-gray-900'
                    : 'bg-[#003D2D] hover:bg-[#004D3D] text-white'
                }`}
                onClick={addToCart}
              >
                <ShoppingCart size={18} className="mr-2" />
                Add to Cart
              </button>
            </div>
            
            {/* Success message with animation */}
            {addedToCart && (
              <div className={`p-3 text-center rounded-md ${
                currentTheme === 'dark'
                  ? 'bg-green-800/50 text-green-200'
                  : 'bg-green-100 text-green-800'
              }`}>
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
          <Reviews productId={id} productName={product.name} collectionName={product.collection} />
        </div>
      )}
    </div>
  );
};

export default ProductPage;