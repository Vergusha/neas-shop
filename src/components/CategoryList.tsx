import React, { JSX } from 'react';
import { FaMobileAlt, FaLaptopCode, FaGamepad, FaTv, FaHome, FaWrench } from 'react-icons/fa';

interface Category {
  name: string;
  icon: JSX.Element;
  link: string;
}

const categories: Category[] = [
  { name: 'Mobile', icon: <FaMobileAlt />, link: '/products/mobile' },
  { name: 'Data and Accessories', icon: <FaLaptopCode />, link: '/products/data-accessories' },
  { name: 'Gaming', icon: <FaGamepad />, link: '/products/gaming' },
  { name: 'TV and Sound', icon: <FaTv />, link: '/products/tv-audio' },
  { name: 'Smart Home', icon: <FaHome />, link: '/products/smart-home' },
  { name: 'NEAS Support', icon: <FaWrench />, link: '/products/support' },
];

const logoColor = '#F0E965'; // Цвет логотипа

const CategoryList: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-8">
      {categories.map((category) => (
        <a
          key={category.name}
          href={category.link}
          className="flex flex-col items-center p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 category-animation"
          style={{ color: 'inherit', transition: 'color 0.3s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = logoColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
        >
          <div className="text-3xl mb-2">{category.icon}</div>
          <span className="text-sm font-medium">{category.name}</span>
        </a>
      ))}
    </div>
  );
};

export default CategoryList;