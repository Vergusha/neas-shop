import React, { useState } from 'react';
import CategoryList from './CategoryList';
import { Filter } from 'lucide-react';

interface CategoryLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const CategoryLayout: React.FC<CategoryLayoutProps> = ({ children, title }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Category navigation section that will stay at the top */}
      <section className="py-4 mb-6 bg-base-200 rounded-lg">
        <div className="px-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Categories</h2>
          <CategoryList />
        </div>
      </section>
      
      {/* Page title if provided */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#003D2D] dark:text-[#95c672]">{title}</h1>
          <button
            onClick={toggleFilters}
            className="flex items-center gap-2 px-4 py-2 text-white bg-[#003D2D] dark:bg-[#95c672] dark:text-gray-900 rounded-lg hover:bg-[#005040] dark:hover:bg-[#7fb356] transition-colors"
          >
            <Filter size={20} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      )}
      
      {/* Main content area */}
      {children}
    </div>
  );
};

export default CategoryLayout;
