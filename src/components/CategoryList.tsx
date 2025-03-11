import React from 'react';
import { FaMobileAlt,FaLaptopCode, FaGamepad, FaTv, FaHome, FaWrench } from 'react-icons/fa';

interface Category {
  name: string;
  icon: JSX.Element;
  link: string;
}

const categories: Category[] = [
  { name: 'Mobil', icon: <FaMobileAlt />, link: '/mobil-og-foto' },
  { name: 'Data og tilbehør', icon: <FaLaptopCode />, link: '/data-og-tilbehor' },
  { name: 'Gaming', icon: <FaGamepad />, link: '/gaming' },
  { name: 'TV og lyd', icon: <FaTv />, link: '/tv-og-lyd' },
  { name: 'Smarte hjem', icon: <FaHome />, link: '/smarte-hjem' },
  { name: 'POWER Support', icon: <FaWrench />, link: '/power-support' },
];

const CategoryList: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {categories.map((category) => (
        <a
          key={category.name}
          href={category.link}
          className="flex flex-col items-center p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <div className="text-3xl mb-2">{category.icon}</div>
          <span className="text-sm font-medium">{category.name}</span>
        </a>
      ))}
    </div>
  );
};

export default CategoryList;