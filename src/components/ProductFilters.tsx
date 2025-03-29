import React, { useState, useEffect, useRef } from 'react';

interface FilterValue {
  value: string | number;
  count: number;
}

interface FilterOption {
  name: string;
  key?: string;
  values: FilterValue[] | string[];
  id?: string;
  type?: 'checkbox' | 'range';
  min?: number;
  max?: number;
}

interface ProductFiltersProps {
  filters: FilterOption[];
  selectedFilters?: Record<string, string[]>;
  activeFilters?: { [key: string]: Set<string | number> | [number, number] };
  onFilterChange: (filterId: string, values: string[] | [number, number]) => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  selectedFilters = {},
  activeFilters = {},
  onFilterChange,
}) => {
  const [priceRange, setPriceRange] = useState<{ min: number; max: number; current: [number, number] }>({
    min: 0,
    max: 10000,
    current: [0, 10000]
  });

  const [minPriceInput, setMinPriceInput] = useState<string>('0');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('10000');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const priceFilter = filters.find(f => (f.key === 'price' || f.id === 'price') && f.type === 'range');
    if (priceFilter && priceFilter.min !== undefined && priceFilter.max !== undefined) {
      const min = priceFilter.min;
      const max = priceFilter.max;
      let current: [number, number] = [min, max];
      if (activeFilters.price && Array.isArray(activeFilters.price)) {
        current = activeFilters.price as [number, number];
      }

      setPriceRange({ min, max, current });
      setMinPriceInput(String(current[0]));
      setMaxPriceInput(String(current[1]));
      initializedRef.current = true;
    }
  }, [filters, activeFilters]);

  const handleMinPriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinPriceInput(e.target.value);
  };

  const handleMaxPriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxPriceInput(e.target.value);
  };

  const applyPriceInputs = () => {
    const min = Math.max(priceRange.min, Number(minPriceInput) || priceRange.min);
    const max = Math.min(priceRange.max, Number(maxPriceInput) || priceRange.max);
    const validMin = Math.min(min, max);
    const validMax = Math.max(min, max);
    const newRange: [number, number] = [validMin, validMax];
    setPriceRange(prev => ({ ...prev, current: newRange }));
    setMinPriceInput(String(validMin));
    setMaxPriceInput(String(validMax));
    onFilterChange('price', newRange);
  };

  // Helper function to check if a value is selected
  const isValueSelected = (filterId: string, value: string | number | FilterValue): boolean => {
    const stringValue = typeof value === 'object' ? String(value.value) : String(value);
    
    // Check both selectedFilters (string array format) and activeFilters (Set format)
    if (selectedFilters && filterId in selectedFilters) {
      return Array.isArray(selectedFilters[filterId]) && 
             selectedFilters[filterId].includes(stringValue);
    }
    
    if (activeFilters && filterId in activeFilters) {
      const filterValue = activeFilters[filterId];
      if (filterValue instanceof Set) {
        // Need to handle both string and number values in the Set
        return filterValue.has(typeof value === 'object' ? value.value : value) || 
               filterValue.has(stringValue);
      }
    }
    
    return false;
  };

  // Helper function to handle filter change for checkbox filters
  const handleFilterChange = (filterId: string, value: string | number | FilterValue, checked: boolean) => {
    // Always convert to string to ensure consistent handling
    const stringValue = typeof value === 'object' ? String(value.value) : String(value);
    
    // Debug logs to help identify issues
    console.log('Filter change:', { filterId, value, stringValue, checked });
    
    if (checked) {
      onFilterChange(filterId, [...(selectedFilters[filterId] || []), stringValue]);
    } else {
      onFilterChange(filterId, (selectedFilters[filterId] || []).filter(v => v !== stringValue));
    }
  };

  // Helper function to get value and count from option
  const getOptionValue = (option: string | FilterValue): string | number => {
    return typeof option === 'object' ? option.value : option;
  };

  const getOptionCount = (option: string | FilterValue): number => {
    return typeof option === 'object' ? option.count : 0;
  };

  // Обновите рендеринг фильтров, чтобы корректно обрабатывать фильтры для ноутбуков
  const renderFilterOptions = (filter: FilterOption) => {
    // Переводим названия фильтров для ноутбуков
    const getFilterLabel = (key: string, value: string | number) => {
      if (key === 'processor' && typeof value === 'string') {
        if (value.includes('Apple M')) return value; // Для чипов Apple сохраняем оригинальное название
        if (value.includes('Intel')) return value; // Для Intel процессоров сохраняем оригинальное название
        if (value.includes('AMD')) return value; // Для AMD процессоров сохраняем оригинальное название
        return value;
      }
      
      if (key === 'ram' && typeof value === 'string') {
        return value; // Оставляем оригинальное значение RAM
      }
      
      if (key === 'storageType' && typeof value === 'string') {
        return value; // Оставляем оригинальное значение типа хранилища
      }
      
      if (key === 'operatingSystem' && typeof value === 'string') {
        return value; // Оставляем оригинальное значение ОС
      }
      
      return value;
    };

    // Skip rendering the entire filter group if it's the category filter
    if (filter.key === 'category' || filter.name === 'Category') {
      return null;
    }

    return (
      <div key={filter.key || filter.name} className="mb-6">
        <h3 className="mb-2 font-medium">{filter.name}</h3>
        
        {filter.values.map(option => {
          const optionValue = getOptionValue(option);
          const filterKey = filter.key || filter.id || filter.name;
          const filterLabel = getFilterLabel(filterKey, optionValue);
          const optionKey = `${filterKey}-${optionValue}`;
          const isChecked = isValueSelected(filterKey, optionValue);
          
          // Debug for checkbox states
          console.log(`Option ${optionKey}: ${isChecked ? 'checked' : 'unchecked'}`);
          
          return (
            <div key={optionKey} className="flex items-center mt-1">
              <input
                type="checkbox"
                id={optionKey}
                className="checkbox checkbox-sm"
                checked={isChecked}
                onChange={() => handleFilterChange(
                  filterKey, 
                  optionValue, 
                  !isChecked
                )}
              />
              <label htmlFor={optionKey} className="ml-2 text-sm cursor-pointer">
                {filterLabel} 
                ({getOptionCount(option)})
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="mb-4 text-lg font-semibold">Filters</h3>
      
      {filters.map((filter) => {
        const filterId = filter.id || filter.key || '';
        
        if (filter.type === 'range' && filter.min !== undefined && filter.max !== undefined) {
          return (
            <div key={filterId} className="mb-6">
              <h4 className="mb-2 font-medium">{filter.name}</h4>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={minPriceInput}
                  onChange={handleMinPriceInput}
                  onBlur={applyPriceInputs}
                  onKeyDown={(e) => e.key === 'Enter' && applyPriceInputs()}
                  className="w-full input input-bordered input-sm"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={maxPriceInput}
                  onChange={handleMaxPriceInput}
                  onBlur={applyPriceInputs}
                  onKeyDown={(e) => e.key === 'Enter' && applyPriceInputs()}
                  className="w-full input input-bordered input-sm"
                  placeholder="Max"
                />
              </div>
              
              {/* YELLOW range slider with proper styling */}
              <div className="relative px-1 mt-4 mb-6">
                {/* Base track */}
                <div className="relative w-full h-3 bg-gray-300 rounded-lg">
                  {/* Active track - FULLY YELLOW */}
                  <div 
                    className="absolute top-0 h-full bg-yellow-400 rounded-lg"
                    style={{
                      left: `${((priceRange.current[0] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                      width: `${((priceRange.current[1] - priceRange.current[0]) / (priceRange.max - priceRange.min)) * 100}%`
                    }}
                  ></div>
                  
                  {/* Min handle - BRIGHT YELLOW with white border */}
                  <div 
                    className="absolute z-20 w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 border-2 border-white rounded-full shadow-md cursor-pointer top-1/2"
                    style={{ left: `${((priceRange.current[0] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = priceRange.current[0];
                      const width = e.currentTarget.parentElement!.clientWidth;
                      const valueRange = priceRange.max - priceRange.min;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const dx = moveEvent.clientX - startX;
                        const pctChange = dx / width;
                        const valueChange = pctChange * valueRange;
                        let newValue = Math.round(startValue + valueChange);
                        
                        // Constrain to min and max values, and below max handle
                        newValue = Math.max(priceRange.min, Math.min(priceRange.current[1] - 10, newValue));
                        
                        setPriceRange(prev => ({ ...prev, current: [newValue, prev.current[1]] }));
                        setMinPriceInput(String(newValue));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                        onFilterChange('price', [priceRange.current[0], priceRange.current[1]]);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  ></div>
                  
                  {/* Max handle - BRIGHT YELLOW with white border */}
                  <div 
                    className="absolute z-10 w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 border-2 border-white rounded-full shadow-md cursor-pointer top-1/2"
                    style={{ left: `${((priceRange.current[1] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = priceRange.current[1];
                      const width = e.currentTarget.parentElement!.clientWidth;
                      const valueRange = priceRange.max - priceRange.min;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const dx = moveEvent.clientX - startX;
                        const pctChange = dx / width;
                        const valueChange = pctChange * valueRange;
                        let newValue = Math.round(startValue + valueChange);
                        
                        // Constrain to min and max values, and above min handle
                        newValue = Math.min(priceRange.max, Math.max(priceRange.current[0] + 10, newValue));
                        
                        setPriceRange(prev => ({ ...prev, current: [prev.current[0], newValue] }));
                        setMaxPriceInput(String(newValue));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                        onFilterChange('price', [priceRange.current[0], priceRange.current[1]]);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  ></div>
                </div>
                
                {/* Price labels */}
                <div className="flex justify-between px-1 mt-4 text-sm font-medium">
                  <span>{priceRange.current[0]} NOK</span>
                  <span>{priceRange.current[1]} NOK</span>
                </div>
              </div>
            </div>
          );
        }

        return renderFilterOptions(filter);
      })}
    </div>
  );
};

export default ProductFilters;
