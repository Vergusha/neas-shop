import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageCarouselProps {
  images: string[];
  productName: string;
  onClick?: () => void;
}

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ 
  images, 
  productName,
  onClick 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset to first image when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  // Filter out empty image URLs
  const validImages = images.filter(img => img && img.trim() !== '');

  // If no valid images, show placeholder
  if (validImages.length === 0) {
    return (
      <div 
        className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-xl"
        onClick={onClick}
      >
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  // If only one image, show it without carousel controls
  if (validImages.length === 1) {
    return (
      <img 
        src={validImages[0]} 
        alt={productName} 
        className="object-contain w-full h-48 rounded-xl"
        onClick={onClick}
      />
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div 
      className="relative w-full h-48"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {/* Main image */}
      <div className="w-full h-full carousel">
        {validImages.map((image, idx) => (
          <div 
            key={idx} 
            className={`carousel-item w-full h-full ${idx === currentIndex ? 'block' : 'hidden'}`}
          >
            <img 
              src={image} 
              alt={`${productName} - Image ${idx + 1}`} 
              className="object-contain w-full h-full rounded-xl"
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <button 
        type="button"
        onClick={prevImage}
        className="absolute p-1 transform -translate-y-1/2 rounded-full shadow-md left-2 top-1/2 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-600"
        aria-label="Previous image"
      >
        <ChevronLeft size={16} className="dark:text-gray-200" />
      </button>
      <button 
        type="button"
        onClick={nextImage}
        className="absolute p-1 transform -translate-y-1/2 rounded-full shadow-md right-2 top-1/2 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-600"
        aria-label="Next image"
      >
        <ChevronRight size={16} className="dark:text-gray-200" />
      </button>

      {/* Dots indicator */}
      <div className="absolute flex space-x-1 transform -translate-x-1/2 bottom-2 left-1/2">
        {validImages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`w-2 h-2 rounded-full ${
              idx === currentIndex 
                ? 'bg-[#003D2D] dark:bg-[#95c672]' // Change from #eebbca to #95c672
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label={`Go to image ${idx + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductImageCarousel;
