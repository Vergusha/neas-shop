import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ProductCard from '../components/ProductCard';
import { Range, getTrackBackground } from 'react-range';

const STEP = 100;

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  brand?: string;
  memory?: string;
  color?: string;
}

const MobilePage: React.FC = () => {
  const [products, setProducts] = useState<ProductCardProps[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState([0, 99999]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(99999);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = collection(db, 'mobile');
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            image: data.image || 'default-image-url', // Provide default values
            name: data.name || 'No Name',
            description: data.description || 'No Description',
            price: data.price || 0,
            brand: data.brand || 'Unknown',
            memory: data.memory || 'Unknown',
            color: data.color || 'Unknown'
          };
        });
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

          // Определение уникальных брендов, памяти и цветов
          const uniqueBrands = Array.from(new Set(productsData.map(product => product.brand)));
          setBrands(uniqueBrands);
          const uniqueMemories = Array.from(new Set(productsData.map(product => product.memory)));
          setMemories(uniqueMemories); // Set unique memory options from products
          const uniqueColors = Array.from(new Set(productsData.map(product => product.color)));
          setColors(uniqueColors); // Set unique color options from products
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
    const filtered = products.filter(product => 
      product.price >= values[0] && 
      product.price <= values[1] &&
      (selectedBrands.length ? selectedBrands.includes(product.brand) : true) &&
      (selectedMemories.length ? selectedMemories.includes(product.memory) : true) &&
      (selectedColors.length ? selectedColors.includes(product.color) : true)
    );
    setFilteredProducts(filtered);
  }, [values, products, selectedBrands, selectedMemories, selectedColors]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleMemoryChange = (memory: string) => {
    setSelectedMemories(prev =>
      prev.includes(memory) ? prev.filter(m => m !== memory) : [...prev, memory]
    );
  };

  const handleColorChange = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
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
                className="w-full mb-2 input input-bordered"
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
                className="w-full mb-4 input input-bordered"
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
              <label htmlFor="brand" className="block text-gray-700 mt-6">Brand</label> {/* Increased margin-top to 6 */}
              <div className="mb-4">
                {brands.map((brand) => (
                  <div key={brand} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`brand-${brand}`}
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                      className="mr-2 checkbox"
                    />
                    <label htmlFor={`brand-${brand}`} className="text-gray-700">{brand}</label>
                  </div>
                ))}
              </div>
              <label htmlFor="memory" className="block text-gray-700">Memory</label>
              <div className="mb-4">
                {memories.map((memory) => ( // Use unique memory options from products
                  <div key={memory} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`memory-${memory}`}
                      checked={selectedMemories.includes(memory)}
                      onChange={() => handleMemoryChange(memory)}
                      className="mr-2 checkbox"
                    />
                    <label htmlFor={`memory-${memory}`} className="text-gray-700">{memory}</label>
                  </div>
                ))}
              </div>
              <label htmlFor="color" className="block text-gray-700">Color</label>
              <div className="mb-4">
                {colors.map((color) => ( // Use unique color options from products
                  <div key={color} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`color-${color}`}
                      checked={selectedColors.includes(color)}
                      onChange={() => handleColorChange(color)}
                      className="mr-2 checkbox"
                    />
                    <label htmlFor={`color-${color}`} className="text-gray-700">{color}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-3/4">
          {filteredProducts.length === 0 ? (
            <div className="text-center">No products found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id || product.name}
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