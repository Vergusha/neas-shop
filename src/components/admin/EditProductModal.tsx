import React, { useState, useEffect } from 'react';
import { ProductForm } from '../../types/product';
import { getTheme } from '../../utils/themeUtils';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductForm, oldId: string) => Promise<void>;
  product: ProductForm;
}

const generateProductId = (product: ProductForm): string => {
  // Создаем ID товара на основе бренда, модели, памяти и цвета
  const parts = [
    product.brand,
    product.model,
    product.modelNumber,
    product.memory,
    product.color,
  ].filter(Boolean);
  
  // Преобразуем в нижний регистр и заменяем пробелы на дефисы
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/[^a-z0-9-]/g, '') // Удаляем все символы, кроме латинских букв, цифр и дефисов
    .replace(/-+/g, '-'); // Заменяем множественные дефисы на один
};

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
}) => {
  const [editedProduct, setEditedProduct] = useState<ProductForm>(product);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [originalId, setOriginalId] = useState<string>(product.id || '');
  const [willUpdateId, setWillUpdateId] = useState<boolean>(false);
  const [allowIdUpdate, setAllowIdUpdate] = useState<boolean>(false); // Add state for enabling ID updates
  const [newProductId, setNewProductId] = useState<string>('');
  
  // Обновляем ID при изменении ключевых полей
  useEffect(() => {
    if (product.id && allowIdUpdate) { // Only check for ID updates if allowed
      const newId = generateProductId(editedProduct);
      if (newId !== originalId && newId.length > 0) {
        setNewProductId(newId);
        setWillUpdateId(true);
      } else {
        setWillUpdateId(false);
      }
    }
  }, [editedProduct.brand, editedProduct.model, editedProduct.modelNumber, editedProduct.memory, editedProduct.color, allowIdUpdate]); // Add allowIdUpdate to dependencies
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Update the form when the product changes
  useEffect(() => {
    setEditedProduct(product);
    setOriginalId(product.id || '');
  }, [product]);

  // Add scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      // Disable scrolling on body when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px'; // Prevent layout shift
    } else {
      // Re-enable scrolling when modal is closed
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      // Clean up on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedProduct((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditedProduct((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Если ID изменился, обновляем его в товаре
      if (allowIdUpdate && willUpdateId && newProductId) {
        editedProduct.id = newProductId;
      }
      
      await onSave(editedProduct, originalId);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Получаем список коллекций на основе категории
  const getCategoryCollection = (category: string): string => {
    const categoryCollectionMap: Record<string, string> = {
      'mobile': 'mobile',
      'laptops': 'laptops',
      'tv': 'tv',
      'audio': 'audio',
      'gaming': 'gaming',
      'accessories': 'accessories',
    };
    
    return categoryCollectionMap[category] || category;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/30" onClick={onClose}></div>
      
      <div 
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] overflow-auto p-6 rounded-lg shadow-xl ${
          currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-xl font-bold mb-4 ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
          Edit Product
        </h2>
        
        {/* ID Update Controls */}
        <div className="p-3 mb-4 text-blue-800 bg-blue-100 rounded-lg dark:bg-blue-800 dark:text-blue-100">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="allowIdUpdate"
              checked={allowIdUpdate}
              onChange={(e) => setAllowIdUpdate(e.target.checked)}
              className={`mr-2 h-4 w-4 rounded ${
                currentTheme === 'dark' 
                  ? 'text-[#95c672] bg-gray-700 border-gray-600 focus:ring-[#95c672]' 
                  : 'text-[#003D2D] focus:ring-[#003D2D]'
              }`}
            />
            <label 
              htmlFor="allowIdUpdate" 
              className="font-medium"
            >
              Enable automatic Product ID updates
            </label>
          </div>
          <p className="text-xs">When enabled, changing key product information will update the product ID. This affects all data related to this product including reviews and ratings.</p>
          
          <div className="pt-2 mt-3 border-t border-blue-200 dark:border-blue-700">
            <p className="text-sm font-medium">Current ID: <span className="font-mono">{originalId}</span></p>
            {allowIdUpdate && willUpdateId && (
              <p className="text-sm font-medium">New ID: <span className="font-mono">{newProductId}</span></p>
            )}
          </div>
        </div>
        
        {willUpdateId && allowIdUpdate && (
          <div className="p-3 mb-4 text-yellow-800 bg-yellow-100 rounded-lg dark:bg-yellow-800 dark:text-yellow-100">
            <p className="font-medium">Product ID will be updated</p>
            <p className="mt-1 text-xs">Note: All related data (reviews, ratings) will be transferred to the new ID</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label 
                  htmlFor="name" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Product Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editedProduct.name || ''}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="brand" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={editedProduct.brand || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="model" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={editedProduct.model || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="modelNumber" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Model Number
                </label>
                <input
                  type="text"
                  id="modelNumber"
                  name="modelNumber"
                  value={editedProduct.modelNumber || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="category" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={editedProduct.category || ''}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                >
                  <option value="">Select category</option>
                  <option value="laptops">Laptops</option>
                  <option value="mobile">Mobile Phones</option>
                  <option value="tv">TV & Display</option>
                  <option value="audio">Audio</option>
                  <option value="gaming">Gaming</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              
              <div>
                <label 
                  htmlFor="collection" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Collection
                </label>
                <input
                  type="text"
                  id="collection"
                  name="collection"
                  value={editedProduct.collection || getCategoryCollection(editedProduct.category || '')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="color" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Color
                </label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={editedProduct.color || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Pricing
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label 
                  htmlFor="price" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Price (NOK)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={editedProduct.price || ''}
                  onChange={handleNumberChange}
                  step="0.01"
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="originalPrice" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Original Price (NOK)
                </label>
                <input
                  type="number"
                  id="originalPrice"
                  name="originalPrice"
                  value={editedProduct.originalPrice || ''}
                  onChange={handleNumberChange}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="discountPercent" 
                  className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Discount (%)
                </label>
                <input
                  type="number"
                  id="discountPercent"
                  name="discountPercent"
                  value={editedProduct.discountPercent || ''}
                  onChange={handleNumberChange}
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
              </div>
            </div>
          </div>
          
          {/* Stock Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Stock Information
            </h3>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="inStock"
                name="inStock"
                checked={editedProduct.inStock || false}
                onChange={handleCheckboxChange}
                className={`mr-2 h-4 w-4 rounded ${
                  currentTheme === 'dark' 
                    ? 'text-[#95c672] bg-gray-700 border-gray-600 focus:ring-[#95c672]' 
                    : 'text-[#003D2D] focus:ring-[#003D2D]'
                }`}
              />
              <label 
                htmlFor="inStock" 
                className={`text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                In Stock
              </label>
            </div>
          </div>
          
          {/* Product Specifications */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Specifications
            </h3>
            
            {/* Dynamic specification fields based on category */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Mobile & Laptop Specs */}
              {(editedProduct.category === 'mobile' || editedProduct.category === 'laptops') && (
                <>
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Memory
                    </label>
                    <input
                      type="text"
                      name="memory"
                      value={editedProduct.memory || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 256GB"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Processor
                    </label>
                    <input
                      type="text"
                      name="processor"
                      value={editedProduct.processor || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Apple A16 Bionic"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                </>
              )}
              
              {/* Laptop Specific */}
              {editedProduct.category === 'laptops' && (
                <>
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      RAM
                    </label>
                    <input
                      type="text"
                      name="ram"
                      value={editedProduct.ram || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 16GB"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Storage
                    </label>
                    <input
                      type="text"
                      name="storageType"
                      value={editedProduct.storageType || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 512GB SSD"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Graphics Card
                    </label>
                    <input
                      type="text"
                      name="graphicsCard"
                      value={editedProduct.graphicsCard || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Operating System
                    </label>
                    <input
                      type="text"
                      name="operatingSystem"
                      value={editedProduct.operatingSystem || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Screen Size
                    </label>
                    <input
                      type="text"
                      name="screenSize"
                      value={editedProduct.screenSize || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 15.6 inch"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                </>
              )}
              
              {/* TV & Display Specs */}
              {editedProduct.category === 'tv' && (
                <>
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Diagonal
                    </label>
                    <input
                      type="text"
                      name="diagonal"
                      value={editedProduct.diagonal || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 55"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Resolution
                    </label>
                    <input
                      type="text"
                      name="resolution"
                      value={editedProduct.resolution || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 4K UHD"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Display Type
                    </label>
                    <input
                      type="text"
                      name="displayType"
                      value={editedProduct.displayType || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. OLED, QLED"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Refresh Rate
                    </label>
                    <input
                      type="text"
                      name="refreshRate"
                      value={editedProduct.refreshRate || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 120Hz"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                </>
              )}
              
              {/* Gaming & Audio Specs */}
              {(editedProduct.category === 'gaming' || editedProduct.category === 'audio') && (
                <>
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Device Type
                    </label>
                    <input
                      type="text"
                      name="deviceType"
                      value={editedProduct.deviceType || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Mouse, Headset"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Connectivity
                    </label>
                    <input
                      type="text"
                      name="connectivity"
                      value={editedProduct.connectivity || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Wireless, Bluetooth"
                      className={`w-full px-3 py-2 border rounded-md ${
                        currentTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                      }`}
                    />
                  </div>
                  
                  {editedProduct.category === 'audio' && (
                    <div>
                      <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Subtype
                      </label>
                      <input
                        type="text"
                        name="subtype"
                        value={editedProduct.subtype || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. In-ear, Over-ear"
                        className={`w-full px-3 py-2 border rounded-md ${
                          currentTheme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                            : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                        }`}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Description */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Description
            </h3>
            <textarea
              id="description"
              name="description"
              value={editedProduct.description || ''}
              onChange={handleInputChange}
              rows={5}
              className={`w-full px-3 py-2 border rounded-md ${
                currentTheme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
              }`}
            />
          </div>
          
          {/* Images */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Images
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Main Image URL
                </label>
                <input
                  type="text"
                  name="image"
                  value={editedProduct.image || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                  }`}
                />
                {editedProduct.image && (
                  <div className="mt-2">
                    <img
                      src={editedProduct.image}
                      alt="Product preview"
                      className="object-contain h-24 border rounded"
                    />
                  </div>
                )}
              </div>
              
              {/* Additional image fields */}
              {['image2', 'image3', 'image4', 'image5'].map((imageName, index) => (
                <div key={imageName}>
                  <label className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Image {index + 2} URL
                  </label>
                  <input
                    type="text"
                    name={imageName}
                    value={editedProduct[imageName] || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md ${
                      currentTheme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-[#95c672] focus:ring-[#95c672]' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-[#003D2D] focus:ring-[#003D2D]'
                    }`}
                  />
                  {editedProduct[imageName] && (
                    <div className="mt-2">
                      <img
                        src={editedProduct[imageName]}
                        alt={`Product image ${index + 2}`}
                        className="object-contain h-24 border rounded"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`px-4 py-2 rounded-md font-medium ${
                currentTheme === 'dark' 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 rounded-md font-medium ${
                currentTheme === 'dark'
                  ? 'bg-[#95c672] text-gray-900 hover:bg-[#85b662]'
                  : 'bg-[#003D2D] text-white hover:bg-[#004D3D]'
              } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
