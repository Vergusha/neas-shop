import { useEffect, useState } from 'react';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';

interface Product {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  clickCount: number;
  favoriteCount?: number;
  purchaseCount?: number;
  collection?: string;
}

const Home = () => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setLoading(true);
        
        // First try to get top products by popularity score from Realtime Database
        const popularRef = ref(database, 'popularProducts');
        const popularQuery = query(
          popularRef, 
          orderByChild('score'), 
          limitToLast(20)
        );
        
        const popularSnapshot = await get(popularQuery);
        let popularIds: string[] = [];
        
        if (popularSnapshot.exists()) {
          // Get IDs of popular products sorted by score
          popularIds = Object.entries(popularSnapshot.val())
            .map(([id, data]: [string, any]) => ({
              id,
              score: data.score || 0
            }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.id);
        }
        
        // If we have popular IDs, fetch those specific products
        if (popularIds.length > 0) {
          // Array to hold all found popular products
          let allPopularProducts: Product[] = [];
          
          // Collections to fetch products from
          const collections = ['products', 'mobile', 'tv'];
          
          // For each popular ID, try to find it in any collection
          for (const productId of popularIds) {
            let found = false;
            
            for (const collectionName of collections) {
              if (found) continue;
              
              try {
                const docRef = doc(db, collectionName, productId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  allPopularProducts.push({
                    id: productId,
                    name: data.name || 'Unnamed Product',
                    description: data.description || '',
                    image: data.image || '',
                    price: typeof data.price === 'number' ? data.price : 
                           typeof data.price === 'string' ? parseFloat(data.price) : 0,
                    collection: collectionName
                  });
                  found = true;
                }
              } catch (error) {
                console.warn(`Error fetching product ${productId} from ${collectionName}:`, error);
              }
            }
          }
          
          // Set popular products - maintain order from popularity scores
          setPopularProducts(allPopularProducts);
        } else {
          // Fallback to old method if no popularity data
          // Array to hold all products from different collections
          let allProducts: Product[] = [];
          
          // Collections to fetch products from
          const collections = ['products', 'mobile', 'tv'];
          
          // Fetch products from all collections
          for (const collectionName of collections) {
            const productsCollection = collection(db, collectionName);
            const productsSnapshot = await getDocs(productsCollection);
            
            const products = productsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || 'Unnamed Product',
                description: data.description || '',
                image: data.image || '',
                price: typeof data.price === 'number' ? data.price : 
                       typeof data.price === 'string' ? parseFloat(data.price) : 0,
                clickCount: data.clickCount || 0,
                collection: collectionName
              };
            }) as Product[];
            
            allProducts = [...allProducts, ...products];
          }
          
          // Get stats from Realtime Database to determine popular items
          const statsRef = ref(database, 'productStats');
          const statsSnapshot = await get(statsRef);
          
          if (statsSnapshot.exists()) {
            const stats = statsSnapshot.val();
            
            // Add stats to products
            allProducts = allProducts.map(product => ({
              ...product,
              popularityScore: stats[product.id]?.popularityScore || 0,
              clickCount: stats[product.id]?.clickCount || 0,
              favoriteCount: stats[product.id]?.favoriteCount || 0,
              cartCount: stats[product.id]?.cartCount || 0
            }));
          }
          
          // Calculate popularity score if not already present
          allProducts = allProducts.map(product => ({
            ...product,
            popularityScore: product.popularityScore || 
                            ((product.clickCount || 0) + 
                             (product.favoriteCount || 0) * 3 + 
                             (product.cartCount || 0) * 5)
          }));
          
          // Sort by popularity score and take top 20
          const topProducts = allProducts
            .filter(product => product && product.id && !isNaN(Number(product.price)))
            .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
            .slice(0, 20);
          
          setPopularProducts(topProducts);
        }
      } catch (error) {
        console.error('Error fetching popular products:', error);
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  return (
    <div className="flex flex-col">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        <section className="hero bg-base-200 py-6 md:py-8 rounded-lg my-4">
          <div className="px-4 md:px-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Welcome to NEAS Shop</h1>
            <p className="mt-2 md:mt-4 text-sm sm:text-base">Find the best electronics and gadgets here.</p>
          </div>
        </section>
        
        <section className="py-6 md:py-8 bg-base-200 rounded-lg">
          <div className="px-4 md:px-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Categories</h2>
            <CategoryList />
          </div>
        </section>
        
        <section className="py-6 md:py-8 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Popular Products</h2>
          {loading ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="px-12 sm:px-16 md:px-20 overflow-x-hidden">
              <div className="flex flex-row flex-nowrap overflow-x-auto pb-4 product-row">
                {popularProducts.length > 0 ? (
                  popularProducts.map(product => (
                    <div key={product.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0">
                      <ProductCard
                        product={product}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-gray-500">No popular products found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
