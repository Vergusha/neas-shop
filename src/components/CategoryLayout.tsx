import React from 'react';
import CategoryList from './CategoryList';

interface CategoryLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const CategoryLayout: React.FC<CategoryLayoutProps> = ({ children, title }) => {
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
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
      )}
      
      {/* Main content area */}
      {children}
    </div>
  );
};

export default CategoryLayout;
