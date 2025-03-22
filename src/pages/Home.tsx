import { useEffect, useState } from 'react';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { collection, getDocs } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

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
            // Normalize the product data to ensure all required fields exist and have the correct type
            return {
              id: doc.id,
              name: data.name || 'Unnamed Product',
              description: data.description || '',
              image: data.image || '',
              price: typeof data.price === 'number' ? data.price : 
                     typeof data.price === 'string' ? parseFloat(data.price) : 0,
              clickCount: data.clickCount || 0,
              collection: collectionName // Add source collection for reference
            };
          }) as Product[];
          
          allProducts = [...allProducts, ...products];
        }
        
        // Get favorites data to determine popular items
        const favoritesRef = ref(database, 'users');
        const favoritesSnapshot = await get(favoritesRef);
        
        // Count times each product has been favorited
        const favoriteCounts: {[key: string]: number} = {};
        if (favoritesSnapshot.exists()) {
          const users = favoritesSnapshot.val();
          Object.values(users).forEach((user: any) => {
            if (user.favorites) {
              Object.keys(user.favorites).forEach(productId => {
                favoriteCounts[productId] = (favoriteCounts[productId] || 0) + 1;
              });
            }
          });
        }
        
        // Also check localStorage favorites for non-logged in users
        try {
          const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
          localFavorites.forEach((productId: string) => {
            favoriteCounts[productId] = (favoriteCounts[productId] || 0) + 1;
          });
        } catch (error) {
          console.error('Error parsing localStorage favorites:', error);
        }
        
        // Get purchase data from orders
        const ordersCollection = collection(db, 'orders');
        const ordersSnapshot = await getDocs(ordersCollection);
        
        // Count times each product has been purchased
        const purchaseCounts: {[key: string]: number} = {};
        ordersSnapshot.docs.forEach(doc => {
          const orderData = doc.data();
          if (orderData.items && Array.isArray(orderData.items)) {
            orderData.items.forEach((item: any) => {
              if (item.id) {
                purchaseCounts[item.id] = (purchaseCounts[item.id] || 0) + (item.quantity || 1);
              }
            });
          }
        });
        
        // Add the counts to the products
        allProducts = allProducts.map(product => ({
          ...product,
          favoriteCount: favoriteCounts[product.id] || 0,
          purchaseCount: purchaseCounts[product.id] || 0
        }));
        
        // Calculate a popularity score (weight favorites and purchases)
        allProducts = allProducts.map(product => ({
          ...product,
          popularityScore: ((product.favoriteCount || 0) * 2) + 
                          ((product.purchaseCount || 0) * 3) + 
                          (product.clickCount || 0)
        }));
        
        // Ensure all products have valid price values before displaying
        const topProducts = allProducts
          .filter(product => product && product.id && !isNaN(Number(product.price)))
          .sort((a: any, b: any) => (b.popularityScore || 0) - (a.popularityScore || 0))
          .slice(0, 20);
        
        setPopularProducts(topProducts);
      } catch (error) {
        console.error('Error fetching popular products:', error);
        // Set empty array to avoid rendering issues
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
