import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Product } from '../types/product';
import { FilterOption, extractFilters as utilsExtractFilters } from '../utils/filterUtils';

// Определение типа контекста для фильтрации
interface FilterContextType {
  activeFilters: { [key: string]: Set<string | number> | [number, number] };
  availableFilters: FilterOption[];
  filteredProducts: Product[];
  showFilters: boolean;
  selectedCategory: string | null;
  setShowFilters: (show: boolean) => void;
  setAvailableFilters: (filters: FilterOption[]) => void;
  handleFilterChange: (filterKey: string, values: string[] | [number, number]) => void;
  clearFilters: () => void;
  applyFiltersToProducts: (products: Product[]) => Product[];
  setProducts: (products: Product[]) => void;
  setCategory: (category: string) => void;
  getActiveFiltersByKey: (key: string) => string[] | [number, number] | null;
  getActiveFiltersCount: () => number;
  extractFilters: (products: Product[]) => void;
  isFilterActive: (key: string, value: string | number) => boolean;
}

// Создаем контекст с начальными значениями
const FilterContext = createContext<FilterContextType>({
  activeFilters: {},
  availableFilters: [],
  filteredProducts: [],
  showFilters: false,
  selectedCategory: null,
  setShowFilters: () => {},
  setAvailableFilters: () => {},
  handleFilterChange: () => {},
  clearFilters: () => {},
  applyFiltersToProducts: (products) => products,
  setProducts: () => {},
  setCategory: () => {},
  getActiveFiltersByKey: () => null,
  getActiveFiltersCount: () => 0,
  extractFilters: () => {},
  isFilterActive: () => false,
});

// Хук для использования контекста в компонентах
export const useFilters = () => useContext(FilterContext);

// Провайдер контекста
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Запускаем фильтрацию при изменении активных фильтров или списка продуктов
  useEffect(() => {
    const filtered = applyFiltersToProducts(allProducts);
    setFilteredProducts(filtered);
  }, [activeFilters, allProducts]);

  // Очищаем фильтры при изменении категории
  useEffect(() => {
    clearFilters();
  }, [selectedCategory]);

  // Обработчик изменения фильтров
  const handleFilterChange = (filterKey: string, values: string[] | [number, number]) => {
    const newActiveFilters = { ...activeFilters };
    
    // Проверяем, является ли это числовым диапазоном (для цен)
    if (Array.isArray(values) && values.length === 2 && typeof values[0] === 'number') {
      newActiveFilters[filterKey] = values as [number, number];
    } else if (values.length === 0) {
      // Удаляем фильтр, если значений нет
      delete newActiveFilters[filterKey];
    } else {
      // Для обычных фильтров используем Set для уникальности значений
      newActiveFilters[filterKey] = new Set(values.map(v => String(v)));
    }
    
    setActiveFilters(newActiveFilters);
  };

  // Очистка всех активных фильтров
  const clearFilters = () => {
    setActiveFilters({});
  };

  // Применение фильтров к списку продуктов
  const applyFiltersToProducts = (products: Product[]): Product[] => {
    if (Object.keys(activeFilters).length === 0) {
      return products;
    }

    return products.filter(product => {
      // Проверяем соответствие продукта всем активным фильтрам
      return Object.entries(activeFilters).every(([key, value]) => {
        // Для ценового диапазона
        if (Array.isArray(value) && key === 'price') {
          const [min, max] = value;
          const productPrice = Number(product.price);
          return !isNaN(productPrice) && productPrice >= min && productPrice <= max;
        }
        
        // Для обычных фильтров (чекбоксы и т.д.)
        if (value instanceof Set) {
          // Если фильтр пустой, не применяем его
          if (value.size === 0) {
            return true;
          }
          
          // Проверяем наличие значения продукта в множестве значений фильтра
          const productValue = product[key as keyof Product];
          return value.has(String(productValue)) || 
                 value.has(productValue) || 
                 (typeof productValue === 'number' && value.has(String(productValue)));
        }
        
        return true;
      });
    });
  };
  
  // Получение активных фильтров по ключу
  const getActiveFiltersByKey = (key: string): string[] | [number, number] | null => {
    const filter = activeFilters[key];
    
    if (!filter) {
      return null;
    }
    
    if (filter instanceof Set) {
      return Array.from(filter).map(String);
    }
    
    if (Array.isArray(filter)) {
      return filter;
    }
    
    return null;
  };
  
  // Проверка активности фильтра
  const isFilterActive = (key: string, value: string | number): boolean => {
    const filter = activeFilters[key];
    
    if (!filter) {
      return false;
    }
    
    if (filter instanceof Set) {
      return filter.has(value) || filter.has(String(value));
    }
    
    if (Array.isArray(filter) && filter.length === 2) {
      const [min, max] = filter;
      return typeof value === 'number' && value >= min && value <= max;
    }
    
    return false;
  };
  
  // Получение количества активных фильтров
  const getActiveFiltersCount = (): number => {
    return Object.values(activeFilters).reduce((count, value) => {
      if (value instanceof Set) {
        return count + value.size;
      }
      
      if (Array.isArray(value)) {
        return count + 1; // Считаем диапазон как один фильтр
      }
      
      return count;
    }, 0);
  };
  
  // Установка продуктов
  const setProducts = (products: Product[]) => {
    setAllProducts(products);
    setFilteredProducts(products);
  };
  
  // Установка категории
  const setCategory = (category: string) => {
    setSelectedCategory(category);
  };
  
  // Извлечение фильтров из продуктов
  const extractFilters = (products: Product[]) => {
    if (!products.length) return;
    
    const filters = utilsExtractFilters(products, selectedCategory || undefined);
    setAvailableFilters(filters);
  };
  
  // Значения, предоставляемые контекстом
  const contextValue: FilterContextType = {
    activeFilters,
    availableFilters,
    filteredProducts,
    showFilters,
    selectedCategory,
    setShowFilters,
    setAvailableFilters,
    handleFilterChange,
    clearFilters,
    applyFiltersToProducts,
    setProducts,
    setCategory,
    getActiveFiltersByKey,
    getActiveFiltersCount,
    extractFilters,
    isFilterActive,
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterContext;