import React from 'react';
import '../styles/ColorVariants.css';

interface ColorVariant {
  id: string;
  color: string;
  image: string;
}

interface ColorVariantSelectorProps {
  variants: ColorVariant[];
  currentVariantId: string;
  onSelectVariant: (variantId: string) => void;
}

const ColorVariantSelector: React.FC<ColorVariantSelectorProps> = ({
  variants,
  currentVariantId,
  onSelectVariant
}) => {
  // Показывать только если есть больше одного варианта цвета
  if (variants.length <= 1) return null;
  
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Available Colors:</h3>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isCurrentVariant = variant.id === currentVariantId;
          
          return (
            <div
              key={variant.id}
              className={`product-color-variant ${isCurrentVariant ? 'active' : ''}`}
              onClick={() => !isCurrentVariant && onSelectVariant(variant.id)}
              title={`${variant.color} - Click to view this variant`}
            >
              <div className="product-color-image">
                <img 
                  src={variant.image} 
                  alt={variant.color}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="product-color-name">{variant.color}</span>
              
              {isCurrentVariant && (
                <div className="active-indicator"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColorVariantSelector;
