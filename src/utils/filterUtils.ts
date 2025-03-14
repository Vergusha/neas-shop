interface FilterValue {
  value: string | number;
  count: number;
}

interface FilterOption {
  name: string;
  values: FilterValue[];
}

export const extractFilters = (products: any[]): FilterOption[] => {
  const filterMap = new Map<string, Set<string | number>>();
  const filterCounts = new Map<string, Map<string | number, number>>();

  // Расширим список исключаемых полей
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
    'price',
    'quantity',
    'addedAt',
    'productId'
  ];

  products.forEach(product => {
    Object.entries(product).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined && value !== null) {
        // Инициализируем множества для уникальных значений
        if (!filterMap.has(key)) {
          filterMap.set(key, new Set());
          filterCounts.set(key, new Map());
        }

        // Добавляем значение и увеличиваем счетчик
        filterMap.get(key)?.add(value);
        const countMap = filterCounts.get(key)!;
        countMap.set(value, (countMap.get(value) || 0) + 1);
      }
    });
  });

  // Преобразуем в массив фильтров
  return Array.from(filterMap.entries())
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
      })
    }));
};

const formatFilterName = (key: string): string => {
  // Преобразование ключей в читаемые названия
  const nameMap: { [key: string]: string } = {
    price: 'Price',
    brand: 'Brand',
    memory: 'Memory',
    screenSize: 'Screen Size',
    camera: 'Camera',
    color: 'Color',
    resolution: 'Resolution',
    // Добавьте другие маппинги по мере необходимости
  };

  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

export const applyFilters = (products: any[], activeFilters: { [key: string]: Set<string | number> }) => {
  return products.filter(product => {
    return Object.entries(activeFilters).every(([key, values]) => {
      if (values.size === 0) return true; // Пропускаем фильтр если нет выбранных значений
      return values.has(product[key]);
    });
  });
};
