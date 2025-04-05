import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaMobileAlt, FaLaptop, FaGamepad, FaTv } from 'react-icons/fa';
import { getTheme } from '../utils/themeUtils';

const CategoryList: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);
  
  // Define all categories with their paths and icons
  const categories = [
    { name: 'Mobile Phones', path: '/mobile', icon: <FaMobileAlt className="text-3xl mb-2" /> },
    { name: 'Laptops', path: '/laptops', icon: <FaLaptop className="text-3xl mb-2" /> },
    { name: 'Gaming', path: '/gaming', icon: <FaGamepad className="text-3xl mb-2" /> },
    { name: 'TV & Audio', path: '/tv-audio', icon: <FaTv className="text-3xl mb-2" /> },
  ];

  // Check if the current path matches one of our category paths
  const isPathActive = (path: string) => {
    if (currentPath === path) return true;
    // Special case for tv-audio which might be just /tv or /audio
    if (path === '/tv-audio' && (currentPath === '/tv' || currentPath === '/audio')) return true;
    return false;
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {categories.map((category) => {
        const isActive = isPathActive(category.path);
        
        const bgColor = isActive 
          ? currentTheme === 'dark' ? 'bg-[#d45288] text-gray-900' : 'bg-[#003D2D] text-white'
          : currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white';
        
        const textColor = isActive 
          ? currentTheme === 'dark' ? 'text-gray-900' : 'text-white'
          : currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800';
        
        const iconColor = isActive
          ? currentTheme === 'dark' ? 'text-gray-900' : 'text-white'
          : currentTheme === 'dark' ? 'text-[#d45288]' : 'text-[#003D2D]';
        
        return (
          <Link 
            key={category.name} 
            to={category.path} 
            className={`flex flex-col items-center p-4 rounded-lg shadow-md ${bgColor} hover:shadow-lg transition-all`}
          >
            <div className={iconColor}>{category.icon}</div>
            <span className={`text-center ${textColor}`}>{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryList;