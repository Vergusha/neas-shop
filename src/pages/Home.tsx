import { useEffect, useState, useRef } from 'react';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, database } from '../firebaseConfig';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { Product } from '../types/product';
import './Home.css'; // Import the CSS file for custom styles
import { getTheme } from '../utils/themeUtils'; // Import the getTheme function

const Home = () => {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const productRowRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const scrollProducts = (direction: 'left' | 'right') => {
    if (productRowRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      productRowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const processProductData = (data: any): Product => {
    return {
      ...data,
      id: data.id || '',
      name: data.name || '',
      description: data.description || '',
      price: Number(data.price) || 0,
      image: data.image || '',
      brand: data.brand || '',
      model: data.model || '',
      // Add any other required fields with defaults
    } as unknown as Product;
  };

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const popularProductsRef = ref(database, 'popularProducts');
        
        try {
          const popularProductsDbQuery = query(
            popularProductsRef,
            orderByChild('score'),
            limitToLast(6)
          );
          
          const snapshot = await get(popularProductsDbQuery);
          
          if (snapshot.exists()) {
            const productsData = snapshot.val();
            const productsArray = Object.entries(productsData)
              .map(([key, value]: [string, any]) => ({
                id: key,
                ...value
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 6);
            
            await processPopularProducts(productsArray);
            return;
          }
        } catch (queryError) {
          console.log('Query with orderByChild failed, trying fallback approach:', queryError);
          
          const snapshot = await get(popularProductsRef);
          
          if (snapshot.exists()) {
            const productsData = snapshot.val();
            const productsArray = Object.entries(productsData)
              .map(([key, value]: [string, any]) => ({
                id: key,
                ...value
              }))
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .slice(0, 6);
            
            await processPopularProducts(productsArray);
            return;
          }
        }
        
        console.log('No popular products found, fetching recent products instead');
        fetchRecentProducts();
      } catch (error) {
        console.error('Error fetching popular products:', error);
        fetchRecentProducts();
      }
    };

    const processPopularProducts = async (productsArray: any[]) => {
      const productsPromises = productsArray.map(async (item) => {
        const collections = ['products', 'mobile', 'tv', 'gaming', 'laptops', 'audio'];
        
        for (const collectionName of collections) {
          try {
            const productDoc = await getDoc(doc(db, collectionName, item.id));
            if (productDoc.exists()) {
              const data = productDoc.data();
              return {
                ...processProductData(data),
                id: item.id,
                score: item.score
              };
            }
          } catch (err) {
            console.error(`Error fetching product ${item.id} from ${collectionName}:`, err);
          }
        }
        
        return {
          id: item.id,
          name: 'Product not found',
          description: 'Not available',
          price: 0,
          image: '',
          brand: 'Unknown', // Add required brand field
          model: 'Unknown', // Add required model field
          score: item.score
        } satisfies Product;
      });
      
      const resolvedProducts = await Promise.all(productsPromises);
      setPopularProducts(resolvedProducts.filter(p => p.name !== 'Product not found'));
      setLoading(false);
    };

    const fetchRecentProducts = async () => {
      try {
        const collections = ['products', 'mobile', 'tv', 'gaming', 'laptops'];
        let recentProducts: Product[] = [];
        
        for (const collectionName of collections) {
          const collectionRef = collection(db, collectionName);
          const querySnapshot = await getDocs(collectionRef);
          
          querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.name && data.price && data.image) {
              recentProducts.push({
                ...processProductData(data),
                id: doc.id,
                collection: collectionName
              });
            }
          });
        }
        
        recentProducts.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return Math.random() - 0.5;
        });
        
        setPopularProducts(recentProducts.slice(0, 6));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recent products:', error);
        setPopularProducts([]);
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
            <div className="popular-products-container relative">
              <button
                onClick={() => scrollProducts('left')}
                className={`carousel-arrow carousel-arrow-left ${
                  currentTheme === 'dark' ? 'carousel-arrow-dark' : ''
                }`}
                aria-label="Scroll left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <div
                ref={productRowRef}
                className="flex flex-row flex-nowrap overflow-x-auto pb-4 product-row hide-scrollbar px-2"
              >
                {popularProducts.length > 0 ? (
                  popularProducts.map(product => (
                    <div key={product.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 px-2">
                      <ProductCard product={product} />
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-gray-500">No popular products found</p>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => scrollProducts('right')}
                className={`carousel-arrow carousel-arrow-right ${
                  currentTheme === 'dark' ? 'carousel-arrow-dark' : ''
                }`}
                aria-label="Scroll right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
