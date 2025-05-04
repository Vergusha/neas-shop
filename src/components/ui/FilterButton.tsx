import React from 'react';
import { FaFilter } from 'react-icons/fa';

interface FilterButtonProps {
  showFilters: boolean;
  onClick: () => void;
  currentTheme: 'light' | 'dark';
}

const FilterButton: React.FC<FilterButtonProps> = ({ showFilters, onClick, currentTheme }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all duration-300
        ${currentTheme === 'dark' 
          ? 'bg-[#95c672] text-gray-800 hover:bg-[#a7d784] hover:shadow-lg' 
          : 'bg-[#003D2D] text-white hover:bg-[#004d3d] hover:shadow-lg'}
      `}
    >
      <FaFilter className="text-sm" />
      <span className="text-sm font-medium">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
    </button>
  );
};

export default FilterButton;