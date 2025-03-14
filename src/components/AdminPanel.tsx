import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface ProductForm {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  memory: string;
  color: string;
}

const AdminPanel: React.FC = () => {
  const [product, setProduct] = useState<ProductForm>({
    name: '',
    description: '',
    price: 0,
    image: '',
    category: 'mobile',
    brand: '',
    memory: '',
    color: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Проверка обязательных полей
      if (!product.name || !product.description || !product.price) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      let imageUrl = product.image;
      
      if (imageFile) {
        try {
          imageUrl = await convertToBase64(imageFile);
        } catch (imageError) {
          console.error('Ошибка при конвертации изображения:', imageError);
          throw new Error('Ошибка при обработке изображения');
        }
      }
      
      // Проверяем, что db определен
      if (!db) {
        throw new Error('База данных не инициализирована');
      }

      const productData = {
        ...product,
        image: imageUrl,
        createdAt: new Date().toISOString(),
        searchKeywords: generateSearchKeywords(product.name),
        clickCount: 0,
        price: Number(product.price), // Убедимся, что цена - число
        updatedAt: new Date().toISOString()
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
        memory: '',
        color: ''
      });
      setImageFile(null);
      
      alert('Товар успешно добавлен!');
      
    } catch (error) {
      console.error('Подробная ошибка:', error);
      alert(error instanceof Error ? error.message : 'Произошла ошибка при добавлении товара');
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Админ-панель</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Категория</label>
            <select 
              value={product.category}
              onChange={(e) => setProduct({...product, category: e.target.value})}
              className="input input-bordered w-full"
              required
            >
              <option value="mobile">Мобильные</option>
              <option value="tv">ТВ</option>
              <option value="gaming">Игры</option>
              <option value="smart-home">Умный дом</option>
              <option value="data">Аксессуары</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Название товара</label>
            <input
              type="text"
              value={product.name}
              onChange={(e) => setProduct({...product, name: e.target.value})}
              className="input input-bordered w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Описание</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({...product, description: e.target.value})}
              className="textarea textarea-bordered w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Цена (NOK)</label>
            <input
              type="number"
              value={product.price}
              onChange={(e) => setProduct({...product, price: Number(e.target.value)})}
              className="input input-bordered w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Изображение</label>
            <input
              type="file"
              onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="file-input file-input-bordered w-full"
              accept="image/*"
            />
            {imageFile && (
              <div className="mt-2">
                <p>Выбран файл: {imageFile.name}</p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Бренд</label>
            <input
              type="text"
              value={product.brand}
              onChange={(e) => setProduct({...product, brand: e.target.value})}
              className="input input-bordered w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Память</label>
            <input
              type="text"
              value={product.memory}
              onChange={(e) => setProduct({...product, memory: e.target.value})}
              className="input input-bordered w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Цвет</label>
            <input
              type="text"
              value={product.color}
              onChange={(e) => setProduct({...product, color: e.target.value})}
              className="input input-bordered w-full"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="loading loading-spinner"></span> : 'Добавить товар'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPanel;
