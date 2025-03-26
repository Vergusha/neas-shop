import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ProductForm } from '../types/product';

interface EditProductModalProps {
  product: ProductForm & { id: string }; // Ensure id is required for editing
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProduct: ProductForm & { id: string }) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [editedProduct, setEditedProduct] = useState<ProductForm>(product);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditedProduct(product);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!editedProduct.id || !editedProduct.category) {
        throw new Error('Invalid product data');
      }

      const productRef = doc(db, editedProduct.category, editedProduct.id);
      const { id, ...updateData } = editedProduct;
      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(productRef, updatedData);
      onUpdate({ ...updatedData, id } as ProductForm);
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setEditedProduct({
        ...editedProduct,
        [name]: parseFloat(value) || 0
      });
    } else {
      setEditedProduct({
        ...editedProduct,
        [name]: value
      });
    }
  };

  if (!isOpen) return null;

  // Determine if this is a laptop product
  const isLaptop = editedProduct.category === 'laptops';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl m-4">
        <h3 className="text-xl font-bold mb-4">Edit Product: {editedProduct.name}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Basic product information */}
            <div>
              <label className="block text-sm font-medium required">Brand</label>
              <input
                type="text"
                name="brand"
                value={editedProduct.brand}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g. Motorola"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Model</label>
              <input
                type="text"
                name="model"
                value={editedProduct.model}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g. Moto G24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Model Number</label>
              <input
                type="text"
                name="modelNumber"
                value={editedProduct.modelNumber}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g. XT2341-1"
              />
            </div>

            {/* Conditional rendering for memory field (non-laptops) */}
            {!isLaptop && (
              <div>
                <label className="block text-sm font-medium required">Memory</label>
                <input
                  type="text"
                  name="memory"
                  value={editedProduct.memory}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="e.g. 128GB"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium required">Color</label>
              <input
                type="text"
                name="color"
                value={editedProduct.color}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g. Steel Gray"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Price (NOK)</label>
              <input
                type="number"
                name="price"
                value={editedProduct.price}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g. 4999"
                min="0"
                step="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Description</label>
              <textarea
                name="description"
                value={editedProduct.description}
                onChange={handleInputChange}
                className="textarea textarea-bordered w-full"
                rows={4}
                placeholder="Product description"
                required
              />
            </div>

            {/* Laptop-specific fields */}
            {isLaptop && (
              <div className="space-y-4">
                <h4 className="font-medium">Laptop Specifications</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Особые поля для MacBook */}
                  {editedProduct.brand === 'Apple' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium">Chip</label>
                        <select
                          name="processor"
                          value={editedProduct.processor || ''}
                          onChange={handleInputChange}
                          className="select select-bordered w-full"
                        >
                          <option value="">Select Chip</option>
                          <option value="Apple M1">Apple M1</option>
                          <option value="Apple M1 Pro">Apple M1 Pro</option>
                          <option value="Apple M1 Max">Apple M1 Max</option>
                          <option value="Apple M1 Ultra">Apple M1 Ultra</option>
                          <option value="Apple M2">Apple M2</option>
                          <option value="Apple M2 Pro">Apple M2 Pro</option>
                          <option value="Apple M2 Max">Apple M2 Max</option>
                          <option value="Apple M2 Ultra">Apple M2 Ultra</option>
                          <option value="Apple M3">Apple M3</option>
                          <option value="Apple M3 Pro">Apple M3 Pro</option>
                          <option value="Apple M3 Max">Apple M3 Max</option>
                          <option value="Apple M3 Ultra">Apple M3 Ultra</option>
                          <option value="Intel Core i5">Intel Core i5</option>
                          <option value="Intel Core i7">Intel Core i7</option>
                          <option value="Intel Core i9">Intel Core i9</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium">Processor</label>
                      <input
                        type="text"
                        name="processor"
                        value={editedProduct.processor || ''}
                        onChange={handleInputChange}
                        className="input input-bordered w-full"
                        placeholder="e.g. Intel Core i7-11800H"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium">RAM</label>
                    <input
                      type="text"
                      name="ram"
                      value={editedProduct.ram || ''}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="e.g. 16GB DDR4"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium">Storage</label>
                    <input
                      type="text"
                      name="storageType"
                      value={editedProduct.storageType || ''}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="e.g. 512GB SSD"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium">Graphics Card</label>
                    <input
                      type="text"
                      name="graphicsCard"
                      value={editedProduct.graphicsCard || ''}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder={editedProduct.brand === 'Apple' ? "e.g. Apple Integrated Graphics" : "e.g. NVIDIA RTX 3060"}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium">Screen Size</label>
                    <input
                      type="text"
                      name="screenSize"
                      value={editedProduct.screenSize || ''}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="e.g. 15.6 inch"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium">Operating System</label>
                    {editedProduct.brand === 'Apple' ? (
                      <select
                        name="operatingSystem"
                        value={editedProduct.operatingSystem || ''}
                        onChange={handleInputChange}
                        className="select select-bordered w-full"
                      >
                        <option value="">Select OS</option>
                        <option value="macOS Monterey">macOS Monterey</option>
                        <option value="macOS Ventura">macOS Ventura</option>
                        <option value="macOS Sonoma">macOS Sonoma</option>
                        <option value="macOS Sequoia">macOS Sequoia</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="operatingSystem"
                        value={editedProduct.operatingSystem || ''}
                        onChange={handleInputChange}
                        className="input input-bordered w-full"
                        placeholder="e.g. Windows 11 Home"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Image preview and URL field */}
            <div>
              <label className="block text-sm font-medium">Current Image</label>
              <div className="mb-4">
                <img 
                  src={editedProduct.image} 
                  alt={editedProduct.name} 
                  className="w-32 h-32 object-contain border rounded"
                />
              </div>
              <input
                type="url"
                name="image"
                value={editedProduct.image}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="Image URL"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <span className="loading loading-spinner"></span> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
