import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Maps route segments to readable names
const routeNameMap: Record<string, string> = {
  'product': 'Product',
  'mobile': 'Mobile Phones',
  'tv': 'TV & Audio',
  'products': 'Products',
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

// Map to convert collection names to route paths
const collectionToRoutePath: Record<string, string> = {
  'mobile': '/mobil',
  'tv': '/tv-og-lyd',
  'products': '/products',
  'gaming': '/gaming',
  'smart-home': '/smarte-hjem',
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
    
    // Check if we're on a product detail page
    if (pathSegments[0] === 'product' && pathSegments.length > 1) {
      // Try to get the collection from session storage
      const productCollection = sessionStorage.getItem('lastProductCollection') || 'products';
      
      // Add the collection to breadcrumb path if we have a mapping for it
      if (collectionToRoutePath[productCollection]) {
        const routePath = collectionToRoutePath[productCollection];
        const routeName = routeNameMap[routePath.substring(1)] || productCollection;
        breadcrumbItems.push({
          name: routeName,
          path: routePath
        });
      }
      
      // Add the product page
      breadcrumbItems.push({
        name: 'Product',
        path: `/${pathSegments[0]}/${pathSegments[1]}`
      });
    } else {
      // Handle regular paths
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        
        // Skip adding "products" segment to breadcrumbs
        if (segment === 'products') {
          return;
        }
        
        // For normal segments
        breadcrumbItems.push({
          name: routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentPath
        });
      });
    }
    
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
