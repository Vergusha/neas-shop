import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const DataPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [products, setProducts] = useState<ProductCardProps[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        image: doc.data().image || '',
        name: doc.data().name || '',
        description: doc.data().description || '',
        price: doc.data().price || 0
      })) as ProductCardProps[];
      setProducts(productsData);
    };

    fetchProducts();
  }, [category]);

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(savedFavorites);
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prevFavorites =>
      prevFavorites.includes(id)
        ? prevFavorites.filter(favId => favId !== id)
        : [...prevFavorites, id]
    );
  };

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
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`mt-2 ${favorites.includes(product.id) ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {favorites.includes(product.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DataPage;