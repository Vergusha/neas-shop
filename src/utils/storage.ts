import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../firebaseConfig';

const storage = getStorage(app);

// Добавляем конфигурацию CORS
const storageConfig = {
  customDomain: process.env.REACT_APP_STORAGE_CUSTOM_DOMAIN,
  cors: {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 3600
  }
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  try {
    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Создаем имя файла с временной меткой
    const timestamp = Date.now();
    const filename = `avatars/${userId}/${timestamp}_${file.name}`;
    
    // Создаем metadata для файла
    const metadata = {
      contentType: file.type,
      cacheControl: 'public,max-age=3600',
      customMetadata: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS'
      }
    };

    // Создаем reference в Storage
    const fileRef = storageRef(storage, filename);
    
    // Загружаем файл с metadata
    const snapshot = await uploadBytes(fileRef, file, metadata);
    
    // Получаем URL для загруженного файла
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
    throw new Error('Failed to upload avatar');
  }
};

// Добавляем функцию для удаления старого аватара
export const deleteOldAvatar = async (oldAvatarUrl: string) => {
  try {
    if (!oldAvatarUrl) return;
    
    const oldAvatarRef = storageRef(storage, oldAvatarUrl);
    await deleteObject(oldAvatarRef);
  } catch (error) {
    console.error('Error deleting old avatar:', error);
  }
};
