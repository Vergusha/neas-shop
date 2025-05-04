import React, { useState, useEffect } from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { getTheme } from '../../utils/themeUtils';

interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

interface FilterCategory {
  id: string;
  name: string;
  options: FilterOption[];
}

// Support both old and new prop structures
interface ProductFiltersProps {
  categories?: FilterCategory[];
  filters?: Array<{ id: string; name: string; values: any[]; key?: string }>;
  selectedFilters?: Record<string, string[]>;
  activeFilters?: { [key: string]: Set<string | number> | [number, number] } | Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[] | [number, number]) => void;
  onClearFilters?: () => void;
  onSortChange?: (value: string) => void;
  sortValue?: string;
  productCount?: number;
  isMobile?: boolean;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  filters,
  selectedFilters = {},
  activeFilters,
  onFilterChange,
  onClearFilters,
  onSortChange,
  sortValue = 'featured',
  productCount,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleFilterChange = (categoryId: string, value: string) => {
    // Если используется старый формат selectedFilters
    if (!activeFilters) {
      const currentValues = selectedFilters[categoryId] || [];
      const isSelected = currentValues.includes(value);
      
      const newValues = isSelected
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      
      onFilterChange(categoryId, newValues);
    } 
    // Если используется новый формат activeFilters
    else {
      // Находим ключ фильтра в filters, если он используется
      const filterKey = filters?.find(f => f.id === categoryId)?.key || categoryId;
      
      // Получаем текущие значения из activeFilters
      let currentValues: string[] = [];
      const activeFilter = activeFilters[filterKey];
      
      if (activeFilter instanceof Set) {
        currentValues = Array.from(activeFilter).map(String);
      } else if (Array.isArray(activeFilter) && activeFilter.length > 0 && typeof activeFilter[0] !== 'number') {
        currentValues = activeFilter.map(String);
      }
      
      const isSelected = currentValues.includes(value);
      
      const newValues = isSelected
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      
      onFilterChange(filterKey, newValues);
    }
  };

  const isOptionChecked = (categoryId: string, optionValue: string): boolean => {
    // Если используется старый формат selectedFilters
    if (!activeFilters) {
      return (selectedFilters[categoryId] || []).includes(optionValue);
    }
    
    // Если используется новый формат activeFilters
    const filterKey = filters?.find(f => f.id === categoryId)?.key || categoryId;
    const activeFilter = activeFilters[filterKey];
    
    if (activeFilter instanceof Set) {
      return activeFilter.has(optionValue);
    } 
    
    if (Array.isArray(activeFilter) && typeof activeFilter[0] !== 'number') {
      return activeFilter.includes(optionValue);
    }
    
    return false;
  };

  const getSelectedFiltersCount = () => {
    // Проверяем, существует ли selectedFilters, чтобы избежать ошибки
    if (!selectedFilters || Object.keys(selectedFilters).length === 0) {
      // Если используется activeFilters, попробуем посчитать его элементы
      if (activeFilters && Object.keys(activeFilters).length > 0) {
        return Object.values(activeFilters).reduce((count, value) => {
          if (value instanceof Set) {
            return count + value.size;
          } else if (Array.isArray(value)) {
            // Для диапазона цен считаем как один фильтр, если он установлен
            return count + (value.length > 0 ? 1 : 0);
          }
          return count;
        }, 0);
      }
      return 0;
    }
    
    // Оригинальная логика для selectedFilters
    return Object.values(selectedFilters).reduce(
      (count, values) => count + values.length,
      0
    );
  };

  const toggleFilters = () => {
    setIsOpen(!isOpen);
  };

  // Convert filters to categories format if categories not provided
  const processedCategories = categories || (filters ? filters.map(filter => ({
    id: filter.id,
    name: filter.name,
    options: filter.values.map(val => ({
      value: typeof val === 'object' ? val.value : String(val),
      label: typeof val === 'object' ? (val.value as string) : String(val),
      count: typeof val === 'object' ? val.count : undefined
    }))
  })) : []);

  return (
    <div className={`mb-4 ${isMobile ? 'md:hidden' : ''}`}>
      {/* Mobile filter toggle button */}
      {isMobile && (
        <div className="mb-4">
          <button
            onClick={toggleFilters}
            className={`flex items-center justify-between w-full px-4 py-2 rounded-lg ${
              currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
            }`}
          >
            <div className="flex items-center">
              <FaFilter className="mr-2" />
              <span>Filters</span>
              {getSelectedFiltersCount() > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  currentTheme === 'dark' ? 'bg-[#95c672] text-gray-900' : 'bg-[#003D2D] text-white'
                }`}>
                  {getSelectedFiltersCount()}
                </span>
              )}
            </div>
            <span>{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* Filter panel */}
      {isOpen && (
        <div className={`p-4 rounded-lg ${
          currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'
        }`}>
          {/* Header with product count and clear filters */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className={currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              {productCount !== undefined && (
                <span>{productCount} products</span>
              )}
            </div>
            {getSelectedFiltersCount() > 0 && onClearFilters && (
              <button
                onClick={onClearFilters}
                className={`flex items-center ${
                  currentTheme === 'dark' ? 'text-[#95c672] hover:text-[#85b662]' : 'text-[#003D2D] hover:text-[#004D3D]'
                }`}
              >
                <FaTimes className="mr-1" />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          {/* Sort options */}
          {onSortChange && (
            <div className="mb-6">
              <h3 className={`mb-2 text-sm font-medium ${
                currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Sort by
              </h3>
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-md ${
                  currentTheme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          )}

          {/* Filter categories */}
          {processedCategories.map((category) => (
            <div key={category.id} className="mb-6">
              <h3 className={`mb-2 text-sm font-medium ${
                currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.options.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${category.id}-${option.value}`}
                      checked={isOptionChecked(category.id, option.value)}
                      onChange={() => handleFilterChange(category.id, option.value)}
                      className={`mr-2 form-checkbox ${
                        currentTheme === 'dark'
                          ? 'text-[#95c672] border-gray-600 bg-gray-700 focus:ring-[#85b662]'
                          : 'text-[#003D2D] border-gray-300 focus:ring-[#004D3D]'
                      }`}
                    />
                    <label 
                      htmlFor={`${category.id}-${option.value}`}
                      className={`text-sm ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {option.label || option.value}
                      {option.count !== undefined && (
                        <span className={`ml-1 text-xs ${
                          currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          ({option.count})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
