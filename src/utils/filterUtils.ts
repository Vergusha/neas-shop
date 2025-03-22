export interface FilterValue {
  value: string | number;
  count: number;
}

export interface FilterOption {
  name: string;
  key: string;
  values: FilterValue[];
  type: 'checkbox' | 'range';
  min?: number;
  max?: number;
}

export const extractFilters = (products: any[]): FilterOption[] => {
  const filterMap = new Map<string, Set<string | number>>();
  const filterCounts = new Map<string, Map<string | number, number>>();
  const priceRange = { min: Infinity, max: 0 };

  // Remove 'price' from excluded fields
  const excludedFields = [
    'id', 
    'name', 
    'description', 
    'image', 
    'createdAt', 
    'updatedAt', 
    'searchKeywords', 
    'clickCount',
    'category',
    'quantity',
    'addedAt',
    'productId'
  ];

  products.forEach(product => {
    // Special handling for price range
    if (product.price !== undefined && product.price !== null) {
      const price = Number(product.price);
      if (!isNaN(price)) {
        priceRange.min = Math.min(priceRange.min, price);
        priceRange.max = Math.max(priceRange.max, price);
      }
    }

    Object.entries(product).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined && value !== null) {
        // Инициализируем множества для уникальных значений
        if (!filterMap.has(key)) {
          filterMap.set(key, new Set());
          filterCounts.set(key, new Map());
        }

        // Добавляем значение и увеличиваем счетчик
        if (typeof value === 'string' || typeof value === 'number') {
          filterMap.get(key)?.add(value);
          const countMap = filterCounts.get(key)!;
          countMap.set(value, (countMap.get(value) || 0) + 1);
        }
      }
    });
  });

  // Преобразуем в массив фильтров
  const filters = Array.from(filterMap.entries())
    .map(([key, values]) => ({
      name: formatFilterName(key),
      key: key,
      values: Array.from(values).map(value => ({
        value,
        count: filterCounts.get(key)?.get(value) || 0
      }))
      .sort((a, b) => {
        // Сортировка числовых значений
        if (typeof a.value === 'number' && typeof b.value === 'number') {
          return a.value - b.value;
        }
        // Сортировка строковых значений
        return String(a.value).localeCompare(String(b.value));
      }),
      type: 'checkbox' as 'checkbox' | 'range'
    })); 

  // Add price range filter if we have valid min/max
  if (priceRange.min !== Infinity && priceRange.max > 0 && priceRange.max >= priceRange.min) {
    // Round min down to nearest 100 and max up to nearest 100
    const min = Math.floor(priceRange.min / 100) * 100;
    const max = Math.ceil(priceRange.max / 100) * 100;
    
    filters.unshift({
      name: 'Price',
      key: 'price',
      values: [],
      type: 'range',
      min,
      max
    } as FilterOption);
  }

  return filters;
};

const formatFilterName = (key: string): string => {
  // Convert keys to readable English names
  const nameMap: { [key: string]: string } = {
    price: 'Price',
    brand: 'Brand',
    memory: 'Memory',
    screenSize: 'Screen Size',
    camera: 'Camera',
    color: 'Color',
    resolution: 'Resolution',
    // Add other mappings as needed
  };

  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

export const applyFilters = (products: any[], activeFilters: { [key: string]: Set<string | number> | [number, number] }) => {
  return products.filter(product => {
    return Object.entries(activeFilters).every(([key, values]) => {
      // Skip filter if no values are selected
      if (values instanceof Set && values.size === 0) return true;
      
      // Handle price range filter
      if (Array.isArray(values) && key === 'price') {
        const [min, max] = values;
        const productPrice = Number(product[key]);
        return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
      }
      
      // Handle regular checkbox filters
      if (values instanceof Set) {
        return values.has(product[key]);
      }
      
      return true;
    });
  });
};
