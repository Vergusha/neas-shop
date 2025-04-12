import React, { useEffect, useState } from 'react';
import { getTheme } from '../utils/themeUtils';

interface ColorVariant {
  id: string;
  color: string;
  image: string;
}

interface ColorVariantSelectorProps {
  variants: ColorVariant[];
  currentVariantId: string;
  onSelectVariant: (variantId: string) => void;
  isPending?: boolean; // Добавляем prop для индикации загрузки
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
      <h3 className="mb-2 text-sm font-medium">
        {currentTheme === 'dark' ? 'Choose Color:' : 'Available Colors:'}
      </h3>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isCurrentVariant = variant.id === currentVariantId;
          
          return (
            <button
              key={variant.id}
              onClick={() => handleVariantClick(variant.id)}
              className={`relative p-2 rounded-lg transition-all duration-200 ${
                variant.id === currentVariantId
                  ? 'ring-2 ring-offset-2 ring-[#003D2D] dark:ring-[#95c672]'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              disabled={isPending}
            >
              <div className="product-color-image">
                <img 
                  src={variant.image} 
                  alt={variant.color}
                  className="object-contain w-full h-full"
                  loading="eager" // Приоритетная загрузка
                />
              </div>
              <span className="product-color-name">{variant.color}</span>
              
              {isCurrentVariant && (
                <div className="active-indicator"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ColorVariantSelector); // Мемоизация для предотвращения лишних рендеров
