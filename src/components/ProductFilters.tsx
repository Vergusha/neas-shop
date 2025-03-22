import React from 'react';

interface FilterValue {
  value: string | number;
  count: number;
}

interface FilterOption {
  name: string;
  key?: string;
  values: FilterValue[] | string[];
  id?: string;
}

interface ProductFiltersProps {
  filters: FilterOption[];
  selectedFilters?: Record<string, string[]>;
  activeFilters?: { [key: string]: Set<string | number> };
  onFilterChange: (filterId: string, values: string[]) => void | ((filterKey: string, values: string[]) => void);
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  selectedFilters = {},
  activeFilters = {},
  onFilterChange,
}) => {
  // Helper function to check if a value is selected
  const isValueSelected = (filterId: string, value: string | number): boolean => {
    if (selectedFilters && filterId in selectedFilters) {
      // Handle array type (MobilePage)
      return Array.isArray(selectedFilters[filterId]) && 
             selectedFilters[filterId].includes(String(value));
    }
    if (activeFilters && filterId in activeFilters) {
      // Handle Set type (TvPage)
      return activeFilters[filterId].has(value);
    }
    return false;
  };

  // Helper function to handle filter change
  const handleFilterChange = (filterId: string, value: string | number, checked: boolean) => {
    // Проверка какой тип фильтров используется и вызов соответствующей функции
    if (Object.keys(selectedFilters).length > 0) {
      // Обработка для MobilePage (string[])
      const currentValues = selectedFilters[filterId] || [];
      const stringValue = String(value);
      const newValues = checked
        ? [...currentValues, stringValue]
        : currentValues.filter((v) => v !== stringValue);
      onFilterChange(filterId, newValues);
    } else {
      // Обработка для TvPage (Set<string | number>)
      const filterKey = filterId;
      const currentValues = activeFilters[filterKey] ? Array.from(activeFilters[filterKey]) : [];
      let newValues: string[] = [];
      
      if (checked) {
        newValues = [...currentValues.map(String), String(value)];
      } else {
        newValues = currentValues.map(String).filter(v => v !== String(value));
      }
      
      onFilterChange(filterKey, newValues);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Фильтры</h3>
      {filters.map((filter) => (
        <div key={filter.id || filter.key} className="mb-4">
          <h4 className="font-medium mb-2">{filter.name}</h4>
          <div className="space-y-2">
            {filter.values.map((item) => {
              const isFilterValue = typeof item !== 'string';
              const value = isFilterValue ? (item as FilterValue).value : item;
              const count = isFilterValue ? (item as FilterValue).count : undefined;
              const filterId = filter.id || filter.key || '';
              
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
      ))}
    </div>
  );
};

export default ProductFilters;
