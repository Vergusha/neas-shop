import React, { useEffect, useState } from 'react';
import { getTheme } from '../../utils/themeUtils';

interface ColorVariant {
  id: string;
  color: string;
  image: string;
}

interface ColorVariantSelectorProps {
  variants: ColorVariant[];
  currentVariantId: string;
  onSelectVariant: (variantId: string) => void;
  isPending?: boolean;
}

const ColorVariantSelector: React.FC<ColorVariantSelectorProps> = ({
  variants,
  currentVariantId,
  onSelectVariant,
  isPending = false
}) => {
  // Track current theme
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  
  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme());
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Preload images for better performance
  useEffect(() => {
    variants.forEach(variant => {
      if (variant.image) {
        const img = new Image();
        img.src = variant.image;
      }
    });
  }, [variants]);

  // Only show if there's more than one color variant
  if (variants.length <= 1) return null;
  
  // Handle click on a variant
  const handleVariantClick = (variantId: string) => {
    if (variantId !== currentVariantId && !isPending) {
      onSelectVariant(variantId);
    }
  };
  
  return (
    <div className="mt-6">
      <h3 className={`mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
        Available Colors:
      </h3>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isCurrentVariant = variant.id === currentVariantId;
          
          return (
            <button
              key={variant.id}
              onClick={() => handleVariantClick(variant.id)}
              className={`relative flex flex-col items-center transition-all duration-200 ${
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isCurrentVariant
                  ? `ring-2 ${currentTheme === 'dark' ? 'ring-[#95c672]' : 'ring-[#003D2D]'}`
                  : `hover:bg-opacity-10 ${currentTheme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`
              } rounded-lg p-2`}
              disabled={isPending}
              aria-label={`Select ${variant.color} color variant`}
              title={variant.color}
            >
              <div className={`w-12 h-12 border rounded-md overflow-hidden ${currentTheme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                <img 
                  src={variant.image} 
                  alt={variant.color}
                  className="object-contain w-full h-full"
                  loading="eager"
                />
              </div>
              <span className={`mt-1 text-xs ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {variant.color}
              </span>
              
              {isCurrentVariant && (
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  currentTheme === 'dark' ? 'bg-[#95c672] text-gray-900' : 'bg-[#003D2D] text-white'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ColorVariantSelector);
