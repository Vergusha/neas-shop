import React, { useState, useEffect } from 'react';
import { collection, addDoc, getFirestore, doc, setDoc, getDocs } from 'firebase/firestore';
import EditProductModal from './EditProductModal';
import { db } from '../firebaseConfig'; // Add this import

interface ProductForm {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  model: string;
  modelNumber: string;
  memory: string;
  color: string;
  // Mobile specific
  camera?: string;
  screenSize?: string;
  resolution?: string;
  // TV specific
  screenDiagonal?: string;
  screenFormat?: string;
}

const AdminPanel: React.FC = () => {
  const [product, setProduct] = useState<ProductForm>({
    name: '',
    description: '',
    price: 0,
    image: '',
    category: 'mobile',
    brand: '',
    model: '',
    modelNumber: '',
    memory: '',
    color: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductForm | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('mobile');
  const [productsList, setProductsList] = useState<ProductForm[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, selectedCategory));
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, product.category);
        const snapshot = await getDocs(productsCollection);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductsList(products);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [product.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Data validation
      if (!product.brand || !product.model || !product.memory || !product.color) {
        throw new Error('Please fill in all required fields');
      }

      // Generate product ID
      const productId = generateProductId(product);
      console.log('Generated Product ID:', productId);

      // Generate product name
      const productName = `${product.brand} ${product.model} ${product.memory}`;

      let finalImageUrl = product.image;
      
      if (imageInputType === 'file' && imageFile) {
        try {
          finalImageUrl = await convertToBase64(imageFile);
        } catch (imageError) {
          console.error('Ошибка при конвертации изображения:', imageError);
          throw new Error('Ошибка при обработке изображения');
        }
      } else if (imageInputType === 'url' && imageUrl) {
        finalImageUrl = imageUrl;
      }
      
      const db = getFirestore();
      if (!db) {
        throw new Error('Database not initialized');
      }

      const productData = {
        id: productId,
        name: productName,
        brand: product.brand,
        model: product.model,
        modelNumber: product.modelNumber,
        memory: product.memory,
        color: product.color,
        description: product.description,
        price: Math.abs(Number(product.price)),
        image: finalImageUrl,
        createdAt: new Date().toISOString(),
        searchKeywords: generateSearchKeywords(productName),
        clickCount: 0,
        updatedAt: new Date().toISOString(),
        // Фильтры для поиска
        filterCategories: {
          brand: product.brand.toLowerCase(),
          memory: product.memory.toLowerCase(),
          color: product.color.toLowerCase(),
        }
      };

      // Добавляем документ с custom ID
      const collectionRef = collection(db, product.category);
      const docRef = doc(collectionRef, productId);
      await setDoc(docRef, productData);
      
      console.log('Product successfully added with ID:', productId);
      
      // Reset form
      setProduct({
        name: '',
        description: '',
        price: 0,
        image: '',
        category: 'mobile',
        brand: '',
        model: '',
        modelNumber: '',
        memory: '',
        color: '',
      });
      setImageFile(null);
      setImageUrl('');
      
      alert('Product successfully added!');
      
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while adding the product');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const generateSearchKeywords = (name: string): string[] => {
    const words = name.toLowerCase().split(' ');
    const keywords: string[] = [];
    
    // Add individual words
    for (const word of words) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
    
    // Add combinations of words
    for (let i = 0; i < words.length; i++) {
      let combined = '';
      for (let j = i; j < words.length; j++) {
        combined += words[j] + ' ';
        keywords.push(combined.trim());
      }
    }
    
    return Array.from(new Set(keywords)); // удаляем дубликаты
  };

  // Функция для форматирования строки в URL-friendly формат
  const formatForUrl = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-') // заменяем пробелы на дефисы
      .replace(/[^a-z0-9-]/g, '') // удаляем все, кроме букв, цифр и дефисов
      .replace(/-+/g, '-') // заменяем множественные дефисы на один
      .trim(); // убираем пробелы в начале и конце
  };

  // Обновленная функция для генерации ID товара
  const generateProductId = (product: ProductForm): string => {
    const brand = formatForUrl(product.brand);
    const model = formatForUrl(product.model);
    const memory = formatForUrl(product.memory)
      .replace('gb', '') // убираем 'gb' из памяти
      + 'gb'; // добавляем 'gb' в конце
    const color = formatForUrl(product.color);
    
    return `${brand}-${model}-${memory}-${color}`;
  };

  const renderMobileFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Brand</label>
        <input
          type="text"
          value={product.brand}
          onChange={(e) => setProduct({...product, brand: e.target.value})}
          className="input input-bordered w-full"
          placeholder="e.g. Motorola"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Model</label>
        <input
          type="text"
          value={product.model}
          onChange={(e) => setProduct({...product, model: e.target.value})}
          className="input input-bordered w-full"
          placeholder="e.g. Moto G24"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Model Number</label>
        <input
          type="text"
          value={product.modelNumber}
          onChange={(e) => setProduct({...product, modelNumber: e.target.value})}
          className="input input-bordered w-full"
          placeholder="e.g. XT2341-1"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Memory</label>
        <input
          type="text"
          value={product.memory}
          onChange={(e) => setProduct({...product, memory: e.target.value})}
          className="input input-bordered w-full"
          placeholder="e.g. 128GB"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Color</label>
        <input
          type="text"
          value={product.color}
          onChange={(e) => setProduct({...product, color: e.target.value})}
          className="input input-bordered w-full"
          placeholder="e.g. Steel Gray"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 required">Price (NOK)</label>
        <input
          type="number"
          value={product.price}
          onChange={(e) => setProduct({...product, price: Math.max(0, Number(e.target.value))})}
          className="input input-bordered w-full"
          placeholder="e.g. 4999"
          min="0"
          step="1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 required">Description</label>
        <textarea
          value={product.description}
          onChange={(e) => setProduct({...product, description: e.target.value})}
          className="textarea textarea-bordered w-full"
          placeholder="Product description"
          required
        />
      </div>

      {/* Preview Generated ID с примером */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <label className="block text-sm font-medium text-gray-700">Generated Product ID:</label>
        <div className="mt-1 text-sm text-gray-900">
          {generateProductId(product) || 'Example: motorola-moto-g24-128gb-steelgray'}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Format: brand-model-memory-color
        </div>
      </div>
    </>
  );

  const renderFields = () => {
    const commonFields = (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            value={product.name}
            onChange={(e) => setProduct({...product, name: e.target.value})}
            className="input input-bordered w-full"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={product.description}
            onChange={(e) => setProduct({...product, description: e.target.value})}
            className="textarea textarea-bordered w-full"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (NOK)</label>
          <input
            type="number"
            value={product.price}
            onChange={(e) => setProduct({...product, price: Number(e.target.value)})}
            className="input input-bordered w-full"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand</label>
          <input
            type="text"
            value={product.brand}
            onChange={(e) => setProduct({...product, brand: e.target.value})}
            className="input input-bordered w-full"
            required
          />
        </div>
      </>
    );

    if (product.category === 'mobile') {
      return renderMobileFields();
    }

    if (product.category === 'tv') {
      return (
        <>
          {commonFields}
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Diagonal</label>
            <input
              type="text"
              value={product.screenDiagonal || ''}
              onChange={(e) => setProduct({...product, screenDiagonal: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Resolution</label>
            <input
              type="text"
              value={product.resolution || ''}
              onChange={(e) => setProduct({...product, resolution: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Format</label>
            <input
              type="text"
              value={product.screenFormat || ''}
              onChange={(e) => setProduct({...product, screenFormat: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <input
              type="text"
              value={product.color || ''}
              onChange={(e) => setProduct({...product, color: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
        </>
      );
    }

    return commonFields;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
      
      {/* Add Product Form */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Add New Product</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select 
                value={product.category}
                onChange={(e) => setProduct({...product, category: e.target.value})}
                className="input input-bordered w-full"
                required
              >
                <option value="mobile">Mobile Phones</option>
                <option value="tv">TVs</option>
              </select>
            </div>
            
            {/* Render dynamic fields based on category */}
            {renderFields()}

            {/* Image upload section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Image</label>
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  className={`btn ${imageInputType === 'file' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setImageInputType('file')}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  className={`btn ${imageInputType === 'url' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setImageInputType('url')}
                >
                  Insert URL
                </button>
              </div>
              
              {imageInputType === 'file' ? (
                <input
                  type="file"
                  onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                  className="file-input file-input-bordered w-full"
                  accept="image/*"
                />
              ) : (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="https://example.com/image.jpg"
                />
              )}
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? <span className="loading loading-spinner"></span> : 'Add Product'}
            </button>
          </div>
        </form>
      </div>

      {/* Manage Products Section */}
      <div className="mt-12">
        <h3 className="text-xl font-bold mb-4">Manage Products</h3>
        
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="select select-bordered mb-4"
        >
          <option value="mobile">Mobile Phones</option>
          <option value="tv">TVs</option>
        </select>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Memory</th>
                <th>Color</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="hover">
                  <td>
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-16 h-16 object-contain"
                    />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.brand}</td>
                  <td>{product.model}</td>
                  <td>{product.memory}</td>
                  <td>{product.color}</td>
                  <td>{product.price} NOK</td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedProduct({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: product.price,
                          image: product.image,
                          category: selectedCategory,
                          brand: product.brand,
                          model: product.model,
                          modelNumber: product.modelNumber || '',
                          memory: product.memory,
                          color: product.color
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProduct(null);
          }}
          onUpdate={(updatedProduct) => {
            setProducts(prevProducts => 
              prevProducts.map(p => 
                p.id === updatedProduct.id ? updatedProduct : p
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
