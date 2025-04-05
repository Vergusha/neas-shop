import React, { useState, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import { getTheme } from '../utils/themeUtils';

const AudioPage: React.FC = () => {
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
        className="btn btn-sm flex items-center gap-2"
        style={{ 
          backgroundColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
          borderColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
          color: currentTheme === 'dark' ? '#1f2937' : 'white'
        }}
      >
        <FaFilter className="filter-icon" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      {showFilters && (
        <div className="filters">
          {/* Filter options go here */}
        </div>
      )}
      {/* Audio products list goes here */}
    </div>
  );
};

export default AudioPage;