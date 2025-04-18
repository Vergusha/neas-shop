import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTheme } from '../utils/themeUtils';

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
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  const debouncedUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const debouncedFilterChange = useCallback((values: [number, number]) => {
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    debouncedUpdate.current = setTimeout(() => {
      onFilterChange('price', values);
    }, 100);
  }, [onFilterChange]);

  useEffect(() => {
    if (initializedRef.current) return;

    const priceFilter = filters.find(f => (f.key === 'price' || f.id === 'price') && f.type === 'range');
    if (priceFilter && priceFilter.min !== undefined && priceFilter.max !== undefined) {
      const min = priceFilter.min;
      const max = priceFilter.max;
      let current: [number, number] = [min, max];
      
      // Check for active price filters in both formats (selectedFilters and activeFilters)
      if (activeFilters.price && Array.isArray(activeFilters.price)) {
        current = activeFilters.price as [number, number];
      } else if (selectedFilters.price && selectedFilters.price.length === 2) {
        const [minStr, maxStr] = selectedFilters.price;
        const parsedMin = parseInt(minStr, 10);
        const parsedMax = parseInt(maxStr, 10);
        if (!isNaN(parsedMin) && !isNaN(parsedMax)) {
          current = [parsedMin, parsedMax];
        }
      }

      setPriceRange({ min, max, current });
      setMinPriceInput(String(current[0]));
      setMaxPriceInput(String(current[1]));
      initializedRef.current = true;
    }
  }, [filters, activeFilters, selectedFilters]);

  useEffect(() => {
    return () => {
      if (debouncedUpdate.current) {
        clearTimeout(debouncedUpdate.current);
      }
    };
  }, []);

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

  const isValueSelected = (filterId: string, value: string | number | FilterValue): boolean => {
    const stringValue = typeof value === 'object' ? String(value.value) : String(value);
    const numValue = typeof value === 'object' ? value.value : value;
    
    // Check selectedFilters format
    if (selectedFilters && filterId in selectedFilters) {
      return Array.isArray(selectedFilters[filterId]) && 
             selectedFilters[filterId].includes(stringValue);
    }
    
    // Check activeFilters format
    if (activeFilters && filterId in activeFilters) {
      const filterValue = activeFilters[filterId];
      if (filterValue instanceof Set) {
        return filterValue.has(numValue) || filterValue.has(stringValue);
      }
    }
    
    return false;
  };

  const handleFilterChange = (filterId: string, value: string | number | FilterValue, checked: boolean) => {
    const stringValue = typeof value === 'object' ? String(value.value) : String(value);
    
    // Handle the change with the proper format
    if (checked) {
      onFilterChange(filterId, [...(selectedFilters[filterId] || []), stringValue]);
    } else {
      onFilterChange(filterId, (selectedFilters[filterId] || []).filter(v => v !== stringValue));
    }
  };

  const getOptionValue = (option: string | FilterValue): string | number => {
    return typeof option === 'object' ? option.value : option;
  };

  const getOptionCount = (option: string | FilterValue): number => {
    return typeof option === 'object' ? option.count : 0;
  };

  const renderPriceRangeSlider = () => {
    // Use theme-appropriate colors
    const themeColors = currentTheme === 'dark' 
      ? { track: 'bg-gray-700', thumb: 'bg-[#95c672]', focus: 'focus:ring-[#95c672]', border: 'border-gray-800' }
      : { track: 'bg-gray-200', thumb: 'bg-[#003D2D]', focus: 'focus:ring-[#003D2D]', border: 'border-white' };

    const handleDrag = (
      startEvent: React.MouseEvent,
      isMin: boolean
    ) => {
      startEvent.preventDefault();
      
      const slider = startEvent.currentTarget.parentElement;
      if (!slider) return;

      const sliderRect = slider.getBoundingClientRect();
      const startX = startEvent.clientX;
      const startValue = isMin ? priceRange.current[0] : priceRange.current[1];

      const calculateNewValue = (currentX: number) => {
        const dx = currentX - startX;
        const percent = dx / sliderRect.width;
        const range = priceRange.max - priceRange.min;
        const rawValue = startValue + (range * percent);
        
        return Math.round(rawValue / 100) * 100;
      };

      const handleMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        let newValue = calculateNewValue(moveEvent.clientX);

        if (isMin) {
          newValue = Math.max(priceRange.min, Math.min(priceRange.current[1] - 100, newValue));
          const newValues: [number, number] = [newValue, priceRange.current[1]];
          setPriceRange(prev => ({ ...prev, current: newValues }));
          setMinPriceInput(String(newValue));
          debouncedFilterChange(newValues);
        } else {
          newValue = Math.min(priceRange.max, Math.max(priceRange.current[0] + 100, newValue));
          const newValues: [number, number] = [priceRange.current[0], newValue];
          setPriceRange(prev => ({ ...prev, current: newValues }));
          setMaxPriceInput(String(newValue));
          debouncedFilterChange(newValues);
        }
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        onFilterChange('price', [priceRange.current[0], priceRange.current[1]]);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    };

    return (
      <div className="relative px-1 mt-4 mb-6">
        <div className={`relative w-full h-3 ${themeColors.track} rounded-lg`}>
          <div 
            className={`absolute top-0 h-full ${currentTheme === 'dark' ? 'bg-[#95c672]' : 'bg-[#003D2D]'} rounded-lg transition-all duration-150`}
            style={{
              left: `${((priceRange.current[0] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
              width: `${((priceRange.current[1] - priceRange.current[0]) / (priceRange.max - priceRange.min)) * 100}%`
            }}
          />
          
          <button
            type="button"
            className={`absolute z-20 w-6 h-6 -ml-3 -mt-1.5 ${themeColors.thumb} ${themeColors.border} border-2 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all focus:outline-none ${themeColors.focus} focus:ring-2`}
            style={{
              left: `${((priceRange.current[0] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
              top: '50%'
            }}
            onMouseDown={(e) => handleDrag(e, true)}
            onClick={(e) => e.stopPropagation()}
          />
          
          <button
            type="button"
            className={`absolute z-20 w-6 h-6 -ml-3 -mt-1.5 ${themeColors.thumb} ${themeColors.border} border-2 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all focus:outline-none ${themeColors.focus} focus:ring-2`}
            style={{
              left: `${((priceRange.current[1] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
              top: '50%'
            }}
            onMouseDown={(e) => handleDrag(e, false)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <div className="flex justify-between px-1 mt-4">
          <span className="text-sm font-medium">{priceRange.current[0]} NOK</span>
          <span className="text-sm font-medium">{priceRange.current[1]} NOK</span>
        </div>
      </div>
    );
  };

  const renderFilterOptions = (filter: FilterOption) => {
    const getFilterLabel = (key: string, value: string | number) => {
      if (key === 'processor' && typeof value === 'string') {
        if (value.includes('Apple M')) return value;
        if (value.includes('Intel')) return value;
        if (value.includes('AMD')) return value;
        return value;
      }
      
      if (key === 'ram' && typeof value === 'string') {
        return value;
      }
      
      if (key === 'storageType' && typeof value === 'string') {
        return value;
      }
      
      if (key === 'operatingSystem' && typeof value === 'string') {
        return value;
      }
      
      return value;
    };

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
                {typeof getOptionCount(option) === 'number' && getOptionCount(option) > 0 && 
                  ` (${getOptionCount(option)})`
                }
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-gray-200">
      <h3 className="mb-4 text-lg font-semibold">Filters</h3>
      
      {[...filters].sort((a, b) => {
        // Price filter should always appear first
        if ((a.type === 'range' && a.key === 'price') || (a.type === 'range' && a.id === 'price')) return -1;
        if ((b.type === 'range' && b.key === 'price') || (b.type === 'range' && b.id === 'price')) return 1;

        // Brand filter should appear second
        if ((a.key === 'brand' || a.id === 'brand')) return -1;
        if ((b.key === 'brand' || b.id === 'brand')) return 1;
        
        return 0;
      }).map((filter) => {
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
                <span className="text-gray-500 dark:text-gray-400">-</span>
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
              
              {renderPriceRangeSlider()}
            </div>
          );
        }

        return renderFilterOptions(filter);
      })}
    </div>
  );
};

export default ProductFilters;
