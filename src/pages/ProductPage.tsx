import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
  }, [id]);

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
            <h1 className="text-2xl font-bold mb-4">{product?.name}</h1>
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