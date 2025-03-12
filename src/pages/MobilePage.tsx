import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { Range, getTrackBackground } from 'react-range';

const STEP = 100;

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState([0, 99999]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(99999);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = collection(db, 'mobile');
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched products:", productsData); // Логирование данных
        setProducts(productsData);
        setFilteredProducts(productsData);

        // Определение минимальной и максимальной цены
        if (productsData.length > 0) {
          const prices = productsData.map(product => product.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          setMinPrice(minPrice);
          setMaxPrice(maxPrice);
          setValues([minPrice, maxPrice]);
        }
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product => product.price >= values[0] && product.price <= values[1]);
    setFilteredProducts(filtered);
  }, [values, products]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-1/4 pr-4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="font-bold mb-2">Filter</h2>
            <div className="mb-4">
              <label htmlFor="minPrice" className="block text-gray-700">Min Price</label>
              <input
                type="number"
                id="minPrice"
                value={values[0]}
                onChange={(e) => setValues([Number(e.target.value), values[1]])}
                className="w-full mb-2"
                min={minPrice}
                max={values[1]}
                placeholder={`Min: ${minPrice}`}
              />
              <label htmlFor="maxPrice" className="block text-gray-700">Max Price</label>
              <input
                type="number"
                id="maxPrice"
                value={values[1]}
                onChange={(e) => setValues([values[0], Number(e.target.value)])}
                className="w-full mb-4"
                min={values[0]}
                max={maxPrice}
                placeholder={`Max: ${maxPrice}`}
              />
              <Range
                values={values}
                step={STEP}
                min={minPrice}
                max={maxPrice}
                onChange={(values) => setValues(values)}
                renderTrack={({ props, children }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '6px',
                      width: '100%',
                      background: getTrackBackground({
                        values,
                        colors: ['#ccc', '#F0E965', '#ccc'],
                        min: minPrice,
                        max: maxPrice
                      }),
                      alignSelf: 'center'
                    }}
                  >
                    {children}
                  </div>
                )}
                renderThumb={({ props, isDragged }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '24px',
                      width: '24px',
                      borderRadius: '12px',
                      backgroundColor: '#FFF',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: '0px 2px 6px #AAA'
                    }}
                  >
                    <div
                      style={{
                        height: '16px',
                        width: '5px',
                        backgroundColor: isDragged ? '#F0E965' : '#CCC'
                      }}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-3/4">
          {filteredProducts.length === 0 ? (
            <div>No products found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  image={product.image}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MobilePage;