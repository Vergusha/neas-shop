import React, { useEffect } from 'react';
import { Product } from '../../types/product';
import { useFilters } from '../../contexts/FilterContext';

interface CategoryPageWrapperProps {
  /**
   * The category identifier used for filter customization
   */
  category: string;
  
  /**
   * The products data fetched from the database
   */
  products: Product[];
  
  /**
   * Function to be called when products are loaded and filters are ready
   * @param filteredProducts - The filtered products based on active filters
   */
  onFiltersReady?: (filteredProducts: Product[]) => void;
  
  /**
   * Children components to render
   */
  children: React.ReactNode;
}

/**
 * A wrapper component for category pages that handles filter integration
 * This makes it easy to convert any category page to use the unified filter system
 */
const CategoryPageWrapper: React.FC<CategoryPageWrapperProps> = ({
  category,
  products,
  onFiltersReady,
  children
}) => {
  const { 
    setCategory, 
    setProducts, 
    extractFilters,
    filteredProducts
  } = useFilters();
  
  // Set the category and initialize products when component mounts
  useEffect(() => {
    setCategory(category);
  }, [category]);
  
  // Update products and extract filters when product data changes
  useEffect(() => {
    if (products && products.length > 0) {
      setProducts(products);
      extractFilters(products);
    }
  }, [products]);
  
  // Call onFiltersReady callback when filtered products change
  useEffect(() => {
    if (onFiltersReady && filteredProducts) {
      onFiltersReady(filteredProducts);
    }
  }, [filteredProducts]);

  return (
    <>{children}</>
  );
};

export default CategoryPageWrapper;