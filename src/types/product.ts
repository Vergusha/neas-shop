export interface BaseProductForm {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  model: string;
  modelNumber: string;
  memory: string;
  color: string;
  updatedAt?: string;
  // Mobile specific
  camera?: string;
  screenSize?: string;
  resolution?: string;
  // TV specific
  screenDiagonal?: string;
  screenFormat?: string;
}

export interface ProductForm extends BaseProductForm {
  id: string;
}

export interface NewProductForm extends BaseProductForm {
  id?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  brand?: string;
  model?: string;
  memory?: string;
  color?: string;
  modelNumber?: string;
  category?: string;
  collection?: string;
  createdAt?: string;
  // Rating related
  rating?: number;
  reviewCount?: number;
  // Stats
  clickCount?: number;
  favoriteCount?: number;
  cartCount?: number;
  popularityScore?: number;
  // Additional images
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
}
