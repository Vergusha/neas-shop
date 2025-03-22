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
