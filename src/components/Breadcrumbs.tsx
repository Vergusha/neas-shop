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
  'data-accessories': 'Data & Accessories',
  'data-og-tilbehor': 'Data & Accessories',
  'gaming': 'Gaming',
  'tv-audio': 'TV & Audio',
  'tv-og-lyd': 'TV & Audio',
  'smart-home': 'Smart Home',
  'smarte-hjem': 'Smart Home',
  'power-support': 'Support',
  'support': 'Support',
  'search': 'Search Results',
  'cart': 'Shopping Cart',
  'favorites': 'Favorites',
  'profile': 'My Profile',
  'login': 'Login',
  'register': 'Register'
};

// Fix the collection to route path mapping with EXACT routes
const collectionToRoutePath: Record<string, string> = {
  'mobile': '/products/mobile',  // Make sure this matches App.tsx routes
  'tv': '/products/tv-audio',    // Make sure this matches App.tsx routes
  'products': '/products',
  'gaming': '/products/gaming',
  'smart-home': '/products/smart-home',
};

// Define exact display names for breadcrumbs based on collection
const collectionDisplayNames: Record<string, string> = {
  'mobile': 'Mobile Phones',
  'tv': 'TV & Audio',
  'products': 'Products',
  'gaming': 'Gaming',
  'smart-home': 'Smart Home'
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
      // Get collection directly from session storage
      const productCollection = sessionStorage.getItem('lastProductCollection');
      console.log('Product collection from session:', productCollection);
      
      if (productCollection && collectionToRoutePath[productCollection]) {
        // Use exact predefined path and name to avoid mismatches
        const routePath = collectionToRoutePath[productCollection];
        const categoryName = collectionDisplayNames[productCollection] || 
                            productCollection.charAt(0).toUpperCase() + productCollection.slice(1);
        
        // Add correct category link to breadcrumbs
        breadcrumbItems.push({
          name: categoryName,
          path: routePath
        });
      } else {
        // Fallback to generic Products path
        breadcrumbItems.push({
          name: 'Products',
          path: '/products'
        });
      }
      
      // Add the product page
      breadcrumbItems.push({
        name: 'Product Details',
        path: `/${pathSegments[0]}/${pathSegments[1]}`
      });
    } else {
      // Handle regular paths
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        
        // Skip adding "products" segment alone to breadcrumbs
        if (segment === 'products' && index === 0 && pathSegments.length > 1) {
          return;
        }
        
        // Use route name map for display names
        const displayName = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        
        breadcrumbItems.push({
          name: displayName,
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
