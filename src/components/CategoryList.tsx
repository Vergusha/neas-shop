import React from 'react';
import { Link } from 'react-router-dom';
import { FaMobileAlt, FaLaptop, FaGamepad, FaTv } from 'react-icons/fa';

const CategoryList: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Link to="/mobile" className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <FaMobileAlt className="text-3xl text-primary mb-2" />
        <span className="text-center">Mobile Phones</span>
      </Link>
      
      <Link to="/laptops" className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <FaLaptop className="text-3xl text-primary mb-2" />
        <span className="text-center">Laptops</span>
      </Link>
      
      <Link to="/gaming" className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <FaGamepad className="text-3xl text-primary mb-2" />
        <span className="text-center">Gaming</span>
      </Link>
      
      <Link to="/tv-audio" className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <FaTv className="text-3xl text-primary mb-2" />
        <span className="text-center">TV & Audio</span>
      </Link>
    </div>
  );
};

export default CategoryList;