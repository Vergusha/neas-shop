import React, { useState, useEffect } from 'react';
import { collection, getFirestore, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import EditProductModal from './EditProductModal';
import { db } from '../firebaseConfig';
import { ProductForm, NewProductForm } from '../types/product';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { updateAllProductsSearchKeywords } from '../utils/updateSearchKeywords';
import { updatePopularProducts } from '../utils/updatePopularProducts';
import { updateGamingKeywords } from '../utils/updateGamingKeywords';
import { Link } from 'react-router-dom';

type ColumnConfig = {
  header: string;
  key: string;
  width?: string;
  render?: (product: any) => React.ReactNode;
};

const commonColumns: ColumnConfig[] = [
  { header: 'Image', key: 'image', width: 'w-16', render: (product) => (
    <img src={product.image} alt={product.name} className="object-contain w-12 h-12" />
  )},
  { header: 'Brand', key: 'brand' },
  { header: 'Price', key: 'price', render: (product) => `${product.price} NOK` },
];

const categoryColumns: Record<string, ColumnConfig[]> = {
  mobile: [
    ...commonColumns,
    { header: 'Model', key: 'model' },
    { header: 'Memory', key: 'memory' },
    { header: 'Color', key: 'color' },
  ],
  laptops: [
    ...commonColumns,
    { header: 'Model', key: 'model' },
    { header: 'Processor', key: 'processor' },
    { header: 'RAM', key: 'ram' },
    { header: 'Storage', key: 'storageType' },
    { header: 'Color', key: 'color' },
  ],
  gaming: [
    ...commonColumns,
    { header: 'Model', key: 'model' },
    { header: 'Type', key: 'deviceType' },
    { header: 'Connectivity', key: 'connectivity' },
    { header: 'Color', key: 'color' },
  ],
  tv: [
    ...commonColumns,
    { header: 'Model', key: 'model' },
    { header: 'Screen Size', key: 'diagonal' },
    { header: 'Resolution', key: 'resolution' },
    { header: 'Display Type', key: 'displayType' },
  ],
  audio: [
    ...commonColumns,
    { header: 'Model', key: 'model' },
    { header: 'Type', key: 'subtype' },
    { header: 'Connectivity', key: 'connectivity' },
    { header: 'Color', key: 'color' },
  ],
};

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
    processor: '',
    graphicsCard: '',
    screenSize: '',
    storageType: '',
    ram: '',
    operatingSystem: '',
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
      if (!product.brand || !product.model) {
        throw new Error('Please fill in all required fields');
      }

      if (product.category === 'gaming' && !product.deviceType) {
        throw new Error('Please select a device type');
      }

      const productId = generateProductId(product);
      console.log('Generated Product ID:', productId);

      let productName = '';
      if (product.category === 'gaming') {
        productName = `${product.brand} ${product.model} ${product.deviceType || ''} ${product.color}`;
      } else if (product.category === 'tv') {
        productName = `${product.brand} ${product.model} ${product.diagonal}" ${product.resolution}`;
      } else if (product.category === 'audio') {
        productName = `${product.brand} ${product.model} ${product.subtype} ${product.color}`;
      } else {
        productName = `${product.brand} ${product.model} ${product.memory || ''}`;
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

      const productData: Record<string, any> = {
        id: productId,
        name: productName,
        brand: product.brand,
        model: product.model,
        modelNumber: product.modelNumber || null,
        color: product.color || '',
        description: product.description || '',
        price: Math.abs(Number(product.price)),
        image: finalImageUrl,
        createdAt: new Date().toISOString(),
        searchKeywords: generateSearchKeywords(productName, product.modelNumber),
        clickCount: 0,
        updatedAt: new Date().toISOString(),
        filterCategories: {
          brand: product.brand.toLowerCase(),
          color: (product.color || '').toLowerCase(),
        }
      };

      // Добавляем память только если это нужная категория
      if (product.category === 'mobile' || product.category === 'laptops' || product.category === 'gaming') {
        productData.memory = product.memory || '';
        productData.filterCategories.memory = (product.memory || '').toLowerCase();
      }

      if (product.category === 'gaming') {
        productData.deviceType = product.deviceType || '';
        productData.connectivity = product.connectivity || '';
        productData.compatibleWith = product.compatibleWith || '';
        productData.rgbLighting = product.rgbLighting === true ? true : false;
        productData.switchType = product.switchType || '';
        productData.dpi = product.dpi || '';
        productData.batteryLife = product.batteryLife || '';
        productData.weight = product.weight || '';
      }

      if (product.category === 'laptops') {
        productData.processor = product.processor || '';
        productData.graphicsCard = product.graphicsCard || '';
        productData.screenSize = product.screenSize || '';
        productData.storageType = product.storageType || '';
        productData.ram = product.ram || '';
        productData.operatingSystem = product.operatingSystem || '';
      }

      if (product.category === 'tv') {
        productData.diagonal = product.diagonal || '';
        productData.resolution = product.resolution || '';
        productData.refreshRate = product.refreshRate || '';
        productData.displayType = product.displayType || '';
      }

      if (product.category === 'audio') {
        productData.subtype = product.subtype || '';
        productData.connectivity = product.connectivity || '';
        if (product.batteryLife) productData.batteryLife = product.batteryLife;
        if (product.power) productData.power = product.power;
        if (product.channels) productData.channels = product.channels;
      }

      const collectionRef = collection(db, product.category);
      const docRef = doc(collectionRef, productId);
      await setDoc(docRef, productData);
      
      console.log('Product successfully added with ID:', productId);
      
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
        processor: '',
        graphicsCard: '',
        screenSize: '',
        storageType: '',
        ram: '',
        operatingSystem: '',
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
    const words = name.toLowerCase().split(' ');
    for (const word of words) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
    for (let i = 0; i < words.length; i++) {
      let combined = '';
      for (let j = i; j < words.length; j++) {
        combined += words[j] + ' ';
        keywords.push(combined.trim());
      }
    }
    if (modelNumber) {
      keywords.push(modelNumber.toLowerCase());
      const cleanModelNumber = modelNumber.toLowerCase().replace(/[\s-]/g, '');
      if (cleanModelNumber !== modelNumber.toLowerCase()) {
        keywords.push(cleanModelNumber);
      }
    }
    return Array.from(new Set(keywords));
  };

  const formatForUrl = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .trim();
  };

  const generateProductId = (product: NewProductForm): string => {
    const brand = formatForUrl(product.brand);
    const model = formatForUrl(product.model);
    if (product.category === 'gaming') {
      const connectivity = product.connectivity ? formatForUrl(product.connectivity) : 'standard';
      const version = formatForUrl(product.memory);
      const color = formatForUrl(product.color);
      return `${brand}-${model}-${connectivity}-${version}-${color}`;
    }
    if (product.category === 'laptops') {
      if (product.brand === 'Apple') {
        const processor = formatForUrl(product.processor || '');
        const ram = formatForUrl(product.ram || '');
        const storage = formatForUrl(product.storageType || '');
        const screenSize = formatForUrl(product.screenSize || '');
        const color = formatForUrl(product.color || '');
        const year = product.modelNumber || '';
        return `apple-${model}-${year}-${processor}-${ram}-${storage}-${screenSize}-${color}`;
      }
      const processor = formatForUrl(product.processor || '');
      const ram = formatForUrl(product.ram || '');
      const storageType = formatForUrl(product.storageType || '');
      const color = formatForUrl(product.color || '');
      return `${brand}-${model}-${processor}-${ram}-${storageType}-${color}`;
    }
    if (product.category === 'tv') {
      const diagonal = product.diagonal ? formatForUrl(product.diagonal) : '';
      const model = formatForUrl(product.model); // Include model in TV ID generation
      const resolution = formatForUrl(product.resolution || '');
      const displayType = formatForUrl(product.displayType || '');
      const modelNumber = product.modelNumber ? `-${formatForUrl(product.modelNumber)}` : '';
      
      return `${brand}-${model}-${diagonal}-${resolution}-${displayType}-tv${modelNumber}`;
    }
    if (product.category === 'audio') {
      const connectivity = product.connectivity ? formatForUrl(product.connectivity) : '';
      const type = product.subtype ? formatForUrl(product.subtype) : '';
      const color = formatForUrl(product.color);
      const modelNumber = product.modelNumber ? `-${formatForUrl(product.modelNumber)}` : '';
      const typeMap: { [key: string]: string } = {
        'headphones': 'headphones',
        'earbuds': 'earbuds',
        'speakers': 'speakers',
        'soundbar': 'soundbar'
      };
      
      const englishType = typeMap[type] || type;
      return `${brand}-${model}${modelNumber}-${connectivity}-${englishType}-${color}`;
    }
    const modelNumber = product.modelNumber ? `-${formatForUrl(product.modelNumber)}` : '';
    const memory = formatForUrl(product.memory)
      .replace('gb', '')
      + 'gb';
    const color = formatForUrl(product.color);
    return `${brand}-${model}${modelNumber}-${memory}-${color}`;
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !productToDelete.id) return;
    try {
      const productId = productToDelete.id;
      const productRef = doc(db, selectedCategory, productId);
      await deleteDoc(productRef);
      setProducts(prevProducts => 
        prevProducts.filter(p => p.id !== productToDelete.id)
      );
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      alert('Product successfully deleted!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleEditProduct = (product: ProductForm) => {
    if (!product.id) return;
    setSelectedProduct({
      ...product,
      id: product.id,
      category: selectedCategory
    } as ProductForm);
    setIsEditModalOpen(true);
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

  const handleUpdatePopularProducts = async () => {
    try {
      if (window.confirm('Are you sure you want to update popular products?')) {
        setIsLoading(true);
        await updatePopularProducts();
        alert('Popular products updated successfully!');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error updating popular products:', error);
      alert('Failed to update popular products');
      setIsLoading(false);
    }
  };

  const handleUpdateGamingKeywords = async () => {
    try {
      if (window.confirm('Are you sure you want to update keywords for gaming products?')) {
        setIsLoading(true);
        await updateGamingKeywords();
        alert('Gaming product keywords updated successfully!');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error updating gaming keywords:', error);
      alert('Failed to update gaming keywords');
      setIsLoading(false);
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
          placeholder="e.g. 12999"
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

  const renderLaptopFields = () => {
    return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 required">Brand</label>
          <select
            value={product.brand}
            onChange={(e) => setProduct({...product, brand: e.target.value})}
            className="w-full select select-bordered"
            required
          >
            <option value="">Select Brand</option>
            <option value="Apple">Apple (MacBook)</option>
            <option value="Dell">Dell</option>
            <option value="HP">HP</option>
            <option value="Lenovo">Lenovo</option>
            <option value="Asus">Asus</option>
            <option value="Acer">Acer</option>
            <option value="MSI">MSI</option>
            <option value="Microsoft">Microsoft</option>
            <option value="Samsung">Samsung</option>
            <option value="Other">Other</option>
          </select>
        </div>
        {product.brand === 'Apple' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Model</label>
              <select
                value={product.model}
                onChange={(e) => setProduct({...product, model: e.target.value})}
                className="w-full select select-bordered"
                required
              >
                <option value="">Select Model</option>
                <option value="MacBook Air">MacBook Air</option>
                <option value="MacBook Pro">MacBook Pro</option>
                <option value="MacBook">MacBook</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model Number</label>
              <input
                type="text"
                value={product.modelNumber}
                onChange={(e) => setProduct({...product, modelNumber: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. A2338"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Chip</label>
              <select
                value={product.processor || ''}
                onChange={(e) => setProduct({...product, processor: e.target.value})}
                className="w-full select select-bordered"
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
                <option value="Apple M4 Ultra">Apple M4 Ultra</option>
                <option value="Intel Core i5">Intel Core i5</option>
                <option value="Intel Core i7">Intel Core i7</option>
                <option value="Intel Core i9">Intel Core i9</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Model Year</label>
              <select
                value={product.modelNumber || ''}
                onChange={(e) => setProduct({...product, modelNumber: e.target.value})}
                className="w-full select select-bordered"
                required
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Graphics Card</label>
              <input
                type="text"
                value={product.graphicsCard}
                onChange={(e) => setProduct({...product, graphicsCard: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. Apple Integrated Graphics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Screen Size</label>
              <select
                value={product.screenSize || ''}
                onChange={(e) => setProduct({...product, screenSize: e.target.value})}
                className="w-full select select-bordered"
                required
              >
                <option value="">Select Screen Size</option>
                <option value="13 inch">13 inch</option>
                <option value="14 inch">14 inch</option>
                <option value="15 inch">15 inch</option>
                <option value="16 inch">16 inch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Storage Type</label>
              <select
                value={product.storageType || ''}
                onChange={(e) => setProduct({...product, storageType: e.target.value})}
                className="w-full select select-bordered"
                required
              >
                <option value="">Select Storage</option>
                <option value="256GB SSD">256GB SSD</option>
                <option value="512GB SSD">512GB SSD</option>
                <option value="1TB SSD">1TB SSD</option>
                <option value="2TB SSD">2TB SSD</option>
                <option value="4TB SSD">4TB SSD</option>
                <option value="8TB SSD">8TB SSD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">RAM</label>
              <select
                value={product.ram || ''}
                onChange={(e) => setProduct({...product, ram: e.target.value})}
                className="w-full select select-bordered"
                required
              >
                <option value="">Select RAM</option>
                <option value="8GB">8GB</option>
                <option value="16GB">16GB</option>
                <option value="24GB">24GB</option>
                <option value="32GB">32GB</option>
                <option value="48GB">48GB</option>
                <option value="64GB">64GB</option>
                <option value="96GB">96GB</option>
                <option value="128GB">128GB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Operating System</label>
              <select
                value={product.operatingSystem || ''}
                onChange={(e) => setProduct({...product, operatingSystem: e.target.value})}
                className="w-full select select-bordered"
                required
              >
                <option value="">Select OS</option>
                <option value="macOS Monterey">macOS Monterey</option>
                <option value="macOS Ventura">macOS Ventura</option>
                <option value="macOS Sonoma">macOS Sonoma</option>
                <option value="macOS Sequoia">macOS Sequoia</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Model</label>
              <input
                type="text"
                value={product.model}
                onChange={(e) => setProduct({...product, model: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. XPS 15"
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
                placeholder="e.g. 9500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Processor</label>
              <input
                type="text"
                value={product.processor}
                onChange={(e) => setProduct({...product, processor: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. Intel Core i7-11800H"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Graphics Card</label>
              <input
                type="text"
                value={product.graphicsCard}
                onChange={(e) => setProduct({...product, graphicsCard: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. NVIDIA RTX 3060"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Screen Size</label>
              <input
                type="text"
                value={product.screenSize}
                onChange={(e) => setProduct({...product, screenSize: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. 15.6 inch"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Storage Type</label>
              <input
                type="text"
                value={product.storageType}
                onChange={(e) => setProduct({...product, storageType: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. 512GB SSD"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">RAM</label>
              <input
                type="text"
                value={product.ram}
                onChange={(e) => setProduct({...product, ram: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. 16GB DDR4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 required">Operating System</label>
              <input
                type="text"
                value={product.operatingSystem}
                onChange={(e) => setProduct({...product, operatingSystem: e.target.value})}
                className="w-full input input-bordered"
                placeholder="e.g. Windows 11 Home"
                required
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 required">Color</label>
          <input
            type="text"
            value={product.color}
            onChange={(e) => setProduct({...product, color: e.target.value})}
            className="w-full input input-bordered"
            placeholder="e.g. Silver"
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
            placeholder="e.g. 12999"
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
        <div className="p-4 mt-4 bg-gray-100 rounded-lg">
          <label className="block text-sm font-medium text-gray-700">Generated Product ID:</label>
          <div className="mt-1 text-sm text-gray-900">
            {generateProductId(product) || 'Example: dell-xps15-intelcorei7-16gb-512gbssd-silver'}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Format: brand-model-processor-ram-storagetype-color
          </div>
        </div>
      </>
    );
  };

  const renderTVFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Brand</label>
        <input
          type="text"
          value={product.brand}
          onChange={(e) => setProduct({...product, brand: e.target.value})}
          className="w-full input input-bordered"
          placeholder="e.g. Samsung, LG, Sony"
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
          placeholder="e.g. QN90B"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Diagonal</label>
        <select
          value={product.diagonal || ''}
          onChange={(e) => setProduct({...product, diagonal: e.target.value})}
          className="w-full select select-bordered"
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
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Resolution</label>
        <select
          value={product.resolution || ''}
          onChange={(e) => setProduct({...product, resolution: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Resolution</option>
          <option value="HD">HD (1366x768)</option>
          <option value="Full HD">Full HD (1920x1080)</option>
          <option value="4K">4K Ultra HD (3840x2160)</option>
          <option value="8K">8K (7680x4320)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Refresh Rate</label>
        <select
          value={product.refreshRate || ''}
          onChange={(e) => setProduct({...product, refreshRate: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Refresh Rate</option>
          <option value="60Hz">60Hz</option>
          <option value="100Hz">100Hz</option>
          <option value="120Hz">120Hz</option>
          <option value="144Hz">144Hz</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Display Type</label>
        <select
          value={product.displayType || ''}
          onChange={(e) => setProduct({...product, displayType: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Display Type</option>
          <option value="LED">LED</option>
          <option value="QLED">QLED</option>
          <option value="OLED">OLED</option>
          <option value="Mini LED">Mini LED</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Price (NOK)</label>
        <input
          type="number"
          value={product.price}
          onChange={(e) => setProduct({...product, price: Math.max(0, Number(e.target.value))})}
          className="w-full input input-bordered"
          placeholder="e.g. 12999"
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
      <div className="p-4 mt-4 bg-gray-100 rounded-lg">
        <label className="block text-sm font-medium text-gray-700">Generated Product ID:</label>
        <div className="mt-1 text-sm text-gray-900">
          {generateProductId(product) || 'Example: samsung-55-4k-uhd-led-tv-tu7105'}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Format: brand-model-diagonal-resolution-displaytype-tv-modelnumber
        </div>
      </div>
    </>
  );

  const renderAudioFields = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Brand</label>
        <select
          value={product.brand}
          onChange={(e) => setProduct({...product, brand: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Brand</option>
          <option value="JBL">JBL</option>
          <option value="Sony">Sony</option>
          <option value="Bose">Bose</option>
          <option value="Apple">Apple</option>
          <option value="Samsung">Samsung</option>
          <option value="Sennheiser">Sennheiser</option>
          <option value="Beats">Beats</option>
          <option value="Marshall">Marshall</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Model</label>
        <input
          type="text"
          value={product.model}
          onChange={(e) => setProduct({...product, model: e.target.value})}
          className="w-full input input-bordered"
          placeholder="e.g. Tune 520BT, WH-1000XM4"
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
          placeholder="e.g. JBLT520BTBLK"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Product Type</label>
        <select
          value={product.subtype || ''}
          onChange={(e) => setProduct({...product, subtype: e.target.value as any})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Type</option>
          <option value="headphones">Headphones</option>
          <option value="earbuds">Earbuds</option>
          <option value="speakers">Speakers</option>
          <option value="soundbar">Soundbar</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Connectivity</label>
        <select
          value={product.connectivity || ''}
          onChange={(e) => setProduct({...product, connectivity: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Connectivity</option>
          <option value="Wired">Wired</option>
          <option value="Wireless">Wireless</option>
          <option value="Bluetooth">Bluetooth</option>
          <option value="Multiple">Multiple</option>
        </select>
      </div>
      {(product.connectivity === 'Wireless' || product.connectivity === 'Bluetooth') && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Battery Life</label>
          <input
            type="text"
            value={product.batteryLife || ''}
            onChange={(e) => setProduct({...product, batteryLife: e.target.value})}
            className="w-full input input-bordered"
            placeholder="e.g. Up to 30 hours"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Price (NOK)</label>
        <input
          type="number"
          value={product.price}
          onChange={(e) => setProduct({...product, price: Math.max(0, Number(e.target.value))})}
          className="w-full input input-bordered"
          placeholder="e.g. 1299"
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
      {product.subtype === 'speakers' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Power Output</label>
            <input
              type="text"
              value={product.power || ''}
              onChange={(e) => setProduct({...product, power: e.target.value})}
              className="w-full input input-bordered"
              placeholder="e.g. 100W"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Channels</label>
            <input
              type="text"
              value={product.channels || ''}
              onChange={(e) => setProduct({...product, channels: e.target.value})}
              className="w-full input input-bordered"
              placeholder="e.g. 2.1, 5.1"
            />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 required">Color</label>
        <select
          value={product.color}
          onChange={(e) => setProduct({...product, color: e.target.value})}
          className="w-full select select-bordered"
          required
        >
          <option value="">Select Color</option>
          <option value="Black">Black</option>
          <option value="White">White</option>
          <option value="Blue">Blue</option>
          <option value="Red">Red</option>
          <option value="Gray">Gray</option>
          <option value="Pink">Pink</option>
        </select>
      </div>
      <div className="p-4 mt-4 bg-gray-100 rounded-lg">
        <label className="block text-sm font-medium text-gray-700">Generated Product ID:</label>
        <div className="mt-1 text-sm text-gray-900">
          {generateProductId(product) || 'Example: jbl-tune520bt-bluetooth-headphones-black'}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Format: brand-model-connectivity-type-color
        </div>
      </div>
    </>
  );

  const renderFields = () => {
    if (product.category === 'mobile') {
      return renderMobileFields();
    }
    if (product.category === 'tv') {
      return renderTVFields();
    }
    if (product.category === 'gaming') {
      return renderGamingFields();
    }
    if (product.category === 'laptops') {
      return renderLaptopFields();
    }
    if (product.category === 'audio') {
      return renderAudioFields();
    }
    return null;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <button
          onClick={handleUpdateSearchKeywords}
          className="mr-2 btn btn-warning btn-sm"
        >
          Update All Search Keywords
        </button>
        <button
          onClick={handleUpdatePopularProducts}
          className="mr-2 btn btn-info btn-sm"
        >
          Update Popular Products
        </button>
        <button
          onClick={handleUpdateGamingKeywords}
          className="mr-2 btn btn-secondary btn-sm"
        >
          Update Gaming Keywords
        </button>
        <Link 
          to="/admin/debug-keywords"
          className="btn btn-outline btn-sm"
        >
          Debug Keywords
        </Link>
      </div>
      <div className="flex items-center justify-between mb-4 cursor-pointer" 
           onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}>
        <h2 className="text-xl font-bold">Admin Panel</h2>
        {isPanelCollapsed ? <FaChevronDown /> : <FaChevronUp />}
      </div>
      {!isPanelCollapsed && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add New Product</h3>
              <select 
                value={product.category}
                onChange={(e) => setProduct({...product, category: e.target.value as any})}
                className="select select-bordered select-sm"
                required
              >
                <option value="mobile">Mobile Phones</option>
                <option value="tv">TV</option>
                <option value="audio">Audio</option>
                <option value="gaming">Gaming</option>
                <option value="laptops">Laptops</option>
              </select>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {renderFields()}
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
                  <option value="tv">TV</option>
                  <option value="audio">Audio</option>
                  <option value="gaming">Gaming</option>
                  <option value="laptops">Laptops</option>
                </select>
              )}
            </div>
            {!isManageCollapsed && (
              <div className="overflow-x-auto">
                <table className="table w-full table-sm table-zebra">
                  <thead>
                    <tr>
                      {(categoryColumns[selectedCategory] || []).map((column) => (
                        <th key={column.key} className={column.width}>
                          {column.header}
                        </th>
                      ))}
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="hover">
                        {(categoryColumns[selectedCategory] || []).map((column) => (
                          <td key={column.key}>
                            {column.render 
                              ? column.render(product)
                              : product[column.key as keyof typeof product]}
                          </td>
                        ))}
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditProduct(product)}
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
                              Delete
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
          {selectedProduct && selectedProduct.id && (
            <EditProductModal
              product={{...selectedProduct, id: selectedProduct.id}}
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
