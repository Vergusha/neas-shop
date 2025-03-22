import React, { useState, useEffect } from 'react';
import { collection, getFirestore, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import EditProductModal from './EditProductModal';
import { db } from '../firebaseConfig';
import { ProductForm, NewProductForm } from '../types/product';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { updateAllProductsSearchKeywords } from '../utils/updateSearchKeywords';

const AdminPanel: React.FC = () => {
  const [product, setProduct] = useState<NewProductForm>({
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
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductForm | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('mobile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductForm | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isManageCollapsed, setIsManageCollapsed] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, selectedCategory));
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProductForm[];
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

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
        searchKeywords: generateSearchKeywords(productName, product.modelNumber),
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

  const generateSearchKeywords = (name: string, modelNumber?: string): string[] => {
    const keywords: string[] = [];
    
    // Process name
    const words = name.toLowerCase().split(' ');
    
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

    // Add model number variations if provided
    if (modelNumber) {
      keywords.push(modelNumber.toLowerCase());
      // Remove spaces and hyphens for alternative search
      const cleanModelNumber = modelNumber.toLowerCase().replace(/[\s-]/g, '');
      if (cleanModelNumber !== modelNumber.toLowerCase()) {
        keywords.push(cleanModelNumber);
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
  const generateProductId = (product: NewProductForm): string => {
    const brand = formatForUrl(product.brand);
    const model = formatForUrl(product.model);
    const modelNumber = product.modelNumber ? `-${formatForUrl(product.modelNumber)}` : '';
    const memory = formatForUrl(product.memory)
      .replace('gb', '') // убираем 'gb' из памяти
      + 'gb'; // добавляем 'gb' в конце
    const color = formatForUrl(product.color);
    
    return `${brand}-${model}${modelNumber}-${memory}-${color}`;
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const productRef = doc(db, selectedCategory, productToDelete.id);
      await deleteDoc(productRef);
      
      // Update products list
      setProducts(prevProducts => 
        prevProducts.filter(p => p.id !== productToDelete.id)
      );
      
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleUpdateSearchKeywords = async () => {
    try {
      if (window.confirm('Are you sure you want to update search keywords for all products?')) {
        await updateAllProductsSearchKeywords();
        alert('Search keywords updated successfully!');
      }
    } catch (error) {
      console.error('Error updating search keywords:', error);
      alert('Failed to update search keywords');
    }
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
          {generateProductId(product) || 'Example: motorola-moto-g24-xt2341-128gb-steelgray'}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Format: brand-model-modelnumber-memory-color
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
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="mb-4">
        <button
          onClick={handleUpdateSearchKeywords}
          className="btn btn-warning btn-sm"
        >
          Update All Search Keywords
        </button>
      </div>

      <div className="flex justify-between items-center mb-4 cursor-pointer" 
           onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}>
        <h2 className="text-xl font-bold">Admin Panel</h2>
        {isPanelCollapsed ? <FaChevronDown /> : <FaChevronUp />}
      </div>
      
      {!isPanelCollapsed && (
        <>
          {/* Add Product Form */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add New Product</h3>
              <select 
                value={product.category}
                onChange={(e) => setProduct({...product, category: e.target.value})}
                className="select select-bordered select-sm"
                required
              >
                <option value="mobile">Mobile Phones</option>
                <option value="tv">TVs</option>
              </select>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Render dynamic fields based on category */}
                {renderFields()}

                {/* Image upload section */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${imageInputType === 'file' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setImageInputType('file')}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${imageInputType === 'url' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setImageInputType('url')}
                    >
                      Insert URL
                    </button>
                  </div>
                  
                  {imageInputType === 'file' ? (
                    <input
                      type="file"
                      onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                      className="file-input file-input-sm file-input-bordered w-full"
                      accept="image/*"
                    />
                  ) : (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="input input-sm input-bordered w-full"
                      placeholder="https://example.com/image.jpg"
                    />
                  )}
                </div>
                
                <div className="lg:col-span-3">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'Add Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Manage Products Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 cursor-pointer"
                   onClick={() => setIsManageCollapsed(!isManageCollapsed)}>
                <h3 className="text-lg font-bold">Manage Products</h3>
                {isManageCollapsed ? <FaChevronDown /> : <FaChevronUp />}
              </div>
              {!isManageCollapsed && (
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="mobile">Mobile Phones</option>
                  <option value="tv">TVs</option>
                </select>
              )}
            </div>

            {!isManageCollapsed && (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="w-16">Image</th>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Memory</th>
                      <th>Color</th>
                      <th>Price</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="hover">
                        <td>
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-12 h-12 object-contain"
                          />
                        </td>
                        <td className="max-w-xs truncate">{product.name}</td>
                        <td>{product.brand}</td>
                        <td>{product.model}</td>
                        <td>{product.memory}</td>
                        <td>{product.color}</td>
                        <td>{product.price} NOK</td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (product.id) {
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
                                  } as ProductForm);
                                  setIsEditModalOpen(true);
                                }
                              }}
                              className="btn btn-xs btn-primary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setProductToDelete(product);
                                setShowDeleteConfirm(true);
                              }}
                              className="btn btn-xs btn-error"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && productToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Delete Product</h3>
                <p className="mb-4">
                  Are you sure you want to delete "{productToDelete.name}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button 
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setProductToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-error"
                    onClick={handleDeleteProduct}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </>
      )}
    </div>
  );
};

export default AdminPanel;
