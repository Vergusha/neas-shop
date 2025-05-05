import React, { useState, useEffect } from 'react';
import { FaFilter, FaTimes, FaCheck } from 'react-icons/fa';
import { getTheme } from '../../utils/themeUtils';
import { useFilters } from '../../contexts/FilterContext';

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
  filters?: Array<{ id: string; name: string; values: any[]; key?: string; type?: string }>;
  selectedFilters?: Record<string, string[]>;
  activeFilters?: { [key: string]: Set<string | number> | [number, number] } | Record<string, string[]>;
  onFilterChange?: (categoryId: string, values: string[] | [number, number]) => void;
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
  activeFilters: propActiveFilters,
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters,
  onSortChange,
  sortValue = 'featured',
  productCount,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Получаем доступ к контексту фильтров
  const {
    activeFilters: contextActiveFilters,
    availableFilters: contextFilters,
    handleFilterChange: contextHandleFilterChange,
    clearFilters: contextClearFilters
  } = useFilters();

  // Используем значения из пропсов или контекста
  const effectiveActiveFilters = propActiveFilters || contextActiveFilters;
  const effectiveFilters = filters || contextFilters;
  const effectiveOnFilterChange = propOnFilterChange || contextHandleFilterChange;
  const effectiveOnClearFilters = propOnClearFilters || contextClearFilters;

  // Initialize expanded states for all categories
  useEffect(() => {
    if (processedCategories.length > 0) {
      const initialExpandedState: Record<string, boolean> = {};
      processedCategories.forEach(category => {
        initialExpandedState[category.id] = true; // Start with all categories expanded
      });
      setExpandedCategories(initialExpandedState);
    }
  }, [filters, categories]);

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
    if (!effectiveActiveFilters) {
      const currentValues = selectedFilters[categoryId] || [];
      const isSelected = currentValues.includes(value);
      
      const newValues = isSelected
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      
      effectiveOnFilterChange(categoryId, newValues);
    } 
    // Если используется новый формат activeFilters
    else {
      // Находим ключ фильтра в filters, если он используется
      const filterKey = effectiveFilters?.find(f => f.id === categoryId)?.key || categoryId;
      
      // Получаем текущие значения из activeFilters
      let currentValues: string[] = [];
      const activeFilter = effectiveActiveFilters[filterKey];
      
      if (activeFilter instanceof Set) {
        currentValues = Array.from(activeFilter).map(String);
      } else if (Array.isArray(activeFilter) && activeFilter.length > 0 && typeof activeFilter[0] !== 'number') {
        currentValues = activeFilter.map(String);
      }
      
      const isSelected = currentValues.includes(value);
      
      const newValues = isSelected
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      
      effectiveOnFilterChange(filterKey, newValues);
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const isOptionChecked = (categoryId: string, optionValue: string): boolean => {
    // Если используется старый формат selectedFilters
    if (!effectiveActiveFilters) {
      return (selectedFilters[categoryId] || []).includes(optionValue);
    }
    
    // Если используется новый формат activeFilters
    const filterKey = effectiveFilters?.find(f => f.id === categoryId)?.key || categoryId;
    const activeFilter = effectiveActiveFilters[filterKey];
    
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
      if (effectiveActiveFilters && Object.keys(effectiveActiveFilters).length > 0) {
        return Object.values(effectiveActiveFilters).reduce((count, value) => {
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

  const getSelectedFiltersByCategoryCount = (categoryId: string): number => {
    if (!effectiveActiveFilters) {
      return (selectedFilters[categoryId] || []).length;
    }

    const filterKey = effectiveFilters?.find(f => f.id === categoryId)?.key || categoryId;
    const activeFilter = effectiveActiveFilters[filterKey];
    
    if (activeFilter instanceof Set) {
      return activeFilter.size;
    }

    if (Array.isArray(activeFilter) && typeof activeFilter[0] !== 'number') {
      return activeFilter.length;
    }

    return 0;
  };

  const toggleFilters = () => {
    setIsOpen(!isOpen);
  };

  // Convert filters to categories format if categories not provided
  const processedCategories = categories || (effectiveFilters ? effectiveFilters.map(filter => ({
    id: filter.id,
    name: filter.name,
    options: filter.values.map(val => ({
      value: typeof val === 'object' ? val.value : String(val),
      label: typeof val === 'object' ? (val.value as string) : String(val),
      count: typeof val === 'object' ? val.count : undefined
    }))
  })) : []);

  // Get all selected filters for displaying as chips
  const getAllSelectedFilters = (): Array<{category: string, value: string}> => {
    const result: Array<{category: string, value: string}> = [];

    processedCategories.forEach(category => {
      category.options.forEach(option => {
        if (isOptionChecked(category.id, option.value)) {
          result.push({
            category: category.name,
            value: option.label || option.value
          });
        }
      });
    });

    return result;
  };

  // Remove a specific filter
  const handleRemoveFilter = (categoryId: string, value: string) => {
    handleFilterChange(categoryId, value);
  };

  // Специальная обработка для фильтров с типом 'range'
  const renderRangeFilter = (filter: any) => {
    if (filter.type !== 'range') return null;
    
    // Determine default values for range
    const defaultMin = filter.min || 0;
    const defaultMax = filter.max || 10000;
    
    // Текущие значения диапазона (или значения по умолчанию)
    const currentRange = Array.isArray(effectiveActiveFilters[filter.key || filter.id]) 
      ? effectiveActiveFilters[filter.key || filter.id] as [number, number] 
      : [defaultMin, defaultMax];
    
    // Check if the range has been modified from default values
    const isModified = currentRange[0] !== defaultMin || currentRange[1] !== defaultMax;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">{defaultMin}</span>
          <span className="text-sm">{defaultMax}</span>
        </div>
        <div className="flex flex-col gap-2">
          <input 
            type="range" 
            min={defaultMin} 
            max={defaultMax} 
            value={currentRange[1]} // Max value
            onChange={(e) => {
              const newMax = Math.max(Number(e.target.value), currentRange[0]);
              effectiveOnFilterChange(filter.key || filter.id, [currentRange[0], newMax]);
            }}
            className={`w-full ${isModified ? 'accent-primary' : ''}`}
          />
          <input 
            type="range" 
            min={defaultMin} 
            max={defaultMax} 
            value={currentRange[0]} // Min value
            onChange={(e) => {
              const newMin = Math.min(Number(e.target.value), currentRange[1]);
              effectiveOnFilterChange(filter.key || filter.id, [newMin, currentRange[1]]);
            }}
            className={`w-full ${isModified ? 'accent-primary' : ''}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={isModified ? 'font-bold' : ''}>Min: {currentRange[0]} NOK</span>
          <span className={isModified ? 'font-bold' : ''}>Max: {currentRange[1]} NOK</span>
        </div>
      </div>
    );
  };

  // Get the selected filters to display as a summary
  const activeFilterItems = getAllSelectedFilters();
  const hasActiveFilters = activeFilterItems.length > 0 || Object.values(effectiveActiveFilters || {}).some(v => 
    (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && 
     effectiveFilters?.some(f => f.type === 'range' && f.min !== undefined && 
     ((v as [number, number])[0] !== f.min || (v as [number, number])[1] !== f.max)))
  );

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
        <div className={`p-4 rounded-lg shadow-md ${
          currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white'
        }`}>
          {/* Header with product count and clear filters */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className={currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              {productCount !== undefined && (
                <span>{productCount} products</span>
              )}
            </div>
            {getSelectedFiltersCount() > 0 && effectiveOnClearFilters && (
              <button
                onClick={effectiveOnClearFilters}
                className={`flex items-center ${
                  currentTheme === 'dark' ? 'text-[#95c672] hover:text-[#85b662]' : 'text-[#003D2D] hover:text-[#004D3D]'
                }`}
              >
                <FaTimes className="mr-1" />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          {/* Selected filters chips */}
          {activeFilterItems.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilterItems.map((filter, index) => (
                <div 
                  key={`${filter.category}-${filter.value}-${index}`}
                  className={`flex items-center px-2 py-1 text-xs rounded-full transition-all duration-200
                    ${currentTheme === 'dark' 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-gray-200 text-gray-800'
                    }`}
                >
                  <span className="mr-1">{filter.category}: {filter.value}</span>
                  <button
                    onClick={() => {
                      // Find categoryId from category name
                      const category = processedCategories.find(c => c.name === filter.category);
                      if (category) {
                        // Find option value
                        const option = category.options.find(o => (o.label || o.value) === filter.value);
                        if (option) {
                          handleRemoveFilter(category.id, option.value);
                        }
                      }
                    }}
                    className={`ml-1 focus:outline-none hover:text-red-500`}
                    aria-label={`Remove filter ${filter.category}: ${filter.value}`}
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
          {processedCategories.map((category) => {
            const selectedCount = getSelectedFiltersByCategoryCount(category.id);
            return (
            <div key={category.id} className={`mb-6 rounded-md ${
              selectedCount > 0 
                ? currentTheme === 'dark' 
                  ? 'border border-gray-700 p-3 bg-gray-750' 
                  : 'border border-gray-200 p-3 bg-gray-50'
                : ''
            }`}>
              <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => toggleCategoryExpansion(category.id)}
              >
                <h3 className={`text-sm font-medium ${
                  currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {category.name}
                  {selectedCount > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                      currentTheme === 'dark' 
                        ? 'bg-[#95c672] text-gray-900' 
                        : 'bg-[#003D2D] text-white'
                    }`}>
                      {selectedCount}
                    </span>
                  )}
                </h3>
                <span>{expandedCategories[category.id] ? '▼' : '►'}</span>
              </div>
              
              {/* Category content */}
              {expandedCategories[category.id] && (
                <>
                  {/* Проверяем, является ли этот фильтр диапазоном */}
                  {effectiveFilters?.find(f => f.id === category.id && f.type === 'range') ? (
                    renderRangeFilter(effectiveFilters.find(f => f.id === category.id))
                  ) : (
                    <div className="mt-2 space-y-2">
                      {category.options.map((option) => {
                        const isChecked = isOptionChecked(category.id, option.value);
                        return (
                        <div 
                          key={option.value} 
                          className={`flex items-center p-1.5 rounded-md transition-all duration-200 ${
                            isChecked 
                              ? currentTheme === 'dark'
                                ? 'bg-gray-700'
                                : 'bg-gray-100'
                              : 'hover:bg-opacity-50'
                          }`}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              id={`${category.id}-${option.value}`}
                              checked={isChecked}
                              onChange={() => handleFilterChange(category.id, option.value)}
                              className={`mr-2 form-checkbox ${
                                currentTheme === 'dark'
                                  ? 'text-[#95c672] border-gray-600 bg-gray-700 focus:ring-[#85b662]'
                                  : 'text-[#003D2D] border-gray-300 focus:ring-[#004D3D]'
                              }`}
                            />
                            {isChecked && (
                              <div className="absolute hidden">
                                <FaCheck size={10} className={currentTheme === 'dark' ? 'text-[#95c672]' : 'text-[#003D2D]'} />
                              </div>
                            )}
                          </div>
                          <label 
                            htmlFor={`${category.id}-${option.value}`}
                            className={`text-sm ${
                              isChecked
                                ? currentTheme === 'dark' 
                                  ? 'text-white font-medium' 
                                  : 'text-gray-900 font-medium'
                                : currentTheme === 'dark' 
                                  ? 'text-gray-300' 
                                  : 'text-gray-700'
                            }`}
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
                      )})}
                    </div>
                  )}
                </>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
