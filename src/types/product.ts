export interface ProductForm {
  id?: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  description: string;
  image: string;
  category?: string;
  color?: string;
  memory?: string;
  modelNumber?: string;
  processor?: string;
  ram?: string;
  storageType?: string;
  screenSize?: string;
  operatingSystem?: string;
  graphicsCard?: string;
  deviceType?: string;
  connectivity?: string;
  diagonal?: string;
  resolution?: string;
  displayType?: string;
  refreshRate?: string;
  subtype?: string;
  batteryLife?: string;
  collection?: string;
  createdAt?: string;
  updatedAt?: string;
  searchKeywords?: string[];
  clickCount?: number;
  favoriteCount?: number;
  cartCount?: number;
  popularityScore?: number;
  rating?: number;
  reviewCount?: number;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand: string;
  model: string; // Change from string | null to just string
  collection?: string;
  category?: string;
  memory?: string;
  color?: string;
  modelNumber?: string;
  processor?: string;
  ram?: string;
  storageType?: string;
  screenSize?: string;
  operatingSystem?: string;
  graphicsCard?: string;
  deviceType?: string;
  connectivity?: string;
  diagonal?: string;
  resolution?: string;
  displayType?: string;
  refreshRate?: string;
  subtype?: string;
  batteryLife?: string;
  createdAt?: string;
  updatedAt?: string;
  searchKeywords?: string[];
  clickCount?: number;
  favoriteCount?: number;
  cartCount?: number;
  popularityScore?: number;
  rating?: number;
  reviewCount?: number;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  [key: string]: any;
}

// Add this new interface for partial product data
export interface PartialProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  model?: string;
  collection?: string;
  category?: string;
  memory?: string;
  color?: string;
  modelNumber?: string;
  processor?: string;
  ram?: string;
  storageType?: string;
  screenSize?: string;
  operatingSystem?: string;
  graphicsCard?: string;
  deviceType?: string;
  connectivity?: string;
  diagonal?: string;
  resolution?: string;
  displayType?: string;
  refreshRate?: string;
  subtype?: string;
  batteryLife?: string;
  createdAt?: string;
  updatedAt?: string;
  searchKeywords?: string[];
  clickCount?: number;
  favoriteCount?: number;
  cartCount?: number;
  popularityScore?: number;
  rating?: number;
  reviewCount?: number;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  [key: string]: any;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  brand: string; // Сделаем обязательным
  price: number;
  image: string;
  collection: string; // Сделаем обязательным
  deviceType?: string;
  subtype?: string; // Добавим для аудио продуктов
  description: string; // Сделаем обязательным
  model?: string;
  color?: string;
  connectivity?: string;
}

export interface NewProductForm extends Omit<ProductForm, 'id'> {
  category: string;
  rgbLighting?: boolean;
  compatibleWith?: string;
  weight?: string;
  switchType?: string;
  dpi?: string;
  power?: string;
  channels?: string;
}

export interface TestResults {
  brands: Record<string, number>;
  deviceTypes: Record<string, number>;
  withKeywords: number;
  withoutKeywords: number;
  keywords: Record<string, number>;
}
