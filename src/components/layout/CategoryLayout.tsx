import React from 'react';
import CategoryList from '../product/CategoryList';

interface CategoryLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const CategoryLayout: React.FC<CategoryLayoutProps> = ({ children, title }) => {
  return (
    <div className="container px-4 py-4 mx-auto">
      {/* Category navigation section that will stay at the top */}
      <section className="py-4 mb-6 rounded-lg bg-base-200">
        <div className="px-4">
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">Categories</h2>
          <CategoryList />
        </div>
      </section>
      
      {/* Page title if provided */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#003D2D] dark:text-[#95c672]">{title}</h1>
        </div>
      )}
      
      {/* Main content area */}
      {children}
    </div>
  );
};

export default CategoryLayout;
