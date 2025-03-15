import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { Heart, Plus, Minus, ShoppingCart } from 'lucide-react'; // Import additional icons
import Rating from '../components/Rating';
import Reviews from '../components/Reviews';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

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
        let foundProduct = null;
        
        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log(`Found product in ${collectionName} collection:`, docSnap.data());
            foundProduct = {
              ...docSnap.data(),
              id: id // Explicitly add the ID to the product data
            };
            break;
          }
        }
        
        if (foundProduct) {
          setProduct(foundProduct);
          setSelectedColor(foundProduct.color || null);
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
            setProduct(prev => {
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
        setProduct(prev => {
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (!product) {
    return <div className="text-center">Product not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <img src={product?.image} alt={product?.name} className="w-full h-auto mb-4" />
            <div className="flex justify-center space-x-2">
              {product?.color && (
                <button
                  key={product.color}
                  className={`w-8 h-8 rounded-full border-2 ${selectedColor === product.color ? 'border-black' : 'border-gray-300'}`}
                  style={{ backgroundColor: product.color }}
                  onClick={() => setSelectedColor(product.color)}
                />
              )}
            </div>
          </div>
          <div className="w-full md:w-1/2 md:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">{product?.name}</h1>
              <button 
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                onClick={toggleFavorite}
              >
                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            
            {/* Rating display */}
            <div className="flex items-center gap-2 mb-4">
              <Rating value={product?.rating || 0} />
              <span className="text-sm text-gray-600">
                {product?.rating ? product.rating.toFixed(1) : "0"} 
                ({product?.reviewCount || 0} reviews)
              </span>
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