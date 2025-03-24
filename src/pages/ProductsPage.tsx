import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { collection, getDocs } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

// Определение типа для продукта
interface Product {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  brand?: string;
  model?: string;
  memory?: string;
  color?: string;
  modelNumber?: string;
  // Stats fields
  rating?: number;
  reviewCount?: number;
  clickCount?: number;
  favoriteCount?: number;
  cartCount?: number;
  popularityScore?: number;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Get products from Firebase collections
        const collections = ['products', 'mobile', 'tv'];
        let allProducts: Product[] = [];
        
        for (const collectionName of collections) {
          const productsCollection = collection(db, collectionName);
          const productsSnapshot = await getDocs(productsCollection);
          
          const collectionProducts = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Unnamed Product',
              description: data.description || '',
              image: data.image || '',
              price: typeof data.price === 'number' ? data.price :
                     typeof data.price === 'string' ? parseFloat(data.price) : 0,
              collection: collectionName,
              clickCount: 0,
              favoriteCount: 0,
              cartCount: 0,
              ...data
            } as Product;
          });
          
          allProducts = [...allProducts, ...collectionProducts];
        }
        
        // Get product stats from Realtime Database
        const statsRef = ref(database, 'productStats');
        const statsSnapshot = await get(statsRef);
        
        if (statsSnapshot.exists()) {
          const stats = statsSnapshot.val();
          
          // Merge stats with products
          allProducts = allProducts.map(product => {
            const productStats = stats[product.id];
            return {
              ...product,
              clickCount: productStats?.clickCount || 0,
              favoriteCount: productStats?.favoriteCount || 0,
              cartCount: productStats?.cartCount || 0,
              popularityScore: productStats?.popularityScore || 0
            };
          });
        }
        
        // Normalize product data
        const normalizedProducts = allProducts.map(product => ({
          ...product,
          price: typeof product.price === 'number' ? product.price :
                 typeof product.price === 'string' ? parseFloat(product.price) : 0,
          name: product.name || 'Unnamed Product',
          description: product.description || '',
          image: product.image || ''
        }));
        
        // Filter out products with invalid data
        const validProducts = normalizedProducts.filter(
          product => product.id && !isNaN(product.price) && product.image
        );
        
        setProducts(validProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length > 0 ? (
          products.map(product => (
            <ProductCard
              key={product.id || product.name}
              product={product}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            No products found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;