import React, { useState, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import { getTheme } from '../utils/themeUtils';

const GamingPage: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };

    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  return (
    <div>
      <button 
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 btn btn-sm ${currentTheme === 'dark' ? 'btn-gaming-dark' : 'btn-gaming-light'}`}
        title={showFilters ? 'Hide Filters' : 'Show Filters'}
      >
        <FaFilter className="filter-icon" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      {showFilters && (
        <div className="filters">
          {/* Add filter options here */}
        </div>
      )}
      {/* Add the rest of the gaming page content here */}
    </div>
  );
};

export default GamingPage;