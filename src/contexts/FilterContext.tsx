import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Product } from '../types/product';
import { FilterOption } from '../utils/filterUtils';

// Определение типа контекста для фильтрации
interface FilterContextType {
  activeFilters: { [key: string]: Set<string | number> | [number, number] };
  availableFilters: FilterOption[];
  filteredProducts: Product[];
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  setAvailableFilters: (filters: FilterOption[]) => void;
  handleFilterChange: (filterKey: string, values: string[] | [number, number]) => void;
  clearFilters: () => void;
  applyFiltersToProducts: (products: Product[]) => Product[];
}

// Создаем контекст с начальными значениями
const FilterContext = createContext<FilterContextType>({
  activeFilters: {},
  availableFilters: [],
  filteredProducts: [],
  showFilters: false,
  setShowFilters: () => {},
  setAvailableFilters: () => {},
  handleFilterChange: () => {},
  clearFilters: () => {},
  applyFiltersToProducts: (products) => products,
});

// Хук для использования контекста в компонентах
export const useFilters = () => useContext(FilterContext);

// Провайдер контекста
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: Set<string | number> | [number, number] }>({});
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Обработчик изменения фильтров
  const handleFilterChange = (filterKey: string, values: string[] | [number, number]) => {
    const newActiveFilters = { ...activeFilters };
    
    // Проверяем, является ли это числовым диапазоном (для цен)
    if (Array.isArray(values) && values.length === 2 && typeof values[0] === 'number') {
      newActiveFilters[filterKey] = values as [number, number];
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
          return product.price >= min && product.price <= max;
        }
        
        // Для обычных фильтров (чекбоксы и т.д.)
        if (value instanceof Set) {
          // Если фильтр пустой, не применяем его
          if (value.size === 0) {
            return true;
          }
          
          // Проверяем наличие значения продукта в множестве значений фильтра
          const productValue = product[key as keyof Product];
          return value.has(String(productValue));
        }
        
        return true;
      });
    });
  };

  // Значения, предоставляемые контекстом
  const contextValue: FilterContextType = {
    activeFilters,
    availableFilters,
    filteredProducts,
    showFilters,
    setShowFilters,
    setAvailableFilters,
    handleFilterChange,
    clearFilters,
    applyFiltersToProducts,
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterContext;