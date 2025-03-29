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

export const extractFilters = (products: any[], category?: string): FilterOption[] => {
  const filterMap = new Map<string, Set<string | number>>();
  const filterCounts = new Map<string, Map<string | number, number>>();

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
    'productId',
    'rating',
    'reviewCount',
    'FilterCategories', // Исключаем FilterCategories
    'Memory'            // Исключаем Memory
  ];

  products.forEach(product => {
    Object.entries(product).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined && value !== null) {
        if (!filterMap.has(key)) {
          filterMap.set(key, new Set());
          filterCounts.set(key, new Map());
        }

        if (typeof value === 'string' || typeof value === 'number') {
          filterMap.get(key)?.add(value);
          const countMap = filterCounts.get(key)!;
          countMap.set(value, (countMap.get(value) || 0) + 1);
        }
      }
    });
  });

  const filters = Array.from(filterMap.entries())
    .map(([key, values]) => ({
      name: formatFilterName(key),
      key: key,
      values: Array.from(values).map(value => ({
        value,
        count: filterCounts.get(key)?.get(value) || 0
      }))
      .sort((a, b) => {
        if (typeof a.value === 'number' && typeof b.value === 'number') {
          return a.value - b.value;
        }
        return String(a.value).localeCompare(String(b.value));
      }),
      type: 'checkbox' as 'checkbox' | 'range'
    }));

  // Исключаем фильтры "Memory" и "Model" для категории "TV & Audio"
  if (category === 'tv' || category === 'audio') {
    return filters.filter(filter => filter.key !== 'Memory' && filter.key !== 'model');
  }

  return filters;
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
    memory: 'Memory'
  };

  return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export const applyFilters = (products: any[], activeFilters: { [key: string]: Set<string | number> | [number, number] }) => {
  return products.filter(product => {
    return Object.entries(activeFilters).every(([key, values]) => {
      if (values instanceof Set && values.size === 0) return true;
      
      if (Array.isArray(values) && key === 'price') {
        const [min, max] = values;
        const productPrice = Number(product[key]);
        return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
      }
      
      if (values instanceof Set) {
        return values.has(product[key]);
      }
      
      return true;
    });
  });
};
