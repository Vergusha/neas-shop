import React, { useState } from 'react';
import { collection, addDoc, getFirestore } from 'firebase/firestore';

interface ProductForm {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  // Mobile specific
  memory?: string;
  color?: string;
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Data validation
      if (!product.name?.trim() || !product.description?.trim() || product.price <= 0) {
        throw new Error('Please fill in all required fields with valid values');
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

      const productData = {
        ...product,
        image: finalImageUrl,
        createdAt: new Date().toISOString(),
        searchKeywords: generateSearchKeywords(product.name),
        clickCount: 0,
        price: Math.abs(Number(product.price)),
        updatedAt: new Date().toISOString(),
        filterCategories: {
          brand: product.brand.toLowerCase(),
          memory: product.memory?.toLowerCase() || '',
          color: product.color?.toLowerCase() || '',
        },
        brandFilter: product.brand.toLowerCase(),
        memoryFilter: product.memory?.toLowerCase() || '',
        colorFilter: product.color?.toLowerCase() || ''
      };

      console.log('Добавляем продукт:', productData); // Для отладки

      const collectionRef = collection(db, product.category);
      const docRef = await addDoc(collectionRef, productData);
      
      console.log('Продукт успешно добавлен с ID:', docRef.id);
      
      // Очистка формы после успешного добавления
      setProduct({
        name: '',
        description: '',
        price: 0,
        image: '',
        category: 'mobile',
        brand: '',
      });
      setImageFile(null);
      setImageUrl('');
      
      alert('Товар успешно добавлен!');
      
    } catch (error) {
      console.error('Detailed error:', error);
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
      return (
        <>
          {commonFields}
          <div>
            <label className="block text-sm font-medium text-gray-700">Memory</label>
            <input
              type="text"
              value={product.memory || ''}
              onChange={(e) => setProduct({...product, memory: e.target.value})}
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Camera</label>
            <input
              type="text"
              value={product.camera || ''}
              onChange={(e) => setProduct({...product, camera: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Size</label>
            <input
              type="text"
              value={product.screenSize || ''}
              onChange={(e) => setProduct({...product, screenSize: e.target.value})}
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
        </>
      );
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
  );
};

export default AdminPanel;
