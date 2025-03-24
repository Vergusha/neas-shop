import React, { useEffect, useState } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { doc, getDoc, collection, getDocs, query as firestoreQuery, orderBy, limit } from 'firebase/firestore';
import { database, db } from '../firebaseConfig';
import ProductCard from './ProductCard';
import { Product } from '../types/product';

const PopularProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
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
                      name: productData.name || 'Unnamed Product',
                      description: productData.description || '',
                      image: productData.image || '',
                      price: typeof productData.price === 'number' ? productData.price : 
                           typeof productData.price === 'string' ? parseFloat(productData.price) : 0,
                      collection: collectionName,
                      ...productData,
                      popularityScore: statsSnapshot.exists() ? 
                        statsSnapshot.val().popularityScore || 0 : 0,
                      clickCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().clickCount || 0 : 0,
                      favoriteCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().favoriteCount || 0 : 0,
                      cartCount: statsSnapshot.exists() ? 
                        statsSnapshot.val().cartCount || 0 : 0
                    } as Product;
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
            .filter((p): p is Product => p !== null && 
              typeof p === 'object' &&
              typeof p.id === 'string' &&
              typeof p.name === 'string' &&
              typeof p.description === 'string' &&
              typeof p.image === 'string' &&
              !isNaN(Number(p.price))
            );
          
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
  
  const fetchRecentProducts = async (): Promise<Product[]> => {
    try {
      const recentProducts: Product[] = [];
      const collections = ['mobile', 'products', 'tv'];
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const q = firestoreQuery(
            collectionRef,
            orderBy('createdAt', 'desc'),
            limit(4)
          );
          
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            recentProducts.push({
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
              popularityScore: 0,
              ...data
            } as Product);
          });
        } catch (e) {
          console.warn(`Error fetching recent from ${collectionName}:`, e);
        }
      }
      
      return recentProducts
        .filter((product): product is Product => 
          Boolean(product) && 
          typeof product.id === 'string' && 
          typeof product.name === 'string' && 
          typeof product.description === 'string' && 
          !isNaN(Number(product.price)) && 
          typeof product.image === 'string'
        )
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 8);
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