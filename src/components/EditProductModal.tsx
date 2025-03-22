import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface ProductForm {
  id: string;
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
}

interface EditProductModalProps {
  product: ProductForm;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProduct: ProductForm) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [editedProduct, setEditedProduct] = useState<ProductForm>(product);
  const [isLoading, setIsLoading] = useState(false);
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('url');

  useEffect(() => {
    setEditedProduct(product);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const productRef = doc(db, editedProduct.category, editedProduct.id);
      const updatedData = {
        ...editedProduct,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(productRef, updatedData);
      onUpdate(updatedData);
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
                value={editedProduct.brand}
                onChange={(e) => setEditedProduct({...editedProduct, brand: e.target.value})}
                className="input input-bordered w-full"
                placeholder="e.g. Motorola"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Model</label>
              <input
                type="text"
                value={editedProduct.model}
                onChange={(e) => setEditedProduct({...editedProduct, model: e.target.value})}
                className="input input-bordered w-full"
                placeholder="e.g. Moto G24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Model Number</label>
              <input
                type="text"
                value={editedProduct.modelNumber}
                onChange={(e) => setEditedProduct({...editedProduct, modelNumber: e.target.value})}
                className="input input-bordered w-full"
                placeholder="e.g. XT2341-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Memory</label>
              <input
                type="text"
                value={editedProduct.memory}
                onChange={(e) => setEditedProduct({...editedProduct, memory: e.target.value})}
                className="input input-bordered w-full"
                placeholder="e.g. 128GB"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Color</label>
              <input
                type="text"
                value={editedProduct.color}
                onChange={(e) => setEditedProduct({...editedProduct, color: e.target.value})}
                className="input input-bordered w-full"
                placeholder="e.g. Steel Gray"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium required">Price (NOK)</label>
              <input
                type="number"
                value={editedProduct.price}
                onChange={(e) => setEditedProduct({...editedProduct, price: Math.max(0, Number(e.target.value))})}
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
                value={editedProduct.description}
                onChange={(e) => setEditedProduct({...editedProduct, description: e.target.value})}
                className="textarea textarea-bordered w-full"
                rows={4}
                placeholder="Product description"
                required
              />
            </div>

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
                value={editedProduct.image}
                onChange={(e) => setEditedProduct({...editedProduct, image: e.target.value})}
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
