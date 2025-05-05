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
    image2: product.image2 || '',
    image3: product.image3 || '',
    image4: product.image4 || '',
    image5: product.image5 || '',
    deviceType: product.deviceType || '',
    connectivity: product.connectivity || '',
    diagonal: product.diagonal || '',
    resolution: product.resolution || '',
    displayType: product.displayType || '',
    refreshRate: product.refreshRate || '',
    subtype: product.subtype || '',
    batteryLife: product.batteryLife || '',
    // Add display-friendly formatted names
    formattedName: generateFormattedName(product),
    shortDescription: generateShortDescription(product.description || ''),
    // Maintain other fields
    collection: product.collection,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    searchKeywords: product.searchKeywords,
    clickCount: product.clickCount || 0,
    favoriteCount: product.favoriteCount || 0,
    cartCount: product.cartCount || 0,
    popularityScore: product.popularityScore || 0,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
  };
};

// Helper function to generate a formatted name based on product type/category
const generateFormattedName = (product: Partial<ProductForm>): string => {
  const collection = product.collection || '';
  const category = product.category || '';
  
  // Мобильные устройства
  if (collection === 'mobile' || category === 'mobile') {
    return `${product.brand || ''} ${product.model || ''} ${product.modelNumber || ''} ${product.memory || ''} ${product.color || ''}`.trim();
  }
  
  // Ноутбуки
  if (collection === 'laptops' || category === 'laptops') {
    if (product.brand === 'Apple') {
      const screenSize = product.screenSize?.replace(' inch', '"') || '';
      const chip = product.processor || '';
      const memory = product.ram ? `${product.ram}` : '';
      const storage = product.storageType || '';
      
      return `${product.brand} ${product.model} ${screenSize} ${chip} ${memory} ${storage} ${product.color || ''}`.trim();
    } else {
      return `${product.brand || ''} ${product.model || ''} ${product.processor || ''} ${product.ram || ''} ${product.storageType || ''} ${product.color || ''}`.trim();
    }
  }
  
  // Телевизоры
  if (collection === 'tv' || category === 'tv') {
    const size = product.diagonal || product.screenSize || '';
    return `${product.brand || ''} ${size ? size + '"' : ''} ${product.displayType || ''} ${product.resolution || ''} ${product.refreshRate || ''} ${product.model || ''}`.trim();
  }
  
  // Аудио устройства
  if (collection === 'audio' || category === 'audio') {
    return `${product.brand || ''} ${product.model || ''} ${product.connectivity || ''} ${product.subtype || ''} ${product.color || ''}`.trim();
  }
  
  // Игровые устройства
  if (collection === 'gaming' || category === 'gaming') {
    return `${product.brand || ''} ${product.model || ''} ${product.modelNumber || ''} ${product.connectivity || ''} ${product.deviceType || ''} ${product.color || ''}`.trim();
  }
  
  return product.name || '';
};

// Format product description with support for # as line break markers
export const formatProductDescription = (description: string | undefined, asList = false): string | JSX.Element[] => {
  if (!description) return '';
  
  // Check if the description contains # markers
  if (description.includes('#')) {
    // Split by # character and remove empty lines
    const lines = description.split('#').map(line => line.trim()).filter(line => line);
    
    if (asList) {
      // Return as an array for React to render
      return lines;
    } else {
      // Return as bullet-formatted text for simpler displays
      return lines.join(' • ');
    }
  }
  
  return description;
};

// Create a short description from the full description
const generateShortDescription = (description: string): string => {
  if (!description) return '';
  
  // If the description has # markers, treat them as separate points
  if (description.includes('#')) {
    const points = description.split('#')
      .map(point => point.trim())
      .filter(point => point);
    return points.slice(0, 2).join(' • ');
  }
  
  // If the description has bullet points
  if (description.includes('•')) {
    const points = description.split('•').filter(point => point.trim());
    return points.slice(0, 2).map(point => point.trim()).join(' • ');
  }
  
  // Otherwise, return first 100 characters
  return description.length > 100 ? `${description.substring(0, 100)}...` : description;
};
