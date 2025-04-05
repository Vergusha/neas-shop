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
  
  if (collection === 'laptops' || product.category === 'laptops') {
    return `${product.brand || ''} ${product.model || ''} ${product.processor || ''}`.trim();
  }
  
  if (collection === 'mobile' || product.category === 'mobile') {
    return `${product.brand || ''} ${product.model || ''} ${product.memory || ''}`.trim();
  }
  
  if (collection === 'tv' || product.category === 'tv') {
    const size = product.diagonal || product.screenSize || '';
    return `${product.brand || ''} ${size ? size + '"' : ''} ${product.displayType || ''} ${product.resolution || ''}`.trim();
  }
  
  if (collection === 'audio' || product.category === 'audio') {
    return `${product.brand || ''} ${product.model || ''} ${product.subtype || ''}`.trim();
  }
  
  if (collection === 'gaming' || product.category === 'gaming') {
    return `${product.brand || ''} ${product.model || ''} ${product.deviceType || ''}`.trim();
  }
  
  return product.name || '';
};

// Create a short description from the full description
const generateShortDescription = (description: string): string => {
  if (!description) return '';
  
  // If the description has bullet points
  if (description.includes('•')) {
    const points = description.split('•').filter(point => point.trim());
    return points.slice(0, 2).map(point => point.trim()).join(' • ');
  }
  
  // Otherwise, return first 100 characters
  return description.length > 100 ? `${description.substring(0, 100)}...` : description;
};
