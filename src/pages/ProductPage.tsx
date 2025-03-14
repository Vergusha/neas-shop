import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Heart, Plus, Minus, ShoppingCart } from 'lucide-react'; // Import additional icons

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductCardProps | null>(null);
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
        const docRef = doc(db, 'mobile', id); // Ensure the collection name matches your Firebase setup
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log("Product data:", docSnap.data());
          setProduct(docSnap.data());
          setSelectedColor(docSnap.data().color || null); // Adjusted to match your data structure
        } else {
          console.error("No such document!");
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
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));
    
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
    </div>
  );
};

export default ProductPage;