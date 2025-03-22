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
  const isValueSelected = (filterId: string, value: string | number): boolean => {
    if (selectedFilters && filterId in selectedFilters) {
      // Handle array type (MobilePage)
      return Array.isArray(selectedFilters[filterId]) && 
             selectedFilters[filterId].includes(String(value));
    }
    if (activeFilters && filterId in activeFilters) {
      // Handle Set type (TvPage)
      const filterValue = activeFilters[filterId];
      if (filterValue instanceof Set) {
        return filterValue.has(value);
      }
    }
    return false;
  };

  // Helper function to handle filter change for checkbox filters
  const handleFilterChange = (filterId: string, value: string | number, checked: boolean) => {
    if (checked) {
      onFilterChange(filterId, [...(selectedFilters[filterId] || []), String(value)]);
    } else {
      onFilterChange(filterId, (selectedFilters[filterId] || []).filter(v => v !== String(value)));
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      
      {filters.map((filter) => {
        const filterId = filter.id || filter.key || '';
        
        if (filter.type === 'range' && filter.min !== undefined && filter.max !== undefined) {
          return (
            <div key={filterId} className="mb-6">
              <h4 className="font-medium mb-2">{filter.name}</h4>
              
              <div className="flex items-center mb-3 gap-2">
                <input
                  type="number"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={minPriceInput}
                  onChange={handleMinPriceInput}
                  onBlur={applyPriceInputs}
                  onKeyDown={(e) => e.key === 'Enter' && applyPriceInputs()}
                  className="input input-bordered input-sm w-full"
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
                  className="input input-bordered input-sm w-full"
                  placeholder="Max"
                />
              </div>
              
              {/* YELLOW range slider with proper styling */}
              <div className="relative mt-4 mb-6 px-1">
                {/* Base track */}
                <div className="w-full h-3 bg-gray-300 rounded-lg relative">
                  {/* Active track - FULLY YELLOW */}
                  <div 
                    className="h-full bg-yellow-400 absolute top-0 rounded-lg"
                    style={{
                      left: `${((priceRange.current[0] - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                      width: `${((priceRange.current[1] - priceRange.current[0]) / (priceRange.max - priceRange.min)) * 100}%`
                    }}
                  ></div>
                  
                  {/* Min handle - BRIGHT YELLOW with white border */}
                  <div 
                    className="w-6 h-6 bg-yellow-400 rounded-full absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer shadow-md border-2 border-white z-20"
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
                    className="w-6 h-6 bg-yellow-400 rounded-full absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer shadow-md border-2 border-white z-10"
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
                <div className="flex justify-between px-1 text-sm font-medium mt-4">
                  <span>{priceRange.current[0]} NOK</span>
                  <span>{priceRange.current[1]} NOK</span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={filterId} className="mb-4">
            <h4 className="font-medium mb-2">{filter.name}</h4>
            <div className="space-y-2">
              {filter.values.map((item) => {
                const isFilterValue = typeof item !== 'string';
                const value = isFilterValue ? (item as FilterValue).value : item;
                const count = isFilterValue ? (item as FilterValue).count : undefined;
                
                return (
                  <label key={String(value)} className="flex items-center">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-2"
                      checked={isValueSelected(filterId, value)}
                      onChange={(e) => handleFilterChange(filterId, value, e.target.checked)}
                    />
                    <span className="text-sm">{value}</span>
                    {count !== undefined && <span className="text-xs text-gray-500 ml-1">({count})</span>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductFilters;
