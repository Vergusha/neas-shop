import React, { useState, useEffect } from 'react';
import { getTheme } from '../../utils/themeUtils';

interface RatingProps {
  value: number;
  readonly?: boolean;
  onChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
}

const Rating: React.FC<RatingProps> = ({
  value = 0,
  readonly = true,
  onChange,
  size = 'medium'
}) => {
  const [rating, setRating] = useState(Math.round(value));
  const [hover, setHover] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Update local rating when prop changes
  useEffect(() => {
    setRating(Math.round(value));
  }, [value]);

  const handleClick = (index: number) => {
    if (readonly) return;
    setRating(index);
    if (onChange) {
      onChange(index);
    }
  };
  
  // Apply different star sizes based on the size prop
  const starSizeClass = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3';
      case 'large':
        return 'w-6 h-6';
      case 'medium':
      default:
        return 'w-5 h-5';
    }
  };

  // Different colors for filled stars based on theme
  const filledStarColor = currentTheme === 'dark' ? '#95c672' : '#003D2D';
  const emptyStarColor = currentTheme === 'dark' ? '#4b5563' : '#d1d5db';
  const hoverStarColor = currentTheme === 'dark' ? '#85b662' : '#004D3D';

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((index) => (
        <span 
          key={index}
          className={`${readonly ? '' : 'cursor-pointer'} ${starSizeClass()} mx-0.5`}
          onClick={() => handleClick(index)}
          onMouseEnter={() => !readonly && setHover(index)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <svg 
            className="w-full h-full" 
            fill={hover ? (index <= hover ? hoverStarColor : emptyStarColor) : (index <= rating ? filledStarColor : emptyStarColor)}
            viewBox="0 0 24 24"
          >
            <path 
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
            />
          </svg>
        </span>
      ))}
    </div>
  );
};

export default Rating;
