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
        className="flex items-center gap-2 btn btn-sm"
        style={{ 
          backgroundColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
          borderColor: currentTheme === 'dark' ? '#95c672' : '#003D2D',
          color: currentTheme === 'dark' ? '#1f2937' : 'white'
        }}
      >
        <FaFilter classNafilter-iconicon" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      {showFilters && (
        <div classNafiltersters">
          {/* Filter options go here */}
        </div>
      )}
      {/* Audio products list goes here */}
    </div>
  );
};

export default AudioPage;