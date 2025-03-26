import React from 'react';
import { Link } from 'react-router-dom';

const categories = [
  { name: 'Mobile Phones', path: '/products/mobile' },
  { name: 'TVs', path: '/products/tv' },
  { name: 'Gaming', path: '/products/gaming' },
  { name: 'Laptops', path: '/products/laptops' },
];

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <ul>
        {categories.map((category) => (
          <li key={category.name}>
            <Link to={category.path}>{category.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;