import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';

// Определение типа для продукта
interface Product {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Fetch products data from an API or define it statically
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard
            key={product.id || product.name}
            product={product}  // Pass the entire product object
          />
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;