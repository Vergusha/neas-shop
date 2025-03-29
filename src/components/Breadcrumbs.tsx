import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Соответствие названий маршрутов читабельным именам
const routeNameMap: Record<string, string> = {
  'product': 'Product',
  'mobile': 'Mobile Phones',
  'tv-audio': 'TV & Audio',
  'gaming': 'Gaming',
  'laptops': 'Laptops',
  'data-accessories': 'Data & Accessories',
  'support': 'Support',
  'search': 'Search Results',
  'cart': 'Shopping Cart',
  'favorites': 'Favorites',
  'profile': 'My Profile',
  'login': 'Login',
  'register': 'Register',
  'admin': 'Admin Panel'
};

// Соответствие коллекций Firebase маршрутам в приложении
const collectionToRoutePath: Record<string, string> = {
  'mobile': 'mobile',
  'tv': 'tv-audio',
  'audio': 'tv-audio',
  'gaming': 'gaming',
  'laptops': 'laptops',
  'data-accessories': 'data-accessories'
};

interface BreadcrumbItem {
  name: string;
  path: string;
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  
  useEffect(() => {
    const fetchBreadcrumbs = async () => {
      const pathSegments = location.pathname.split('/').filter(segment => segment);
      
      // Всегда начинаем с Home
      const breadcrumbItems: BreadcrumbItem[] = [
        { name: 'Home', path: '/' }
      ];
      
      // Проверяем, находимся ли мы на странице товара
      if (pathSegments[0] === 'product' && pathSegments.length > 1) {
        const productId = pathSegments[1];
        
        // Пытаемся получить данные о товаре из всех возможных коллекций
        const collections = ['mobile', 'tv', 'audio', 'gaming', 'laptops', 'data-accessories'];
        let productData = null;
        let productCollection = null;
        
        // Поиск товара в разных коллекциях
        for (const collection of collections) {
          const docRef = doc(db, collection, productId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            productData = docSnap.data();
            productCollection = collection;
            break;
          }
        }
        
        if (productCollection && collectionToRoutePath[productCollection]) {
          // Если коллекция найдена, добавляем соответствующую категорию
          const routePath = collectionToRoutePath[productCollection];
          const categoryName = routeNameMap[routePath] || productCollection.charAt(0).toUpperCase() + productCollection.slice(1);
          
          breadcrumbItems.push({
            name: categoryName,
            path: `/${routePath}`
          });
        }
        
        // Форматируем название продукта для отображения в хлебных крошках
        let formattedProductName = productData?.name || 'Product Details';
        
        // Для мобильных устройств отображаем полное название (как в ProductPage)
        if (productCollection === 'mobile' && productData) {
          const nameComponents = [
            productData.brand || '', 
            productData.model || '', 
            productData.modelNumber || '', 
            productData.memory || '', 
            productData.color || ''
          ]
            .filter(component => component && component.trim() !== '')
            .join(' ');
          
          formattedProductName = nameComponents || productData.name;
        }
        
        // Добавляем страницу товара с форматированным названием
        breadcrumbItems.push({
          name: formattedProductName,
          path: location.pathname
        });
      } else {
        // Обработка обычных путей (не страниц товаров)
        let currentPath = '';
        
        pathSegments.forEach((segment, index) => {
          currentPath += `/${segment}`;
          
          // Используем карту маршрутов для отображаемых имен
          const displayName = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
          
          breadcrumbItems.push({
            name: displayName,
            path: currentPath
          });
        });
      }
      
      setBreadcrumbs(breadcrumbItems);
    };
    
    fetchBreadcrumbs();
  }, [location.pathname]);
  
  // Не рендерим хлебные крошки на главной странице
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
                <span className="text-gray-500 truncate max-w-[300px]">{breadcrumb.name}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Breadcrumbs;
