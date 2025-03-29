import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
      if (!editedProduct.id) {
        throw new Error('Product ID is required');
      }

      // Try to find the correct collection for this product
      const collections = ['laptops', 'gaming', 'tv', 'audio', 'mobile'];
      let foundDoc = null;
      let foundCollection = '';

      for (const collection of collections) {
        const docRef = doc(db, collection, editedProduct.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          foundDoc = docSnap;
          foundCollection = collection;
          break;
        }
      }

      if (!foundDoc) {
        throw new Error('Product not found in any collection');
      }

      const { id, category, ...updateData } = editedProduct;
      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      const productRef = doc(db, foundCollection, id);
      await updateDoc(productRef, updatedData);
      onUpdate({ ...updatedData, id, category: foundCollection } as ProductForm & { id: string });
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: value === null ? '' : name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  if (!isOpen) return null;

  // Determine if this is a laptop product
  const isLaptop = editedProduct.category === 'laptops';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 m-4 bg-white rounded-lg">
        <h3 className="mb-4 text-xl font-bold">Edit Product: {editedProduct.name}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Basic product information */}
            <div>
              <label className="block text-sm font-medium required">Brand</label>
              <input
                type="text"
                name="brand"
                value={editedProduct.brand || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
                placeholder="e.g. Motorola"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Model</label>
              <input
                type="text"
                name="model"
                value={editedProduct.model || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
                placeholder="e.g. Moto G24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Model Number</label>
              <input
                type="text"
                name="modelNumber"
                value={editedProduct.modelNumber || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
                placeholder="e.g. XT2341-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Model Year</label>
              <select
                name="modelNumber"
                value={editedProduct.modelNumber || ''}
                onChange={handleInputChange}
                className="w-full select select-bordered"
              >
                <option value="">Select Year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>

            {/* Conditional rendering for memory field (non-laptops) */}
            {!isLaptop && (
              <div>
                <label className="block text-sm font-medium required">Memory</label>
                <input
                  type="text"
                  name="memory"
                  value={editedProduct.memory || ''}
                  onChange={handleInputChange}
                  className="w-full input input-bordered"
                  placeholder="e.g. 128GB"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium required">Color</label>
              <input
                type="text"
                name="color"
                value={editedProduct.color || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
                placeholder="e.g. Steel Gray"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Price (NOK)</label>
              <input
                type="number"
                name="price"
                value={editedProduct.price || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
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
                value={editedProduct.description || ''}
                onChange={handleInputChange}
                className="w-full textarea textarea-bordered"
                rows={4}
                placeholder="Product description"
                required
              />
            </div>

            {/* Laptop-specific fields */}
            {isLaptop && (
              <div className="space-y-4">
                <h4 className="font-medium">Laptop Specifications</h4>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Особые поля для MacBook */}
                  {editedProduct.brand === 'Apple' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium">Chip</label>
                        <select
                          name="processor"
                          value={editedProduct.processor || ''}
                          onChange={handleInputChange}
                          className="w-full select select-bordered"
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
                        className="w-full input input-bordered"
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
                      className="w-full input input-bordered"
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
                      className="w-full input input-bordered"
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
                      className="w-full input input-bordered"
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
                      className="w-full input input-bordered"
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
                        className="w-full select select-bordered"
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
                        className="w-full input input-bordered"
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
                  src={editedProduct.image || ''} 
                  alt={editedProduct.name || ''} 
                  className="object-contain w-32 h-32 border rounded"
                />
              </div>
              <input
                type="url"
                name="image"
                value={editedProduct.image || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
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
