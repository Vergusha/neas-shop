import React, { useEffect, useState } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { database, db } from '../firebaseConfig';
import ProductCard from './ProductCard';

interface ProductData {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  createdAt?: string;
  popularityScore?: number;
}

const PopularProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get products with highest popularity scores
        // Using orderByChild and limitToLast with query for better performance
        const popularProductsRef = ref(database, 'popularProducts');
        const popularProductsQuery = query(
          popularProductsRef,
          orderByChild('score'),
          limitToLast(20) // Get top 20 products
        );
        
        const snapshot = await get(popularProductsQuery);
        
        if (snapshot.exists()) {
          // Convert to array and sort by popularity score (highest first)
          const popularProducts = Object.entries(snapshot.val())
            .map(([id, data]: [string, any]) => ({
              id,
              score: data.score || 0,
              lastUpdated: data.lastUpdated || ''
            }))
            .sort((a, b) => b.score - a.score);
          
          // Get full product details for each popular product
          const productPromises = popularProducts.map(async (item) => {
            try {
              // First try to get basic product info from productStats
              const statsRef = ref(database, `productStats/${item.id}`);
              const statsSnapshot = await get(statsRef);
              
              // Then get full product details from multiple collections
              const collections = ['mobile', 'products', 'tv'];
              for (const collectionName of collections) {
                try {
                  const docRef = doc(db, collectionName, item.id);
                  const docSnap = await getDoc(docRef);
                  
                  if (docSnap.exists()) {
                    const productData = docSnap.data();
                    return {
                      id: item.id,
                      ...productData,
                      popularityScore: statsSnapshot.exists() ? 
                        statsSnapshot.val().popularityScore || 0 : 0,
                      clickCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().clickCount || 0 : 0,
                      favoriteCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().favoriteCount || 0 : 0,
                      cartCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().cartCount || 0 : 0
                    };
                  }
                } catch (e) {
                  console.warn(`Error fetching product ${item.id} from ${collectionName}:`, e);
                }
              }
              
              // If product not found in any collection
              return null;
            } catch (err) {
              console.error(`Error fetching product ${item.id}:`, err);
              return null;
            }
          });
          
          const fetchedProducts = await Promise.all(productPromises);
          // Filter out null values and ensure each product has required fields
          const validProducts = fetchedProducts
            .filter((p): p is ProductData => p !== null)
            .map(product => ({
              ...product,
              // Ensure required fields have default values
              name: product.name || 'Unnamed Product',
              price: typeof product.price === 'number' ? product.price : 
                     typeof product.price === 'string' ? parseFloat(product.price) : 0,
              image: product.image || '',
              rating: product.rating || 0,
              reviewCount: product.reviewCount || 0
            }));
          
          setProducts(validProducts);
        } else {
          // Fallback to recent products if no popularity data
          const fallbackProducts = await fetchRecentProducts();
          setProducts(fallbackProducts);
        }
      } catch (err) {
        console.error('Error fetching popular products:', err);
        setError('Failed to load popular products. Please try again later.');
        
        // Try fallback option
        try {
          const fallbackProducts = await fetchRecentProducts();
          if (fallbackProducts.length > 0) {
            setProducts(fallbackProducts);
            setError(null);
          }
        } catch (fallbackErr) {
          console.error('Error fetching fallback products:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopularProducts();
  }, []);
  
  // Fallback method unchanged
  const fetchRecentProducts = async (): Promise<ProductData[]> => {
    try {
      // Получаем последние добавленные продукты из Firestore
      const recentProducts: ProductData[] = [];
      
      const collections = ['mobile', 'products', 'tv'];
      for (const collectionName of collections) {
        try {
          const q = query(
            collection(db, collectionName),
            orderBy('createdAt', 'desc'),
            limit(4)
          );
          
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            recentProducts.push({
              id: doc.id,
              ...doc.data()
            } as ProductData);
          });
        } catch (e) {
          console.warn(`Error fetching recent from ${collectionName}:`, e);
        }
      }
      
      // Если мы получили продукты из нескольких коллекций, 
      // сортируем их по дате создания и берем только первые 8
      if (recentProducts.length > 0) {
        return recentProducts
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // От новых к старым
          })
          .slice(0, 8); // Берем только первые 8
      }
      
      return [];
    } catch (err) {
      console.error('Error in fallback products fetch:', err);
      return [];
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.length > 0 ? (
        products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))
      ) : (
        <div className="col-span-full text-center py-8 text-gray-500">
          No popular products found. Check back later!
        </div>
      )}
    </div>
  );
};

export default PopularProducts;