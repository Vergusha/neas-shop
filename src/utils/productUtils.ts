import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ProductForm } from '../types/product';

export const findProductCollection = async (productId: string): Promise<{
  collection: string;
  data: ProductForm;
} | null> => {
  const collections = ['laptops', 'gaming', 'tv', 'audio', 'mobile'];
  
  for (const collection of collections) {
    const docRef = doc(db, collection, productId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          collection,
          data: { id: docSnap.id, ...docSnap.data() } as ProductForm
        };
      }
    } catch (error) {
      console.error(`Error checking collection ${collection}:`, error);
    }
  }
  
  return null;
};

export const normalizeProductData = (product: Partial<ProductForm>): ProductForm => {
  return {
    id: product.id || '',
    name: product.name || '',
    brand: product.brand || '',
    model: product.model || '',
    price: typeof product.price === 'number' ? product.price : 0,
    description: product.description || '',
    image: product.image || '',
    category: product.category || '',
    color: product.color || '',
    memory: product.memory || '',
    modelNumber: product.modelNumber || '',
    processor: product.processor || '',
    ram: product.ram || '',
    storageType: product.storageType || '',
    screenSize: product.screenSize || '',
    operatingSystem: product.operatingSystem || '',
    graphicsCard: product.graphicsCard || '',
    // Add any other fields your ProductForm type requires
  };
};
