import React, { useState, useEffect } from 'react';
import { ProductForm } from '../../types/product';
import { getTheme } from '../../utils/themeUtils';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductForm) => Promise<void>;
  product: ProductForm;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
}) => {
  const [editedProduct, setEditedProduct] = useState<ProductForm>(product);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
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
  }, [product]);

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
      await onSave(editedProduct);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-auto p-6 rounded-lg shadow-xl ${
        currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
          Edit Product
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>
          
          {/* Pricing */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="mb-6">
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
          
          {/* Description */}
          <div className="mb-6">
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
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Images
            </h3>
            <div>
              <label 
                htmlFor="image" 
                className={`block mb-1 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Main Image URL
              </label>
              <input
                type="text"
                id="image"
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
                    className="h-24 object-contain border rounded"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-3">
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
