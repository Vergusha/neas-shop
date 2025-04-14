import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ProductForm } from '../types/product';
import { getTheme } from '../utils/themeUtils';

interface EditProductModalProps {
  product: ProductForm & { id: string };
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
  const [saving, setSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  useEffect(() => {
    setEditedProduct(product);
    setErrors({});
  }, [product, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields for all products
    if (!editedProduct.name?.trim()) newErrors.name = 'Name is required';
    if (!editedProduct.brand?.trim()) newErrors.brand = 'Brand is required';
    if (!editedProduct.model?.trim()) newErrors.model = 'Model is required';
    if (!editedProduct.description?.trim()) newErrors.description = 'Description is required';
    if (!editedProduct.image?.trim()) newErrors.image = 'Image URL is required';
    if (editedProduct.price === undefined || editedProduct.price <= 0) newErrors.price = 'Valid price is required';
    if (!editedProduct.color?.trim()) newErrors.color = 'Color is required';

    // Category specific validations
    if (editedProduct.category === 'mobile' && !editedProduct.memory?.trim()) {
      newErrors.memory = 'Memory is required for mobile products';
    }
    
    if (editedProduct.category === 'laptops') {
      if (!editedProduct.processor?.trim()) newErrors.processor = 'Processor information is required';
      if (!editedProduct.ram?.trim()) newErrors.ram = 'RAM information is required';
      if (!editedProduct.storageType?.trim()) newErrors.storageType = 'Storage information is required';
    }
    
    if (editedProduct.category === 'gaming' && !editedProduct.deviceType?.trim()) {
      newErrors.deviceType = 'Device type is required for gaming products';
    }
    
    if (editedProduct.category === 'tv') {
      if (!editedProduct.diagonal?.trim()) newErrors.diagonal = 'Screen size is required';
      if (!editedProduct.resolution?.trim()) newErrors.resolution = 'Resolution is required';
      if (!editedProduct.displayType?.trim()) newErrors.displayType = 'Display type is required';
    }
    
    if (editedProduct.category === 'audio' && !editedProduct.subtype?.trim()) {
      newErrors.subtype = 'Audio product type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      await handleSubmit();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      const { id, ...updateData } = editedProduct;
      
      // Ensure price is a number
      updateData.price = Number(updateData.price);
      
      // Add timestamps
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox input
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditedProduct(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle all other inputs
    setEditedProduct(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  // Determine product category
  const isLaptop = editedProduct.category === 'laptops';
  const isGaming = editedProduct.category === 'gaming';
  const isTV = editedProduct.category === 'tv';
  const isAudio = editedProduct.category === 'audio';
  const isMobile = editedProduct.category === 'mobile';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 m-4 bg-white rounded-lg dark:bg-gray-800 dark:text-gray-200">
        <h3 className="mb-4 text-xl font-bold">Edit Product: {editedProduct.name}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Basic product information */}
            <div>
              <label className="block text-sm font-medium required">Name</label>
              <input
                type="text"
                name="name"
                value={editedProduct.name || ''}
                onChange={handleInputChange}
                className={`w-full input input-bordered ${errors.name ? 'input-error' : ''}`}
                placeholder="Product name"
                required
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium required">Brand</label>
              <input
                type="text"
                name="brand"
                value={editedProduct.brand || ''}
                onChange={handleInputChange}
                className={`w-full input input-bordered ${errors.brand ? 'input-error' : ''}`}
                placeholder="e.g. Motorola"
                required
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium required">Model</label>
              <input
                type="text"
                name="model"
                value={editedProduct.model || ''}
                onChange={handleInputChange}
                className={`w-full input input-bordered ${errors.model ? 'input-error' : ''}`}
                placeholder="e.g. Moto G24"
                required
              />
              {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium">Model Number/Year</label>
              <input
                type="text"
                name="modelNumber"
                value={editedProduct.modelNumber || ''}
                onChange={handleInputChange}
                className="w-full input input-bordered"
                placeholder="e.g. XT2341-1 or year"
              />
            </div>

            {/* Gaming-specific fields */}
            {isGaming && (
              <>
                <div>
                  <label className="block text-sm font-medium required">Device Type</label>
                  <select
                    name="deviceType"
                    value={editedProduct.deviceType || ''}
                    onChange={handleInputChange}
                    className={`w-full select select-bordered ${errors.deviceType ? 'select-error' : ''}`}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Headset">Headset</option>
                    <option value="Controller">Controller</option>
                    <option value="Chair">Chair</option>
                    <option value="Mousepad">Mousepad</option>
                    <option value="Speakers">Speakers</option>
                    <option value="Webcam">Webcam</option>
                    <option value="Microphone">Microphone</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.deviceType && <p className="mt-1 text-sm text-red-500">{errors.deviceType}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium">Connectivity</label>
                  <select
                    name="connectivity"
                    value={editedProduct.connectivity || ''}
                    onChange={handleInputChange}
                    className="w-full select select-bordered"
                  >
                    <option value="">Choose Connectivity</option>
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                    <option value="Bluetooth">Bluetooth</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rgbLighting"
                    name="rgbLighting"
                    checked={editedProduct.rgbLighting || false}
                    onChange={handleInputChange}
                    className="checkbox"
                  />
                  <label htmlFor="rgbLighting" className="text-sm">
                    RGB Lighting
                  </label>
                </div>
                
                {editedProduct.deviceType === 'Mouse' && (
                  <div>
                    <label className="block text-sm font-medium">DPI</label>
                    <input
                      type="text"
                      name="dpi"
                      value={editedProduct.dpi || ''}
                      onChange={handleInputChange}
                      className="w-full input input-bordered"
                      placeholder="e.g. 25,600"
                    />
                  </div>
                )}
                
                {editedProduct.deviceType === 'Keyboard' && (
                  <div>
                    <label className="block text-sm font-medium">Switch Type</label>
                    <input
                      type="text"
                      name="switchType"
                      value={editedProduct.switchType || ''}
                      onChange={handleInputChange}
                      className="w-full input input-bordered"
                      placeholder="e.g. Cherry MX Red"
                    />
                  </div>
                )}
                
                {['Wireless', 'Bluetooth'].includes(editedProduct.connectivity || '') && (
                  <div>
                    <label className="block text-sm font-medium">Battery Life</label>
                    <input
                      type="text"
                      name="batteryLife"
                      value={editedProduct.batteryLife || ''}
                      onChange={handleInputChange}
                      className="w-full input input-bordered"
                      placeholder="e.g. Up to 40 hours"
                    />
                  </div>
                )}
              </>
            )}

            {/* TV-specific fields */}
            {isTV && (
              <>
                <div>
                  <label className="block text-sm font-medium required">Screen Size</label>
                  <select
                    name="diagonal"
                    value={editedProduct.diagonal || ''}
                    onChange={handleInputChange}
                    className={`w-full select select-bordered ${errors.diagonal ? 'select-error' : ''}`}
                    required
                  >
                    <option value="">Select Size</option>
                    <option value="32">32"</option>
                    <option value="43">43"</option>
                    <option value="50">50"</option>
                    <option value="55">55"</option>
                    <option value="65">65"</option>
                    <option value="75">75"</option>
                    <option value="85">85"</option>
                  </select>
                  {errors.diagonal && <p className="mt-1 text-sm text-red-500">{errors.diagonal}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium required">Resolution</label>
                  <select
                    name="resolution"
                    value={editedProduct.resolution || ''}
                    onChange={handleInputChange}
                    className={`w-full select select-bordered ${errors.resolution ? 'select-error' : ''}`}
                    required
                  >
                    <option value="">Select Resolution</option>
                    <option value="HD">HD (1366x768)</option>
                    <option value="Full HD">Full HD (1920x1080)</option>
                    <option value="4K">4K Ultra HD (3840x2160)</option>
                    <option value="8K">8K (7680x4320)</option>
                  </select>
                  {errors.resolution && <p className="mt-1 text-sm text-red-500">{errors.resolution}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium">Refresh Rate</label>
                  <select
                    name="refreshRate"
                    value={editedProduct.refreshRate || ''}
                    onChange={handleInputChange}
                    className="w-full select select-bordered"
                  >
                    <option value="">Select Refresh Rate</option>
                    <option value="60Hz">60Hz</option>
                    <option value="100Hz">100Hz</option>
                    <option value="120Hz">120Hz</option>
                    <option value="144Hz">144Hz</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium required">Display Type</label>
                  <select
                    name="displayType"
                    value={editedProduct.displayType || ''}
                    onChange={handleInputChange}
                    className={`w-full select select-bordered ${errors.displayType ? 'select-error' : ''}`}
                    required
                  >
                    <option value="">Select Display Type</option>
                    <option value="LED">LED</option>
                    <option value="QLED">QLED</option>
                    <option value="OLED">OLED</option>
                    <option value="Mini LED">Mini LED</option>
                  </select>
                  {errors.displayType && <p className="mt-1 text-sm text-red-500">{errors.displayType}</p>}
                </div>
              </>
            )}

            {/* Audio-specific fields */}
            {isAudio && (
              <>
                <div>
                  <label className="block text-sm font-medium required">Product Type</label>
                  <select
                    name="subtype"
                    value={editedProduct.subtype || ''}
                    onChange={handleInputChange}
                    className={`w-full select select-bordered ${errors.subtype ? 'select-error' : ''}`}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="headphones">Headphones</option>
                    <option value="earbuds">Earbuds</option>
                    <option value="speakers">Speakers</option>
                    <option value="soundbar">Soundbar</option>
                  </select>
                  {errors.subtype && <p className="mt-1 text-sm text-red-500">{errors.subtype}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium">Connectivity</label>
                  <select
                    name="connectivity"
                    value={editedProduct.connectivity || ''}
                    onChange={handleInputChange}
                    className="w-full select select-bordered"
                  >
                    <option value="">Select Connectivity</option>
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                    <option value="Bluetooth">Bluetooth</option>
                    <option value="Multiple">Multiple</option>
                  </select>
                </div>
                
                {(editedProduct.connectivity === 'Wireless' || editedProduct.connectivity === 'Bluetooth') && (
                  <div>
                    <label className="block text-sm font-medium">Battery Life</label>
                    <input
                      type="text"
                      name="batteryLife"
                      value={editedProduct.batteryLife || ''}
                      onChange={handleInputChange}
                      className="w-full input input-bordered"
                      placeholder="e.g. Up to 30 hours"
                    />
                  </div>
                )}
                
                {editedProduct.subtype === 'speakers' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium">Power Output</label>
                      <input
                        type="text"
                        name="power"
                        value={editedProduct.power || ''}
                        onChange={handleInputChange}
                        className="w-full input input-bordered"
                        placeholder="e.g. 100W"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium">Channels</label>
                      <input
                        type="text"
                        name="channels"
                        value={editedProduct.channels || ''}
                        onChange={handleInputChange}
                        className="w-full input input-bordered"
                        placeholder="e.g. 2.1, 5.1"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Mobile-specific fields */}
            {isMobile && (
              <div>
                <label className="block text-sm font-medium required">Memory</label>
                <input
                  type="text"
                  name="memory"
                  value={editedProduct.memory || ''}
                  onChange={handleInputChange}
                  className={`w-full input input-bordered ${errors.memory ? 'input-error' : ''}`}
                  placeholder="e.g. 128GB"
                  required
                />
                {errors.memory && <p className="mt-1 text-sm text-red-500">{errors.memory}</p>}
              </div>
            )}

            {/* Laptop-specific fields */}
            {isLaptop && (
              <div className="space-y-4">
                <h4 className="font-medium">Laptop Specifications</h4>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {editedProduct.brand === 'Apple' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium required">Chip</label>
                        <select
                          name="processor"
                          value={editedProduct.processor || ''}
                          onChange={handleInputChange}
                          className={`w-full select select-bordered ${errors.processor ? 'select-error' : ''}`}
                          required
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
                          <option value="Apple M4">Apple M4</option>
                          <option value="Apple M4 Pro">Apple M4 Pro</option>
                          <option value="Apple M4 Max">Apple M4 Max</option>
                          <option value="Intel Core i5">Intel Core i5</option>
                          <option value="Intel Core i7">Intel Core i7</option>
                          <option value="Intel Core i9">Intel Core i9</option>
                        </select>
                        {errors.processor && <p className="mt-1 text-sm text-red-500">{errors.processor}</p>}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium required">Processor</label>
                      <input
                        type="text"
                        name="processor"
                        value={editedProduct.processor || ''}
                        onChange={handleInputChange}
                        className={`w-full input input-bordered ${errors.processor ? 'input-error' : ''}`}
                        placeholder="e.g. Intel Core i7-11800H"
                        required
                      />
                      {errors.processor && <p className="mt-1 text-sm text-red-500">{errors.processor}</p>}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium required">RAM</label>
                    <input
                      type="text"
                      name="ram"
                      value={editedProduct.ram || ''}
                      onChange={handleInputChange}
                      className={`w-full input input-bordered ${errors.ram ? 'input-error' : ''}`}
                      placeholder="e.g. 16GB DDR4"
                      required
                    />
                    {errors.ram && <p className="mt-1 text-sm text-red-500">{errors.ram}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium required">Storage</label>
                    <input
                      type="text"
                      name="storageType"
                      value={editedProduct.storageType || ''}
                      onChange={handleInputChange}
                      className={`w-full input input-bordered ${errors.storageType ? 'input-error' : ''}`}
                      placeholder="e.g. 512GB SSD"
                      required
                    />
                    {errors.storageType && <p className="mt-1 text-sm text-red-500">{errors.storageType}</p>}
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
                        <option value="macOS">macOS</option>
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

            <div>
              <label className="block text-sm font-medium required">Color</label>
              <input
                type="text"
                name="color"
                value={editedProduct.color || ''}
                onChange={handleInputChange}
                className={`w-full input input-bordered ${errors.color ? 'input-error' : ''}`}
                placeholder="e.g. Steel Gray"
                required
              />
              {errors.color && <p className="mt-1 text-sm text-red-500">{errors.color}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium required">Price (NOK)</label>
              <input
                type="number"
                name="price"
                value={editedProduct.price || ''}
                onChange={handleInputChange}
                className={`w-full input input-bordered ${errors.price ? 'input-error' : ''}`}
                placeholder="e.g. 4999"
                min="0"
                step="1"
                required
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium required">Description</label>
              <textarea
                name="description"
                value={editedProduct.description || ''}
                onChange={handleInputChange}
                className={`w-full textarea textarea-bordered ${errors.description ? 'textarea-error' : ''}`}
                rows={4}
                placeholder="Product description"
                required
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
            </div>

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
                className={`w-full input input-bordered ${errors.image ? 'input-error' : ''}`}
                placeholder="Image URL"
                required
              />
              {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isLoading}
              className={`px-4 py-2 ${currentTheme === 'dark' ? 'bg-[#95c672] text-gray-900 hover:bg-[#7fb356]' : 'bg-[#003D2D] text-white hover:bg-[#005040]'} rounded disabled:opacity-50`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
