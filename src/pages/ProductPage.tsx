import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Heart } from 'lucide-react'; // Import Heart icon

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
  const [isFavorite, setIsFavorite] = useState(false); // Add state for favorite status

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
            <button className="btn btn-primary">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;