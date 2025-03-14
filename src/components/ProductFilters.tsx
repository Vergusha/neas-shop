import React from 'react';

interface FilterOption {
  id: string;
  name: string;
  values: string[];
}

interface ProductFiltersProps {
  filters: FilterOption[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filterId: string, values: string[]) => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Фильтры</h3>
      {filters.map((filter) => (
        <div key={filter.id} className="mb-4">
          <h4 className="font-medium mb-2">{filter.name}</h4>
          <div className="space-y-2">
            {filter.values.map((value) => (
              <label key={value} className="flex items-center">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-2"
                  checked={selectedFilters[filter.id]?.includes(value) || false}
                  onChange={(e) => {
                    const currentValues = selectedFilters[filter.id] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, value]
                      : currentValues.filter((v) => v !== value);
                    onFilterChange(filter.id, newValues);
                  }}
                />
                <span className="text-sm">{value}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductFilters;
