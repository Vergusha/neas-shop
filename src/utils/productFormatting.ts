export const formatMacBookName = (product: {
  brand?: string;
  model?: string;
  screenSize?: string;
  modelNumber?: string;
  processor?: string;
  ram?: string;
  storageType?: string;
  color?: string;
}): string => {
  if (product.brand !== 'Apple') return '';

  const screenSizeFormatted = product.screenSize?.replace(' inch', '"') || '';
  const year = product.modelNumber || '';
  const chip = product.processor?.replace('Apple ', '') || '';
  const memory = `${product.ram?.replace('GB', '')}/${product.storageType?.replace(' SSD', '').replace('GB', '')} GB`;

  return `Apple ${product.model} ${screenSizeFormatted} (${year}, ${chip}) ${memory}, ${product.color}`.trim();
};

export const formatAudioName = (product: {
  brand?: string;
  model?: string;
  connectivity?: string;
  subtype?: string;
  color?: string;
}): string => {
  if (!product.brand || !product.model) return '';

  const parts = [
    product.brand,
    product.model,
    product.connectivity,
    product.subtype,
    product.color?.toLowerCase()
  ].filter(Boolean);

  return parts.join(' ');
};
