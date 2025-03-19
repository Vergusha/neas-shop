import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

const SmartHomePage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [products, setProducts] = useState<ProductCardProps[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          image: data.image || ''
        };
      });
      setProducts(productsData);
    };

    fetchProducts();
  }, [category]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{category}</h1>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-1/4 pr-4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="font-bold mb-2">Filter</h2>
            {/* Add your filters here */}
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-3/4">
          <div className="grid grid-cols-1 gap-4">
            {products.map((product, index) => (
              <div key={product.id || index} className="bg-white p-4 rounded-lg shadow-md flex">
                <img src={product.image} alt={product.name} className="w-1/4" />
                <div className="ml-4">
                  <h3 className="font-bold">{product.name}</h3>
                  <p>{product.description}</p>
                  <p className="text-gray-500">{product.price},-</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SmartHomePage;