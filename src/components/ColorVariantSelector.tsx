import React, { useEffect } from 'react';
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
  // Предзагрузка изображений для улучшения производительности
  useEffect(() => {
    // Предзагрузим все изображения вариантов
    variants.forEach(variant => {
      if (variant.image) {
        const img = new Image();
        img.src = variant.image;
      }
    });
  }, [variants]);

  // Показывать только если есть больше одного варианта цвета
  if (variants.length <= 1) return null;
  
  // Обработчик клика на вариант
  const handleVariantClick = (variantId: string) => {
    if (variantId !== currentVariantId) {
      // Используем React Router для перехода
      onSelectVariant(variantId);
    }
  };
  
  return (
    <div className="mt-6">
      {/* Removed the duplicate heading */}
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isCurrentVariant = variant.id === currentVariantId;
          
          return (
            <div
              key={variant.id}
              className={`product-color-variant ${isCurrentVariant ? 'active' : ''}`}
              onClick={() => handleVariantClick(variant.id)}
              title={`${variant.color} - Click to view this variant`}
              data-testid={`color-variant-${variant.color}`}
            >
              <div className="product-color-image">
                <img 
                  src={variant.image} 
                  alt={variant.color}
                  className="w-full h-full object-contain"
                  loading="eager" // Приоритетная загрузка
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

export default React.memo(ColorVariantSelector); // Мемоизация для предотвращения лишних рендеров
