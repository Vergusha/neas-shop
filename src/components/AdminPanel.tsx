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

  // Обновите функцию handleSubmit, когда добавляете данные для игровой периферии
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  
  try {
    // Data validation
    if (!product.brand || !product.model) {
      throw new Error('Please fill in all required fields');
    }

    // For gaming peripherals, ensure device type is selected
    if (product.category === 'gaming' && !product.deviceType) {
      throw new Error('Please select a device type');
    }

    // Generate product ID
    const productId = generateProductId(product);
    console.log('Generated Product ID:', productId);

    // Generate product name based on category
    let productName = '';
    if (product.category === 'gaming') {
      productName = `${product.brand} ${product.model} ${product.deviceType || ''} ${product.color}`;
    } else {
      productName = `${product.brand} ${product.model} ${product.memory}`;
    }

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

    // Создаем базовый объект с данными продукта
    const productData: Record<string, any> = {
      id: productId,
      name: productName,
      brand: product.brand,
      model: product.model,
      modelNumber: product.modelNumber || null, // null вместо undefined
      memory: product.memory || '', // Пустая строка вместо undefined
      color: product.color || '', // Пустая строка вместо undefined
      description: product.description || '', // Пустая строка вместо undefined
      price: Math.abs(Number(product.price)),
      image: finalImageUrl,
      createdAt: new Date().toISOString(),
      searchKeywords: generateSearchKeywords(productName, product.modelNumber),
      clickCount: 0,
      updatedAt: new Date().toISOString(),
      // Фильтры для поиска
      filterCategories: {
        brand: product.brand.toLowerCase(),
        memory: (product.memory || '').toLowerCase(),
        color: (product.color || '').toLowerCase(),
      }
    };

    // Add gaming peripherals specific fields if applicable
    if (product.category === 'gaming') {
      // Добавляем только определенные поля, заменяя undefined на null или пустые строки
      productData.deviceType = product.deviceType || '';
      productData.connectivity = product.connectivity || '';
      productData.compatibleWith = product.compatibleWith || '';
      productData.rgbLighting = product.rgbLighting === true ? true : false; // Убедитесь, что это boolean
      productData.switchType = product.switchType || '';
      productData.dpi = product.dpi || '';
      productData.batteryLife = product.batteryLife || '';
      productData.weight = product.weight || '';
    }

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
    
    if (product.category === 'gaming') {
      const connectivity = product.connectivity ? formatForUrl(product.connectivity) : 'standard';
      const version = formatForUrl(product.memory); // memory field is used for version/series
      const color = formatForUrl(product.color);
      
      return `${brand}-${model}-${connectivity}-${version}-${color}`;
    }
    
    // Original logic for other product types
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
          className="w-full input input-bordered"
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
          className="w-full input input-bordered"
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
          className="w-full input input-bordered"
          placeholder="e.g. XT2341-1"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Memory</label>
        <input
          type="text"
          value={product.memory}
          onChange={(e) => setProduct({...product, memory: e.target.value})}
          className="w-full input input-bordered"
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
          className="w-full input input-bordered"
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
          className="w-full input input-bordered"
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
          className="w-full textarea textarea-bordered"
          placeholder="Product description"
          required
        />
      </div>

      {/* Preview Generated ID с примером */}
      <div className="p-4 mt-4 bg-gray-100 rounded-lg">
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

  const renderGamingFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Бренд</label>
        <input
          type="text"
          value={product.brand}
          onChange={(e) => setProduct({...product, brand: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: Logitech, Razer, HyperX"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Модель</label>
        <input
          type="text"
          value={product.model}
          onChange={(e) => setProduct({...product, model: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: G Pro X, BlackWidow V3"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Модельный номер</label>
        <input
          type="text"
          value={product.modelNumber}
          onChange={(e) => setProduct({...product, modelNumber: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: 920-009392"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Тип устройства</label>
        <select
          value={product.deviceType || ''}
          onChange={(e) => setProduct({...product, deviceType: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Выберите тип</option>
          <option value="Mouse">Мышь</option>
          <option value="Keyboard">Клавиатура</option>
          <option value="Headset">Гарнитура</option>
          <option value="Controller">Геймпад/Контроллер</option>
          <option value="Chair">Кресло</option>
          <option value="Mousepad">Коврик для мыши</option>
          <option value="Speakers">Колонки</option>
          <option value="Webcam">Веб-камера</option>
          <option value="Microphone">Микрофон</option>
          <option value="Other">Другое</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Подключение</label>
        <select
          value={product.connectivity || ''}
          onChange={(e) => setProduct({...product, connectivity: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Выберите тип подключения</option>
          <option value="Wired">Проводное</option>
          <option value="Wireless">Беспроводное</option>
          <option value="Bluetooth">Bluetooth</option>
          <option value="N/A">Не применимо</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Совместимость</label>
        <select
          value={product.compatibleWith || ''}
          onChange={(e) => setProduct({...product, compatibleWith: e.target.value})}
          className="w-full select select-bordered"
        >
          <option value="">Выберите совместимость</option>
          <option value="PC">PC</option>
          <option value="Mac">Mac</option>
          <option value="PC/Mac">PC/Mac</option>
          <option value="PlayStation">PlayStation</option>
          <option value="Xbox">Xbox</option>
          <option value="Switch">Nintendo Switch</option>
          <option value="Multi">Мультиплатформа</option>
        </select>
      </div>

      {/* Дополнительные поля для мышей */}
      {product.deviceType === 'Mouse' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">DPI</label>
          <input
            type="text"
            value={product.dpi || ''}
            onChange={(e) => setProduct({...product, dpi: e.target.value})}
            className="w-full input input-bordered"
            placeholder="например: 16000"
          />
        </div>
      )}

      {/* Дополнительные поля для клавиатур */}
      {product.deviceType === 'Keyboard' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Тип переключателей</label>
          <input
            type="text"
            value={product.switchType || ''}
            onChange={(e) => setProduct({...product, switchType: e.target.value})}
            className="w-full input input-bordered"
            placeholder="например: Cherry MX Red, Razer Green"
          />
        </div>
      )}

      {/* Поля для беспроводных устройств */}
      {(product.connectivity === 'Wireless' || product.connectivity === 'Bluetooth') && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Время работы от батареи</label>
          <input
            type="text"
            value={product.batteryLife || ''}
            onChange={(e) => setProduct({...product, batteryLife: e.target.value})}
            className="w-full input input-bordered"
            placeholder="например: До 40 часов"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Вес</label>
        <input
          type="text"
          value={product.weight || ''}
          onChange={(e) => setProduct({...product, weight: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: 80 г"
        />
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="rgbLighting"
          checked={product.rgbLighting || false}
          onChange={(e) => setProduct({...product, rgbLighting: e.target.checked})}
          className="checkbox"
        />
        <label htmlFor="rgbLighting" className="text-sm font-medium text-gray-700">
          RGB-подсветка
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 required">Версия/Серия</label>
        <input
          type="text"
          value={product.memory}
          onChange={(e) => setProduct({...product, memory: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: 2023, Mk2, Series 2"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Цвет</label>
        <input
          type="text"
          value={product.color}
          onChange={(e) => setProduct({...product, color: e.target.value})}
          className="w-full input input-bordered"
          placeholder="например: Черный, Белый, Красный"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 required">Цена (NOK)</label>
        <input
          type="number"
          value={product.price}
          onChange={(e) => setProduct({...product, price: Math.max(0, Number(e.target.value))})}
          className="w-full input input-bordered"
          placeholder="например: 1299"
          min="0"
          step="1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 required">Описание</label>
        <textarea
          value={product.description}
          onChange={(e) => setProduct({...product, description: e.target.value})}
          className="w-full textarea textarea-bordered"
          placeholder="Описание продукта"
          required
        />
      </div>

      {/* Preview Generated ID */}
      <div className="p-4 mt-4 bg-gray-100 rounded-lg">
        <label className="block text-sm font-medium text-gray-700">Generated Product ID:</label>
        <div className="mt-1 text-sm text-gray-900">
          {generateProductId(product) || 'Example: logitech-gpro-wireless-2022-black'}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Format: brand-model-connectivity-version-color
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
            className="w-full input input-bordered"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={product.description}
            onChange={(e) => setProduct({...product, description: e.target.value})}
            className="w-full textarea textarea-bordered"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (NOK)</label>
          <input
            type="number"
            value={product.price}
            onChange={(e) => setProduct({...product, price: Number(e.target.value)})}
            className="w-full input input-bordered"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand</label>
          <input
            type="text"
            value={product.brand}
            onChange={(e) => setProduct({...product, brand: e.target.value})}
            className="w-full input input-bordered"
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
              className="w-full input input-bordered"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Resolution</label>
            <input
              type="text"
              value={product.resolution || ''}
              onChange={(e) => setProduct({...product, resolution: e.target.value})}
              className="w-full input input-bordered"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Format</label>
            <input
              type="text"
              value={product.screenFormat || ''}
              onChange={(e) => setProduct({...product, screenFormat: e.target.value})}
              className="w-full input input-bordered"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <input
              type="text"
              value={product.color || ''}
              onChange={(e) => setProduct({...product, color: e.target.value})}
              className="w-full input input-bordered"
              required
            />
          </div>
        </>
      );
    }

    if (product.category === 'gaming') {
      return renderGamingFields();
    }

    return commonFields;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <button
          onClick={handleUpdateSearchKeywords}
          className="btn btn-warning btn-sm"
        >
          Update All Search Keywords
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 cursor-pointer" 
           onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}>
        <h2 className="text-xl font-bold">Admin Panel</h2>
        {isPanelCollapsed ? <FaChevronDown /> : <FaChevronUp />}
      </div>
      
      {!isPanelCollapsed && (
        <>
          {/* Add Product Form */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add New Product</h3>
              <select 
                value={product.category}
                onChange={(e) => setProduct({...product, category: e.target.value})}
                className="select select-bordered select-sm"
                required
              >
                <option value="mobile">Mobile Phones</option>
                <option value="tv">TVs</option>
                <option value="gaming">Gaming</option>
              </select>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Render dynamic fields based on category */}
                {renderFields()}

                {/* Image upload section */}
                <div className="lg:col-span-3">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Image</label>
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
                      className="w-full file-input file-input-sm file-input-bordered"
                      accept="image/*"
                    />
                  ) : (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full input input-sm input-bordered"
                      placeholder="https://example.com/image.jpg"
                    />
                  )}
                </div>
                
                <div className="lg:col-span-3">
                  <button 
                    type="submit" 
                    className="w-full btn btn-primary btn-sm"
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
            <div className="flex items-center justify-between mb-4">
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
                  <option value="gaming">Gaming</option>
                </select>
              )}
            </div>

            {!isManageCollapsed && (
              <div className="overflow-x-auto">
                <table className="table w-full table-sm table-zebra">
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
                            className="object-contain w-12 h-12"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-full max-w-md p-6 bg-white rounded-lg">
                <h3 className="mb-4 text-lg font-bold">Delete Product</h3>
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
