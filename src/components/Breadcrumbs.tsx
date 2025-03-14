import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Maps route segments to readable names
const routeNameMap: Record<string, string> = {
  'products': 'Products',
  'product': 'Product',
  'mobil': 'Mobile Phones',
  'data-og-tilbehor': 'Data & Accessories',
  'gaming': 'Gaming',
  'tv-og-lyd': 'TV & Audio',
  'smarte-hjem': 'Smart Home',
  'power-support': 'Support',
  'search': 'Search Results',
  'cart': 'Shopping Cart',
  'favorites': 'Favorites',
  'profile': 'My Profile',
  'login': 'Login',
  'register': 'Register'
};

interface BreadcrumbItem {
  name: string;
  path: string;
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    
    // Always start with Home
    const breadcrumbItems: BreadcrumbItem[] = [
      { name: 'Home', path: '/' }
    ];
    
    // Build up the breadcrumb path
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Special case for product detail page
      if (segment === 'product' && pathSegments[index + 1]) {
        breadcrumbItems.push({
          name: routeNameMap[segment] || segment,
          path: currentPath
        });
        return;
      }
      
      // For normal segments
      breadcrumbItems.push({
        name: routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath
      });
    });
    
    setBreadcrumbs(breadcrumbItems);
  }, [location.pathname]);
  
  // Don't render breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-2">
      <div className="text-sm breadcrumbs">
        <ul className="flex flex-row items-center">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.path} className="flex items-center">
              {index > 0 && <ChevronRight size={14} className="mx-1" />}
              {index < breadcrumbs.length - 1 ? (
                <Link to={breadcrumb.path} className="hover:text-primary">{breadcrumb.name}</Link>
              ) : (
                <span className="text-gray-500">{breadcrumb.name}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Breadcrumbs;
