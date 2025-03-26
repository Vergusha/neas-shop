import React, { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from './ProductCard';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  processor?: string;
  ram?: string;
  graphicsCard?: string;
  storageType?: string;
  screenSize?: string;
  operatingSystem?: string;
  color?: string;
  category?: string;
}

interface RelatedProductsProps {
  product: Product;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ product }) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        
        let productCollection = product.category || 'laptops';
        let q;

        // For MacBooks, use only essential filters to avoid Firestore limitations
        if (productCollection === 'laptops' && product.brand === 'Apple') {
          q = query(
            collection(db, productCollection),
            where('brand', '==', 'Apple'),
            where('model', '==', product.model),
            where('modelNumber', '==', product.modelNumber), // year
            limit(6)
          );
        } else {
          q = query(
            collection(db, productCollection),
            where('brand', '==', product.brand),
            limit(6)
          );
        }
        
        const relatedSnapshot = await getDocs(q);
        const relatedList = relatedSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Product))
          .filter(p => p.id !== product.id)
          // Post-query filtering for MacBooks
          .filter(p => {
            if (productCollection === 'laptops' && product.brand === 'Apple') {
              return p.processor === product.processor &&
                     p.ram === product.ram &&
                     p.storageType === product.storageType &&
                     p.screenSize === product.screenSize;
            }
            return true;
          });
        
        // Если получили менее 3 продуктов, попробуем получить другие продукты той же категории
        if (relatedList.length < 3) {
          const additionalQ = query(
            collection(db, productCollection),
            limit(6)
          );
          
          const additionalSnapshot = await getDocs(additionalQ);
          const additionalList = additionalSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(p => p.id !== product.id && !relatedList.some(r => r.id === p.id));
          
          // Добавляем дополнительные продукты к списку похожих
          relatedList.push(...additionalList);
        }
        
        // Ограничиваем количество похожих продуктов
        setRelatedProducts(relatedList.slice(0, 4));
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [product]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return <div className="text-center py-8">No related products found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {relatedProducts.map((relatedProduct) => (
          <ProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;