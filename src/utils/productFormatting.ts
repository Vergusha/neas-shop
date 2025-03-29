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

export const formatMobileName = (product: {
  brand?: string;
  model?: string;
  memory?: string;
  color?: string;
}): string => {
  if (!product.brand || !product.model) return '';

  const parts = [
    product.brand,
    product.model,
    product.memory,
    product.color
  ].filter(Boolean);

  return parts.join(' ');
};

export const formatTVName = (product: {
  brand?: string;
  diagonal?: string;
  screenSize?: string;
  resolution?: string;
  refreshRate?: string;
  displayType?: string;
  model?: string;
  modelNumber?: string;
}): string => {
  if (!product.brand) return '';
  
  // Use diagonal or screenSize, whichever is available
  const size = product.diagonal || product.screenSize || '';
  
  const parts = [
    product.brand,                      // Samsung
    size ? `${size}"` : '',             // 55"
    product.resolution || '',           // 4K
    product.refreshRate || '',          // 120Hz
    product.displayType || '',          // QLED
    product.model || '',                // QN90B
    product.modelNumber || ''           // Model number if available
  ]
    .filter(Boolean)  // Remove empty strings
    .join(' ');
  
  return parts;
};
