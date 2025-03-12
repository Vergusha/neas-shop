import React, { JSX } from 'react';
import { FaMobileAlt, FaLaptopCode, FaGamepad, FaTv, FaHome, FaWrench } from 'react-icons/fa';

interface Category {
  name: string;
  icon: JSX.Element;
  link: string;
}

const categories: Category[] = [
  { name: 'Mobil', icon: <FaMobileAlt />, link: '/mobil-og-foto' },
  { name: 'Data og tilbehør', icon: <FaLaptopCode />, link: '/data-og-tilbehor' },
  { name: 'Gaming', icon: <FaGamepad />, link: '/gaming' },
  { name: 'TV и lyd', icon: <FaTv />, link: '/tv-og-lyd' },
  { name: 'Smarte hjem', icon: <FaHome />, link: '/smarte-hjem' },
  { name: 'POWER Support', icon: <FaWrench />, link: '/power-support' },
];

const logoColor = '#F0E965'; // Цвет логотипа

const CategoryList: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-8">
      {categories.map((category) => (
        <a
          key={category.name}
          href={category.link}
          className="flex flex-col items-center p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
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