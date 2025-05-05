export interface FilterValue {
  value: string | number;
  count: number;
}

export interface FilterOption {
  name: string;
  key: string;
  id?: string;
  values: FilterValue[];
  type: 'checkbox' | 'range';
  min?: number;
  max?: number;
}

export const extractFilters = (products: any[], category?: string): FilterOption[] => {
  const filterMap = new Map<string, Set<string | number>>();
  const filterCounts = new Map<string, Map<string | number, number>>();
  const priceRange = {min: Infinity, max: 0};

  const excludedFields = [
    'id',
    'name',
    'description',
    'image',
    'image2',
    'image3',
    'collection',
    'createdAt',
    'updatedAt',
    'searchKeywords',
    'clickCount',
    'category',
    'quantity',
    'addedAt',
    'productId',
    'rating',
    'reviewCount'
  ];

  // Always include price filter
  filterMap.set('price', new Set());

  // Check if products is a valid array and not empty
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [{
      name: 'Price',
      key: 'price',
      id: 'price',
      values: [],
      type: 'range',
      min: 0,
      max: 10000
    }];
  }

  products.forEach(product => {
    if (!product) return; // Skip if product is null or undefined
    
    // Handle price separately
    const price = Number(product.price);
    if (!isNaN(price)) {
      priceRange.min = Math.min(priceRange.min, price);
      priceRange.max = Math.max(priceRange.max, price);
    }

    Object.entries(product).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined && value !== null && value !== '') {
        if (!filterMap.has(key)) {
          filterMap.set(key, new Set());
          filterCounts.set(key, new Map());
        }

        if (typeof value === 'string' || typeof value === 'number') {
          filterMap.get(key)?.add(value);
          const countMap = filterCounts.get(key);
          if (countMap) { // Add null check for countMap
            countMap.set(value, (countMap.get(value) || 0) + 1);
          }
        }
      }
    });
  });

  // Round price range to nice values
  priceRange.min = priceRange.min === Infinity ? 0 : Math.floor(priceRange.min / 100) * 100;
  priceRange.max = priceRange.max === 0 ? 10000 : Math.ceil(priceRange.max / 100) * 100;

  // Generate filter objects for all properties
  let filters = Array.from(filterMap.entries())
    .map(([key, values]) => {
      if (key === 'price') {
        return {
          name: formatFilterName(key),
          key: key,
          id: key,
          values: [],
          type: 'range' as const,
          min: priceRange.min,
          max: priceRange.max
        };
      }

      return {
        name: formatFilterName(key),
        key: key,
        id: key,
        values: Array.from(values).map(value => {
          const countMap = filterCounts.get(key);
          return {
            value,
            count: countMap?.get(value) || 0
          };
        })
        .sort((a, b) => {
          if (typeof a.value === 'number' && typeof b.value === 'number') {
            return a.value - b.value;
          }
          return String(a.value).localeCompare(String(b.value));
        }),
        type: 'checkbox' as const
      };
    });

  // Apply category-specific filter modifications
  if (category) {
    filters = applyCategorySpecificFilters(filters, category);
  }

  // Sort filters - price always first, then sort alphabetically
  return filters.sort((a, b) => {
    if (a.key === 'price') return -1;
    if (b.key === 'price') return 1;
    return a.name.localeCompare(b.name);
  });
};

// Apply category-specific filter modifications
const applyCategorySpecificFilters = (filters: FilterOption[], category: string): FilterOption[] => {
  switch (category) {
    case 'tv':
      return filters.filter(filter => 
        !['memory', 'ram', 'storage', 'processor'].includes(filter.key)
      );
    
    case 'audio':
      return filters.filter(filter => 
        !['memory', 'ram', 'storage', 'processor', 'operatingSystem', 'refreshRate', 'diagonal'].includes(filter.key)
      );
    
    case 'mobile':
      // Keep only relevant filters for mobile devices
      return filters.filter(filter => 
        ['price', 'brand', 'memory', 'color', 'operatingSystem'].includes(filter.key)
      );

    case 'laptops':
      // Prioritize laptop-specific filters
      const priorityOrder = ['price', 'brand', 'processor', 'ram', 'storage', 'screen'];
      return filters.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.key);
        const bIndex = priorityOrder.indexOf(b.key);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    
    case 'gaming':
      // Keep only relevant filters for gaming products
      return filters.filter(filter => 
        ['price', 'brand', 'deviceType', 'connectivity', 'color'].includes(filter.key)
      );

    default:
      return filters;
  }
};

// Функция для форматирования ключей фильтров в читабельные названия
export const formatFilterName = (key: string): string => {
  const nameMap: Record<string, string> = {
    price: 'Price',
    brand: 'Brand',
    model: 'Model',
    refreshRate: 'Refresh Rate',
    audioType: 'Audio Type',
    connectivity: 'Connectivity',
    batteryLife: 'Battery Life',
    memory: 'Memory',
    color: 'Color',
    ram: 'RAM',
    storage: 'Storage',
    displayType: 'Display Type',
    operatingSystem: 'OS',
    resolution: 'Resolution',
    processor: 'Processor',
    diagonal: 'Screen Size',
    deviceType: 'Device Type',
    subtype: 'Type'
  };

  return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export const applyFilters = (products: any[], activeFilters: { [key: string]: Set<string | number> | [number, number] }) => {
  if (Object.keys(activeFilters).length === 0) {
    return products;
  }
  
  return products.filter(product => {
    return Object.entries(activeFilters).every(([key, values]) => {
      // Handle price range filter
      if (Array.isArray(values) && key === 'price') {
        const [min, max] = values;
        const productPrice = Number(product.price);
        return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
      }
      
      // Handle regular filters (checkboxes)
      if (values instanceof Set) {
        // Skip empty filters
        if (values.size === 0) {
          return true;
        }
        
        // Handle different value types
        const productValue = product[key];
        return values.has(productValue) || 
               values.has(String(productValue)) || 
               (typeof productValue === 'number' && values.has(String(productValue)));
      }
      
      return true;
    });
  });
};

// Helper function to serialize filter state for URL parameters
export const serializeFilters = (filters: { [key: string]: Set<string | number> | [number, number] }): string => {
  const serialized: Record<string, string> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value instanceof Set) {
      serialized[key] = Array.from(value).join(',');
    } else if (Array.isArray(value)) {
      serialized[key] = value.join('-');
    }
  });
  
  return new URLSearchParams(serialized).toString();
};

// Helper function to deserialize filter state from URL parameters
export const deserializeFilters = (queryString: string): { [key: string]: Set<string | number> | [number, number] } => {
  const filters: { [key: string]: Set<string | number> | [number, number] } = {};
  const params = new URLSearchParams(queryString);
  
  params.forEach((value, key) => {
    if (key === 'price' && value.includes('-')) {
      const [min, max] = value.split('-').map(Number);
      filters[key] = [min, max];
    } else {
      filters[key] = new Set(value.split(','));
    }
  });
  
  return filters;
};
