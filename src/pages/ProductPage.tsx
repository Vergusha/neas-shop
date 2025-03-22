import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { Heart, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'; // Added ChevronLeft and ChevronRight icons
import Rating from '../components/Rating';
import Reviews from '../components/Reviews';

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
  // ...other properties
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  
  // New state for image slider
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);

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
          setSelectedColor(foundProduct.color || null);
          
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
    if (id) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(id));
    }

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
  const toggleFavorite = () => {
    if (!id) return;
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let updatedFavorites;
    
    if (favorites.includes(id)) {
      // Remove from favorites
      updatedFavorites = favorites.filter((favId: string) => favId !== id);
      setIsFavorite(false);
    } else {
      // Add to favorites
      updatedFavorites = [...favorites, id];
      setIsFavorite(true);
    }
    
    // Save updated favorites to localStorage
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
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
            
            {/* Color selector */}
            <div className="flex justify-center space-x-2 mt-4">
              {product?.color && (
                <button
                  key={product.color}
                  className={`w-8 h-8 rounded-full border-2 ${selectedColor === product.color ? 'border-black' : 'border-gray-300'}`}
                  style={{ backgroundColor: product.color }}
                  onClick={() => setSelectedColor(product.color || null)}
                />
              )}
            </div>
          </div>
          
          <div className="w-full md:w-3/5 md:pl-8">
            {/* Rating display - moved above product name */}
            <div className="flex items-center gap-2 mb-2">
              <Rating value={product?.rating || 0} />
              <span className="text-sm text-gray-600">
                {product?.rating ? product.rating.toFixed(1) : "0"} 
                ({product?.reviewCount || 0} reviews)
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">{product?.name}</h1>
              <button 
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                onClick={toggleFavorite}
              >
                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            
            <p className="text-gray-500 mb-4">{product?.description}</p>
            <p className="text-xl font-bold text-gray-900 mb-4">{Number(product?.price).toFixed(2)} NOK</p>
            
            {/* Quantity selector */}
            <div className="flex items-center mb-6">
              <span className="mr-4">Quantity:</span>
              <div className="flex items-center border rounded-md">
                <button 
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                  onClick={decrementQuantity}
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-1 border-l border-r">{quantity}</span>
                <button 
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                  onClick={incrementQuantity}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Add to cart button */}
            <button 
              className="btn btn-primary flex items-center justify-center gap-2"
              onClick={addToCart}
            >
              <ShoppingCart size={20} />
              Add to Cart
            </button>
            
            {/* Success message */}
            {addedToCart && (
              <div className="mt-4 p-2 bg-green-100 text-green-700 rounded-md">
                Product added to cart!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Reviews section - pass the ID explicitly */}
      {product && id && <Reviews productId={id} />}
    </div>
  );
};

export default ProductPage;