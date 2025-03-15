import React from 'react';
import { Star, StarHalf } from 'lucide-react';

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
  color = 'warning',
  readonly = true,
  onChange
}) => {
  // Convert size prop to CSS class
  const sizeClass = {
    xs: 'rating-xs',
    sm: 'rating-sm',
    md: 'rating-md',
    lg: 'rating-lg'
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
    <div className={`rating ${sizeClass} ${readonly ? '' : 'rating-interactive'}`}>
      {[...Array(maxValue)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= fullStars;
        const isHalf = !isFilled && hasHalfStar && starValue === fullStars + 1;
        
        return (
          <div 
            key={i}
            className="rating-item"
            onClick={() => handleRatingClick(starValue)}
            style={{ cursor: readonly ? 'default' : 'pointer' }}
          >
            {isFilled ? (
              <Star className={`fill-${color} text-${color}`} />
            ) : isHalf ? (
              <div className="relative">
                <Star className="text-gray-300" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className={`fill-${color} text-${color}`} />
                </div>
              </div>
            ) : (
              <Star className="text-gray-300" />
            )}
          </div>
        );
      })}
      {!readonly && (
        <span className="text-xs text-gray-500 ml-2">
          {value.toFixed(1)}/{maxValue}
        </span>
      )}
    </div>
  );
};

export default Rating;
