import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getTheme } from '../utils/themeUtils';

interface RatingProps {
  value: number;
  maxValue?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  readonly?: boolean;
  onChange?: (newValue: number) => void;
}

const Rating: React.FC<RatingProps> = ({
  value,
  maxValue = 5,
  size = 'md',
  readonly = true,
  onChange
}) => {
  // Add theme tracking
  const [theme, setTheme] = useState(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Convert size prop to pixel values
  const sizePx = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24
  }[size];

  // Calculate how many full stars and half stars to render
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  
  // Function to handle rating click
  const handleRatingClick = (newValue: number) => {
    if (!readonly && onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center">
      {[...Array(maxValue)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= fullStars;
        const isHalf = !isFilled && hasHalfStar && starValue === fullStars + 1;
        
        return (
          <div 
            key={i}
            onClick={() => handleRatingClick(starValue)}
            style={{ 
              cursor: readonly ? 'default' : 'pointer',
              padding: '2px' // Add a small padding for better touch targets
            }}
          >
            {isFilled ? (
              <Star size={sizePx} fill="#FFCA28" color="#FFCA28" stroke="#E6A700" strokeWidth="1" />
            ) : isHalf ? (
              <div className="relative">
                <Star size={sizePx} color="#e2e8f0" stroke="#888888" strokeWidth="1.5" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star size={sizePx} fill="#FFCA28" color="#FFCA28" stroke="#E6A700" strokeWidth="1" />
                </div>
              </div>
            ) : (
              <Star size={sizePx} color="#e2e8f0" stroke="#888888" strokeWidth="1.5" />
            )}
          </div>
        );
      })}
      {!readonly && (
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {value.toFixed(1)}/{maxValue}
        </span>
      )}
    </div>
  );
};

export default Rating;
